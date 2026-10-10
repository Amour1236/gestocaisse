import { create } from 'zustand';
import { authAPI } from '../services/api';
import { User } from '../types';

// Fonction utilitaire pour récupérer un cookie du navigateur
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

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
    // Essayer d'abord de lire le cookie HttpOnly (plus sécurisé)
    let token = getCookie('gc_token');
    let userStr: string | null = null;

    // Si pas de cookie, tomber back vers localStorage (migration progressive)
    if (!token) {
      token = localStorage.getItem('gc_token');
      userStr = localStorage.getItem('gc_user');
    }

    if (token && userStr) {
      let cachedUser: User | null = null;
      try {
        cachedUser = JSON.parse(userStr) as User;
        set({ token, user: cachedUser, initialized: true });
        const { data } = await authAPI.moi();
        if (data.success && data.user) {
          set({ user: data.user });
          // Sauvegarder aussi dans localStorage si le cookie n'est pas présent
          if (!getCookie('gc_token')) {
            localStorage.setItem('gc_user', JSON.stringify(data.user));
          }
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
      const { data } = await authAPI.connexion({ email: String(email || '').trim().toLowerCase(), mot_de_passe });
      if (data.success && data.user) {
        // Le token est géré par le cookie HttpOnly défini par le backend
        // On ne le stocke plus explicitement pour éviter les vulnérabilités XSS
        // On met à jour l'utilisateur dans le state
        set({ user: data.user, loading: false });
        // Le token sera lu automatiquement via getCookie dans les prochains appels API
        return { success: true };
      }
    } catch (err: any) {
      set({ loading: false });
      return { success: false, message: err.response?.data?.message || 'Erreur de connexion' };
    }
    set({ loading: false });
    return { success: false, message: 'Erreur inconnue' };
  },

  loginWithToken: (token: string, user: User) => {
    // Plus de stockage explicite du token - il doit venir du cookie HttpOnly
    set({ user });
  },

  deconnexion: ({ redirect = true } = {}) => {
    // Supprimer les données de l'utilisateur du state
    set({ user: null, initialized: true });
    // Nettoyer les anciens stockages localStorage pour la migration
    localStorage.removeItem('gc_token');
    localStorage.removeItem('gc_user');
    if (redirect) window.location.href = '/';
  },

  refreshUser: async () => {
    try {
      const { data } = await authAPI.moi();
      if (data.success && data.user) {
        set({ user: data.user });
        // Le token sera rafraîchi automatiquement via le cookie HttpOnly
      }
    } catch {}
  },
}));
