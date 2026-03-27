import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  resolved: ResolvedTheme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  resolved: 'dark',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('regen-theme') as Theme) ?? 'dark';
  });

  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved: ResolvedTheme =
    theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  const setTheme = (t: Theme) => {
    localStorage.setItem('regen-theme', t);
    setThemeState(t);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
  }, [resolved]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

// ── Theme token maps ────────────────────────────────────────────────────────
export const THEMES = {
  dark: {
    bg:            'linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1f35 100%)',
    topBar:        'transparent',
    tabStrip:      'rgba(0,0,0,0.15)',
    navBar:        'transparent',
    statusBar:     'rgba(0,0,0,0.18)',
    border:        'rgba(255,255,255,0.08)',
    borderSubtle:  'rgba(255,255,255,0.06)',
    text:          '#ffffff',
    textMuted:     'rgba(255,255,255,0.55)',
    textDim:       'rgba(255,255,255,0.35)',
    inputBg:       'rgba(255,255,255,0.07)',
    inputBorder:   'rgba(255,255,255,0.10)',
    cardBg:        'rgba(255,255,255,0.05)',
    cardBorder:    'rgba(255,255,255,0.08)',
    tabActive:     'rgba(255,255,255,0.10)',
    tabActiveBorder:'rgba(255,255,255,0.12)',
    menuBg:        '#15273d',
    menuBorder:    'rgba(255,255,255,0.1)',
    accent:        '#F5A623',
    toggleBg:      'rgba(0,0,0,0.30)',
    toggleBorder:  'rgba(255,255,255,0.12)',
  },
  light: {
    bg:            'linear-gradient(135deg, #eaf1f8 0%, #dce8f3 50%, #e6eff7 100%)',
    topBar:        'transparent',
    tabStrip:      'rgba(0,0,0,0.05)',
    navBar:        'transparent',
    statusBar:     'rgba(0,0,0,0.06)',
    border:        'rgba(0,0,0,0.10)',
    borderSubtle:  'rgba(0,0,0,0.07)',
    text:          '#0d1f3c',
    textMuted:     'rgba(13,31,60,0.60)',
    textDim:       'rgba(13,31,60,0.35)',
    inputBg:       'rgba(255,255,255,0.70)',
    inputBorder:   'rgba(0,0,0,0.12)',
    cardBg:        'rgba(255,255,255,0.60)',
    cardBorder:    'rgba(0,0,0,0.08)',
    tabActive:     'rgba(255,255,255,0.80)',
    tabActiveBorder:'rgba(0,0,0,0.12)',
    menuBg:        '#ffffff',
    menuBorder:    'rgba(0,0,0,0.12)',
    accent:        '#F5A623',
    toggleBg:      'rgba(0,0,0,0.08)',
    toggleBorder:  'rgba(0,0,0,0.12)',
  },
} as const;

export type ThemeTokens = typeof THEMES.dark;
