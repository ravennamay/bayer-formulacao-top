import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceCard: string;
  border: string;
  overlay: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;

  primary: string;
  primaryActive: string;

  secondary: string;
  accent: string;

  danger: string;
  dangerBg: string;

  warning: string;
  warningBg: string;

  success: string;
  successBg: string;

  info: string;
  infoBg: string;

  whatsapp: string;
};

// =========================
// DARK THEME
// =========================

const DARK: ThemeColors = {
  background: '#0B1620',

  surface: '#13212C',
  surfaceElevated: '#1B2D3A',
  surfaceCard: '#1B2D3A',
  overlay: 'rgba(0, 0, 0, 0.4)',

  border: '#1F3447',

  textPrimary: '#FFFFFF',
  textSecondary: '#9FB3C2',
  textTertiary: '#6A8194',

  primary: '#89D329',
  primaryActive: '#A8E445',

  secondary: '#00BCFF',
  accent: '#10384F',

  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.15)',

  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.15)',

  success: '#22C55E',
  successBg: 'rgba(34, 197, 94, 0.15)',

  info: '#00BCFF',
  infoBg: 'rgba(0, 188, 255, 0.15)',

  whatsapp: '#25D366',
};

// =========================
// LIGHT THEME
// =========================

const LIGHT: ThemeColors = {
  background: '#FAFBFC',

  surface: '#FFFFFF',
  surfaceElevated: '#F5F8FB',
  surfaceCard: '#F5F8FB',
  overlay: 'rgba(0, 0, 0, 0.3)',

  border: '#D4DDE5',

  textPrimary: '#0D2636',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',

  primary: '#89D329',
  primaryActive: '#7BC922',

  secondary: '#0099DD',
  accent: '#00BCFF',

  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.12)',

  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.12)',

  success: '#22C55E',
  successBg: 'rgba(34, 197, 94, 0.12)',

  info: '#0284C7',
  infoBg: 'rgba(2, 132, 199, 0.12)',

  whatsapp: '#25D366',
};

type ThemeContextType = {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggle: () => void;
  setTheme: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = 'bayer_theme_mode';

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  const loadTheme = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);

      if (saved === 'dark' || saved === 'light') {
        setMode(saved);
      }
    } catch (err) {
      console.log('Erro ao carregar tema:', err);
    }
  }, []);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  const persistTheme = useCallback(async (next: ThemeMode) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch (err) {
      console.log('Erro ao salvar tema:', err);
    }
  }, []);

  const toggle = useCallback(() => {
    setMode(current => {
      const next = current === 'dark' ? 'light' : 'dark';

      persistTheme(next);

      return next;
    });
  }, [persistTheme]);

  const setTheme = useCallback(
    (next: ThemeMode) => {
      setMode(next);

      persistTheme(next);
    },
    [persistTheme]
  );

  const colors = useMemo(() => {
    return mode === 'dark' ? DARK : LIGHT;
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      colors,
      isDark: mode === 'dark',
      toggle,
      setTheme,
    }),
    [mode, colors, toggle, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return context;
}

export const BAYER_LOGO_URL =
  'https://customer-assets.emergentagent.com/job_industrial-ops-track/artifacts/bozqbrkv_Logo_Bayer.svg.png';
