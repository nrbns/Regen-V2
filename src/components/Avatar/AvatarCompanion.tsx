import React, { memo, useEffect, useState, useCallback, useRef } from 'react';
import type { AvatarEmotion } from '../../lib/companion/companionConfig';
import { COMPANION_LANG_OPTIONS } from '../../lib/companion/companionConfig';
import { companionDebug } from '../../lib/companion/companionDebug';
import {
  AVATAR_CSS,
  AVATAR_SIZES,
  EMOTION_COLORS,
  EMOTION_GLOW,
  type AvatarMode,
} from './avatarStyles';

export type { AvatarMode };

/** Voice, VLM, multilingual STT/TTS, execution — wired from `useBrowserCompanion` */
export type AvatarLiveChrome = {
  voiceSupported: boolean;
  isListening: boolean;
  streamText: string;
  visionSummary: string;
  visionSharing: boolean;
  visionNeedsWebShare: boolean;
  executionConnected: boolean;
  responseLanguage: string;
  onResponseLanguageChange: (v: string) => void;
  onMicDown: () => void;
  onMicUp: () => void;
  onStopSpeaking: () => void;
  onVisionShare?: () => void | Promise<boolean>;
  onVisionStop?: () => void;
};

type Props = {
  mode?: AvatarMode;
  emotion?: AvatarEmotion;
  accent?: string;
  /** Override width/height (optional) */
  size?: number;
  onClick?: () => void;
  showStatusDot?: boolean;
  autoRevertMs?: number;
  imageSrc?: string;
  className?: string;
  /** Live orchestration: mic, language, vision (VLM), execution status */
  live?: AvatarLiveChrome | null;
  /** Fewer controls (e.g. side panel) */
  liveCompact?: boolean;
};

function AvatarCompanionInner({
  mode = 'general',
  emotion: emotionProp = 'idle',
  accent,
  size,
  onClick,
  showStatusDot = true,
  autoRevertMs = 0,
  imageSrc = '/images/character-half.png',
  className = '',
  live = null,
  liveCompact = false,
}: Props) {
  const dims = AVATAR_SIZES[mode];
  const w = size ?? dims.width;
  const h = size ? Math.round(size * 1.15) : dims.height;

  const [displayEmotion, setDisplayEmotion] = useState<AvatarEmotion>(emotionProp);
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const glowColor = accent || EMOTION_COLORS[displayEmotion];

  const updateEmotion = useCallback(
    (e: AvatarEmotion, opts?: { autoRevert?: boolean }) => {
      setDisplayEmotion(e);
      companionDebug.patch({ emotion: e });
      if (revertTimer.current) clearTimeout(revertTimer.current);
      const ms = opts?.autoRevert === false ? 0 : autoRevertMs;
      if (ms > 0 && e !== 'idle') {
        revertTimer.current = setTimeout(() => setDisplayEmotion('idle'), ms);
      }
    },
    [autoRevertMs]
  );

  const getEmotion = useCallback(() => displayEmotion, [displayEmotion]);

  useEffect(() => {
    window.avatarCompanion = { updateEmotion, getEmotion };
    return () => {
      if (window.avatarCompanion?.updateEmotion === updateEmotion) {
        delete window.avatarCompanion;
      }
      if (revertTimer.current) clearTimeout(revertTimer.current);
    };
  }, [updateEmotion, getEmotion]);

  useEffect(() => {
    setDisplayEmotion(emotionProp);
    companionDebug.patch({ emotion: emotionProp });
  }, [emotionProp]);

  const thinking = displayEmotion === 'thinking';
  const animClass =
    displayEmotion === 'listening'
      ? 'regen-avatar-img--listening'
      : displayEmotion === 'thinking'
        ? 'regen-avatar-img--thinking'
        : displayEmotion === 'speaking'
          ? 'regen-avatar-img--speaking'
          : displayEmotion === 'happy'
            ? 'regen-avatar-img--happy'
            : displayEmotion === 'noticing'
              ? 'regen-avatar-img--noticing'
              : '';

  const wrapClass = `regen-avatar-wrap relative flex flex-col items-center justify-center border-0 bg-transparent p-0 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`;
  const wrapStyle = { width: w, height: h, transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' };

  const inner = (
    <>
        {/* Radial glow */}
        <span
          className="absolute inset-0 pointer-events-none rounded-full"
          style={{
            background: EMOTION_GLOW[displayEmotion],
            transition: 'background 0.4s ease',
            transform: 'scale(1.15)',
          }}
        />

        {/* Thinking dots — above head */}
        {thinking && mode !== 'compact' && (
          <div
            className="absolute flex gap-1.5 pointer-events-none"
            style={{ top: mode === 'general' ? 8 : 0, left: '50%', transform: 'translateX(-50%)' }}
            aria-hidden
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: EMOTION_COLORS.thinking,
                  animation: `regen-dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        )}

        <img
          src={imageSrc}
          alt="Regen AI"
          draggable={false}
          className={`object-contain drop-shadow-lg regen-avatar-img ${animClass}`}
          style={{
            width: w * 0.92,
            height: h * 0.92,
            pointerEvents: 'none',
            transition: 'filter 0.4s ease, opacity 0.4s ease',
            filter:
              displayEmotion === 'happy'
                ? 'brightness(1.08)'
                : displayEmotion === 'listening'
                  ? 'brightness(1.04)'
                  : undefined,
          }}
        />

        {/* Status dot — bottom right */}
        {showStatusDot && mode !== 'compact' && (
          <span
            className="absolute pointer-events-none rounded-full"
            style={{
              width: mode === 'general' ? 28 : 20,
              height: mode === 'general' ? 28 : 20,
              bottom: mode === 'general' ? 24 : 12,
              right: mode === 'general' ? 16 : 8,
              background: glowColor,
              boxShadow: `0 0 15px ${glowColor}88`,
              animation: displayEmotion !== 'idle' ? 'regen-status-pulse 2s ease-in-out infinite' : undefined,
              transition: 'background 0.2s ease, box-shadow 0.2s ease',
            }}
          />
        )}
    </>
  );

  const showOverlay = !!(live && !liveCompact && mode !== 'compact');
  const showStack = !!(live && liveCompact);

  const liveControls = (placement: 'overlay' | 'stack') => {
    if (!live) return null;
    const box =
      placement === 'overlay'
        ? `pointer-events-auto absolute bottom-2 left-1 right-1 flex flex-col gap-1 rounded-lg border border-white/10 bg-black/55 px-2 py-1.5 backdrop-blur-md text-[10px] max-h-[120px]`
        : `pointer-events-auto flex w-full flex-col gap-1 rounded-lg border border-white/10 bg-black/55 px-2 py-1.5 backdrop-blur-md text-[9px]`;
    return (
      <div
        className={box}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-1 text-white/70">
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: live.executionConnected ? '#4ade80' : '#64748b' }}
              title={live.executionConnected ? 'Execution WS live' : 'Execution offline'}
            />
            {placement === 'overlay' ? (
              <span>{live.executionConnected ? 'Orchestration' : 'Local'}</span>
            ) : null}
          </span>
          {live.streamText ? (
            <span className="max-w-[70%] truncate text-emerald-200/90" title={live.streamText}>
              {live.streamText}
            </span>
          ) : null}
        </div>
        {placement === 'overlay' && live.visionSummary ? (
          <p className="line-clamp-2 text-white/55" title={live.visionSummary}>
            VLM: {live.visionSummary}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-1">
          <select
            value={live.responseLanguage}
            onChange={(e) => live.onResponseLanguageChange(e.target.value)}
            className="max-w-[92px] rounded border border-white/15 bg-black/40 px-1 py-0.5 text-[9px] text-white/90"
            aria-label="Speech language"
          >
            {COMPANION_LANG_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {live.voiceSupported ? (
            <button
              type="button"
              className={`rounded px-2 py-0.5 font-medium ${
                live.isListening ? 'bg-amber-500/40 text-amber-100' : 'bg-white/10 text-white/90'
              }`}
              onMouseDown={live.onMicDown}
              onMouseUp={live.onMicUp}
              onMouseLeave={live.onMicUp}
              onTouchStart={live.onMicDown}
              onTouchEnd={live.onMicUp}
            >
              Mic
            </button>
          ) : (
            <span className="text-white/40">No STT</span>
          )}
          <button
            type="button"
            className="rounded bg-white/10 px-2 py-0.5 text-white/80"
            onClick={live.onStopSpeaking}
          >
            Stop
          </button>
          {live.visionNeedsWebShare && live.onVisionShare && live.onVisionStop ? (
            <button
              type="button"
              className={`rounded px-2 py-0.5 ${live.visionSharing ? 'bg-violet-500/50 text-white' : 'bg-white/10 text-white/80'}`}
              onClick={() => {
                if (live.visionSharing) live.onVisionStop?.();
                else void live.onVisionShare?.();
              }}
            >
              {live.visionSharing ? 'Screen' : 'Share'}
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  if (showStack) {
    return (
      <>
        <style>{AVATAR_CSS}</style>
        <div className={`flex flex-col items-center gap-1 ${className}`}>
          <div className="relative" style={{ width: w, height: h }}>
            {onClick ? (
              <button
                type="button"
                onClick={onClick}
                className={`${wrapClass} h-full w-full`}
                style={{ ...wrapStyle, width: '100%', height: '100%' }}
                aria-label={`Regen avatar — ${displayEmotion}`}
              >
                {inner}
              </button>
            ) : (
              <div className={`${wrapClass} h-full w-full`} style={{ ...wrapStyle, width: '100%', height: '100%' }}>
                {inner}
              </div>
            )}
          </div>
          {liveControls('stack')}
        </div>
      </>
    );
  }

  return (
    <>
      <style>{AVATAR_CSS}</style>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={`${wrapClass} relative`}
          style={wrapStyle}
          aria-label={`Regen avatar — ${displayEmotion}`}
        >
          {inner}
          {showOverlay ? liveControls('overlay') : null}
        </button>
      ) : (
        <div className={`${wrapClass} relative`} style={wrapStyle}>
          {inner}
          {showOverlay ? liveControls('overlay') : null}
        </div>
      )}
    </>
  );
}

export const AvatarCompanion = memo(AvatarCompanionInner);
