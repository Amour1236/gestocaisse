-- Correctif pour l'erreur:
-- new row for relation "abonnements" violates check constraint "abonnements_statut_check"
--
-- A executer dans Supabase > SQL Editor > New query > Run.
-- Cette migration autorise le statut utilise pour les paiements MoMo en attente.

alter table abonnements drop constraint if exists abonnements_statut_check;

alter table abonnements add constraint abonnements_statut_check
  check(statut in ('actif','expire','annule','en_attente'));
