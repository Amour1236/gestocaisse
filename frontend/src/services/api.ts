import axios, { AxiosResponse } from 'axios';
import { ApiResponse, User, Produit, Categorie, Vente, Client, MouvementStock, DashboardStats, Boutique, Paiement } from '../types';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('gc_token');
  if (token && cfg.headers) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginRequest = err.config?.url?.includes('/auth/connexion');
    const isNetworkError = !err.response;
    if (err.response?.status === 401 && !isLoginRequest && !isNetworkError) {
      localStorage.removeItem('gc_token');
      localStorage.removeItem('gc_user');
      if (!window.location.pathname.includes('/connexion') && window.location.pathname !== '/') {
        window.location.href = '/connexion';
      }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  inscription: (d: Record<string, string>): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/auth/inscription', d),
  connexion: (d: { email: string; mot_de_passe: string }): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/auth/connexion', d),
  moi: (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/auth/moi'),
  profil: (d: Partial<User>): Promise<AxiosResponse<ApiResponse>> =>
    api.put('/auth/profil', d),
  mdp: (d: { ancien: string; nouveau: string }): Promise<AxiosResponse<ApiResponse>> =>
    api.put('/auth/mot-de-passe', d),
  supprimerCompte: (): Promise<AxiosResponse<ApiResponse>> =>
    api.delete('/auth/compte'),
};

export const produitsAPI = {
  liste: (p: Record<string, unknown> = {}): Promise<AxiosResponse<ApiResponse<Produit[]>>> =>
    api.get('/produits', { params: p }),
  creer: (d: Partial<Produit>): Promise<AxiosResponse<ApiResponse<Produit>>> =>
    api.post('/produits', d),
  modifier: (id: string, d: Partial<Produit>): Promise<AxiosResponse<ApiResponse<Produit>>> =>
    api.put(`/produits/${id}`, d),
  supprimer: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/produits/${id}`),
};

export const categoriesAPI = {
  liste: (): Promise<AxiosResponse<ApiResponse<Categorie[]>>> =>
    api.get('/categories'),
  creer: (d: Partial<Categorie>): Promise<AxiosResponse<ApiResponse<Categorie>>> =>
    api.post('/categories', d),
  modifier: (id: string, d: Partial<Categorie>): Promise<AxiosResponse<ApiResponse<Categorie>>> =>
    api.put(`/categories/${id}`, d),
  supprimer: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/categories/${id}`),
};

export const ventesAPI = {
  creer: (d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse<Vente>>> =>
    api.post('/ventes', d),
  liste: (p: Record<string, unknown> = {}): Promise<AxiosResponse<ApiResponse<Vente[]>>> =>
    api.get('/ventes', { params: p }),
  historique: (p: Record<string, unknown> = {}): Promise<AxiosResponse<ApiResponse<Vente[]>>> =>
    api.get('/ventes/historique', { params: p }),
  annuler: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.patch(`/ventes/${id}/annuler`),
  detail: (id: string): Promise<AxiosResponse<ApiResponse<Vente>>> =>
    api.get(`/ventes/${id}`),
};

export const stockAPI = {
  ajustement: (d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/stock/ajustement', d),
  mouvements: (p: Record<string, unknown> = {}): Promise<AxiosResponse<ApiResponse<MouvementStock[]>>> =>
    api.get('/stock/mouvements', { params: p }),
  alertes: (): Promise<AxiosResponse<ApiResponse<Produit[]>>> =>
    api.get('/stock/alertes'),
  envoyerAlerte: (): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/stock/alertes/email'),
};

export const clientsAPI = {
  liste: (p: Record<string, unknown> = {}): Promise<AxiosResponse<ApiResponse<Client[]>>> =>
    api.get('/clients', { params: p }),
  creer: (d: Partial<Client>): Promise<AxiosResponse<ApiResponse<Client>>> =>
    api.post('/clients', d),
  modifier: (id: string, d: Partial<Client>): Promise<AxiosResponse<ApiResponse<Client>>> =>
    api.put(`/clients/${id}`, d),
  supprimer: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/clients/${id}`),
  ventes: (id: string): Promise<AxiosResponse<ApiResponse<Vente[]>>> =>
    api.get(`/clients/${id}/ventes`),
  credits: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/clients/${id}/credits`),
  rembourser: (id: string, d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.post(`/clients/${id}/rembourser`, d),
};

export const rapportsAPI = {
  dashboard: (): Promise<AxiosResponse<ApiResponse<DashboardStats>>> =>
    api.get('/rapports/dashboard'),
  global: (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/rapports/global'),
  rapportJour: (d?: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/rapports/jour', { params: d ? { date: d } : {} }),
  rapportMois: (p: Record<string, unknown> = {}): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/rapports/mois', { params: p }),
  alertes: (): Promise<AxiosResponse<ApiResponse<Produit[]>>> =>
    api.get('/stock/alertes'),
};

export const boutiqueAPI = {
  get: (): Promise<AxiosResponse<ApiResponse<Boutique>>> =>
    api.get('/boutique'),
  update: (d: Partial<Boutique>): Promise<AxiosResponse<ApiResponse<Boutique>>> =>
    api.put('/boutique', d),
  caissiers: (): Promise<AxiosResponse<ApiResponse<User[]>>> =>
    api.get('/boutique/caissiers'),
  creerCaissier: (d: Partial<User>): Promise<AxiosResponse<ApiResponse<User>>> =>
    api.post('/boutique/caissiers', d),
  toggleCaissier: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.patch(`/boutique/caissiers/${id}/toggle`),
  supprimerCaissier: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/boutique/caissiers/${id}`),
};

export const paiementsAPI = {
  stripeCheckout: (plan_id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/paiements/stripe/checkout', { plan_id }),
  momoInitier: (plan_id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/paiements/momo/initier', { plan_id }),
  mesPaiements: (): Promise<AxiosResponse<ApiResponse<Paiement[]>>> =>
    api.get('/paiements/mes-paiements'),
};

export const adminAPI = {
  stats: (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/admin/stats'),
  users: (): Promise<AxiosResponse<ApiResponse<User[]>>> =>
    api.get('/admin/users'),
  boutiques: (): Promise<AxiosResponse<ApiResponse<Boutique[]>>> =>
    api.get('/admin/boutiques'),
  paiements: (): Promise<AxiosResponse<ApiResponse<Paiement[]>>> =>
    api.get('/admin/paiements-attente'),
  confirmerMomo: (ref: string): Promise<AxiosResponse<ApiResponse>> =>
    api.post(`/paiements/momo/confirmer/${ref}`),
  toggle: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.patch(`/admin/boutiques/${id}/toggle`),
  supprimerBoutique: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/admin/boutiques/${id}`),
  supprimerUser: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/admin/users/${id}`),
};

export const caisseAPI = {
  sessionActive: (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/caisse/session-active'),
  sessions: (p: Record<string, unknown> = {}): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/caisse/sessions', { params: p }),
  ouvrir: (d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/caisse/ouvrir', d),
  fermer: (id: string, d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.post(`/caisse/fermer/${id}`, d),
  mouvement: (d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/caisse/mouvement', d),
};

export const documentsAPI = {
  liste: (p: Record<string, unknown> = {}): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/documents', { params: p }),
  htmlUrl: (id: string): string =>
    `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/documents/${id}/html`,
};

export const notificationsAPI = {
  liste: (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/notifications'),
  generer: (): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/notifications/generer'),
};

export const auditAPI = {
  liste: (p: Record<string, unknown> = {}): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/audit', { params: p }),
};

export default api;
