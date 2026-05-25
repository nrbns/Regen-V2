import { loadCompanionConfig } from '../companion/companionConfig';
import { isTauriShell } from '../tauri/runtime';

const API =
  typeof import.meta !== 'undefined'
    ? import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000'
    : 'http://127.0.0.1:4000';

/**
 * Optional server/Ollama transcription when Web Speech API is unavailable or user prefers offline server STT.
 * Returns null → caller should use browser SpeechRecognition.
 */
export async function transcribeAudioBlob(blob: Blob, language = 'en'): Promise<string | null> {
  if (!blob.size) return null;

  if (isTauriShell()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const buf = new Uint8Array(await blob.arrayBuffer());
      const text = await invoke<string>('transcribe_voice', {
        audio: Array.from(buf),
        language,
      });
      if (text?.trim()) return text.trim();
    } catch {
      /* command may be absent */
    }
  }

  try {
    const form = new FormData();
    form.append('audio', blob, 'voice.webm');
    form.append('language', language);
    const res = await fetch(`${API}/api/voice/transcribe`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string; transcribedText?: string };
    const text = data.text ?? data.transcribedText;
    return text?.trim() || null;
  } catch {
    return null;
  }
}

export async function transcribeWithOllamaWhisper(blob: Blob): Promise<string | null> {
  const cfg = loadCompanionConfig();
  try {
    const b64 = await blobToBase64(blob);
    const res = await fetch(`${cfg.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'whisper',
        prompt: '',
        audio: b64,
        stream: false,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.response as string)?.trim() || null;
  } catch {
    return null;
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}
