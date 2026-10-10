-- ============================================
-- GESTOCAISSE — Migration idempotence offline
-- Exécuter dans Supabase > SQL Editor > Run
-- ============================================

-- 1. Ajouter la colonne local_id pour l'idempotence des ventes offline
alter table ventes
  add column if not exists local_id text;

-- 2. Index unique sur local_id pour la recherche rapide d'idempotence
create unique index if not exists idx_ventes_local_id
  on ventes (local_id)
  where local_id is not null;

-- 3. Nettoyer les doublons si existants (garder le plus ancien)
do $$
declare
  r record;
  oldest_id uuid;
begin
  for r in
    select min(id) as keep_id, local_id
    from ventes
    where local_id is not null
    group by local_id
    having count(*) > 1
  loop
    delete from ventes
    where local_id = r.local_id
      and id != r.keep_id;
  end loop;
end;
$$;

-- Confirmation
select 'Migration idempotence appliquée avec succès !' as status;
