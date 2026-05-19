import React, { useEffect, useState } from 'react';
import { useTheme, THEMES } from '../../contexts/ThemeContext';
import {
  loadCompanionConfig,
  saveCompanionConfig,
  COMPANION_LANG_OPTIONS,
  type CompanionConfig,
} from '../../lib/companion/companionConfig';

export function CompanionSettingsSection() {
  const { resolvedTheme } = useTheme();
  const T = THEMES[resolvedTheme];
  const [cfg, setCfg] = useState<CompanionConfig>(() => loadCompanionConfig());

  useEffect(() => {
    const onCfg = () => setCfg(loadCompanionConfig());
    window.addEventListener('regen:companion-config', onCfg);
    return () => window.removeEventListener('regen:companion-config', onCfg);
  }, []);

  const update = (patch: Partial<CompanionConfig>) => {
    setCfg(saveCompanionConfig(patch));
  };

  return (
    <div className="space-y-4 text-sm">
      <p style={{ color: T.textMuted }}>Avatar, voice, vision, and local LLM — changes apply without restart.</p>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={cfg.visionEnabled} onChange={(e) => update({ visionEnabled: e.target.checked })} />
        <span style={{ color: T.textMuted }}>Enable screen vision</span>
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={cfg.voiceEnabled} onChange={(e) => update({ voiceEnabled: e.target.checked })} />
        <span style={{ color: T.textMuted }}>Enable voice input & TTS</span>
      </label>

      <label className="block">
        <span className="text-xs mb-1 block" style={{ color: T.textDim }}>TTS voice</span>
        <select
          value={cfg.ttsVoiceGender}
          onChange={(e) => update({ ttsVoiceGender: e.target.value as CompanionConfig['ttsVoiceGender'] })}
          className="w-full px-3 py-2 rounded-lg"
          style={{ background: T.inputBg, color: T.text, border: `1px solid ${T.border}` }}
        >
          <option value="default">System default</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>
      </label>

      <label className="block">
        <span className="text-xs mb-1 block" style={{ color: T.textDim }}>
          Vision interval ({cfg.visionIntervalMs}ms)
        </span>
        <input
          type="range"
          min={1000}
          max={10000}
          step={500}
          value={cfg.visionIntervalMs}
          onChange={(e) => update({ visionIntervalMs: Number(e.target.value) })}
          className="w-full"
        />
      </label>

      <label className="block">
        <span className="text-xs mb-1 block" style={{ color: T.textDim }}>LLM model</span>
        <select
          value={cfg.llmModel}
          onChange={(e) => update({ llmModel: e.target.value })}
          className="w-full px-3 py-2 rounded-lg"
          style={{ background: T.inputBg, color: T.text, border: `1px solid ${T.border}` }}
        >
          <option value="phi3:mini">phi3:mini</option>
          <option value="phi3:latest">phi3:latest</option>
          <option value="mistral">mistral</option>
        </select>
      </label>

      <label className="block">
        <span className="text-xs mb-1 block" style={{ color: T.textDim }}>Vision (VLM) model</span>
        <select
          value={cfg.visionModel}
          onChange={(e) => update({ visionModel: e.target.value })}
          className="w-full px-3 py-2 rounded-lg"
          style={{ background: T.inputBg, color: T.text, border: `1px solid ${T.border}` }}
        >
          <option value="llava:7b">llava:7b</option>
          <option value="llava:latest">llava:latest</option>
          <option value="llava-phi3:latest">llava-phi3:latest</option>
          <option value="moondream:latest">moondream:latest</option>
        </select>
      </label>

      <label className="block">
        <span className="text-xs mb-1 block" style={{ color: T.textDim }}>Speech & response language</span>
        <select
          value={cfg.responseLanguage}
          onChange={(e) => update({ responseLanguage: e.target.value })}
          className="w-full px-3 py-2 rounded-lg"
          style={{ background: T.inputBg, color: T.text, border: `1px solid ${T.border}` }}
        >
          {COMPANION_LANG_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
