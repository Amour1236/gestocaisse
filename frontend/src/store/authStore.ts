import { create } from 'zustand';
import { authAPI } from '../services/api';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  connexion: (email: string, mot_de_passe: string) => Promise<{ success: boolean; message?: string }>;
  loginWithToken: (token: string, user: User) => void;
  deconnexion: (opts?: { redirect?: boolean }) => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: false,
  initialized: false,

  init: async () => {
    const token = localStorage.getItem('gc_token');
    const userStr = localStorage.getItem('gc_user');
    if (token && userStr) {
      let cachedUser: User | null = null;
      try {
        cachedUser = JSON.parse(userStr) as User;
        set({ token, user: cachedUser, initialized: true });
        const { data } = await authAPI.moi();
        if (data.success && data.user) {
          set({ user: data.user });
          localStorage.setItem('gc_user', JSON.stringify(data.user));
        }
      } catch (err: any) {
        if (err.response?.status === 401) {
          get().deconnexion({ redirect: false });
          return;
        }
        set({ token, user: cachedUser, initialized: true });
      }
    } else {
      set({ initialized: true });
    }
  },

  connexion: async (email, mot_de_passe) => {
    set({ loading: true });
    try {
      const { data } = await authAPI.connexion({ email, mot_de_passe });
      if (data.success && data.token && data.user) {
        localStorage.setItem('gc_token', data.token);
        localStorage.setItem('gc_user', JSON.stringify(data.user));
        set({ token: data.token, user: data.user, loading: false });
        return { success: true };
      }
    } catch (err: any) {
      set({ loading: false });
      return { success: false, message: err.response?.data?.message || 'Erreur de connexion' };
    }
    set({ loading: false });
    return { success: false, message: 'Erreur inconnue' };
  },

  loginWithToken: (token, user) => {
    localStorage.setItem('gc_token', token);
    localStorage.setItem('gc_user', JSON.stringify(user));
    set({ token, user });
  },

  deconnexion: ({ redirect = true } = {}) => {
    localStorage.removeItem('gc_token');
    localStorage.removeItem('gc_user');
    set({ user: null, token: null, initialized: true });
    if (redirect) window.location.href = '/';
  },

  refreshUser: async () => {
    try {
      const { data } = await authAPI.moi();
      if (data.success && data.user) {
        set({ user: data.user });
        localStorage.setItem('gc_user', JSON.stringify(data.user));
      }
    } catch {}
  },
}));
