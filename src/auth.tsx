import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://bayer-formulacao.onrender.com';

if (!BASE) {
  throw new Error('Backend URL não configurada');
}

console.log('BASE:', process.env.EXPO_PUBLIC_BACKEND_URL);
const TOKEN_KEY = 'bayer_auth_token';

export type User = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  api: AxiosInstance;
  isDemo: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const api = axios.create({
  baseURL: `${BASE.replace(/\/$/, '')}/api`,
  timeout: 20000,
});

/**
 * Wrapper seguro para evitar crash em versões quebradas do SecureStore
 */
const safeSecureStore = {
  get: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  set: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // fallback silencioso
    }
  },
  remove: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // fallback silencioso (evita crash do app)
    }
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const setAuthHeader = (tk: string | null) => {
    if (tk) {
      api.defaults.headers.common['Authorization'] = `Bearer ${tk}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const tk = await safeSecureStore.get(TOKEN_KEY);

        if (tk) {
          setAuthHeader(tk);
          setToken(tk);

          const r = await api.get('/auth/me');
          setUser(r.data);
        }
      } catch {
        setAuthHeader(null);
        await safeSecureStore.remove(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const r = await api.post('/auth/login', { email, password });

    const tk = r.data.access_token as string;

    await safeSecureStore.set(TOKEN_KEY, tk);

    setAuthHeader(tk);
    setToken(tk);
    setUser(r.data.user);
  };

  const register = async (email: string, password: string, name: string) => {
    const r = await api.post('/auth/register', {
      email,
      password,
      name,
    });

    const tk = r.data.access_token as string;

    await safeSecureStore.set(TOKEN_KEY, tk);

    setAuthHeader(tk);
    setToken(tk);
    setUser(r.data.user);
  };

  const logout = async () => {
    await safeSecureStore.remove(TOKEN_KEY);

    setAuthHeader(null);
    setToken(null);
    setUser(null);
    setIsDemo(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, api, isDemo, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
