import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useTheme, THEMES } from '../contexts/ThemeContext';

interface Shortcut {
  id: string;
  label: string;
  url: string;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: 'google',  label: 'Google Search', url: 'https://google.com'  },
  { id: 'github',  label: 'GitHub',         url: 'https://github.com'  },
  { id: 'discord', label: 'Discord',        url: 'https://discord.com' },
  { id: 'youtube', label: 'YouTube',        url: 'https://youtube.com' },
];

const SZ = { width: 17, height: 17 };

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" style={SZ}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const GithubIcon = ({ color = 'white' }: { color?: string }) => (
  <svg viewBox="0 0 24 24" style={SZ} fill={color}>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
);

const DiscordIcon = () => (
  <svg viewBox="0 0 24 24" style={SZ} fill="#5865F2">
    <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.175 13.175 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"/>
  </svg>
);

const YoutubeIcon = () => (
  <svg viewBox="0 0 24 24" style={SZ}>
    <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
    <path fill="white" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const ICONS: Record<string, React.ReactNode> = {
  google:  <GoogleIcon />,
  github:  <GithubIcon />,
  discord: <DiscordIcon />,
  youtube: <YoutubeIcon />,
};

export default function Browse() {
  const { resolvedTheme } = useTheme();
  const T = THEMES[resolvedTheme];
  const [urlInput, setUrlInput] = useState('');

  const handleNavigate = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && urlInput.trim()) {
      const url = urlInput.startsWith('http') ? urlInput : `https://${urlInput}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="h-full w-full flex overflow-hidden">
      {/* 3D Character — left side */}
      <div
        className="flex-shrink-0 flex items-end pointer-events-none select-none"
        style={{ width: 180 }}
      >
        <motion.img
          src="/images/character-full.png"
          alt="REGEN AI"
          className="object-contain object-bottom w-full"
          style={{ maxHeight: 360 }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
          draggable={false}
        />
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col justify-center pr-8 pl-6 space-y-4">
        {/* URL input */}
        <motion.input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={handleNavigate}
          placeholder="Enter URL"
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
          style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.textMuted }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(245,166,35,0.5)')}
          onBlur={(e)  => (e.target.style.borderColor = T.inputBorder)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        />

        {/* 2×2 shortcuts grid */}
        <motion.div
          className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {DEFAULT_SHORTCUTS.map((s) => (
            <motion.button
              key={s.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => window.open(s.url, '_blank')}
              className="flex flex-col items-center justify-center py-4 rounded-2xl space-y-2 transition-colors"
              style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}
            >
              <div
                className="rounded-full flex items-center justify-center"
                style={{ width: 34, height: 34, background: T.inputBg }}
              >
                {s.id === 'github'
                  ? <GithubIcon color={resolvedTheme === 'light' ? '#1a2332' : 'white'} />
                  : ICONS[s.id]}
              </div>
              <span style={{ fontSize: 12, color: T.textMuted }}>{s.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Add Shortcut */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex flex-col items-center justify-center py-3 rounded-2xl space-y-1.5 w-full"
          style={{ background: T.cardBg, border: `1px dashed ${T.border}` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div
            className="rounded-full flex items-center justify-center"
            style={{ width: 30, height: 30, background: T.inputBg }}
          >
            <Plus style={{ width: 15, height: 15, color: T.textDim }} />
          </div>
          <span style={{ fontSize: 12, color: T.textDim }}>Add Shortcut</span>
        </motion.button>
      </div>

      {/* Floating pencil button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-10 right-5 w-10 h-10 rounded-full flex items-center justify-center shadow-lg z-40 text-white text-base"
        style={{ background: 'linear-gradient(135deg, #F5A623, #e08a1a)' }}
      >
        ✎
      </motion.button>
    </div>
  );
}
