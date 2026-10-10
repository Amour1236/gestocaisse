-- ============================================
-- GESTOCAISSE — Schéma base de données Supabase
-- Copiez TOUT ce texte dans SQL Editor > Run
-- ============================================

create extension if not exists "pgcrypto";

create table if not exists boutiques (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  proprietaire_id uuid not null,
  logo text default '',
  adresse text default '',
  telephone text default '',
  devise text default 'FCFA',
  plan text default 'starter' check(plan in ('starter','pro','business')),
  plan_expire_at timestamptz,
  ticket_primary_color text default '#059669',
  ticket_secondary_color text default '#0f766e',
  ticket_text_color text default '#111827',
  ticket_footer text default 'Merci pour votre achat !',
  ticket_message text default 'À bientôt 😊',
  actif boolean default true,
  created_at timestamptz default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  prenom text not null,
  email text unique not null,
  mot_de_passe text not null,
  role text default 'proprietaire' check(role in ('proprietaire','caissier','admin')),
  boutique_id uuid references boutiques(id) on delete set null,
  email_verifie boolean default false,
  email_token text default '',
  reset_token text default '',
  reset_expire timestamptz,
  actif boolean default true,
  created_at timestamptz default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  boutique_id uuid not null references boutiques(id) on delete cascade,
  nom text not null,
  couleur text default '#10b981',
  created_at timestamptz default now()
);

create table if not exists produits (
  id uuid primary key default gen_random_uuid(),
  boutique_id uuid not null references boutiques(id) on delete cascade,
  categorie_id uuid references categories(id),
  nom text not null,
  code_barre text default '',
  description text default '',
  prix_achat decimal(12,2) default 0,
  prix_vente decimal(12,2) not null,
  stock_actuel integer default 0,
  stock_minimum integer default 5,
  unite text default 'unité',
  actif boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ventes (
  id uuid primary key default gen_random_uuid(),
  boutique_id uuid not null references boutiques(id) on delete cascade,
  caissier_id uuid references users(id),
  client_id uuid,
  numero text not null,
  local_id text, -- pour idempotence offline
  total decimal(12,2) not null,
  remise decimal(12,2) default 0,
  total_final decimal(12,2) not null,
  mode_paiement text default 'especes' check(mode_paiement in ('especes','momo','carte','credit')),
  statut text default 'payee' check(statut in ('payee','credit','annulee')),
  notes text default '',
  created_at timestamptz default now()
);

create table if not exists lignes_vente (
  id uuid primary key default gen_random_uuid(),
  vente_id uuid not null references ventes(id) on delete cascade,
  produit_id uuid not null references produits(id) on delete cascade,
  nom_produit text not null,
  quantite integer not null,
  prix_unitaire decimal(12,2) not null,
  prix_achat decimal(12,2) default 0,
  total decimal(12,2) not null
);

create table if not exists mouvements_stock (
  id uuid primary key default gen_random_uuid(),
  boutique_id uuid not null references boutiques(id) on delete cascade,
  produit_id uuid not null references produits(id),
  type text not null check(type in ('entree','sortie','ajustement','vente','retour')),
  quantite integer not null,
  stock_avant integer not null,
  stock_apres integer not null,
  motif text default '',
  reference_id uuid,
  created_at timestamptz default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  boutique_id uuid not null references boutiques(id) on delete cascade,
  nom text not null,
  telephone text default '',
  email text default '',
  adresse text default '',
  credit_encours decimal(12,2) default 0,
  total_achats decimal(12,2) default 0,
  nb_achats integer default 0,
  notes text default '',
  created_at timestamptz default now()
);

create table if not exists credits (
  id uuid primary key default gen_random_uuid(),
  boutique_id uuid not null references boutiques(id) on delete cascade,
  client_id uuid not null references clients(id),
  vente_id uuid references ventes(id),
  montant decimal(12,2) not null,
  montant_rembourse decimal(12,2) default 0,
  statut text default 'en_cours' check(statut in ('en_cours','rembourse','partiel')),
  date_echeance timestamptz,
  created_at timestamptz default now()
);

create table if not exists abonnements (
  id uuid primary key default gen_random_uuid(),
  boutique_id uuid not null references boutiques(id) on delete cascade,
  plan text not null,
  montant_fcfa integer not null,
  montant_eur decimal(8,2) default 0,
  statut text default 'actif' check(statut in ('actif','expire','annule','en_attente')),
  methode text default 'stripe',
  stripe_session_id text default '',
  reference_momo text default '',
  debut timestamptz default now(),
  fin timestamptz not null,
  created_at timestamptz default now()
);

-- Désactiver RLS pour que l'API backend puisse accéder
-- Mettre à jour la contrainte si la table existait déjà sans le statut en_attente.
-- Corriger les contraintes FK existantes pour permettre la suppression d'un utilisateur
alter table boutiques alter column proprietaire_id drop not null;
alter table boutiques add column if not exists ticket_primary_color text default '#059669';
alter table boutiques add column if not exists ticket_secondary_color text default '#0f766e';
alter table boutiques add column if not exists ticket_text_color text default '#111827';
alter table boutiques add column if not exists ticket_footer text default 'Merci pour votre achat !';
alter table boutiques add column if not exists ticket_message text default 'À bientôt 😊';

alter table boutiques drop constraint if exists boutiques_proprietaire_id_fkey;
alter table users drop constraint if exists users_boutique_id_fkey;
alter table ventes drop constraint if exists ventes_caissier_id_fkey;
alter table abonnements drop constraint if exists abonnements_boutique_id_fkey;
alter table lignes_vente drop constraint if exists lignes_vente_produit_id_fkey;

update boutiques b
set proprietaire_id = (
  select u.id
  from users u
  where u.boutique_id = b.id
    and u.role = 'proprietaire'
  order by u.created_at asc
  limit 1
)
where b.proprietaire_id is null
   or not exists (select 1 from users u where u.id = b.proprietaire_id);

update ventes v
set caissier_id = null
where v.caissier_id is not null
  and not exists (select 1 from users u where u.id = v.caissier_id);

delete from abonnements a
where not exists (select 1 from boutiques b where b.id = a.boutique_id);

delete from lignes_vente lv
where not exists (select 1 from produits p where p.id = lv.produit_id);

alter table boutiques
  add constraint boutiques_proprietaire_id_fkey
  foreign key (proprietaire_id) references users(id) on delete set null;

alter table users
  add constraint users_boutique_id_fkey
  foreign key (boutique_id) references boutiques(id) on delete set null;

alter table ventes
  add constraint ventes_caissier_id_fkey
  foreign key (caissier_id) references users(id) on delete set null;

alter table abonnements
  add constraint abonnements_boutique_id_fkey
  foreign key (boutique_id) references boutiques(id) on delete cascade;

alter table lignes_vente
  add constraint lignes_vente_produit_id_fkey
  foreign key (produit_id) references produits(id) on delete cascade;

alter table abonnements drop constraint if exists abonnements_statut_check;
alter table abonnements add constraint abonnements_statut_check
  check(statut in ('actif','expire','annule','en_attente'));

-- ─── INDEX DE PERFORMANCE ───────────────────────────────────────────────────
create unique index if not exists idx_ventes_local_id on ventes (local_id) where local_id is not null;
create index if not exists idx_ventes_boutique_created on ventes (boutique_id, created_at desc) where statut != 'annulee';
create index if not exists idx_ventes_client_created on ventes (client_id, created_at desc) where statut != 'annulee';
create index if not exists idx_lignes_vente_vente on lignes_vente (vente_id);
create index if not exists idx_lignes_vente_produit on lignes_vente (produit_id);
create index if not exists idx_produits_boutique_actif on produits (boutique_id, actif) where actif = true;
create index if not exists idx_mouvements_stock_boutique on mouvements_stock (boutique_id, created_at desc);
create index if not exists idx_mouvements_stock_produit on mouvements_stock (produit_id, created_at desc);
create index if not exists idx_credits_client_boutique on credits (client_id, boutique_id);
create index if not exists idx_clients_boutique on clients (boutique_id);

alter table boutiques disable row level security;
alter table users disable row level security;
alter table categories disable row level security;
alter table produits disable row level security;
alter table ventes disable row level security;
alter table lignes_vente disable row level security;
alter table mouvements_stock disable row level security;
alter table clients disable row level security;
alter table credits disable row level security;
alter table abonnements disable row level security;

-- Succès!
select 'Tables créées avec succès!' as resultat;
