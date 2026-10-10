-- ============================================
-- GestoCaisse — Migration Module Stock Professionnel
-- Exécutez ce fichier dans Supabase > SQL Editor
-- ============================================

-- 1) Ajouter les nouvelles colonnes à la table produits
alter table produits add column if not exists stock_maximum integer default 100;
alter table produits add column if not exists emplacement text default '';
alter table produits add column if not exists delai_reapprovisionnement integer default 7; -- jours
alter table produits add column if not exists fournisseur_id uuid;

-- 2) TABLE: Fournisseurs
create table if not exists fournisseurs (
  id uuid primary key default gen_random_uuid(),
  boutique_id uuid not null references boutiques(id) on delete cascade,
  nom text not null,
  telephone text default '',
  email text default '',
  adresse text default '',
  delai_livraison integer default 7,  -- jours de délai moyen
  notes text default '',
  actif boolean default true,
  created_at timestamptz default now()
);

-- 3) TABLE: Commandes Fournisseurs
create table if not exists commandes_fournisseurs (
  id uuid primary key default gen_random_uuid(),
  boutique_id uuid not null references boutiques(id) on delete cascade,
  fournisseur_id uuid not null references fournisseurs(id),
  utilisateur_id uuid references users(id),
  reference text not null,
  date_commande timestamptz default now(),
  date_livraison_prevue timestamptz,
  date_livraison_reelle timestamptz,
  statut text default 'en_attente' check(statut in ('en_attente','confirmee','recue','partiellement_recue','annulee')),
  montant_total decimal(12,2) default 0,
  notes text default '',
  created_at timestamptz default now()
);

-- 4) TABLE: Lignes Commande Fournisseur
create table if not exists lignes_commande_fournisseur (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null references commandes_fournisseurs(id) on delete cascade,
  produit_id uuid references produits(id),
  nom_produit text not null,
  quantite_commandee integer not null default 0,
  quantite_recue integer not null default 0,
  prix_unitaire decimal(12,2) default 0,
  total decimal(12,2) default 0,
  conforme boolean default true,
  notes text default '',
  created_at timestamptz default now()
);

-- 5) Ajouter controle_qualite aux bons existants
alter table lignes_vente add column if not exists conforme boolean default true;
alter table lignes_vente add column if not exists remarque_qualite text default '';

-- 6) TABLE: Config alertes email
create table if not exists config_alertes (
  id uuid primary key default gen_random_uuid(),
  boutique_id uuid not null references boutiques(id) on delete cascade,
  frequence text default 'quotidienne' check(frequence in ('aucune','quotidienne','hebdomadaire')),
  heure_envoi time default '08:00',
  emails_cibles text default '',  -- séparés par virgules
  alerte_rupture boolean default true,
  alerte_stock_faible boolean default true,
  seuil_rupture integer default 0,
  seuil_stock_faible integer default 5,
  actif boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 7) INDEX de performance
create index if not exists idx_fournisseurs_boutique on fournisseurs (boutique_id) where actif = true;
create index if not exists idx_commandes_fournisseurs_boutique on commandes_fournisseurs (boutique_id, created_at desc);
create index if not exists idx_commandes_fournisseurs_fournisseur on commandes_fournisseurs (fournisseur_id);
create index if not exists idx_lignes_commande on lignes_commande_fournisseur (commande_id);
create index if not exists idx_produits_fournisseur on produits (fournisseur_id) where fournisseur_id is not null;

-- 8) Désactiver RLS sur les nouvelles tables
alter table fournisseurs disable row level security;
alter table commandes_fournisseurs disable row level security;
alter table lignes_commande_fournisseur disable row level security;
alter table config_alertes disable row level security;

-- 9) Insertion config_alertes par défaut
insert into config_alertes (boutique_id, frequence, emails_cibles, seuil_rupture, seuil_stock_faible)
select id, 'aucune', '', 0, 5
from boutiques
where not exists (select 1 from config_alertes ca where ca.boutique_id = boutiques.id)
on conflict do nothing;

-- Succès !
select 'Migration stock professionnel appliquée avec succès !' as resultat;
