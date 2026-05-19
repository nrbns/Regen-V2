import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrowserCompanion } from '../../hooks/useBrowserCompanion';
import { useShellBrowser } from '../../hooks/useShellBrowser';
import { AvatarCompanion, type AvatarLiveChrome } from '../Avatar/AvatarCompanion';
import { CompanionErrorBoundary } from '../companion/CompanionErrorBoundary';
import { CompanionDebugPanel } from '../companion/CompanionDebugPanel';
import { RealtimeWebPane } from './RealtimeWebPane';
import { SearchResultsPane } from './SearchResultsPane';
import { LiveBadge } from '../workspace/LiveBadge';
import { TimelineLite } from '../workspace/TimelineLite';
import { ThoughtLite } from '../workspace/ThoughtLite';
import { displayUrlBar, isSearchTabUrl, getSearchQueryFromUrl } from '../../lib/browser/normalizeUrl';
import { useTabsStore } from '../../state/tabsStore';
import type { AvatarEmotion } from '../../lib/companion/companionConfig';

type AvatarState = "dormant" | "watching" | "noticing" | "thinking" | "speaking" | "rebuilding";
type BrowserMode = "normal" | "focus" | "research" | "trade" | "creative" | "threat";
type AvatarPosition = "orb" | "panel" | "hud" | "chrome";
type PageRebuildStyle = "none" | "reader" | "cards" | "dense" | "visual";

interface AvatarMessage {
  id: string;
  role: "user" | "regen";
  text: string;
  lang?: string;
  ts: number;
}

interface PageContext {
  title: string;
  domain: string;
  contentType: "article" | "app" | "video" | "shop" | "docs" | "unknown";
  rebuildStyle: PageRebuildStyle;
  accentColor: string;
}

// ─── MOCK PAGES ───────────────────────────────────────────────────────────────

const MOCK_PAGES: Record<string, PageContext> = {
  "news.example.com": { title: "Breaking: AI reshapes browsing forever", domain: "news.example.com", contentType: "article", rebuildStyle: "reader", accentColor: "#E24B4A" },
  "github.com": { title: "ggerganov/whisper.cpp", domain: "github.com", contentType: "docs", rebuildStyle: "dense", accentColor: "#378ADD" },
  "figma.com": { title: "Regen UI Design System", domain: "figma.com", contentType: "app", rebuildStyle: "visual", accentColor: "#D4537E" },
  "tradingview.com": { title: "BTC/USD Chart", domain: "tradingview.com", contentType: "app", rebuildStyle: "dense", accentColor: "#1D9E75" },
  "amazon.in": { title: "Laptops under ₹50,000", domain: "amazon.in", contentType: "shop", rebuildStyle: "cards", accentColor: "#EF9F27" },
};

const AVATAR_MESSAGES_BY_CONTEXT: Record<string, string[]> = {
  article: ["I've rebuilt this as a clean reader. Want me to summarize?", "Reading time: ~4 min. Shall I extract the key points?"],
  shop: ["I found 3 cheaper alternatives. Want me to compare them?", "Price drop alert: this was ₹8k cheaper last week."],
  app: ["I can see you're designing. Want me to critique the layout?", "Your Figma file has 3 detached components I can fix."],
  docs: ["This repo has 847 open issues. Want a summary of the critical ones?"],
  trade: ["BTC showing bullish divergence on 4H. Shall I pull latest news?"],
  unknown: ["I'm watching. Tell me what to do."],
};

// ─── HELPER: animated gradient text ──────────────────────────────────────────

function GlowText({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{ color, filter: `drop-shadow(0 0 6px ${color}66)`, transition: "color 0.6s" }}>
      {children}
    </span>
  );
}

// ─── NEW TAB PAGE ─────────────────────────────────────────────────────────────

function NewTabPage({
  onNavigate,
  avatarLive,
  companionEmotion,
}: {
  onNavigate: (url: string) => void;
  avatarLive: AvatarLiveChrome;
  companionEmotion: AvatarEmotion;
}) {
  const shortcuts = [
    { label: "GitHub", url: "github.com", icon: "⬡", color: "#378ADD" },
    { label: "TradingView", url: "tradingview.com", icon: "📈", color: "#1D9E75" },
    { label: "Figma", url: "figma.com", icon: "✦", color: "#D4537E" },
    { label: "Amazon", url: "amazon.in", icon: "◈", color: "#EF9F27" },
  ];

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 40, padding: 40,
      background: "var(--bg-deep)",
    }}>
      <AvatarCompanion mode="general" emotion={companionEmotion} autoRevertMs={2000} live={avatarLive} />

      {/* Regen wordmark */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: 52, fontWeight: 400, letterSpacing: "-2px",
          color: "var(--text-primary)", lineHeight: 1,
          marginBottom: 8,
        }}>
          Re<GlowText color="var(--accent)">gen</GlowText>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", letterSpacing: "0.12em" }}>
          your browser. your companion.
        </div>
      </div>

      {/* Command bar */}
      <div style={{
        width: "100%", maxWidth: 560,
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 16, padding: "14px 20px",
        display: "flex", alignItems: "center", gap: 12,
        cursor: "text",
      }}
        onClick={() => onNavigate("amazon.in")}
      >
        <span style={{ fontSize: 16, opacity: 0.4 }}>⬡</span>
        <span style={{ fontSize: 14, color: "var(--text-muted)", flex: 1 }}>
          Search or tell Regen what to do…
        </span>
        <kbd style={{
          fontSize: 11, color: "var(--text-muted)", opacity: 0.5,
          border: "1px solid var(--border)", borderRadius: 6, padding: "2px 6px",
        }}>⌘K</kbd>
      </div>

      {/* Shortcuts */}
      <div style={{ display: "flex", gap: 16 }}>
        {shortcuts.map(s => (
          <button key={s.url} onClick={() => onNavigate(s.url)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            background: "var(--surface-2)", border: "1px solid var(--border)",
            borderRadius: 14, padding: "16px 20px", cursor: "pointer",
            transition: "all 0.2s", minWidth: 80,
            color: "var(--text-secondary)",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = s.color;
              (e.currentTarget as HTMLElement).style.color = s.color;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
            }}
          >
            <span style={{ fontSize: 22 }}>{s.icon}</span>
            <span style={{ fontSize: 11 }}>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── PAGE VIEWER (mock webpage with AI rebuild) ───────────────────────────────

function PageViewer({ url, rebuildStyle, accentColor }: {
  url: string; rebuildStyle: PageRebuildStyle; accentColor: string;
}) {
  const ctx = MOCK_PAGES[url];

  if (!ctx) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
      Loading {url}…
    </div>
  );

  if (rebuildStyle === "reader") return (
    <div style={{ flex: 1, overflowY: "auto", padding: "40px 0", background: "var(--bg-deep)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px" }}>
        <div style={{
          fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em",
          color: accentColor, marginBottom: 16,
        }}>
          AI Reader Mode — rebuilt by Regen
        </div>
        <h1 style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: 32, fontWeight: 400, color: "var(--text-primary)",
          lineHeight: 1.3, marginBottom: 20,
        }}>{ctx.title}</h1>
        <div style={{ display: "flex", gap: 16, marginBottom: 32, fontSize: 12, color: "var(--text-muted)" }}>
          <span>{ctx.domain}</span>
          <span>·</span>
          <span style={{ color: accentColor }}>4 min read</span>
          <span>·</span>
          <span>Key points extracted</span>
        </div>
        {["The landscape of AI-powered browsing is shifting dramatically, with new tools offering unprecedented levels of personalization.", "Unlike traditional browsers that simply display content, next-generation platforms like Regen actively rebuild page layouts to match user context and preferences.", "Local AI models running entirely on-device ensure privacy while delivering real-time intelligence without cloud dependency."].map((p, i) => (
          <p key={i} style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text-secondary)", marginBottom: 20 }}>{p}</p>
        ))}
      </div>
    </div>
  );

  if (rebuildStyle === "cards") return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "var(--bg-deep)" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: accentColor, marginBottom: 20 }}>
        AI Card Mode — rebuilt by Regen
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {["MacBook Air M3", "Dell XPS 13", "ASUS Zenbook 14", "Lenovo ThinkPad X1", "HP Spectre x360", "Acer Swift 5"].map((item, i) => (
          <div key={i} style={{
            background: "var(--surface-2)", border: "1px solid var(--border)",
            borderRadius: 14, padding: 16, cursor: "pointer",
          }}>
            <div style={{
              height: 80, background: "var(--surface-3)", borderRadius: 8,
              marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, color: "var(--text-muted)",
            }}>⬡</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>{item}</div>
            <div style={{ fontSize: 12, color: accentColor }}>₹{(42 + i * 3).toFixed(0)},999</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (rebuildStyle === "dense") return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "var(--bg-deep)", fontFamily: "var(--font-mono)" }}>
      <div style={{ fontSize: 11, color: accentColor, marginBottom: 16 }}>// AI Dense Mode — rebuilt by Regen</div>
      {["main.py", "README.md", "requirements.txt", "src/inference.cpp", "models/ggml-base.bin", "tests/test_transcribe.py"].map((f, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 12, padding: "8px 0",
          borderBottom: "1px solid var(--border)", fontSize: 12, color: "var(--text-secondary)",
        }}>
          <span style={{ color: "var(--text-muted)", minWidth: 20 }}>{i + 1}</span>
          <span style={{ color: accentColor }}>⬡</span>
          <span style={{ flex: 1, color: "var(--text-primary)" }}>{f}</span>
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{(Math.random() * 100 | 0)}kb</span>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
      {ctx.title}
    </div>
  );
}

// ─── AVATAR ORBS ─────────────────────────────────────────────────────────────

function AvatarOrb({ state, color, onClick, pulse }: {
  state: AvatarState; color: string; onClick: () => void; pulse: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      width: 40, height: 40, borderRadius: "50%",
      border: `1.5px solid ${color}`,
      background: "transparent",
      cursor: "pointer", position: "relative",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "border-color 0.4s",
    }}>
      {/* Pulse ring */}
      {pulse && (
        <span style={{
          position: "absolute", inset: -5, borderRadius: "50%",
          border: `1px solid ${color}44`,
          animation: "orbPulse 2s ease-in-out infinite",
        }} />
      )}
      {/* Inner dot */}
      <span style={{
        width: 10, height: 10, borderRadius: "50%",
        background: color,
        transition: "background 0.4s, transform 0.3s",
        transform: state === "thinking" ? "scale(0.6)" : state === "speaking" ? "scale(1.2)" : "scale(1)",
        animation: state === "thinking" ? "orbBlink 0.8s ease-in-out infinite" : "none",
      }} />
    </button>
  );
}

function emotionToOrbState(e: AvatarEmotion): AvatarState {
  if (e === 'listening') return 'speaking';
  if (e === 'happy') return 'watching';
  if (e === 'noticing') return 'noticing';
  if (e === 'thinking') return 'thinking';
  if (e === 'speaking') return 'speaking';
  return 'watching';
}

// ─── MAIN BROWSER SHELL ───────────────────────────────────────────────────────

function domainLabel(url: string): string {
  if (isSearchTabUrl(url)) return 'search';
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0] || 'page';
  }
}

function RegenBrowserShellInner() {
  const routerNavigate = useNavigate();
  const companion = useBrowserCompanion();
  const browser = useShellBrowser();

  const avatarLive: AvatarLiveChrome = useMemo(
    () => ({
      voiceSupported: companion.voiceSupported,
      isListening: companion.isListening,
      streamText: companion.streamText,
      visionSummary: companion.visionSummary,
      visionSharing: companion.visionSharing,
      visionNeedsWebShare: companion.visionNeedsWebShare,
      executionConnected: companion.executionConnected,
      responseLanguage: companion.responseLanguage,
      onResponseLanguageChange: companion.setResponseLanguage,
      onMicDown: companion.startListening,
      onMicUp: companion.stopListening,
      onStopSpeaking: companion.stopSpeaking,
      onVisionShare: companion.startWebVisionShare,
      onVisionStop: companion.stopWebVisionShare,
    }),
    [
      companion.voiceSupported,
      companion.isListening,
      companion.streamText,
      companion.visionSummary,
      companion.visionSharing,
      companion.visionNeedsWebShare,
      companion.executionConnected,
      companion.responseLanguage,
      companion.setResponseLanguage,
      companion.startListening,
      companion.stopListening,
      companion.stopSpeaking,
      companion.startWebVisionShare,
      companion.stopWebVisionShare,
    ]
  );
  const [urlInput, setUrlInput] = useState("");
  const [avatarState, setAvatarState] = useState<AvatarState>("watching");
  const [avatarPos, setAvatarPos] = useState<AvatarPosition>("orb");
  const [browserMode, setBrowserMode] = useState<BrowserMode>("normal");
  const [messages, setMessages] = useState<AvatarMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [rebuildStyle, setRebuildStyle] = useState<PageRebuildStyle>("none");
  const [accentColor, setAccentColor] = useState("#7F77DD");
  const [showCommandBar, setShowCommandBar] = useState(false);
  const [pageCtx, setPageCtx] = useState<PageContext | null>(null);
  const [hudMessage, setHudMessage] = useState("");
  const [chromeAdapted, setChromeAdapted] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  const orbState = avatarState === 'rebuilding' ? avatarState : emotionToOrbState(companion.emotion);
  const activeTab = browser.activeTab;

  useEffect(() => {
    setUrlInput(displayUrlBar(browser.activeUrl));
  }, [browser.activeUrl, browser.activeTabId]);

  const addRegenMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'regen', text, ts: Date.now() }]);
    setTimeout(() => messagesRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }), 50);
  }, []);

  // ─── PAGE NAVIGATION (real URLs via tabsStore) ───────────────────────────────

  const navigateTo = useCallback((input: string) => {
    const bar = browser.navigate(input);
    setUrlInput(bar);

    const st = useTabsStore.getState();
    const tab = st.tabs.find((t) => t.id === st.activeTabId);
    const activeUrlNow = tab?.url ?? '';

    const clean = input.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const ctx = MOCK_PAGES[clean];
    if (ctx) {
      setPageCtx(ctx);
      setAccentColor(ctx.accentColor);
      setChromeAdapted(true);
      setTimeout(() => {
        setAvatarState('rebuilding');
        setRebuildStyle(ctx.rebuildStyle);
        const msgs = AVATAR_MESSAGES_BY_CONTEXT[ctx.contentType] ?? AVATAR_MESSAGES_BY_CONTEXT.unknown;
        const msg = msgs[Math.floor(Math.random() * msgs.length)];
        setHudMessage(msg);
        setTimeout(() => setHudMessage(''), 4000);
        setTimeout(() => {
          setAvatarState('watching');
          addRegenMessage(msg);
        }, 800);
      }, 400);
    } else if (isSearchTabUrl(activeUrlNow)) {
      const sq = getSearchQueryFromUrl(activeUrlNow) ?? '';
      setPageCtx({
        title: sq ? `Results: ${sq}` : 'Search',
        domain: 'Regen Search',
        contentType: 'article',
        rebuildStyle: 'none',
        accentColor: '#F5A623',
      });
      setRebuildStyle('none');
      setChromeAdapted(true);
      setAccentColor('#F5A623');
    } else if (activeUrlNow && activeUrlNow !== 'regen://newtab') {
      setPageCtx({
        title: tab?.title || domainLabel(activeUrlNow),
        domain: domainLabel(activeUrlNow),
        contentType: 'unknown',
        rebuildStyle: 'none',
        accentColor: '#7F77DD',
      });
      setRebuildStyle('none');
      setChromeAdapted(true);
      setAccentColor('#7F77DD');
    } else {
      setPageCtx(null);
      setRebuildStyle('none');
      setChromeAdapted(false);
      setAccentColor('#7F77DD');
    }
  }, [addRegenMessage, browser]);

  useEffect(() => {
    companion.bindMessages({
      addUser: (text) => {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', text, ts: Date.now() }]);
        setTimeout(() => messagesRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }), 50);
      },
      addRegen: addRegenMessage,
    });
  }, [companion.bindMessages, addRegenMessage]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setInputText('');
      await companion.sendMessage(text);
    },
    [companion.sendMessage]
  );

  const addTab = () => {
    browser.addTab();
    setRebuildStyle('none');
    setChromeAdapted(false);
    setAccentColor('#7F77DD');
    setUrlInput('');
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    browser.closeTab(id);
  };

  const selectTab = (id: string) => {
    browser.switchTab(id);
    const tab = browser.tabs.find((t) => t.id === id);
    if (tab?.url) setUrlInput(displayUrlBar(tab.url));
    else setUrlInput('');
  };

  const reloadPage = () => {
    const u = activeTab?.url;
    if (!u || browser.isNewTab) return;
    if (isSearchTabUrl(u)) {
      import('../../state/searchStore').then(({ useSearchStore }) => {
        useSearchStore.getState().clear();
        browser.navigate(getSearchQueryFromUrl(u) ?? '');
      });
      return;
    }
    browser.navigate(u);
  };

  // Keyboard shortcut
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === " ") {
        e.preventDefault();
        setAvatarPos(p => p === "orb" ? "panel" : "orb");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandBar(v => !v);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const modes: BrowserMode[] = ["normal", "focus", "research", "trade", "creative", "threat"];
  const modeColors: Record<BrowserMode, string> = {
    normal: "#7F77DD", focus: "#1D9E75", research: "#378ADD",
    trade: "#EF9F27", creative: "#D4537E", threat: "#E24B4A",
  };

  const currentAccent = chromeAdapted ? accentColor : modeColors[browserMode];

  return (
    <div style={{
      width: "100%", height: "100vh", minHeight: 600,
      display: "flex", flexDirection: "column",
      background: "var(--bg-deep, #0d0d0f)",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      position: "relative", overflow: "hidden",
      "--accent": currentAccent,
      "--bg-deep": "#0d0d0f",
      "--surface-1": "#141417",
      "--surface-2": "#1a1a1f",
      "--surface-3": "#222228",
      "--border": "#ffffff14",
      "--text-primary": "#f0eeea",
      "--text-secondary": "#a09e98",
      "--text-muted": "#5a5856",
      "--font-mono": "'JetBrains Mono', monospace",
    } as React.CSSProperties}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display&display=swap');
        @keyframes orbPulse { 0%,100%{transform:scale(1);opacity:.5} 50%{transform:scale(1.2);opacity:.15} }
        @keyframes orbBlink { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes slideIn { from{opacity:0;transform:translateX(12px)} to{opacity:1;transform:translateX(0)} }
        @keyframes hudIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { from{background-position:200%} to{background-position:-200%} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
        button { background: none; border: none; cursor: pointer; }
        input { outline: none; background: none; border: none; color: var(--text-primary); }
      `}</style>

      {/* ── CHROME TOP: Tab bar ─────────────────────────────────────────── */}
      <div style={{
        height: 42,
        background: "var(--surface-1)",
        borderBottom: `1px solid ${currentAccent}22`,
        display: "flex", alignItems: "center",
        padding: "0 8px", gap: 2,
        transition: "border-color 0.6s",
        flexShrink: 0,
      }}>
        {/* Window controls */}
        <div style={{ display: "flex", gap: 5, marginRight: 12, flexShrink: 0 }}>
          {["#E24B4A", "#EF9F27", "#1D9E75"].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.8 }} />
          ))}
        </div>

        {/* Tabs */}
        <div style={{ flex: 1, display: "flex", gap: 2, overflow: "hidden" }}>
          {browser.tabs.map(tab => {
            const isActive = tab.id === browser.activeTabId;
            return (
            <button key={tab.id} onClick={() => selectTab(tab.id)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "0 12px", height: 32, borderRadius: "8px 8px 0 0",
              background: isActive ? "var(--surface-2)" : "transparent",
              border: isActive ? `1px solid ${currentAccent}33` : "1px solid transparent",
              borderBottom: isActive ? "1px solid var(--surface-2)" : "1px solid transparent",
              color: isActive ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: 12, maxWidth: 180, flexShrink: 0,
              transition: "all 0.2s",
            }}>
              <span style={{ fontSize: 10 }}>⬡</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tab.title || 'New Tab'}
              </span>
              {tab.isLoading && (
                <span style={{
                  fontSize: 9, padding: "1px 5px", borderRadius: 4,
                  background: currentAccent + "22", color: currentAccent,
                }}>
                  …
                </span>
              )}
              <span onClick={(e) => closeTab(tab.id, e)} style={{
                fontSize: 11, color: "var(--text-muted)", padding: "0 2px",
                opacity: 0.5, lineHeight: 1,
              }}>×</span>
            </button>
          );})}
          <button onClick={addTab} style={{
            width: 28, height: 28, borderRadius: 8,
            color: "var(--text-muted)", fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>+</button>
        </div>

        {/* Mode selector */}
        <div style={{ display: "flex", gap: 4, marginLeft: 8, flexShrink: 0 }}>
          {modes.map(m => (
            <button key={m} onClick={() => {
              if (m === 'research') { routerNavigate('/research'); return; }
              setBrowserMode(m);
            }} style={{
              padding: "3px 8px", borderRadius: 6, fontSize: 10,
              background: browserMode === m ? modeColors[m] + "22" : "transparent",
              color: browserMode === m ? modeColors[m] : "var(--text-muted)",
              border: `1px solid ${browserMode === m ? modeColors[m] + "44" : "transparent"}`,
              textTransform: "capitalize", transition: "all 0.2s",
            }}>{m}</button>
          ))}
        </div>
      </div>

      {/* ── CHROME: Address bar ─────────────────────────────────────────── */}
      <div style={{
        height: 46,
        background: "var(--surface-1)",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center",
        padding: "0 12px", gap: 10,
        flexShrink: 0,
      }}>
        {/* Nav buttons */}
        {["←", "→", "↻"].map((icon, i) => (
          <button key={i} onClick={i === 2 ? reloadPage : undefined} style={{
            width: 28, height: 28, borderRadius: 7,
            color: "var(--text-muted)", fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{icon}</button>
        ))}

        {/* URL bar */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 8,
          background: "var(--surface-2)",
          border: `1px solid ${currentAccent}33`,
          borderRadius: 10, padding: "0 12px", height: 32,
          transition: "border-color 0.4s",
        }}>
          {chromeAdapted && (
            <span style={{
              fontSize: 10, padding: "1px 6px", borderRadius: 4,
              background: currentAccent + "22", color: currentAccent,
              flexShrink: 0,
            }}>AI</span>
          )}
          <input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") navigateTo(urlInput); }}
            placeholder="Search or type a URL — or tell Regen what you need"
            style={{ flex: 1, fontSize: 13, color: "var(--text-secondary)" }}
          />
          {!browser.isNewTab && (
            <span style={{ fontSize: 10, color: currentAccent, flexShrink: 0, opacity: 0.8 }}>
              {browser.isRunning ? 'executing…' : browser.connected ? 'live' : 'offline'}
            </span>
          )}
        </div>

        {/* Avatar orb in chrome */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <AvatarOrb
            state={orbState}
            color={currentAccent}
            onClick={() => setAvatarPos(p => p === "panel" ? "orb" : "panel")}
            pulse={orbState !== "dormant"}
          />
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {orbState === "thinking" ? "thinking…" :
             orbState === "rebuilding" ? "rebuilding…" :
             orbState === "speaking" ? "speaking" :
             companion.emotion}
          </span>
        </div>
      </div>

      {/* ── MAIN AREA ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {/* Page content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
          {browser.isNewTab
            ? <NewTabPage onNavigate={navigateTo} avatarLive={avatarLive} companionEmotion={companion.emotion} />
            : activeTab && isSearchTabUrl(browser.activeUrl) ? (
              <SearchResultsPane
                url={browser.activeUrl}
                onOpenResult={(target) => navigateTo(target)}
              />
            ) : activeTab ? (
              <RealtimeWebPane
                tabId={activeTab.id}
                url={browser.activeUrl}
                onUrlChange={(u) => browser.updateTab(activeTab.id, { url: u })}
                onTitleChange={(t) => browser.updateTab(activeTab.id, { title: t })}
              />
            ) : null
          }

          {/* HUD overlay message */}
          {hudMessage && (
            <div style={{
              position: "absolute", top: 16, left: "50%",
              transform: "translateX(-50%)",
              background: "var(--surface-2)",
              border: `1px solid ${currentAccent}55`,
              borderRadius: 12, padding: "8px 16px",
              fontSize: 12, color: "var(--text-primary)",
              display: "flex", alignItems: "center", gap: 8,
              animation: "hudIn 0.3s ease",
              zIndex: 50, pointerEvents: "none",
              backdropFilter: "blur(8px)",
              maxWidth: 480, textAlign: "center",
            }}>
              <span style={{ color: currentAccent, fontSize: 14 }}>⬡</span>
              {hudMessage}
            </div>
          )}

          {/* Rebuild shimmer overlay */}
          {avatarState === "rebuilding" && (
            <div style={{
              position: "absolute", inset: 0,
              background: `linear-gradient(90deg, transparent, ${currentAccent}08, transparent)`,
              backgroundSize: "200% 100%",
              animation: "shimmer 0.8s ease-in-out",
              pointerEvents: "none", zIndex: 40,
            }} />
          )}
        </div>

        {/* ── AVATAR PANEL (right side) ───────────────────────────────── */}
        {avatarPos === "panel" && (
          <div style={{
            width: 300, flexShrink: 0,
            background: "var(--surface-1)",
            borderLeft: `1px solid ${currentAccent}33`,
            display: "flex", flexDirection: "column",
            animation: "slideIn 0.25s ease",
            transition: "border-color 0.6s",
          }}>
            {/* Panel header */}
            <div style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <AvatarCompanion mode="compact" emotion={companion.emotion} accent={currentAccent} onClick={() => {}} showStatusDot={false} live={avatarLive} liveCompact />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Regen</div>
                <div style={{ fontSize: 10, color: currentAccent, textTransform: "capitalize" }}>
                  {companion.emotion} · {browserMode} mode
                </div>
              </div>
              <LiveBadge />
              <button onClick={() => setAvatarPos("orb")} style={{ color: "var(--text-muted)", fontSize: 16 }}>×</button>
            </div>

            <div style={{ padding: '8px 12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <TimelineLite />
              <ThoughtLite />
            </div>

            {/* Page context card */}
            {(pageCtx || activeTab) && (
              <div style={{
                margin: "12px 12px 0",
                padding: "10px 12px",
                background: "var(--surface-2)",
                borderRadius: 10,
                borderLeft: `2px solid ${currentAccent}`,
              }}>
                <div style={{ fontSize: 10, color: currentAccent, marginBottom: 4 }}>
                  {pageCtx?.domain ?? domainLabel(activeTab?.url ?? '')} · {pageCtx?.contentType ?? 'live'} · {browser.connected ? 'ws live' : 'offline'}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {pageCtx?.title ?? activeTab?.title ?? 'Current page'}
                </div>
              </div>
            )}

            {/* Messages */}
            <div ref={messagesRef} style={{
              flex: 1, overflowY: "auto", padding: 12,
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              {messages.length === 0 && (
                <div style={{
                  marginTop: 24, textAlign: "center",
                  fontSize: 12, color: "var(--text-muted)", lineHeight: 1.8,
                }}>
                  I'm watching.<br />
                  Navigate to a page and I'll adapt.
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%", animation: "slideIn 0.2s ease",
                }}>
                  <div style={{
                    padding: "8px 12px",
                    borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "2px 12px 12px 12px",
                    background: msg.role === "user" ? currentAccent + "22" : "var(--surface-2)",
                    border: `1px solid ${msg.role === "user" ? currentAccent + "44" : "var(--border)"}`,
                    fontSize: 12, color: "var(--text-primary)", lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}>
                    {msg.role === "regen" && (
                      <span style={{ color: currentAccent, marginRight: 6, fontSize: 10 }}>⬡</span>
                    )}
                    {msg.text}
                  </div>
                </div>
              ))}
              {companion.streamText && (
                <div style={{
                  alignSelf: "flex-start", maxWidth: "88%",
                  padding: "8px 12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "2px 12px 12px 12px",
                  fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6,
                }}>
                  <span style={{ color: currentAccent, marginRight: 6, fontSize: 10 }}>⬡</span>
                  {companion.streamText}
                  <span style={{ animation: "orbBlink 0.8s infinite", color: currentAccent }}>▍</span>
                </div>
              )}
            </div>

            {/* Quick actions */}
            {pageCtx && (
              <div style={{
                padding: "8px 12px",
                display: "flex", flexWrap: "wrap", gap: 6,
                borderTop: "1px solid var(--border)",
              }}>
                {["Summarize", "Translate", "Compare", "Extract"].map(action => (
                  <button key={action} onClick={() => sendMessage(action.toLowerCase())} style={{
                    padding: "4px 10px", borderRadius: 20, fontSize: 11,
                    border: `1px solid ${currentAccent}44`,
                    color: currentAccent, transition: "all 0.15s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = currentAccent + "22")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{
              padding: "10px 12px",
              borderTop: "1px solid var(--border)",
              display: "flex", gap: 8, alignItems: "center",
            }}>
              <input
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") sendMessage(inputText); }}
                placeholder="Tell Regen…"
                style={{
                  flex: 1, fontSize: 12, color: "var(--text-primary)",
                  padding: "7px 10px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              {/* Mic */}
              <button
                onMouseDown={() => companion.startListening()}
                onMouseUp={() => companion.stopListening()}
                style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: companion.isListening ? currentAccent + "44" : "var(--surface-2)",
                  border: `1px solid ${currentAccent}44`,
                  color: currentAccent, fontSize: 13,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >🎤</button>
              <button onClick={() => sendMessage(inputText)} style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: inputText ? currentAccent : "var(--surface-2)",
                border: `1px solid ${inputText ? currentAccent : "var(--border)"}`,
                color: inputText ? "#fff" : "var(--text-muted)",
                fontSize: 14, transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>↑</button>
            </div>
          </div>
        )}

        {/* ── FLOATING ORB (when panel closed) ───────────────────────── */}
        {avatarPos === "orb" && (
          <div style={{
            position: "absolute", right: 16, bottom: 16,
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 8, zIndex: 100,
          }}>
            {/* Last message bubble */}
            {messages.length > 0 && messages[messages.length - 1].role === "regen" && (
              <div style={{
                maxWidth: 220, padding: "8px 12px",
                background: "var(--surface-2)",
                border: `1px solid ${currentAccent}44`,
                borderRadius: "12px 12px 2px 12px",
                fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5,
                animation: "slideIn 0.25s ease",
              }}>
                <span style={{ color: currentAccent, marginRight: 4 }}>⬡</span>
                {messages[messages.length - 1].text.slice(0, 80)}
                {messages[messages.length - 1].text.length > 80 ? "…" : ""}
              </div>
            )}
            <AvatarCompanion
              mode="research"
              emotion={companion.emotion}
              accent={currentAccent}
              onClick={() => setAvatarPos("panel")}
              live={avatarLive}
            />
            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>⌘Space</span>
          </div>
        )}
      </div>

      {/* ── COMMAND BAR (⌘K) ─────────────────────────────────────────── */}
      {showCommandBar && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            paddingTop: 120,
          }}
          onClick={() => setShowCommandBar(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 520,
              background: "var(--surface-2)",
              border: `1px solid ${currentAccent}55`,
              borderRadius: 14, padding: "12px 16px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
              Command palette · ⌘K
            </div>
            <input
              autoFocus
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Escape") setShowCommandBar(false);
                if (e.key === "Enter" && inputText.trim()) {
                  sendMessage(inputText);
                  setShowCommandBar(false);
                }
              }}
              placeholder="Ask Regen or run a command…"
              style={{
                width: "100%", fontSize: 14, padding: "8px 0",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </div>
      )}

      {/* ── STATUS BAR ──────────────────────────────────────────────── */}
      <div style={{
        height: 24, flexShrink: 0,
        background: "var(--surface-1)",
        borderTop: "1px solid var(--border)",
        display: "flex", alignItems: "center",
        padding: "0 14px", gap: 16,
        fontSize: 10, color: "var(--text-muted)",
      }}>
        <span style={{ color: currentAccent }}>⬡ Regen</span>
        <span>{browser.connected ? 'execution ws · live' : 'execution ws · offline'}</span>
        <span>phi3:mini · ollama local</span>
        <span style={{ flex: 1 }} />
        {activeTab?.url && !browser.isNewTab && (
          <span style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayUrlBar(activeTab.url)}
          </span>
        )}
        {chromeAdapted && <span style={{ color: currentAccent }}>page context active</span>}
        <span>{browserMode} mode</span>
        <span style={{ cursor: "pointer" }} onClick={() => setAvatarPos(p => p === "panel" ? "orb" : "panel")}>
          avatar: {avatarPos}
        </span>
      </div>
      <CompanionDebugPanel />
    </div>
  );
}

export default function RegenBrowserShell() {
  return (
    <CompanionErrorBoundary name="shell">
      <RegenBrowserShellInner />
    </CompanionErrorBoundary>
  );
}