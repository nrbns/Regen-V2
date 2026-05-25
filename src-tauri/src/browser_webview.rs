//! Embedded tab webviews (real browser engine — not iframes).
//! Requires Tauri `unstable` feature for `Window::add_child`.

use std::sync::mpsc;
use std::time::Duration;

use tauri::{
    webview::{PageLoadEvent, WebviewBuilder},
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, Url, WebviewUrl, WebviewWindow,
};

const CHROME_UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/// Tab bar (42) + address bar (46) — keep native webviews below shell chrome.
const SHELL_CHROME_MIN_Y: f64 = 88.0;

#[derive(Clone, serde::Serialize)]
struct PageLoadedPayload {
    tab_id: String,
}

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

#[derive(serde::Deserialize)]
pub struct WebviewRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

fn tab_label(tab_id: &str) -> String {
    let safe: String = tab_id
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '-'
            }
        })
        .collect();
    format!("browse-{safe}").chars().take(64).collect()
}

fn parent_window(parent: &WebviewWindow) -> tauri::Window {
    parent.as_ref().window()
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

fn same_host(a: &Url, b: &Url) -> bool {
    a.host_str() == b.host_str()
}

fn hide_other_tab_webviews(window: &tauri::Window, active_label: &str) {
    for wv in window.webviews() {
        let label = wv.label();
        if label.starts_with("browse-") && label != active_label {
            let _ = wv.hide();
        }
    }
}

fn clamp_content_rect(rect: &WebviewRect) -> WebviewRect {
    let mut y = rect.y;
    let mut height = rect.height.max(100.0);
    if y < SHELL_CHROME_MIN_Y {
        height = (height - (SHELL_CHROME_MIN_Y - y)).max(100.0);
        y = SHELL_CHROME_MIN_Y;
    }
    WebviewRect {
        x: rect.x.max(0.0),
        y,
        width: rect.width.max(320.0),
        height,
    }
}

fn apply_bounds(wv: &tauri::Webview, rect: &WebviewRect) -> Result<(), String> {
    let rect = clamp_content_rect(rect);
    wv.set_position(LogicalPosition::new(rect.x, rect.y))
        .map_err(|e| e.to_string())?;
    wv.set_size(LogicalSize::new(rect.width, rect.height))
        .map_err(|e| e.to_string())?;
    let _ = wv.set_auto_resize(false);
    Ok(())
}

#[tauri::command]
pub async fn browser_webview_upsert(
    parent: WebviewWindow,
    app: AppHandle,
    tab_id: String,
    url: String,
    rect: WebviewRect,
) -> Result<(), String> {
    let parsed = normalize_target_url(&url)?;
    let label = tab_label(&tab_id);
    let window = parent_window(&parent);
    let rect = clamp_content_rect(&rect);
    let tab_id_emit = tab_id.clone();
    let app_emit = app.clone();

    if let Some(existing) = window.get_webview(&label) {
        apply_bounds(&existing, &rect)?;
        let current = existing.url().ok();
        let can_navigate = current.as_ref().is_some_and(|u| same_host(u, &parsed));

        if can_navigate {
            if current.as_ref().map(|u| u.as_str()) != Some(parsed.as_str()) {
                existing
                    .navigate(parsed.clone())
                    .map_err(|e| e.to_string())?;
            }
        } else {
            existing.close().map_err(|e| e.to_string())?;
            create_child_webview(
                &window,
                &app_emit,
                &label,
                &tab_id_emit,
                parsed,
                &rect,
            )?;
        }
    } else {
        create_child_webview(&window, &app_emit, &label, &tab_id_emit, parsed, &rect)?;
    }

    hide_other_tab_webviews(&window, &label);

    if let Some(wv) = window.get_webview(&label) {
        wv.show().map_err(|e| e.to_string())?;
        let _ = wv.set_focus();
    }

    Ok(())
}

/// Hide every tab webview except the active tab (call before showing active).
#[tauri::command]
pub async fn browser_webview_hide_all_except(
    parent: WebviewWindow,
    tab_id: Option<String>,
) -> Result<(), String> {
    let window = parent_window(&parent);
    let except = tab_id.map(|id| tab_label(&id));
    for wv in window.webviews() {
        let label = wv.label();
        if label.starts_with("browse-") {
            if except.as_ref().map(|e| e.as_str()) != Some(label) {
                let _ = wv.hide();
            }
        }
    }
    Ok(())
}

fn create_child_webview(
    window: &tauri::Window,
    app: &AppHandle,
    label: &str,
    tab_id: &str,
    url: Url,
    rect: &WebviewRect,
) -> Result<(), String> {
    let tab_id_owned = tab_id.to_string();
    let app = app.clone();

    let builder = WebviewBuilder::new(label, WebviewUrl::External(url))
        .user_agent(CHROME_UA)
        .on_page_load(move |_wv, payload| {
            if payload.event() == PageLoadEvent::Finished {
                let _ = app.emit(
                    "browser://page-loaded",
                    PageLoadedPayload {
                        tab_id: tab_id_owned.clone(),
                    },
                );
            }
        });

    let wv = window
        .add_child(
            builder,
            LogicalPosition::new(rect.x, rect.y),
            LogicalSize::new(rect.width.max(1.0), rect.height.max(1.0)),
        )
        .map_err(|e| e.to_string())?;

    wv.show().map_err(|e| e.to_string())?;
    let _ = wv.set_auto_resize(false);
    Ok(())
}

#[tauri::command]
pub async fn browser_webview_set_bounds(
    parent: WebviewWindow,
    tab_id: String,
    rect: WebviewRect,
) -> Result<(), String> {
    let label = tab_label(&tab_id);
    let window = parent_window(&parent);
    let wv = window
        .get_webview(&label)
        .ok_or_else(|| format!("Webview not found: {label}"))?;
    apply_bounds(&wv, &clamp_content_rect(&rect))
}

#[tauri::command]
pub async fn browser_webview_set_visible(
    parent: WebviewWindow,
    tab_id: String,
    visible: bool,
) -> Result<(), String> {
    let label = tab_label(&tab_id);
    let window = parent_window(&parent);
    let wv = window
        .get_webview(&label)
        .ok_or_else(|| format!("Webview not found: {label}"))?;
    if visible {
        wv.show().map_err(|e| e.to_string())?;
        let _ = wv.set_focus();
    } else {
        wv.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn browser_webview_close_all(parent: WebviewWindow) -> Result<(), String> {
    let window = parent_window(&parent);
    for wv in window.webviews() {
        if wv.label().starts_with("browse-") {
            let _ = wv.close();
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn browser_webview_close(parent: WebviewWindow, tab_id: String) -> Result<(), String> {
    let label = tab_label(&tab_id);
    let window = parent_window(&parent);
    if let Some(wv) = window.get_webview(&label) {
        wv.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Extract title + text snippet from an embedded tab webview (for emotion / AI context).
#[tauri::command]
pub async fn browser_webview_extract_page(
    parent: WebviewWindow,
    tab_id: String,
) -> Result<PageSnippetPayload, String> {
    let label = tab_label(&tab_id);
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
