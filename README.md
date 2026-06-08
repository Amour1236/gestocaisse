# GestoCaisse v1.0 ????

---

## ?? PROBLEME RESOLU - Erreur 404 a l'inscription

**Cause** : Le backend n'etait pas demarre, ou les cles Supabase manquaient.
**Solution** : Suivez les 5 etapes ci-dessous dans l'ordre exact.

---

## ?? Installation - 5 etapes (20 minutes)

### ? Recuperer vos cles Supabase

1. Allez sur https://supabase.com ? connectez-vous
2. Selectionnez votre projet (`zafusuyauhbtnydzzmzc`)
3. Dans le menu gauche : **?? Project Settings** ? **API**
4. Copiez ces 2 cles :

```
anon public          ? SUPABASE_ANON_KEY
service_role secret  ? SUPABASE_SERVICE_KEY  (cliquez "Reveal" pour voir)
```

---

### ? Creer les tables dans Supabase

1. Dans Supabase ? menu gauche ? **SQL Editor**
2. Cliquez **"+ New query"**
3. Ouvrez le fichier : `backend/SCHEMA_SQL.sql`
4. **Selectionnez tout** (Ctrl+A) et copiez
5. Collez dans Supabase SQL Editor
6. Cliquez **"Run"** (bouton vert)
7. Vous devez voir : `Tables creees avec succes!`

> Si Supabase affiche l’erreur « Désolé ! Une extension de navigateur… removeChild » : fermez les extensions de traduction/tiers, ouvrez Supabase en navigation privée ou dans un autre navigateur, puis relancez le script.

> ?? Si vous voyez "relation does not exist" plus tard ? vous avez saute cette etape.

---

### ? Configurer le fichier .env

Ouvrez `backend/.env` et remplacez les deux lignes :

```
SUPABASE_ANON_KEY=COLLER_VOTRE_ANON_KEY_ICI
SUPABASE_SERVICE_KEY=COLLER_VOTRE_SERVICE_KEY_ICI
```

Par les vraies valeurs copiees a l'etape ?.

Exemple (NE PAS copier ces valeurs, elles sont fausses) :
```
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### ? Lancer le backend

Ouvrez un terminal (ou PowerShell) :

```bash
cd gestocaisse/backend
npm install
node src/database/setup.js    # ? Cree le compte admin
npm run dev                   # ? Lance le serveur
```

Vous devez voir :
```
????????????????????????????????????????
?      GestoCaisse API v1.0.0          ?
????????????????????????????????????????
?  URL     : http://localhost:5000      ?
?  Supabase: ? OK                     ?
????????????????????????????????????????

Compte admin disponible:
   admin@gestocaisse.com / Admin1234!
```

> ? Si vous voyez `Supabase: ? MANQUANT` ? retournez a l'etape ?

---

### ? Lancer le frontend

Ouvrez **un 2eme terminal** :

```bash
cd gestocaisse/frontend
npm install
npm start
```

Le site s'ouvre sur **http://localhost:3000** ??

---

## Comptes disponibles

| Compte | Email | Mot de passe |
|---|---|---|
| ??? Admin | admin@gestocaisse.com | Admin1234! |

Limites par plan :
- Starter : le propriétaire compte déjà comme caissier ; l'administrateur reste le seul autre compte autorisé
- Pro : 2 caissiers maximum
- Business : caissiers illimités

Vous pouvez aussi creer votre propre compte via l'inscription.

Fonctionnalités à venir / à maintenir :
- chaque boutique doit pouvoir personnaliser son reçu (couleurs, logo, libellés, pied de page, etc.)

---

## Commande SQL pour la personnalisation du reçu

Si votre base Supabase n'a pas encore les colonnes de personnalisation du reçu, exécutez cette commande dans Supabase > SQL Editor > New query :

```sql
alter table boutiques
  add column if not exists ticket_primary_color text default '#059669';

alter table boutiques
  add column if not exists ticket_secondary_color text default '#0f766e';

alter table boutiques
  add column if not exists ticket_text_color text default '#111827';

alter table boutiques
  add column if not exists ticket_footer text default 'Merci pour votre achat !';

alter table boutiques
  add column if not exists ticket_message text default 'À bientôt 😊';
```

Ensuite redémarrez le backend et rechargez l'application.

---

## ? Problemes frequents

**"404 Not Found" a l'inscription**
? Le backend ne tourne pas. Lancez `npm run dev` dans `backend/`.
? Verifiez que http://localhost:5000/api/health repond dans votre navigateur.

**"relation 'users' does not exist"**
? Vous n'avez pas execute le SQL. Retournez a l'etape ?.

**"Invalid API key"**
? Vos cles Supabase dans .env sont incorrectes. Reverifiez l'etape ??.

**Email de confirmation ne part pas**
? Normal si Gmail n'est pas configure. Regardez dans la console backend :
? Vous verrez une ligne `[Dev] Lien confirmation: http://localhost:3000/confirmer-email/XXXX`
? Copiez ce lien dans votre navigateur pour confirmer manuellement.

## Correctif suppression de compte (obligatoire si l'erreur persiste)

Si vous voyez encore l'erreur :

```text
update or delete on table "users" violates foreign key constraint "boutiques_proprietaire_id_fkey"
```

ou

```text
update or delete on table "users" violates foreign key constraint "ventes_caissier_id_fkey"
```

alors votre base Supabase actuelle a encore les anciennes contraintes. Dans Supabase > SQL Editor > New query, exécutez ce correctif :

> ⚠️ Attention : cette réparation supprime des lignes orphelines et recrée les clés étrangères. Exécutez-la uniquement si vous comprenez les risques et avez une sauvegarde récente de votre base.

```sql
-- 1) rendre la colonne propriétaire temporairement nullable
alter table boutiques alter column proprietaire_id drop not null;

-- 2) supprimer les anciennes contraintes FK (y compris celles qui bloquent la suppression du compte admin)
alter table boutiques drop constraint if exists boutiques_proprietaire_id_fkey;
alter table users drop constraint if exists users_boutique_id_fkey;
alter table ventes drop constraint if exists ventes_caissier_id_fkey;
alter table abonnements drop constraint if exists abonnements_boutique_id_fkey;
alter table lignes_vente drop constraint if exists lignes_vente_produit_id_fkey;

-- 3) corriger les lignes orphelines en leur attribuant un propriétaire valide si possible
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

-- 4) nettoyer les ventes liées à des caissiers supprimés
update ventes v
set caissier_id = null
where v.caissier_id is not null
  and not exists (select 1 from users u where u.id = v.caissier_id);

-- 5) supprimer les lignes orphelines qui bloquent la recréation des FK
delete from abonnements a
where not exists (select 1 from boutiques b where b.id = a.boutique_id);

delete from lignes_vente lv
where not exists (select 1 from produits p where p.id = lv.produit_id);

-- 6) recréer les FK avec suppression en cascade / set null
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
```

Ensuite redémarrez le backend, puis essayez à nouveau la suppression. Si Supabase affiche encore « Could not find a relationship… » dans l’UI, rechargez simplement l’onglet SQL / la page de schéma pour actualiser le cache avant de relancer le correctif.

---

## Correctif abonnement en attente

Si le paiement MoMo affiche cette erreur:

```text
new row for relation "abonnements" violates check constraint "abonnements_statut_check"
```

alors Supabase refuse encore le statut `en_attente`. Dans ce cas, l'abonnement n'est pas cree du tout, donc l'administrateur ne peut pas le voir dans "Abonnements en attente".

Dans Supabase > SQL Editor > New query, executez:

```sql
alter table abonnements drop constraint if exists abonnements_statut_check;

alter table abonnements add constraint abonnements_statut_check
  check(statut in ('actif','expire','annule','en_attente'));
```

Ensuite:

1. Redemarrez le backend.
2. Reconnectez-vous avec le compte proprietaire.
3. Refaites une demande de paiement MoMo depuis la page Abonnement.
4. Connectez-vous avec `admin@gestocaisse.com`.
5. Ouvrez `Panel Admin > Abonnements en attente`.
6. Cliquez sur `Confirmer le paiement`.

## ?? Structure du projet

```
gestocaisse/
??? backend/
?   ??? SCHEMA_SQL.sql         ? a executer dans Supabase (etape ?)
?   ??? .env                   ? a configurer (etape ?)
?   ??? package.json
?   ??? src/
?       ??? server.js          ? Point d'entree API
?       ??? database/
?       ?   ??? supabase.js    ? Connexion DB
?       ?   ??? setup.js       ? Cree le compte admin
?       ??? middleware/auth.js
?       ??? routes/
?           ??? auth.js        ? Inscription / connexion
?           ??? produits.js
?           ??? ventes.js      ? Caisse
?           ??? stock.js
?           ??? clients.js
?           ??? rapports.js
?           ??? paiements.js   ? MoMo + Stripe
??? frontend/
    ??? src/
        ??? App.js
        ??? pages/
        ?   ??? Accueil.jsx    ? Page d'accueil (/)
        ?   ??? Dashboard.jsx  ? Tableau de bord (/app)
        ?   ??? caisse/        ? Caisse (/app/caisse)
        ?   ??? stock/         ? Stock (/app/stock)
        ?   ??? clients/       ? Clients (/app/clients)
        ?   ??? rapports/      ? Rapports (/app/rapports)
        ??? ...
```

---

GestoCaisse — © 2026. Tous droits réservés.
"# GestoGaisse" 
