-- GestoCaisse - Migration complete stock professionnel et mode offline
-- A executer une seule fois dans Supabase > SQL Editor > Run.
-- Les instructions sont idempotentes et peuvent etre relancees.

-- Mode offline / idempotence des ventes
alter table ventes add column if not exists local_id text;
create unique index if not exists idx_ventes_local_id
  on ventes (local_id) where local_id is not null;

-- Colonnes stock professionnel
alter table produits add column if not exists stock_maximum integer default 100;
alter table produits add column if not exists emplacement text default '';
alter table produits add column if not exists delai_reapprovisionnement integer default 7;
alter table produits add column if not exists fournisseur_id uuid;

-- Inventaires
create table if not exists inventaires (
  id uuid primary key default gen_random_uuid(),
  boutique_id uuid not null references boutiques(id) on delete cascade,
  utilisateur_id uuid not null references users(id),
  date_inventaire timestamptz default now(),
  statut text default 'en_cours' check(statut in ('en_cours', 'termine', 'annule')),
  notes text default '',
  created_at timestamptz default now()
);

create table if not exists lignes_inventaire (
  id uuid primary key default gen_random_uuid(),
  inventaire_id uuid not null references inventaires(id) on delete cascade,
  produit_id uuid not null references produits(id),
  stock_theorique integer not null,
  stock_physique integer not null,
  ecart integer generated always as (stock_physique - stock_theorique) stored,
  date_comptage timestamptz default now(),
  notes text default ''
);

-- Bons de reception et de sortie
create table if not exists bons (
  id uuid primary key default gen_random_uuid(),
  boutique_id uuid not null references boutiques(id) on delete cascade,
  utilisateur_id uuid not null references users(id),
  type_bon text not null check(type_bon in ('reception', 'sortie')),
  reference text default '',
  fournisseur text default '',
  client text default '',
  date_bon timestamptz default now(),
  statut text default 'valide' check(statut in ('valide', 'annule')),
  notes text default '',
  created_at timestamptz default now()
);

create table if not exists lignes_bon (
  id uuid primary key default gen_random_uuid(),
  bon_id uuid not null references bons(id) on delete cascade,
  produit_id uuid not null references produits(id),
  nom_produit text not null,
  quantite integer not null check(quantite > 0),
  prix_unitaire numeric(12,2) default 0,
  total numeric(12,2) generated always as (quantite * prix_unitaire) stored
);

-- Fournisseurs et commandes fournisseurs
create table if not exists fournisseurs (
  id uuid primary key default gen_random_uuid(),
  boutique_id uuid not null references boutiques(id) on delete cascade,
  nom text not null,
  telephone text default '',
  email text default '',
  adresse text default '',
  delai_livraison integer default 7,
  notes text default '',
  actif boolean default true,
  created_at timestamptz default now()
);

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
  montant_total numeric(12,2) default 0,
  notes text default '',
  created_at timestamptz default now()
);

create table if not exists lignes_commande_fournisseur (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null references commandes_fournisseurs(id) on delete cascade,
  produit_id uuid references produits(id),
  nom_produit text not null,
  quantite_commandee integer not null default 0,
  quantite_recue integer not null default 0,
  prix_unitaire numeric(12,2) default 0,
  total numeric(12,2) default 0,
  conforme boolean default true,
  notes text default '',
  created_at timestamptz default now()
);

-- Colonnes qualite utilisees par le module bons
alter table lignes_vente add column if not exists conforme boolean default true;
alter table lignes_vente add column if not exists remarque_qualite text default '';

-- Desactiver RLS pour les tables gerees par le backend service_role
alter table inventaires disable row level security;
alter table lignes_inventaire disable row level security;
alter table bons disable row level security;
alter table lignes_bon disable row level security;
alter table fournisseurs disable row level security;
alter table commandes_fournisseurs disable row level security;
alter table lignes_commande_fournisseur disable row level security;

select 'Migration complete appliquee avec succes.' as resultat;
