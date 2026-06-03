import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { getExecutionClient } from '../services/realtime/executionClient';
import { VoiceHandler } from '../lib/voice/voiceHandler';
import { VisionProcessor } from '../lib/vision/visionProcessor';
import { LLMHandler } from '../lib/ai/llmHandler';
import { loadCompanionConfig, saveCompanionConfig, type AvatarEmotion } from '../lib/companion/companionConfig';
import { companionDebug } from '../lib/companion/companionDebug';
import { useTabsStore } from '../state/tabsStore';
import { useExecutionStore } from '../state/executionStore';
import { isTauriRuntime } from '../lib/env';
import { setCompanionEmotion } from '../lib/companion/avatarBridge';
import { getPageSnippet } from '../lib/browser/pageContextStore';
import { buildPageContextBlock } from '../lib/browser/pageGroundedPrompt';
import { fetchNativePageSnippet } from '../lib/browser/fetchPageSnippet';
import { isNewTabUrl } from '../lib/browser/normalizeUrl';

export function useBrowserCompanion() {
  const voiceRef = useRef<VoiceHandler | null>(null);
  const visionRef = useRef<VisionProcessor | null>(null);
  const llmRef = useRef<LLMHandler | null>(null);
  const [streamText, setStreamText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [emotion, setEmotion] = useState<AvatarEmotion>('idle');
  const [visionSummary, setVisionSummary] = useState('');
  const [visionSharing, setVisionSharing] = useState(false);
  const [pending, startTransition] = useTransition();
  const messagesRef = useRef<{ addRegen: (t: string) => void; addUser: (t: string) => void } | null>(null);
  const executionConnected = useExecutionStore((s) => s.connected);

  const bindMessages = useCallback((api: { addRegen: (t: string) => void; addUser: (t: string) => void }) => {
    messagesRef.current = api;
  }, []);

  useEffect(() => {
    const voice = new VoiceHandler({
      onTranscript: (text, lang, isFinal) => {
        startTransition(() => setStreamText(text));
        if (isFinal && text) void sendMessageRef.current?.(text, lang);
      },
      onError: (e) => companionDebug.log(`voice: ${e.message}`),
    });
    const vision = new VisionProcessor({
      onDescription: (desc) => {
        companionDebug.log(`vision: ${desc.slice(0, 80)}`);
        startTransition(() => setVisionSummary(desc.slice(0, 200)));
      },
      onError: (e) => companionDebug.log(`vision err: ${e.message}`),
    });
    const llm = new LLMHandler();

    voiceRef.current = voice;
    visionRef.current = vision;
    llmRef.current = llm;

    if (loadCompanionConfig().visionEnabled) vision.startWatching();

    const onCfg = () => {
      const c = loadCompanionConfig();
      vision.stopWatching();
      vision.stopDisplayMedia();
      setVisionSharing(false);
      if (c.visionEnabled) vision.startWatching();
    };
    window.addEventListener('regen:companion-config', onCfg);

    return () => {
      window.removeEventListener('regen:companion-config', onCfg);
      voice.dispose();
      vision.dispose();
      llm.cancel();
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const s = companionDebug.getState().emotion;
      setEmotion(s);
    }, 200);
    return () => clearInterval(id);
  }, []);

  const sendMessageRef = useRef<(text: string, lang?: string) => Promise<void>>(async () => {});

  const sendMessage = useCallback(async (text: string, lang = 'en') => {
    if (!text.trim()) return;
    messagesRef.current?.addUser(text);
    setCompanionEmotion('thinking');
    const { tabs, activeTabId } = useTabsStore.getState();
    const tab = tabs.find((t) => t.id === activeTabId);
    getExecutionClient().execute(text, { url: tab?.url || undefined, tabId: tab?.id });
    startTransition(() => setStreamText(''));

    let pageContext = '';
    if (activeTabId && tab?.url && !isNewTabUrl(tab.url)) {
      let snippet = getPageSnippet(activeTabId);
      if (!snippet?.text || Date.now() - snippet.fetchedAt > 90_000) {
        await fetchNativePageSnippet(activeTabId);
        snippet = getPageSnippet(activeTabId);
      }
      pageContext = buildPageContextBlock(snippet);
    }

    try {
      const reply = await llmRef.current!.generate(text, {
        language: lang,
        pageContext: pageContext || undefined,
        onToken: (token) => {
          startTransition(() => setStreamText((prev) => prev + token));
        },
      });
      startTransition(() => {
        setStreamText('');
        messagesRef.current?.addRegen(reply);
        setCompanionEmotion('happy', { revertMs: 1500, revertTo: 'idle' });
      });
      if (loadCompanionConfig().voiceEnabled) {
        voiceRef.current?.speak(reply, lang);
      }
    } catch (e) {
      companionDebug.log(`llm: ${e instanceof Error ? e.message : String(e)}`);
      startTransition(() => setStreamText(''));
    }
  }, []);

  sendMessageRef.current = sendMessage;

  const startWebVisionShare = useCallback(async () => {
    const v = visionRef.current;
    if (!v) return false;
    const ok = await v.ensureDisplayMediaStream();
    startTransition(() => setVisionSharing(!!ok));
    return !!ok;
  }, []);

  const stopWebVisionShare = useCallback(() => {
    visionRef.current?.stopDisplayMedia();
    startTransition(() => setVisionSharing(false));
  }, []);

  const [responseLanguage, setLangState] = useState(() => loadCompanionConfig().responseLanguage);
  const [visionEnabled, setVisionEnabled] = useState(() => loadCompanionConfig().visionEnabled);

  useEffect(() => {
    const on = () => {
      setLangState(loadCompanionConfig().responseLanguage);
      setVisionEnabled(loadCompanionConfig().visionEnabled);
    };
    window.addEventListener('regen:companion-config', on);
    return () => window.removeEventListener('regen:companion-config', on);
  }, []);

  const setResponseLanguage = useCallback((value: string) => {
    saveCompanionConfig({ responseLanguage: value });
    setLangState(value);
  }, []);

  const startListening = useCallback(() => {
    if (!VoiceHandler.isSupported()) return;
    setIsListening(true);
    setCompanionEmotion('listening');
    voiceRef.current?.startListening();
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
    setCompanionEmotion('thinking', { revertMs: 800, revertTo: 'idle' });
    voiceRef.current?.stopListening();
  }, []);

  const stopSpeaking = useCallback(() => {
    voiceRef.current?.stopSpeaking();
  }, []);

  return {
    streamText,
    isListening,
    emotion,
    pending,
    bindMessages,
    sendMessage,
    startListening,
    stopListening,
    stopSpeaking,
    voiceSupported: VoiceHandler.isSupported(),
    visionSummary,
    visionSharing,
    startWebVisionShare,
    stopWebVisionShare,
    executionConnected,
    responseLanguage,
    setResponseLanguage,
    visionNeedsWebShare: !isTauriRuntime() && visionEnabled,
  };
}
