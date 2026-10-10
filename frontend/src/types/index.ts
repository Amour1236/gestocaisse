export interface Boutique {
  id: string;
  nom: string;
  adresse?: string;
  telephone?: string;
  logo?: string;
  plan: 'starter' | 'pro' | 'business';
  proprietaire_id: string;
  actif: boolean;
  created_at: string;
  ticket_primary_color?: string;
  ticket_secondary_color?: string;
  ticket_text_color?: string;
  ticket_footer?: string;
  ticket_message?: string;
}

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: 'admin' | 'proprietaire' | 'caissier';
  boutique_id?: string;
  boutique?: Boutique;
  actif: boolean;
  created_at: string;
}

export interface Categorie {
  id: string;
  boutique_id: string;
  nom: string;
  couleur?: string;
}

export interface Produit {
  id: string;
  boutique_id: string;
  nom: string;
  code_barre?: string;
  prix_achat: number;
  prix_vente: number;
  stock_actuel: number;
  stock_minimum: number;
  stock_maximum?: number;
  emplacement?: string;
  delai_reapprovisionnement?: number;
  fournisseur_id?: string;
  unite?: string;
  categorie_id?: string;
  categories?: Categorie;
  actif: boolean;
  created_at: string;
  updated_at?: string;
}

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
  lignes?: LigneCommandeFournisseur[];
}

export interface LigneCommandeFournisseur {
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

export interface Client {
  id: string;
  boutique_id: string;
  nom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  credit_total?: number;
  created_at: string;
}

export interface LigneVente {
  produit_id: string;
  quantite: number;
  prix_unitaire: number;
  prix_achat?: number;
  nom_produit?: string;
  // enrichi côté frontend
  id?: string;
  nom?: string;
  qte?: number;
  prix_vente?: number;
}

export interface Vente {
  id: string;
  boutique_id?: string;
  numero?: string;
  mode_paiement: 'especes' | 'momo' | 'carte' | 'credit';
  total: number;
  remise: number;
  total_final: number;
  montant_recu?: number | string | null;
  client_id?: string;
  client?: Client;
  caissier_id?: string;
  notes?: string;
  annulee?: boolean;
  created_at: string;
  lignes: LigneVente[];
  boutique?: Boutique;
  monnaieRendue?: number;
  local?: boolean;
}

export interface PanierItem extends Produit {
  qte: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  user?: User;
}

export interface DashboardStats {
  ventes_jour: number;
  ca_jour: number;
  benefice_jour: number;
  total_produits: number;
  nb_ventes_total: number;
  ca_total: number;
  benefice_total: number;
  boutique_created_at?: string;
}

export interface MouvementStock {
  id: string;
  boutique_id: string;
  produit_id: string;
  type: 'entree' | 'sortie' | 'ajustement';
  quantite: number;
  motif?: string;
  created_at: string;
  produits?: Produit;
}

export interface Paiement {
  id: string;
  boutique_id: string;
  plan: string;
  montant: number;
  methode: 'stripe' | 'momo';
  statut: 'en_attente' | 'confirme' | 'echoue';
  reference?: string;
  created_at: string;
}
