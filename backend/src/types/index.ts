import { Request } from 'express';

export interface UserRow {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  mot_de_passe?: string;
  role: 'admin' | 'proprietaire' | 'caissier';
  boutique_id?: string;
  actif: boolean;
  email_verifie: boolean;
  reset_token?: string;
  reset_expire?: string;
  created_at: string;
}

export interface BoutiqueRow {
  id: string;
  nom: string;
  adresse?: string;
  telephone?: string;
  logo?: string;
  plan: 'starter' | 'pro' | 'business';
  proprietaire_id?: string;
  actif: boolean;
  created_at: string;
  ticket_primary_color?: string;
  ticket_secondary_color?: string;
  ticket_text_color?: string;
  ticket_footer?: string;
  ticket_message?: string;
}

export interface ProduitRow {
  id: string;
  boutique_id: string;
  nom: string;
  code_barre?: string;
  prix_achat: number;
  prix_vente: number;
  stock_actuel: number;
  stock_minimum: number;
  unite?: string;
  categorie_id?: string;
  actif: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ClientRow {
  id: string;
  boutique_id: string;
  nom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  credit_total?: number;
  created_at: string;
}

export interface VenteRow {
  id: string;
  boutique_id: string;
  numero?: string;
  mode_paiement: 'especes' | 'momo' | 'carte' | 'credit';
  total: number;
  remise: number;
  total_final: number;
  montant_recu?: number;
  client_id?: string;
  caissier_id?: string;
  notes?: string;
  annulee: boolean;
  created_at: string;
}

export interface LigneVenteRow {
  id: string;
  vente_id: string;
  produit_id: string;
  quantite: number;
  prix_unitaire: number;
  prix_achat: number;
  nom_produit?: string;
}

export interface AuthenticatedRequest extends Request {
  user: UserRow;
  boutique_id: string;
}

export type Plan = 'starter' | 'pro' | 'business';
