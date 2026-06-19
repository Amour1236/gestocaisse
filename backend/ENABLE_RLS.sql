-- ============================================================
-- ACTIVER RLS — Bloquer l'accès direct à Supabase REST API
-- Le service_role (backend) garde tous les droits.
-- À exécuter dans Supabase SQL Editor > Run
-- ============================================================

-- 1. Activer RLS sur toutes les tables
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
alter table momo_portefeuilles enable row level security;
alter table momo_transactions enable row level security;

-- 2. Autoriser uniquement le service_role (votre backend Node.js)
--    à lire/écrire. L'anon key et les users Supabase Auth sont bloqués.

create policy "service_role_only" on boutiques for all using (auth.role() = 'service_role');
create policy "service_role_only" on users for all using (auth.role() = 'service_role');
create policy "service_role_only" on categories for all using (auth.role() = 'service_role');
create policy "service_role_only" on produits for all using (auth.role() = 'service_role');
create policy "service_role_only" on ventes for all using (auth.role() = 'service_role');
create policy "service_role_only" on lignes_vente for all using (auth.role() = 'service_role');
create policy "service_role_only" on mouvements_stock for all using (auth.role() = 'service_role');
create policy "service_role_only" on clients for all using (auth.role() = 'service_role');
create policy "service_role_only" on credits for all using (auth.role() = 'service_role');
create policy "service_role_only" on abonnements for all using (auth.role() = 'service_role');
create policy "service_role_only" on momo_portefeuilles for all using (auth.role() = 'service_role');
create policy "service_role_only" on momo_transactions for all using (auth.role() = 'service_role');

select 'RLS activé avec succès — seul le backend peut accéder aux données.' as resultat;
