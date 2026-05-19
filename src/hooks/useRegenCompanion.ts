import { useCallback, useRef, useState } from 'react';
import { VoiceHandler } from '../lib/voice/voiceHandler';
import { useExecutionStore } from '../state/executionStore';

export function useRegenCompanion() {
  const run = useExecutionStore((s) => s.run);
  const [listening, setListening] = useState(false);
  const voiceRef = useRef<VoiceHandler | null>(null);

  const startListening = useCallback(() => {
    if (!voiceRef.current) {
      voiceRef.current = new VoiceHandler({
        onTranscript: (text, _lang, isFinal) => {
          if (isFinal && text) run(text);
        },
      });
    }
    setListening(true);
    voiceRef.current.startListening();
  }, [run]);

  const stopListening = useCallback(() => {
    voiceRef.current?.stopListening();
    setListening(false);
  }, []);

  return {
    listening,
    voiceSupported: VoiceHandler.isSupported(),
    startListening,
    stopListening,
  };
}
