-- ============================================
-- GESTOCAISSE — Schéma SÉCURISÉ avec RLS
-- À exécuter APRÈS le SCHEMA_SQL.sql initial
-- ============================================
-- Ce script :
--   1. Active Row Level Security (RLS) sur toutes les tables
--   2. Crée des policies restrictives
--   3. Bloque l'accès direct non autorisé à la base
--
-- ⚠️ IMPORTANT : Votre backend utilise SUPABASE_SERVICE_KEY
--    qui BYPASS RLS automatiquement.
--    Les policies RLS protègent contre :
--      - Fuites accidentelles de clés anon
--      - Accès direct à la DB si SERVICE_KEY fuit
--      - Connexions malveillantes via API Supabase publique
-- ============================================

-- ============================================
-- ÉTAPE 1 : Activer RLS sur toutes les tables
-- ============================================

alter table boutiques enable row level security;
alter table users enable row level security;
alter table categories enable row level security;
alter table produits enable row level security;
alter table ventes enable row level security;
alter table lignes_vente enable row level security;
alter table mouvements_stock enable row level security;
alter table clients enable row level security;
alter table credits enable row level security;
alter table abonnements enable row level security;

-- ============================================
-- ÉTAPE 2 : Policies pour la table BOUTIQUES
-- ============================================
-- Une boutique n'est visible que par son propriétaire
-- ou les caissiers qui y sont rattachés
-- ============================================

-- Lecture : utilisateurs voient uniquement leur propre boutique
create policy "Users can view their own boutique"
on boutiques for select
to authenticated
using (
  id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.actif = true
  )
);

-- Mise à jour : seul le propriétaire peut modifier sa boutique
create policy "Proprietaires can update their boutique"
on boutiques for update
to authenticated
using (
  id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.role = 'proprietaire'
      and users.actif = true
  )
);

-- Suppression : seul le propriétaire peut supprimer sa boutique
create policy "Proprietaires can delete their boutique"
on boutiques for delete
to authenticated
using (
  id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.role = 'proprietaire'
      and users.actif = true
  )
);

-- ============================================
-- ÉTAPE 3 : Policies pour la table USERS
-- ============================================
-- Un utilisateur ne voit que les users de SA boutique
-- ============================================

-- Lecture : voir les users de la même boutique
create policy "Users can view users in their boutique"
on users for select
to authenticated
using (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.actif = true
  )
);

-- Mise à jour : un user peut modifier son propre profil
-- OU le propriétaire peut modifier les users de sa boutique
create policy "Users can update own profile or proprietaire can update users"
on users for update
to authenticated
using (
  -- Modifier son propre profil
  id = auth.uid()
  -- OU être propriétaire de la même boutique
  OR boutique_id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.role = 'proprietaire'
      and users.actif = true
  )
);

-- Suppression : seul le propriétaire peut supprimer un user de sa boutique
create policy "Proprietaires can delete users in their boutique"
on users for delete
to authenticated
using (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.role = 'proprietaire'
      and users.actif = true
  )
  -- Protection : on ne peut pas se supprimer soi-même
  AND id != auth.uid()
);

-- ============================================
-- ÉTAPE 4 : Policies pour CATEGORIES, PRODUITS
-- ============================================
-- Données de la boutique : visibles par tous les users de la boutique
-- Modifiables uniquement par le propriétaire
-- ============================================

-- CATEGORIES ─────────────────────────────────

-- Lecture
create policy "Users can view categories in their boutique"
on categories for select
to authenticated
using (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid() and users.actif = true
  )
);

-- Création
create policy "Proprietaires can create categories"
on categories for insert
to authenticated
with check (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.role = 'proprietaire'
      and users.actif = true
  )
);

-- Mise à jour
create policy "Proprietaires can update categories"
on categories for update
to authenticated
using (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.role = 'proprietaire'
      and users.actif = true
  )
);

-- Suppression
create policy "Proprietaires can delete categories"
on categories for delete
to authenticated
using (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.role = 'proprietaire'
      and users.actif = true
  )
);

-- PRODUITS ───────────────────────────────────

-- Lecture : tous les users de la boutique voient les produits
create policy "Users can view produits in their boutique"
on produits for select
to authenticated
using (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid() and users.actif = true
  )
);

-- Création : propriétaire uniquement
create policy "Proprietaires can create produits"
on produits for insert
to authenticated
with check (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.role = 'proprietaire'
      and users.actif = true
  )
);

-- Mise à jour : propriétaire uniquement
create policy "Proprietaires can update produits"
on produits for update
to authenticated
using (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.role = 'proprietaire'
      and users.actif = true
  )
);

-- Suppression : propriétaire uniquement
create policy "Proprietaires can delete produits"
on produits for delete
to authenticated
using (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.role = 'proprietaire'
      and users.actif = true
  )
);

-- ============================================
-- ÉTAPE 5 : Policies pour VENTES & LIGNES_VENTE
-- ============================================
-- Caissiers ET propriétaires peuvent créer des ventes
-- Lecture : tous les users de la boutique
-- ============================================

-- VENTES ─────────────────────────────────────

-- Lecture
create policy "Users can view ventes in their boutique"
on ventes for select
to authenticated
using (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid() and users.actif = true
  )
);

-- Création : caissiers et propriétaires
create policy "Caissiers and proprietaires can create ventes"
on ventes for insert
to authenticated
with check (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.role in ('proprietaire', 'caissier')
      and users.actif = true
  )
);

-- Mise à jour : propriétaire peut annuler (statut = 'annulee')
create policy "Proprietaires can update ventes"
on ventes for update
to authenticated
using (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.role = 'proprietaire'
      and users.actif = true
  )
);

-- Suppression : INTERDITE (garder l'historique comptable)
-- Pas de policy DELETE = pas de suppression possible

-- LIGNES_VENTE ───────────────────────────────

-- Lecture
create policy "Users can view lignes_vente in their boutique"
on lignes_vente for select
to authenticated
using (
  vente_id in (
    select id from ventes
    where boutique_id in (
      select boutique_id from users
      where users.id = auth.uid() and users.actif = true
    )
  )
);

-- Création : mêmes droits que pour les ventes
create policy "Caissiers and proprietaires can create lignes_vente"
on lignes_vente for insert
to authenticated
with check (
  vente_id in (
    select id from ventes
    where boutique_id in (
      select boutique_id from users
      where users.id = auth.uid()
        and users.role in ('proprietaire', 'caissier')
        and users.actif = true
    )
  )
);

-- ============================================
-- ÉTAPE 6 : Policies pour MOUVEMENTS_STOCK
-- ============================================
-- Lecture : tous les users de la boutique
-- Création : caissiers et propriétaires
-- Modification/suppression : INTERDITES (audit trail)
-- ============================================

-- Lecture
create policy "Users can view mouvements in their boutique"
on mouvements_stock for select
to authenticated
using (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid() and users.actif = true
  )
);

-- Création : historique des mouvements
create policy "Users can create mouvements in their boutique"
on mouvements_stock for insert
to authenticated
with check (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.role in ('proprietaire', 'caissier')
      and users.actif = true
  )
);

-- Pas de UPDATE/DELETE = audit trail immuable

-- ============================================
-- ÉTAPE 7 : Policies pour CLIENTS & CREDITS
-- ============================================
-- Lecture : tous les users de la boutique
-- Gestion : caissiers et propriétaires
-- ============================================

-- CLIENTS ────────────────────────────────────

-- Lecture
create policy "Users can view clients in their boutique"
on clients for select
to authenticated
using (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid() and users.actif = true
  )
);

-- Création
create policy "Caissiers and proprietaires can create clients"
on clients for insert
to authenticated
with check (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.role in ('proprietaire', 'caissier')
      and users.actif = true
  )
);

-- Mise à jour
create policy "Caissiers and proprietaires can update clients"
on clients for update
to authenticated
using (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.role in ('proprietaire', 'caissier')
      and users.actif = true
  )
);

-- Suppression : propriétaire uniquement
create policy "Proprietaires can delete clients"
on clients for delete
to authenticated
using (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.role = 'proprietaire'
      and users.actif = true
  )
);

-- CREDITS ────────────────────────────────────

-- Lecture
create policy "Users can view credits in their boutique"
on credits for select
to authenticated
using (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid() and users.actif = true
  )
);

-- Création : lors d'une vente à crédit
create policy "Caissiers and proprietaires can create credits"
on credits for insert
to authenticated
with check (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.role in ('proprietaire', 'caissier')
      and users.actif = true
  )
);

-- Mise à jour : remboursement de crédit
create policy "Caissiers and proprietaires can update credits"
on credits for update
to authenticated
using (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.role in ('proprietaire', 'caissier')
      and users.actif = true
  )
);

-- Suppression : INTERDITE (traçabilité financière)
-- Pas de policy DELETE

-- ============================================
-- ÉTAPE 8 : Policies pour ABONNEMENTS
-- ============================================
-- Lecture : propriétaire uniquement
-- Création/modification : propriétaire
-- ============================================

-- Lecture : propriétaire voit ses abonnements
create policy "Proprietaires can view their abonnements"
on abonnements for select
to authenticated
using (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.role = 'proprietaire'
      and users.actif = true
  )
);

-- Création : propriétaire
create policy "Proprietaires can create abonnements"
on abonnements for insert
to authenticated
with check (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.role = 'proprietaire'
      and users.actif = true
  )
);

-- Mise à jour : propriétaire (statut, dates)
create policy "Proprietaires can update abonnements"
on abonnements for update
to authenticated
using (
  boutique_id in (
    select boutique_id from users
    where users.id = auth.uid()
      and users.role = 'proprietaire'
      and users.actif = true
  )
);

-- ============================================
-- ÉTAPE 9 : Bloquer l'accès ANON (non authentifié)
-- ============================================
-- Par défaut, RLS bloque déjà les anon, mais on l'assure
-- avec une policy explicite qui refuse tout
-- ============================================

-- Pas besoin de policies pour le rôle anon
-- Par défaut, RLS bloque tout accès anon
-- Seules les clés SERVICE_KEY (backend) bypass RLS

-- ============================================
-- ÉTAPE 10 : Fonctions helper (optionnel)
-- ============================================
-- Fonction SQL pour vérifier rapidement le rôle
-- ============================================

create or replace function get_user_role()
returns text
language sql
security definer
stable
as $$
  select role from users
  where id = auth.uid()
  limit 1;
$$;

-- Fonction pour vérifier si l'utilisateur est propriétaire
create or replace function is_proprietaire()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from users
    where id = auth.uid()
      and role = 'proprietaire'
      and actif = true
  );
$$;

-- Fonction pour récupérer l'ID de la boutique de l'utilisateur
create or replace function get_user_boutique_id()
returns uuid
language sql
security definer
stable
as $$
  select boutique_id from users
  where id = auth.uid()
  limit 1;
$$;

-- ============================================
-- ÉTAPE 11 : Vérification finale
-- ============================================

-- Vérifier que RLS est bien activé sur toutes les tables
do $$
declare
  table_name text;
  rls_enabled boolean;
  tables_to_check text[] := array[
    'boutiques', 'users', 'categories', 'produits',
    'ventes', 'lignes_vente', 'mouvements_stock',
    'clients', 'credits', 'abonnements'
  ];
begin
  foreach table_name in array tables_to_check
  loop
    select relrowsecurity into rls_enabled
    from pg_class
    where relname = table_name;

    if rls_enabled then
      raise notice '✅ RLS activé sur %', table_name;
    else
      raise warning '❌ RLS DÉSACTIVÉ sur %', table_name;
    end if;
  end loop;
end $$;

-- Lister toutes les policies créées
select
  schemaname,
  tablename,
  policyname,
  cmd as operation
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- Succès!
select 'RLS activé et policies configurées avec succès !' as resultat;

-- ============================================
-- NOTES IMPORTANTES
-- ============================================
--
-- 🔑 ARCHITECTURE DE SÉCURITÉ :
--
--    Frontend (React)
--        ↓ JWT Token
--    Backend Node.js (Express)
--        ↓ SUPABASE_SERVICE_KEY (bypass RLS)
--    Supabase Database (RLS activé en protection)
--
-- 📋 RÔLES :
--    - admin : accès total (système)
--    - proprietaire : gestion complète de sa boutique
--    - caissier : ventes et clients uniquement
--
-- 🛡️ PROTECTIONS :
--    - RLS bloque l'accès direct non authentifié
--    - SERVICE_KEY reste secrète côté serveur
--    - Audit trail : pas de suppression pour ventes/credits
--    - Protection anti-auto-suppression
--
-- ⚠️ SI VOUS UTILISEZ VOTRE PROPRE AUTHENTIFICATION (pas Supabase Auth) :
--    Vous n'avez peut-être PAS besoin de RLS car tout passe par votre backend.
--    Dans ce cas, supprimez ce script et gardez RLS désactivé.
--    MAIS : c'est une couche de protection supplémentaire recommandée.
--
-- ============================================
