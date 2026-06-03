import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { isTauriShell } from '../tauri/runtime';
import { useDownloadsStore } from '../../state/downloadsStore';

export type TauriDownloadRow = {
  id: string;
  url: string;
  filename?: string;
  path?: string;
  status: string;
  progress?: number;
  receivedBytes?: number;
  totalBytes?: number;
  createdAt: number;
};

export async function listTauriDownloads(): Promise<TauriDownloadRow[]> {
  if (!isTauriShell()) return [];
  try {
    return await invoke<TauriDownloadRow[]>('downloads:list');
  } catch {
    return [];
  }
}

export async function syncDownloadsFromDb(): Promise<void> {
  const rows = await listTauriDownloads();
  const store = useDownloadsStore.getState();
  for (const row of rows) {
    const existing = store.getDownload(row.id);
    const status =
      row.status === 'completed'
        ? 'completed'
        : row.status === 'failed'
          ? 'error'
          : row.status === 'downloading'
            ? 'downloading'
            : 'queued';
    if (existing) {
      store.updateDownload(row.id, {
        filename: row.filename || existing.filename,
        path: row.path,
        status,
        progress: row.progress ?? existing.progress,
        totalBytes: row.totalBytes,
        receivedBytes: row.receivedBytes,
      });
    } else {
      store.addDownload(
        {
          url: row.url,
          filename: row.filename || 'download',
          path: row.path,
        },
        row.id
      );
      store.updateDownload(row.id, { status, progress: row.progress ?? 0 });
    }
  }
}

export async function saveTextDownload(options: {
  url: string;
  filename: string;
  content: string;
}): Promise<{ id: string; path?: string } | null> {
  const { url, filename, content } = options;
  const name = filename.trim() || 'overview.md';

  if (!isTauriShell()) {
    const id = crypto.randomUUID();
    useDownloadsStore.getState().addDownload({ url: url || 'regen://page-overview', filename: name }, id);
    try {
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = name;
      a.click();
      URL.revokeObjectURL(href);
      useDownloadsStore.getState().updateDownload(id, { status: 'completed', progress: 100 });
      return { id };
    } catch (e) {
      useDownloadsStore.getState().updateDownload(id, {
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
      });
      return null;
    }
  }

  const tempId = crypto.randomUUID();
  useDownloadsStore.getState().addDownload(
    { url: url || 'regen://page-overview', filename: name },
    tempId
  );
  useDownloadsStore.getState().updateDownload(tempId, { status: 'downloading', progress: 10 });

  try {
    const result = await invoke<{
      id: string;
      path?: string;
      filename?: string;
      status: string;
    }>('browser_save_text_download', { url, filename: name, content });

    if (result.id !== tempId) {
      useDownloadsStore.getState().removeDownload(tempId);
      useDownloadsStore.getState().addDownload(
        { url: url || 'regen://page-overview', filename: result.filename || name, path: result.path },
        result.id
      );
    }
    useDownloadsStore.getState().updateDownload(result.id, {
      status: 'completed',
      progress: 100,
      path: result.path,
      filename: result.filename || name,
    });
    return { id: result.id, path: result.path };
  } catch (e) {
    useDownloadsStore.getState().updateDownload(tempId, {
      status: 'error',
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

export async function startBrowserDownload(
  url: string,
  filename?: string
): Promise<{ id: string; path?: string } | null> {
  if (!isTauriShell()) {
    const id = useDownloadsStore.getState().addDownload({
      url,
      filename: filename || 'download',
    });
    useDownloadsStore.getState().updateDownload(id, {
      status: 'error',
      error: 'Downloads require the desktop app',
    });
    return null;
  }

  const tempId = crypto.randomUUID();
  useDownloadsStore.getState().addDownload(
    {
      url,
      filename: filename || url.split('/').pop()?.split('?')[0] || 'download',
    },
    tempId
  );
  useDownloadsStore.getState().updateDownload(tempId, { status: 'downloading', progress: 5 });

  try {
    const result = await invoke<{
      id: string;
      path?: string;
      filename?: string;
      status: string;
    }>('browser_download_url', { url, filename });

    if (result.id !== tempId) {
      useDownloadsStore.getState().removeDownload(tempId);
      useDownloadsStore.getState().addDownload(
        {
          url,
          filename: result.filename || filename || 'download',
          path: result.path,
        },
        result.id
      );
    }
    useDownloadsStore.getState().updateDownload(result.id, {
      status: result.status === 'completed' ? 'completed' : 'downloading',
      progress: 100,
      path: result.path,
      filename: result.filename || filename,
    });
    return { id: result.id, path: result.path };
  } catch (e) {
    useDownloadsStore.getState().updateDownload(tempId, {
      status: 'error',
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

export async function openDownloadFile(path: string): Promise<void> {
  if (!isTauriShell()) return;
  await invoke('downloads:openFile', { path });
}

export async function showDownloadInFolder(path: string): Promise<void> {
  if (!isTauriShell()) return;
  await invoke('downloads:showInFolder', { path });
}

export function subscribeDownloadEvents(): () => void {
  if (!isTauriShell()) return () => {};
  let unlisten: (() => void) | undefined;
  void listen<{ id: string; path?: string; filename?: string }>(
    'browser://download-complete',
    () => {
      void syncDownloadsFromDb();
    }
  ).then((fn) => {
    unlisten = fn;
  });
  return () => unlisten?.();
}

export async function toggleActiveTabDevTools(tabId: string | null): Promise<void> {
  if (!tabId || !isTauriShell()) return;
  const { withBrowseProfile } = await import('./browserWebviewInvoke');
  await invoke('browser_webview_toggle_devtools', withBrowseProfile({ tabId }));
}
