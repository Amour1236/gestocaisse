-- ============================================
-- GESTOCAISSE — Fonctions SQL atomiques
-- À exécuter dans Supabase > SQL Editor > Run
-- ============================================

-- Fonction atomique pour mettre à jour les stats d'un client
-- Évite les race conditions lors de l'enregistrement d'une vente
create or replace function incrementer_client_stats(
  client_id_param uuid,
  montant_achat numeric,
  credit_param numeric
) returns void as $$
begin
  update clients
  set
    total_achats = coalesce(total_achats, 0) + montant_achat,
    nb_achats = coalesce(nb_achats, 0) + 1,
    credit_encours = credit_param
  where id = client_id_param;
end;
$$ language plpgsql;

-- Index de performance
create index if not exists idx_ventes_boutique_created
  on ventes (boutique_id, created_at desc)
  where statut != 'annulee';

create index if not exists idx_ventes_client
  on ventes (client_id, created_at desc)
  where statut != 'annulee';

create index if not exists idx_lignes_vente_vente
  on lignes_vente (vente_id);

create index if not exists idx_lignes_vente_produit
  on lignes_vente (produit_id);

create index if not exists idx_produits_boutique_actif
  on produits (boutique_id, actif)
  where actif = true;

create index if not exists idx_produits_boutique_categorie
  on produits (boutique_id, categorie_id)
  where actif = true;

create index if not exists idx_credits_client_boutique
  on credits (client_id, boutique_id);

create index if not exists idx_credits_boutique_statut
  on credits (boutique_id, statut)
  where statut in ('en_cours', 'partiel');

create index if not exists idx_mouvements_stock_boutique
  on mouvements_stock (boutique_id, created_at desc);

create index if not exists idx_mouvements_stock_produit
  on mouvements_stock (produit_id, created_at desc);

create index if not exists idx_caisse_sessions_boutique
  on caisse_sessions (boutique_id, opened_at desc);

create index if not exists idx_caisse_sessions_caissier
  on caisse_sessions (caissier_id, statut)
  where statut = 'ouverte';

create index if not exists idx_clients_boutique
  on clients (boutique_id);

create index if not exists idx_clients_boutique_nom
  on clients (boutique_id, nom);

-- Confirmation
select 'Fonctions et index installés avec succès !' as status;
