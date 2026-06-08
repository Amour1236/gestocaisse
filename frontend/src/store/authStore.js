import { create } from 'zustand';
import { authAPI } from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  loading: false,
  initialized: false,

  init: async () => {
    const token = localStorage.getItem('gc_token');
    const userStr = localStorage.getItem('gc_user');
    if (token && userStr) {
      let cachedUser = null;
      try {
        cachedUser = JSON.parse(userStr);
        set({ token, user: cachedUser, initialized: true });
        const { data } = await authAPI.moi();
        if (data.success) {
          set({ user: data.user });
          localStorage.setItem('gc_user', JSON.stringify(data.user));
        }
      } catch (err) {
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
      if (data.success) {
        localStorage.setItem('gc_token', data.token);
        localStorage.setItem('gc_user', JSON.stringify(data.user));
        set({ token: data.token, user: data.user, loading: false });
        return { success: true };
      }
    } catch (err) {
      set({ loading: false });
      return { success: false, message: err.response?.data?.message || 'Erreur de connexion' };
    }
    set({ loading: false });
    return { success: false, message: 'Erreur inconnue' };
  },

  // Connexion après inscription (token déjà disponible)
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
      if (data.success) {
        set({ user: data.user });
        localStorage.setItem('gc_user', JSON.stringify(data.user));
      }
    } catch {}
  },
}));
