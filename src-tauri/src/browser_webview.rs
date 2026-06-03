//! Embedded tab webviews (real browser engine — not iframes).
//! Requires Tauri `unstable` feature for `Window::add_child`.

use std::sync::mpsc;
use std::time::Duration;

use std::path::PathBuf;

use tauri::{
    path::BaseDirectory,
    webview::{PageLoadEvent, WebviewBuilder},
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, Url, WebviewUrl, WebviewWindow,
};

const CHROME_UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct PageSyncPayload {
    tab_id: String,
    url: String,
    title: String,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageStatePayload {
    #[serde(alias = "tabId")]
    pub tab_id: String,
    pub url: String,
    pub title: String,
}

const TITLE_JS: &str = r#"(function(){
  try { return JSON.stringify(document.title || ''); }
  catch (e) { return JSON.stringify(''); }
})()"#;

#[derive(Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageSnippetPayload {
    #[serde(alias = "tabId")]
    pub tab_id: String,
    pub url: String,
    pub title: String,
    pub text: String,
}

fn parse_eval_json(raw: &str) -> serde_json::Value {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return serde_json::json!({});
    }
    if let Ok(v) = serde_json::from_str(trimmed) {
        return v;
    }
    if (trimmed.starts_with('"') && trimmed.ends_with('"'))
        || (trimmed.starts_with('\'') && trimmed.ends_with('\''))
    {
        if let Ok(inner) = serde_json::from_str::<String>(trimmed) {
            if let Ok(v) = serde_json::from_str(&inner) {
                return v;
            }
        }
    }
    serde_json::json!({})
}

const EXTRACT_PAGE_JS: &str = r#"(function(){
  try {
    var root = document.body || document.documentElement;
    var clone = root.cloneNode(true);
    var junk = clone.querySelectorAll('script, style, noscript, svg, iframe');
    for (var i = 0; i < junk.length; i++) junk[i].remove();
    var text = (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
  if (text.length > 5000) text = text.slice(0, 5000);
    return JSON.stringify({ url: location.href, title: document.title || '', text: text });
  } catch (e) {
    return JSON.stringify({ url: location.href, title: document.title || '', text: '' });
  }
})()"#;

#[derive(serde::Serialize, serde::Deserialize)]
pub struct WebviewRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

fn sanitize_label_part(s: &str) -> String {
    s.chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '-'
            }
        })
        .collect()
}

pub fn resolve_profile_id(profile_id: Option<String>) -> String {
    let raw = profile_id.unwrap_or_else(|| "default".to_string());
    let safe = sanitize_label_part(raw.trim());
    if safe.is_empty() {
        "default".to_string()
    } else {
        safe
    }
}

fn tab_label(profile_id: &str, tab_id: &str) -> String {
    format!(
        "browse-{}-{}",
        sanitize_label_part(profile_id),
        sanitize_label_part(tab_id)
    )
    .chars()
    .take(64)
    .collect()
}

fn profile_incognito(profile_id: &str) -> bool {
    profile_id == "private" || profile_id == "guest"
}

fn profile_data_directory(app: &AppHandle, profile_id: &str) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .resolve(
            format!("profiles/{profile_id}"),
            BaseDirectory::AppData,
        )
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn parent_window(parent: &WebviewWindow) -> tauri::Window {
    parent.as_ref().window()
}

const SHELL_WEBVIEW_LABEL: &str = "main";

/// Shell UI `WebviewWindow` — never a per-tab `browse-*` child (those trigger
/// "current webview is not a WebviewWindow" when used as command parent).
fn shell_webview_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    if let Some(w) = app.get_webview_window(SHELL_WEBVIEW_LABEL) {
        return Ok(w);
    }
    for (label, w) in app.webview_windows() {
        if !label.starts_with("browse-") {
            return Ok(w);
        }
    }
    Err(
        "Shell WebviewWindow not found. Native browse commands must run from the main app window."
            .to_string(),
    )
}

fn normalize_target_url(url: &str) -> Result<Url, String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return "https://www.google.com/"
            .parse()
            .map_err(|e| format!("Invalid URL: {e}"));
    }
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        return trimmed
            .parse()
            .map_err(|e| format!("Invalid URL: {e}"));
    }
    format!("https://{trimmed}")
        .parse()
        .map_err(|e| format!("Invalid URL: {e}"))
}

fn read_webview_title(wv: &tauri::Webview) -> String {
    let (tx, rx) = mpsc::channel::<String>();
    if wv
        .eval_with_callback(TITLE_JS, move |result| {
            let _ = tx.send(result);
        })
        .is_err()
    {
        return String::new();
    }
    let raw = rx.recv_timeout(Duration::from_millis(800)).unwrap_or_default();
    let parsed = parse_eval_json(&raw);
    parsed.as_str().map(|s| s.to_string()).unwrap_or_default()
}

fn emit_page_sync(app: &AppHandle, tab_id: &str, wv: &tauri::Webview) {
    let url = wv.url().map(|u| u.to_string()).unwrap_or_default();
    if url.is_empty() {
        return;
    }
    let title = read_webview_title(wv);
    let payload = PageSyncPayload {
        tab_id: tab_id.to_string(),
        url: url.clone(),
        title: title.clone(),
    };
    let _ = app.emit("browser://did-navigate", payload.clone());
    let _ = app.emit("browser://page-loaded", payload);
}

/// Hide and move off-screen — `hide()` alone is unreliable on Windows (stacked HWNDs).
fn deactivate_browse_webview(wv: &tauri::Webview) {
    let _ = wv.hide();
    let _ = wv.set_position(LogicalPosition::new(-20_000.0, -20_000.0));
    let _ = wv.set_size(LogicalSize::new(1.0, 1.0));
}

fn hide_other_tab_webviews(window: &tauri::Window, active_label: &str) {
    for wv in window.webviews() {
        let label = wv.label();
        if label.starts_with("browse-") && label != active_label {
            deactivate_browse_webview(&wv);
        }
    }
}

fn clamp_content_rect(rect: &WebviewRect) -> WebviewRect {
    WebviewRect {
        x: rect.x.max(0.0),
        y: rect.y.max(0.0),
        width: rect.width.max(200.0),
        height: rect.height.max(120.0),
    }
}

fn apply_bounds(wv: &tauri::Webview, rect: &WebviewRect) -> Result<(), String> {
    let rect = clamp_content_rect(rect);
    wv.set_position(LogicalPosition::new(rect.x, rect.y))
        .map_err(|e| e.to_string())?;
    wv.set_size(LogicalSize::new(rect.width, rect.height))
        .map_err(|e| e.to_string())?;
    let _ = wv.set_auto_resize(false);
    raise_browse_webview(wv);
    Ok(())
}

/// Fallback: size browse webview from window metrics when DOM bounds are not ready.
fn fit_pane_rect(
    window: &tauri::Window,
    sidebar_width: f64,
    chrome_bottom: f64,
    status_bar_height: f64,
) -> Result<WebviewRect, String> {
    let scale = window.scale_factor().map_err(|e| e.to_string())?;
    let inner = window.inner_size().map_err(|e| e.to_string())?;
    let w = inner.width as f64 / scale;
    let h = inner.height as f64 / scale;
    Ok(WebviewRect {
        x: 0.0,
        y: chrome_bottom.max(0.0),
        width: (w - sidebar_width.max(0.0)).max(200.0),
        height: (h - chrome_bottom - status_bar_height).max(120.0),
    })
}

/// On Windows the shell webview HWND can paint over child tab webviews — raise browse webviews to the top.
#[cfg(windows)]
fn raise_browse_webview(wv: &tauri::Webview) {
    use winapi::shared::windef::HWND;
    use winapi::um::winuser::{SetWindowPos, HWND_TOP, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE};
    use windows::Win32::Foundation::HWND as WinHWND;

    let _ = wv.with_webview(|platform| {
        let mut hwnd = WinHWND::default();
        if unsafe { platform.controller().ParentWindow(&mut hwnd) }.is_ok() {
            unsafe {
                SetWindowPos(
                    hwnd.0 as HWND,
                    HWND_TOP,
                    0,
                    0,
                    0,
                    0,
                    SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
                );
            }
        }
    });
}

#[cfg(not(windows))]
fn raise_browse_webview(_wv: &tauri::Webview) {}

fn show_browse_webview(wv: &tauri::Webview) -> Result<(), String> {
    wv.show().map_err(|e| e.to_string())?;
    raise_browse_webview(wv);
    let _ = wv.set_focus();
    Ok(())
}

#[tauri::command]
pub async fn browser_webview_upsert(
    app: AppHandle,
    tab_id: String,
    url: String,
    rect: WebviewRect,
    activate: Option<bool>, // false = update without stealing focus from current tab
    profile_id: Option<String>,
) -> Result<(), String> {
    let parent = shell_webview_window(&app)?;
    let activate = activate.unwrap_or(true);
    let parsed = normalize_target_url(&url)?;
    let profile = resolve_profile_id(profile_id);
    let label = tab_label(&profile, &tab_id);
    let window = parent_window(&parent);
    let rect = clamp_content_rect(&rect);
    let tab_id_emit = tab_id.clone();
    let app_emit = app.clone();

    if let Some(existing) = window.get_webview(&label) {
        apply_bounds(&existing, &rect)?;
        let needs_nav = existing
            .url()
            .ok()
            .map(|u| u.as_str() != parsed.as_str())
            .unwrap_or(true);

        if needs_nav {
            if existing.navigate(parsed.clone()).is_err() {
                eprintln!("[browser_webview] navigate failed for {label}, recreating webview");
                let _ = existing.close();
                window
                    .get_webview(&label)
                    .map(|stale| {
                        let _ = stale.close();
                    });
                create_child_webview(
                    &window,
                    &app_emit,
                    &profile,
                    &label,
                    &tab_id_emit,
                    parsed,
                    &rect,
                    activate,
                )?;
            }
        } else {
            emit_page_sync(&app_emit, &tab_id_emit, &existing);
        }
    } else {
        create_child_webview(
            &window,
            &app_emit,
            &profile,
            &label,
            &tab_id_emit,
            parsed,
            &rect,
            activate,
        )?;
    }

    if activate {
        hide_other_tab_webviews(&window, &label);
        if let Some(wv) = window.get_webview(&label) {
            show_browse_webview(&wv)?;
        }
    } else if let Some(wv) = window.get_webview(&label) {
        deactivate_browse_webview(&wv);
    }

    Ok(())
}

/// Hide every tab webview except the active tab (call before showing active).
#[tauri::command]
pub async fn browser_webview_hide_all_except(
    app: AppHandle,
    tab_id: Option<String>,
    profile_id: Option<String>,
) -> Result<(), String> {
    let parent = shell_webview_window(&app)?;
    let window = parent_window(&parent);
    let profile = resolve_profile_id(profile_id);
    let except = tab_id.as_ref().map(|id| tab_label(&profile, id));
    for wv in window.webviews() {
        let label = wv.label();
        if !label.starts_with("browse-") {
            continue;
        }
        if except.as_ref().map(|e| e.as_str()) == Some(label) {
            let rect = fit_pane_rect(&window, 280.0, 88.0, 26.0).unwrap_or(WebviewRect {
                x: 0.0,
                y: 88.0,
                width: 800.0,
                height: 600.0,
            });
            let _ = apply_bounds(&wv, &rect);
            let _ = show_browse_webview(&wv);
        } else {
            deactivate_browse_webview(&wv);
        }
    }
    Ok(())
}

fn create_child_webview(
    window: &tauri::Window,
    app: &AppHandle,
    profile_id: &str,
    label: &str,
    tab_id: &str,
    url: Url,
    rect: &WebviewRect,
    show_on_create: bool,
) -> Result<(), String> {
    let tab_id_owned = tab_id.to_string();
    let app_emit = app.clone();

    let mut builder = WebviewBuilder::new(label, WebviewUrl::External(url))
        .user_agent(CHROME_UA)
        .focused(show_on_create)
        .on_page_load(move |wv, payload| {
            if payload.event() == PageLoadEvent::Finished {
                emit_page_sync(&app_emit, &tab_id_owned, &wv);
            }
        });

    if profile_incognito(profile_id) {
        builder = builder.incognito(true);
    } else if let Ok(dir) = profile_data_directory(app, profile_id) {
        builder = builder.data_directory(dir);
    }

    let wv = window
        .add_child(
            builder,
            LogicalPosition::new(rect.x, rect.y),
            LogicalSize::new(rect.width.max(1.0), rect.height.max(1.0)),
        )
        .map_err(|e| e.to_string())?;

    if show_on_create {
        apply_bounds(&wv, rect)?;
        show_browse_webview(&wv)?;
    } else {
        deactivate_browse_webview(&wv);
    }
    let _ = wv.set_auto_resize(false);
    Ok(())
}

#[tauri::command]
pub async fn browser_webview_set_bounds(
    app: AppHandle,
    tab_id: String,
    rect: WebviewRect,
    profile_id: Option<String>,
) -> Result<(), String> {
    let parent = shell_webview_window(&app)?;
    let profile = resolve_profile_id(profile_id);
    let label = tab_label(&profile, &tab_id);
    let window = parent_window(&parent);
    let wv = window
        .get_webview(&label)
        .ok_or_else(|| format!("Webview not found: {label}"))?;
    apply_bounds(&wv, &clamp_content_rect(&rect))?;
    let _ = show_browse_webview(&wv);
    Ok(())
}

#[tauri::command]
pub async fn browser_webview_fit_pane(
    app: AppHandle,
    tab_id: String,
    sidebar_width: f64,
    chrome_bottom: f64,
    status_bar_height: f64,
    profile_id: Option<String>,
) -> Result<WebviewRect, String> {
    let parent = shell_webview_window(&app)?;
    let profile = resolve_profile_id(profile_id);
    let label = tab_label(&profile, &tab_id);
    let window = parent_window(&parent);
    let rect = fit_pane_rect(&window, sidebar_width, chrome_bottom, status_bar_height)?;
    if let Some(wv) = window.get_webview(&label) {
        apply_bounds(&wv, &rect)?;
        let _ = show_browse_webview(&wv);
    }
    Ok(rect)
}

#[tauri::command]
pub async fn browser_webview_set_visible(
    app: AppHandle,
    tab_id: String,
    visible: bool,
    profile_id: Option<String>,
) -> Result<(), String> {
    let parent = shell_webview_window(&app)?;
    let profile = resolve_profile_id(profile_id);
    let label = tab_label(&profile, &tab_id);
    let window = parent_window(&parent);
    let wv = window
        .get_webview(&label)
        .ok_or_else(|| format!("Webview not found: {label}"))?;
    if visible {
        show_browse_webview(&wv)?;
    } else {
        deactivate_browse_webview(&wv);
    }
    Ok(())
}

#[tauri::command]
pub async fn browser_webview_close_all(app: AppHandle) -> Result<(), String> {
    let parent = shell_webview_window(&app)?;
    let window = parent_window(&parent);
    for wv in window.webviews() {
        if wv.label().starts_with("browse-") {
            let _ = wv.close();
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn browser_webview_close(
    app: AppHandle,
    tab_id: String,
    profile_id: Option<String>,
) -> Result<(), String> {
    let parent = shell_webview_window(&app)?;
    let profile = resolve_profile_id(profile_id);
    let label = tab_label(&profile, &tab_id);
    let window = parent_window(&parent);
    if let Some(wv) = window.get_webview(&label) {
        wv.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Extract title + text snippet from an embedded tab webview (for emotion / AI context).
#[tauri::command]
pub async fn browser_webview_extract_page(
    app: AppHandle,
    tab_id: String,
    profile_id: Option<String>,
) -> Result<PageSnippetPayload, String> {
    let parent = shell_webview_window(&app)?;
    let profile = resolve_profile_id(profile_id);
    let label = tab_label(&profile, &tab_id);
    let window = parent_window(&parent);
    let wv = window
        .get_webview(&label)
        .ok_or_else(|| format!("Webview not found: {label}"))?;

    let page_url = wv.url().map(|u| u.to_string()).unwrap_or_default();

    let (tx, rx) = mpsc::channel::<String>();
    wv.eval_with_callback(EXTRACT_PAGE_JS, move |result| {
        let _ = tx.send(result);
    })
    .map_err(|e| e.to_string())?;

    let raw = rx
        .recv_timeout(Duration::from_secs(4))
        .map_err(|_| "Timed out reading page content".to_string())?;

    let parsed = parse_eval_json(&raw);

    let url = parsed
        .get("url")
        .and_then(|v| v.as_str())
        .unwrap_or(&page_url)
        .to_string();
    let title = parsed
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let text = parsed
        .get("text")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    Ok(PageSnippetPayload {
        tab_id,
        url,
        title,
        text,
    })
}

fn browse_webview(
    parent: &WebviewWindow,
    profile_id: &str,
    tab_id: &str,
) -> Result<tauri::Webview, String> {
    let label = tab_label(profile_id, tab_id);
    let window = parent_window(parent);
    window
        .get_webview(&label)
        .ok_or_else(|| format!("Webview not found: {label}"))
}

#[tauri::command]
pub async fn browser_webview_reload(
    app: AppHandle,
    tab_id: String,
    profile_id: Option<String>,
) -> Result<(), String> {
    let parent = shell_webview_window(&app)?;
    let profile = resolve_profile_id(profile_id);
    let wv = browse_webview(&parent, &profile, &tab_id)?;
    wv.reload().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn browser_webview_go_back(
    app: AppHandle,
    tab_id: String,
    profile_id: Option<String>,
) -> Result<(), String> {
    let parent = shell_webview_window(&app)?;
    let profile = resolve_profile_id(profile_id);
    let wv = browse_webview(&parent, &profile, &tab_id)?;
    wv.eval("history.back()").map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn browser_webview_go_forward(
    app: AppHandle,
    tab_id: String,
    profile_id: Option<String>,
) -> Result<(), String> {
    let parent = shell_webview_window(&app)?;
    let profile = resolve_profile_id(profile_id);
    let wv = browse_webview(&parent, &profile, &tab_id)?;
    wv.eval("history.forward()").map_err(|e| e.to_string())
}

/// Current URL + document title for a tab webview (reconcile UI with OS webview).
#[tauri::command]
pub async fn browser_webview_get_page_state(
    app: AppHandle,
    tab_id: String,
    profile_id: Option<String>,
) -> Result<PageStatePayload, String> {
    let parent = shell_webview_window(&app)?;
    let profile = resolve_profile_id(profile_id);
    let wv = browse_webview(&parent, &profile, &tab_id)?;
    let url = wv.url().map(|u| u.to_string()).unwrap_or_default();
    let title = read_webview_title(&wv);
    Ok(PageStatePayload {
        tab_id,
        url,
        title,
    })
}

const SELECTION_JS: &str = r#"(function(){
  try {
    var s = window.getSelection ? window.getSelection().toString() : '';
    return JSON.stringify((s || '').trim().slice(0, 4000));
  } catch (e) { return JSON.stringify(''); }
})()"#;

#[tauri::command]
pub async fn browser_webview_get_selection(
    app: AppHandle,
    tab_id: String,
    profile_id: Option<String>,
) -> Result<String, String> {
    let parent = shell_webview_window(&app)?;
    let profile = resolve_profile_id(profile_id);
    let wv = browse_webview(&parent, &profile, &tab_id)?;
    let (tx, rx) = mpsc::channel::<String>();
    wv.eval_with_callback(SELECTION_JS, move |result| {
        let _ = tx.send(result);
    })
    .map_err(|e| e.to_string())?;
    let raw = rx
        .recv_timeout(Duration::from_secs(2))
        .map_err(|_| "Timed out reading selection".to_string())?;
    let parsed = parse_eval_json(&raw);
    Ok(parsed
        .as_str()
        .map(|s| s.to_string())
        .unwrap_or_default())
}

#[tauri::command]
pub async fn browser_webview_toggle_devtools(
    app: AppHandle,
    tab_id: String,
    profile_id: Option<String>,
) -> Result<(), String> {
    let parent = shell_webview_window(&app)?;
    let profile = resolve_profile_id(profile_id);
    let wv = browse_webview(&parent, &profile, &tab_id)?;
    wv.open_devtools();
    Ok(())
}
