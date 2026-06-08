import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('gc_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  res => res,
  err => {
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
  inscription: (d) => api.post('/auth/inscription', d),
  connexion:   (d) => api.post('/auth/connexion', d),
  moi:         ()  => api.get('/auth/moi'),
  profil:      (d) => api.put('/auth/profil', d),
  mdp:         (d) => api.put('/auth/mot-de-passe', d),
  supprimerCompte: () => api.delete('/auth/compte'),
};

export const produitsAPI = {
  liste:     (p={}) => api.get('/produits', { params: p }),
  creer:     (d)   => api.post('/produits', d),
  modifier:  (id,d) => api.put(`/produits/${id}`, d),
  supprimer: (id)  => api.delete(`/produits/${id}`),
};

export const categoriesAPI = {
  liste:    ()    => api.get('/categories'),
  creer:    (d)   => api.post('/categories', d),
  modifier: (id,d)=> api.put(`/categories/${id}`, d),
  supprimer:(id)  => api.delete(`/categories/${id}`),
};

export const ventesAPI = {
  creer:    (d)   => api.post('/ventes', d),
  liste:    (p={})=> api.get('/ventes', { params: p }),
  historique: (p={}) => api.get('/ventes/historique', { params: p }),
  annuler:  (id)  => api.patch(`/ventes/${id}/annuler`),
  detail:   (id)  => api.get(`/ventes/${id}`),
};

export const stockAPI = {
  ajustement:  (d)   => api.post('/stock/ajustement', d),
  mouvements:  (p={})=> api.get('/stock/mouvements', { params: p }),
  alertes:     ()    => api.get('/stock/alertes'),
  envoyerAlerte: ()  => api.post('/stock/alertes/email'),
};

export const clientsAPI = {
  liste:       (p={})=> api.get('/clients', { params: p }),
  creer:       (d)   => api.post('/clients', d),
  modifier:    (id,d)=> api.put(`/clients/${id}`, d),
  supprimer:   (id)  => api.delete(`/clients/${id}`),
  ventes:      (id)  => api.get(`/clients/${id}/ventes`),
  credits:     (id)  => api.get(`/clients/${id}/credits`),
  rembourser:  (id,d)=> api.post(`/clients/${id}/rembourser`, d),
};

export const rapportsAPI = {
  dashboard:   ()    => api.get('/rapports/dashboard'),
  global:      ()    => api.get('/rapports/global'),
  rapportJour: (d)   => api.get('/rapports/jour', { params: d ? { date: d } : {} }),
  rapportMois: (p={})=> api.get('/rapports/mois', { params: p }),
  alertes:     ()    => api.get('/stock/alertes'),
};

export const boutiqueAPI = {
  get:           ()    => api.get('/boutique'),
  update:        (d)   => api.put('/boutique', d),
  caissiers:        ()    => api.get('/boutique/caissiers'),
  creerCaissier:    (d)   => api.post('/boutique/caissiers', d),
  toggleCaissier:   (id)  => api.patch(`/boutique/caissiers/${id}/toggle`),
  supprimerCaissier:(id) => api.delete(`/boutique/caissiers/${id}`),
};

export const paiementsAPI = {
  stripeCheckout: (plan_id) => api.post('/paiements/stripe/checkout', { plan_id }),
  momoInitier:    (plan_id) => api.post('/paiements/momo/initier', { plan_id }),
  mesPaiements:   ()  => api.get('/paiements/mes-paiements'),
};

export const adminAPI = {
  stats:      () => api.get('/admin/stats'),
  users:      () => api.get('/admin/users'),
  boutiques:  () => api.get('/admin/boutiques'),
  paiements:  () => api.get('/admin/paiements-attente'),
  confirmerMomo: (ref) => api.post(`/paiements/momo/confirmer/${ref}`),
  toggle:     (id) => api.patch(`/admin/boutiques/${id}/toggle`),
  supprimerBoutique: (id) => api.delete(`/admin/boutiques/${id}`),
  supprimerUser: (id) => api.delete(`/admin/users/${id}`),
};

export default api;
