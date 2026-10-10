import axios, { AxiosResponse } from 'axios';
import { ApiResponse, User, Produit, Categorie, Vente, Client, MouvementStock, DashboardStats, Boutique, Paiement } from '../types';

// Fonction utilitaire pour récupérer un cookie
const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  withCredentials: true, // Important pour envoyer les cookies
});

api.interceptors.request.use((cfg) => {
  const token = getCookie('gc_token');
  if (token && cfg.headers) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginRequest = err.config?.url?.includes('/auth/connexion');
    const isMomoRequest = err.config?.url?.includes('/momo/');
    const isNetworkError = !err.response;
    if (err.response?.status === 401 && !isLoginRequest && !isMomoRequest && !isNetworkError) {
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

// ─── MODULE STOCK PROFESSIONNEL ────────────────────────────────────────────────

export interface Inventaire {
  id: string;
  boutique_id: string;
  utilisateur_id: string;
  date_inventaire: string;
  statut: 'en_cours' | 'termine' | 'annule';
  notes: string;
  lignes?: LigneInventaire[];
  stats?: {
    total_lignes: number;
    ecarts_positifs: number;
    ecarts_negatifs: number;
    lignes_sans_ecart: number;
  };
  utilisateur?: { nom: string; prenom: string };
}

export interface LigneInventaire {
  id: string;
  inventaire_id: string;
  produit_id: string;
  stock_theorique: number;
  stock_physique: number | null;
  ecart: number;
  notes: string;
  produit?: { id: string; nom: string; code_barre: string };
}

export interface Bon {
  id: string;
  boutique_id: string;
  utilisateur_id: string;
  type_bon: 'reception' | 'sortie';
  reference: string;
  fournisseur: string;
  client: string;
  date_bon: string;
  statut: 'valide' | 'annule';
  notes: string;
  lignes?: LigneBon[];
  stats?: {
    nb_articles: number;
    nb_produits: number;
    total: number;
  };
  utilisateur?: { nom: string; prenom: string };
}

export interface LigneBon {
  id: string;
  bon_id: string;
  produit_id: string;
  nom_produit: string;
  quantite: number;
  prix_unitaire: number;
  total: number;
}

export const inventairesAPI = {
  liste: (p?: { statut?: string; limit?: number }): Promise<AxiosResponse<ApiResponse<Inventaire[]>>> =>
    api.get('/inventaires', { params: p }),
  creer: (d: { notes?: string }): Promise<AxiosResponse<ApiResponse<Inventaire>>> =>
    api.post('/inventaires', d),
  detail: (id: string): Promise<AxiosResponse<ApiResponse<Inventaire>>> =>
    api.get(`/inventaires/${id}`),
  updateLigne: (inventaireId: string, ligneId: string, d: { stock_physique: number; notes?: string }): Promise<AxiosResponse<ApiResponse>> =>
    api.put(`/inventaires/${inventaireId}/lignes/${ligneId}`, d),
  bulkUpdateLignes: (inventaireId: string, lignes: { ligneId: string; stock_physique: number; notes?: string }[]): Promise<AxiosResponse<ApiResponse>> =>
    api.post(`/inventaires/${inventaireId}/lignes/bulk`, { lignes }),
  valider: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.post(`/inventaires/${id}/valider`),
  supprimer: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/inventaires/${id}`),
};

export const bonsAPI = {
  liste: (p?: { type?: string; statut?: string; limit?: number }): Promise<AxiosResponse<ApiResponse<Bon[]>>> =>
    api.get('/bons', { params: p }),
  creer: (d: {
    type_bon: 'reception' | 'sortie';
    reference?: string;
    fournisseur?: string;
    client?: string;
    notes?: string;
    lignes: { produit_id: string; quantite: number; prix_unitaire?: number }[];
  }): Promise<AxiosResponse<ApiResponse<Bon>>> =>
    api.post('/bons', d),
  detail: (id: string): Promise<AxiosResponse<ApiResponse<Bon>>> =>
    api.get(`/bons/${id}`),
  modifier: (id: string, d: { reference?: string; fournisseur?: string; client?: string; notes?: string }): Promise<AxiosResponse<ApiResponse<Bon>>> =>
    api.put(`/bons/${id}`, d),
  supprimer: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/bons/${id}`),
};

export const rapportsStockAPI = {
  etat: (p?: { categorie?: string }): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/rapports-stock/etat', { params: p }),
  mouvements: (p?: { produit_id?: string; type?: string; debut?: string; fin?: string; limit?: number }): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/rapports-stock/mouvements', { params: p }),
  alertes: (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/rapports-stock/alertes'),
  velocity: (p?: { jours?: number }): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/rapports-stock/velocity', { params: p }),
  suggestions: (p?: { jours?: number }): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/rapports-stock/suggestions', { params: p }),
  synthese: (p?: { debut?: string; fin?: string }): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/rapports-stock/synthese', { params: p }),
  rapportInventaire: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/rapports-stock/inventaire/${id}`),
  rapportBon: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/rapports-stock/bon/${id}`),
};

// ─── FOURNISSEURS ────────────────────────────────────────────────────────────────
export interface Fournisseur {
  id: string;
  boutique_id: string;
  nom: string;
  telephone: string;
  email: string;
  adresse: string;
  delai_livraison: number;
  notes: string;
  actif: boolean;
  created_at: string;
}

export const fournisseursAPI = {
  liste: (p?: { actif?: boolean }): Promise<AxiosResponse<ApiResponse<Fournisseur[]>>> =>
    api.get('/fournisseurs', { params: p }),
  creer: (d: Partial<Fournisseur>): Promise<AxiosResponse<ApiResponse<Fournisseur>>> =>
    api.post('/fournisseurs', d),
  modifier: (id: string, d: Partial<Fournisseur>): Promise<AxiosResponse<ApiResponse<Fournisseur>>> =>
    api.put(`/fournisseurs/${id}`, d),
  supprimer: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/fournisseurs/${id}`),
  detail: (id: string): Promise<AxiosResponse<ApiResponse<Fournisseur>>> =>
    api.get(`/fournisseurs/${id}`),
};

// ─── COMMANDES FOURNISSEURS ─────────────────────────────────────────────────────
export interface CommandeFournisseur {
  id: string;
  boutique_id: string;
  fournisseur_id: string;
  reference: string;
  date_commande: string;
  date_livraison_prevue: string;
  date_livraison_reelle?: string;
  statut: 'en_attente' | 'confirmee' | 'recue' | 'partiellement_recue' | 'annulee';
  montant_total: number;
  notes: string;
  fournisseur?: { nom: string; telephone: string };
  lignes?: LigneCommande[];
}

export interface LigneCommande {
  id: string;
  commande_id: string;
  produit_id: string;
  nom_produit: string;
  quantite_commandee: number;
  quantite_recue: number;
  prix_unitaire: number;
  total: number;
  conforme: boolean;
  remarque_qualite: string;
}

export const commandesFournisseursAPI = {
  liste: (p?: { statut?: string; fournisseur_id?: string }): Promise<AxiosResponse<ApiResponse<CommandeFournisseur[]>>> =>
    api.get('/commandes-fournisseurs', { params: p }),
  creer: (d: {
    fournisseur_id: string;
    reference?: string;
    date_livraison_prevue?: string;
    notes?: string;
    lignes: { produit_id?: string; nom_produit: string; quantite_commandee: number; prix_unitaire: number }[];
  }): Promise<AxiosResponse<ApiResponse<CommandeFournisseur>>> =>
    api.post('/commandes-fournisseurs', d),
  detail: (id: string): Promise<AxiosResponse<ApiResponse<CommandeFournisseur>>> =>
    api.get(`/commandes-fournisseurs/${id}`),
  modifier: (id: string, d: Partial<CommandeFournisseur>): Promise<AxiosResponse<ApiResponse<CommandeFournisseur>>> =>
    api.put(`/commandes-fournisseurs/${id}`, d),
  recevoir: (id: string, lignes_recues: { ligneId: string; quantite_recue: number; conforme: boolean; remarque?: string }[]): Promise<AxiosResponse<ApiResponse>> =>
    api.post(`/commandes-fournisseurs/${id}/recevoir`, { lignes_recues }),
  supprimer: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/commandes-fournisseurs/${id}`),
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
    api.post(`/clients/credits/${id}/rembourser`, d),
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
    api.post('/notifications/generer-alertes'),
};

export const auditAPI = {
  liste: (p: Record<string, unknown> = {}): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/audit', { params: p }),
};

export const momoAPI = {
  portefeuilles: (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/momo/portefeuilles'),
  ajouterPortefeuille: (d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/momo/portefeuilles', d),
  modifierPortefeuille: (id: string, d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.put(`/momo/portefeuilles/${id}`, d),
  supprimerPortefeuille: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/momo/portefeuilles/${id}`),
  transactions: (p: Record<string, unknown> = {}): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/momo/transactions', { params: p }),
  ajouterTransaction: (d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/momo/transactions', d),
  supprimerTransaction: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/momo/transactions/${id}`),
  floats: (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/momo/floats'),
  rapprochement: (date: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/momo/rapprochement', { params: { date } }),
  historiqueClient: (numero: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/momo/clients/${encodeURIComponent(numero)}`),
  rapport: (annee: number, mois: number): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/momo/rapport', { params: { annee, mois } }),
};

export const recusAPI = {
  preview:    (d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/recus/preview', d),
  envoyer:    (d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/recus/envoyer', d),
  vente:      (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/recus/vente/${id}`),
  envoyes:    (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/recus/envoyes'),
};

export const creditAPI = {
  credits:        (p: Record<string, unknown> = {}): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/credit/credits', { params: p }),
  creer:          (d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/credit', d),
  modifier:       (id: string, d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.put(`/credit/${id}`, d),
  rappel:         (id: string, d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.post(`/credit/${id}/rappel`, d),
  rappelsMassifs: (d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/credit/rappels/massifs', d),
  rappels:        (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/credit/rappels'),
  stats:          (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/credit/stats'),
  score:          (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/credit/score/${id}`),
  tontines:       (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/credit/tontines'),
  creerTontine:   (d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/credit/tontines', d),
  cotiserTontine: (id: string, d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.post(`/credit/tontines/${id}/cotiser`, d),
};

export const ohadaAPI = {
  config:         (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/ohada/config'),
  updateConfig:   (d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.put('/ohada/config', d),
  genererFacture: (d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/ohada/facture', d),
  factures:       (p: Record<string, unknown> = {}): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/ohada/factures', { params: p }),
  facture:        (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/ohada/factures/${id}`),
  export:         (p: Record<string, unknown> = {}): Promise<AxiosResponse<Blob>> =>
    api.get('/ohada/export', { params: p, responseType: 'blob' }),
  exportJson:     (p: Record<string, unknown> = {}): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/ohada/export', { params: { ...p, format: 'json' } }),
};

export const fideliteAPI = {
  programme:       (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/fidelite/programme'),
  updateProgramme: (d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.put('/fidelite/programme', d),
  clients:         (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/fidelite/clients'),
  client:          (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/fidelite/clients/${id}`),
  utiliser:        (d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/fidelite/utiliser', d),
  attribuer:       (d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/fidelite/attribuer', d),
};

export const transfertsAPI = {
  liste:     (p: Record<string, unknown> = {}): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/transferts', { params: p }),
  creer:     (d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/transferts', d),
  action:    (id: string, d: Record<string, unknown>): Promise<AxiosResponse<ApiResponse>> =>
    api.patch(`/transferts/${id}`, d),
  boutiques: (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/transferts/boutiques'),
};

export const demoAPI = {
  demarrer: (): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/demo/demarrer'),
  info:     (): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/demo/info'),
};

export default api;
