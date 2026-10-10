# GestoCaisse v1.0

---

##  Problème résolu - Erreur 404 à l'inscription

**Cause** : Le backend n'était pas démarré, ou les clés Supabase manquaient.
**Solution** : Suivez les 5 étapes ci-dessous dans l'ordre exact.

---

##  Installation - 5 étapes (20 minutes)

###  1. Récupérer vos clés Supabase

1. Allez sur https://supabase.com et connectez-vous
2. Sélectionnez votre projet (`zafusuyauhbtnydzzmzc`)
3. Dans le menu gauche : **Project Settings** → **API**
4. Copiez ces 2 clés :

```
anon public          → SUPABASE_ANON_KEY
service_role secret  → SUPABASE_SERVICE_KEY  (cliquez "Reveal" pour voir)
```

---

###  2. Créer les tables dans Supabase

1. Dans Supabase → menu gauche → **SQL Editor**
2. Cliquez **"+ New query"**
3. Ouvrez le fichier : `backend/SCHEMA_SQL.sql`
4. **Sélectionnez tout** (Ctrl+A) et copiez
5. Collez dans Supabase SQL Editor
6. Cliquez **"Run"** (bouton vert)
7. Vous devez voir : `Tables créées avec succès!`

> Si Supabase affiche l'erreur « Désolé ! Une extension de navigateur… removeChild » : fermez les extensions de traduction/tiers, ouvrez Supabase en navigation privée ou dans un autre navigateur, puis relancez le script.

>  Si vous voyez "relation does not exist" plus tard → vous avez sauté cette étape.

---

###  3. Configurer le fichier .env

Ouvrez `backend/.env` et remplacez les deux lignes :

```
SUPABASE_ANON_KEY=COLLER_VOTRE_ANON_KEY_ICI
SUPABASE_SERVICE_KEY=COLLER_VOTRE_SERVICE_KEY_ICI
```

Par les vraies valeurs copiées à l'étape 1.

Exemple (NE PAS copier ces valeurs, elles sont fausses) :
```
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

###  4. Lancer le backend

Ouvrez un terminal (ou PowerShell) :

```bash
cd gestocaisse/backend
npm install
node src/database/setup.js    # → Crée le compte admin
npm run dev                   # → Lance le serveur
```

Vous devez voir :
```
╔══════════════════════════════════════╗
║      GestoCaisse API v1.0.0          ║
╠══════════════════════════════════════╣
║  URL     : http://localhost:5000      ║
║  Supabase: ✅ OK                     ║
╚══════════════════════════════════════╝

Compte admin disponible:
  gestocaisse6@gmail.com / Admin1234!
```

>  Si vous voyez `Supabase: ❌ MANQUANT` → retournez à l'étape 3.

---

###  5. Lancer le frontend

Ouvrez **un 2ème terminal** :

```bash
cd gestocaisse/frontend
npm install
npm start
```

Le site s'ouvre sur **http://localhost:3000** 

---

## Comptes disponibles

| Compte | Email | Mot de passe |
|---|---|---|
|  Admin | gestocaisse6@gmail.com | Admin1234! |

Limites par plan :
- **Starter** : 5 produits maximum
- **Pro** : 2 caissiers maximum
- **Business** : caissiers illimités

Vous pouvez aussi créer votre propre compte via l'inscription.

---

## Fonctionnalités principales

-  Gestion de caisse et encaissement
-  Gestion des ventes et historique
-  Gestion du stock avec alertes
-  Programme de fidélité
-  Gestion des crédits clients
-  Rapports et analytics
-  Mode offline (PWA)
-  Personnalisation des reçus

---

##  Personnalisation des reçus

Chaque boutique peut personnaliser son reçu (couleurs, logo, libellés, pied de page).

### Commande SQL pour activer la personnalisation

Si votre base Supabase n'a pas encore les colonnes de personnalisation du reçu, exécutez cette commande dans **Supabase > SQL Editor > New query** :

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
  add column if not exists ticket_message text default 'À bientôt !';
```

Ensuite redémarrez le backend et rechargez l'application.

---

##  Problèmes fréquents

### "404 Not Found" à l'inscription
- Le backend ne tourne pas. Lancez `npm run dev` dans `backend/`.
- Vérifiez que http://localhost:5000/api/health répond dans votre navigateur.

### "relation 'users' does not exist"
- Vous n'avez pas exécuté le SQL. Retournez à l'étape 2.

### "Invalid API key"
- Vos clés Supabase dans .env sont incorrectes. Revérifiez l'étape 3.

### Email de confirmation ne part pas
- Normal si Gmail n'est pas configuré. Regardez dans la console backend :
- Vous verrez une ligne `[Dev] Lien confirmation: http://localhost:3000/confirmer-email/XXXX`
- Copiez ce lien dans votre navigateur pour confirmer manuellement.

---

## Correctif suppression de compte (obligatoire si l'erreur persiste)

Si vous voyez encore l'erreur :

```text
update or delete on table "users" violates foreign key constraint "boutiques_proprietaire_id_fkey"
```

ou

```text
update or delete on table "users" violates foreign key constraint "ventes_caissier_id_fkey"
```

alors votre base Supabase actuelle a encore les anciennes contraintes. Dans **Supabase > SQL Editor > New query**, exécutez ce correctif :

>  Attention : cette réparation supprime des lignes orphelines et recrée les clés étrangères. Exécutez-la uniquement si vous comprenez les risques et avez une sauvegarde récente de votre base.

```sql
-- 1) rendre la colonne propriétaire temporairement nullable
alter table boutiques alter column proprietaire_id drop not null;

-- 2) supprimer les anciennes contraintes FK
alter table boutiques drop constraint if exists boutiques_proprietaire_id_fkey;
alter table users drop constraint if exists users_boutique_id_fkey;
alter table ventes drop constraint if exists ventes_caissier_id_fkey;
alter table abonnements drop constraint if exists abonnements_boutique_id_fkey;
alter table lignes_vente drop constraint if exists lignes_vente_produit_id_fkey;

-- 3) corriger les lignes orphelines
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

-- 5) supprimer les lignes orphelines
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

Ensuite redémarrez le backend, puis essayez à nouveau la suppression.

---

## Correctif abonnement en attente

Si le paiement MoMo affiche cette erreur :

```text
new row for relation "abonnements" violates check constraint "abonnements_statut_check"
```

Dans **Supabase > SQL Editor > New query**, exécutez :

```sql
alter table abonnements drop constraint if exists abonnements_statut_check;

alter table abonnements add constraint abonnements_statut_check
  check(statut in ('actif','expire','annule','en_attente'));
```

Ensuite :

1. Redémarrez le backend.
2. Reconnectez-vous avec le compte propriétaire.
3. Refaites une demande de paiement MoMo depuis la page Abonnement.
4. Connectez-vous avec `gestocaisse6@gmail.com`.
5. Ouvrez `Panel Admin > Abonnements en attente`.
6. Cliquez sur `Confirmer le paiement`.

---

##  Structure du projet

```
gestocaisse/
├── backend/
│   ├── SCHEMA_SQL.sql         → Schéma de la base de données
│   ├── .env                   → Configuration (clés Supabase)
│   ├── package.json
│   └── src/
│       ├── server.js          → Point d'entrée API
│       ├── database/
│       │   ├── supabase.js    → Connexion Supabase
│       │   └── setup.js       → Script création admin
│       ├── middleware/
│       │   ├── auth.js        → Authentification JWT
│       │   └── sanitize.js    → Protection XSS
│       ├── routes/
│       │   ├── auth.js        → Inscription / connexion
│       │   ├── produits.js    → Catalogue produits
│       │   ├── ventes.js      → Transactions
│       │   ├── stock.js       → Inventaire
│       │   ├── clients.js     → Gestion clients
│       │   ├── caisse.js      → Sessions caisse
│       │   ├── rapports.js    → Analytics
│       │   ├── paiements.js    → MoMo + Stripe
│       │   ├── credit_avance.js → Crédits
│       │   ├── fidelite.js     → Programme fidélité
│       │   ├── ohada.js        → Comptabilité
│       │   ├── momo.js         → MTN Mobile Money
│       │   └── ... (autres routes)
│       └── utils/
│           └── credit.js      → Utilitaires crédit
└── frontend/
    ├── package.json
    └── src/
        ├── App.tsx            → Routage principal
        ├── pages/
        │   ├── Dashboard.tsx  → Tableau de bord
        │   ├── Caisse.tsx     → Encaissement
        │   ├── Stock.tsx      → Gestion stock
        │   ├── Clients.tsx    → CRM
        │   ├── Rapports.tsx    → Analytics
        │   └── auth/          → Pages auth
        ├── components/
        │   └── layout/
        ├── services/
        │   ├── api.ts         → API client
        │   └── offlineDb.ts   → Base offline (PWA)
        └── store/
            └── authStore.ts   → State auth
```

---

##  Améliorations récentes

### v1.0.2 - Mode Offline Complet

- **Synchronisation offline** — Ventes mises en cache et syncées au retour du réseau
- **Idempotence** — Même vente envoyée plusieurs fois = pas de doublons
- **Retry exponentiel** — 1s, 2s, 4s, 8s... jusqu'à 5 min max
- **Détection conflits** — Stock insuffisant / produit introuvable détecté automatiquement
- **Bannière de statut** — Indicateur visuel dans le Layout
- **Page de gestion** — Paramètres → Synchronisation (conflits, stats)
- **Endpoint idempotent** — `POST /api/ventes` avec `local_id`

### v1.0.1 - Sécurisation et performance

- **CSP activée** — Protection XSS renforcée
- **Validation des entrées** — `express-validator` dans toutes les routes
- **Transactions atomiques** — Rollback automatique en cas d'erreur
- **Optimisation N+1** — Requêtes groupées, parallélisées avec `Promise.all`
- **Index de performance** — Ajoutés dans `SCHEMA_SQL.sql`
- **Fonction atomique** — `incrementer_client_stats` pour les stats client
- **Nettoyage code** — Suppression des duplications JS/TS

### Nouvelles fonctionnalités SQL

Exécutez `backend/FUNCTIONS_SQL.sql` dans Supabase pour :
- Fonction atomique de mise à jour stats client
- Index de performance sur toutes les tables principales

### Migration pour le mode offline (existant uniquement)

Exécutez `backend/MIGRATION_VENTES_IDEMPOTENCE.sql` dans Supabase pour :
- Ajouter la colonne `local_id` à la table `ventes`
- Index unique pour la recherche rapide d'idempotence

### Migration complète stock et offline

Si les pages **Bons**, **Commandes**, **Inventaires** ou l'envoi des ventes offline affichent une erreur, exécutez le fichier `backend/MIGRATION_COMPLETE_STOCK_OFFLINE.sql` dans Supabase > SQL Editor. Il crée les tables et colonnes manquantes en une seule opération.

---

##  Variables d'environnement

| Variable | Description |
|----------|-------------|
| `PORT` | Port du serveur (défaut: 5000) |
| `NODE_ENV` | development / production |
| `FRONTEND_URL` | URL du frontend |
| `JWT_SECRET` | Clé secrète JWT |
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_ANON_KEY` | Clé publique Supabase |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase |
| `EMAIL_USER` | Email pour envoi |
| `EMAIL_PASS` | Mot de passe app Gmail |
| `STRIPE_SECRET_KEY` | Clé Stripe |
| `SMS_PROVIDER` | africastalking ou twilio |

---

---

## 🚀 Déploiement

📘 **Guide complet de déploiement gratuit** : voir [`README-DEPLOIEMENT.md`](./README-DEPLOIEMENT.md)

**Hébergement 100% gratuit recommandé :**
- **Frontend** : Vercel
- **Backend** : Belmo.io
- **BDD** : Supabase

**Coût total : 0€/mois** pour démarrer

---

## v1.1 - Améliorations UX & Interactivité (2026-09-09)

### Ajout principal
- **Transitions de page fluides** avec Framer Motion et `AnimatePresence` (ancrage `wait` pour éviter les sauts)
- **Composants réutilisables** : `AnimatedCounter`, `Skeleton`, `EmptyState`, `PageTransition`, `BottomNav`
- **Raccourcis clavier** globaux (`Ctrl+N`, `Ctrl+E`, `Ctrl+C`, `Esc`, `Ctrl+K`)
- **Skeleton screens** partout pendant le chargement
- **États vides illustrés** avec titres, descriptions et CTA
- **Bottom Navigation** tactile pour mobile (< 1024px)
- **Indicateurs de dernière synchronisation** et polling intelligent

### Nouvelles dépendances
```bash
npm install framer-motion react-countup react-use react-swipeable
```

### Améliorations techniques
- Mise à jour TypeScript strict sur les fichiers critiques (Commandes.tsx, RapportsStock.tsx, etc.)
- Correction des erreurs `Cannot find name` et `TS2322` dans plusieurs composants
- Compatibilité dark mode préservée sur toutes les nouvelles composantes

### Migration requise
```bash
# Mettre à jour les fichiers concernés (voir plan complet)
npx tsc --noEmit
npx react-scripts build
```

---

## 🚀 Déploiement
