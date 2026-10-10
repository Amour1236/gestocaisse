# Déploiement gratuit — GestoCaisse (sans abonnement, sans suspension)

## 🏆 Architecture 100% gratuite (choix recommandé)

```
Utilisateur
    │
    ├── Frontend ────► Vercel (gratuit, illimité, toujours actif)
    │                   (React/TypeScript + PWA)
    │
    └── Backend  ────► Belmo.io (gratuit, 0€ pour toujours)
        │               (Node.js/Express - toujours actif, pas de sleep)
        │
        └── BDD  ────► Supabase (gratuit, 500MB)
                        (PostgreSQL managé)
```

### Pourquoi ces choix ?

| Service | Coût | Avantages | Limites |
|---------|------|-----------|---------|
| **Vercel** | **0€/mois** | Frontend React optimisé, HTTPS, CDN mondial | Hobby tier (non-commercial OK) |
| **Belmo.io** | **0€/mois** | Node.js toujours actif, pas de sleep, auto-deploy GitHub | 512 MB RAM / 0.5 vCPU |
| **Supabase** | **0€/mois** | 500MB DB, gratuit permanent | Suffisant pour ~10 000 ventes |

> ✅ **Pas de carte bancaire requise** pour aucune de ces plateformes
> ✅ **Pas de suspension** après une période
> ✅ **Pas de sleep** côté Vercel et Belmo
> ✅ **Accessible 24h/24** pour vos utilisateurs

---

## 📋 Prérequis

1. Un compte **GitHub** (gratuit) — pour héberger le code
2. Un compte **Supabase** (gratuit) — pour la base de données
3. Un compte **Belmo.io** (gratuit) — pour le backend
4. Un compte **Vercel** (gratuit) — pour le frontend

---

## 🚀 Étape 1 : Préparer la base de données Supabase

### 1.1 Créer un projet Supabase
1. Allez sur https://supabase.com
2. Cliquez **Start your project** → **Sign in with GitHub**
3. Créez un nouveau projet (nom au choix, choisissez un mot de passe DB)
4. Notez l'URL du projet : `https://xxxx.supabase.co`

### 1.2 Exécuter le schéma SQL
1. Dans Supabase, menu gauche → **SQL Editor**
2. Cliquez **New query**
3. Ouvrez le fichier `backend/SCHEMA_SQL.sql` de votre projet
4. **Copiez tout** (Ctrl+A puis Ctrl+C) et collez dans l'éditeur
5. Cliquez **Run** (ou Ctrl+Enter)
6. Vous devez voir : `Tables créées avec succès!`

### 1.3 Exécuter les migrations
Répétez l'opération avec :
- `backend/FUNCTIONS_SQL.sql` (index de performance)
- `backend/MIGRATION_VENTES_IDEMPOTENCE.sql` (mode offline)

### 1.4 Récupérer les clés
1. Menu gauche → **Settings** → **API**
2. Notez :
   - **Project URL** = `SUPABASE_URL`
   - **service_role** (cliquez "Reveal") = `SUPABASE_SERVICE_KEY`

⚠️ **Ne partagez jamais la clé `service_role`** — elle a tous les droits admin.

---

## 🖥️ Étape 2 : Déployer le Backend sur Belmo.io

### 2.1 Pousser le code sur GitHub
Si pas encore fait :
```bash
cd gestocaisse
git add .
git commit -m "deploy"
git push origin main
```

### 2.2 Créer un compte Belmo
1. Allez sur https://belmo.io
2. Cliquez **Get Started** → **Sign in with GitHub**

### 2.3 Déployer
1. Cliquez **New Service**
2. Sélectionnez **Deploy from GitHub**
3. Choisissez votre repo `gestocaisse`
4. **Root Directory** : `backend`
5. **Build Command** : `npm install`
6. **Start Command** : `node src/server.js`
7. Cliquez **Create Service**

Belmo détecte automatiquement Node.js et lance le build.

### 2.4 Variables d'environnement
Dans votre service → onglet **Environment**, ajoutez :

```env
NODE_ENV=production
PORT=3000

# JWT — Générez un secret fort
# Exécutez dans votre terminal : node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=ICI_VOTRE_SECRET_64_CARACTERES

# Supabase (de l'étape 1.4)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOi...

# Frontend Vercel (URL que vous obtiendrez à l'étape 3)
FRONTEND_URL=https://votre-app.vercel.app

# Admin (pour créer le compte)
ADMIN_EMAIL=admin@votredomaine.com
ADMIN_PASSWORD=VotreMotDePasse1234!
ADMIN_BOUTIQUE_NOM=Ma Boutique

# Email (optionnel)
EMAIL_USER=
EMAIL_PASS=votre_mot_de_passe_app_gmail

# Stripe (optionnel)
STRIPE_SECRET_KEY=sk_test_placeholder
```

### 2.5 Récupérer l'URL de votre backend
Une fois déployé, Belmo vous donne une URL :
```
https://votre-service.belmo.app
```

### 2.6 Tester
Ouvrez dans le navigateur :
```
https://votre-service.belmo.app/api/health
```

Vous devez voir : `{"ok":true,"time":"..."}`

---

## 🎨 Étape 3 : Déployer le Frontend sur Vercel

### 3.1 Créer un compte Vercel
1. Allez sur https://vercel.com
2. **Sign Up** → **Continue with GitHub**

### 3.2 Importer le projet
1. Cliquez **Add New → Project**
2. Sélectionnez votre repo `gestocaisse`
3. **Root Directory** : modifiez et choisissez `frontend`

### 3.3 Configurer
- **Framework Preset** : Create React App (détecté auto)
- **Build Command** : `npm run build`
- **Output Directory** : `build`

### 3.4 Variables d'environnement
Cliquez **Environment Variables**, ajoutez :
```
REACT_APP_API_URL = https://votre-app.cyclic.app/api
```

⚠️ Remplacez par l'URL exacte de votre backend Cyclic.

### 3.5 Déployer
Cliquez **Deploy**. Vercel construit et déploie en 2-3 minutes.

Votre app est accessible sur :
```
https://votre-frontend.vercel.app
```

---

## 🔧 Étape 4 : Connecter les deux

### 4.1 Mettre à jour CORS backend
Dans Belmo.io, vérifiez que `FRONTEND_URL` pointe bien vers :
```
https://votre-frontend.vercel.app
```

### 4.2 Tester la connexion
1. Ouvrez `https://votre-frontend.vercel.app`
2. Vous devez voir la page d'accueil
3. Cliquez **S'inscrire** et créez un compte
4. Connectez-vous — l'app doit fonctionner !

---

## 🎉 Étape 5 : Créer le compte admin

Vous avez 2 options :

### Option A : Via la commande setup (localement)
```bash
cd gestocaisse/backend
npm install
# Configurer votre .env local avec les mêmes variables
npm run setup
```

### Option B : Via Supabase directement
1. Supabase → **Table Editor** → table `users`
2. Créez un utilisateur manuellement avec role `admin`

---

## ✅ C'est fait ! Votre app est en ligne

| Élément | URL | Coût |
|---------|-----|------|
| Frontend | `https://votre-frontend.vercel.app` | 0€ |
| Backend | `https://votre-service.belmo.app` | 0€ |
| Base de données | Supabase | 0€ |
| **TOTAL** | | **0€/mois** |

---

## 🔄 Mise à jour de l'application

Pour mettre à jour :
```bash
git add .
git commit -m "modifications"
git push
```

Belmo et Vercel déploient automatiquement à chaque push. Pas d'action manuelle.

---

## 📊 Limites à connaître (gratuit)

| Service | Limite gratuite | Impact |
|---------|----------------|--------|
| Vercel | 100 GB bande passante/mois | ~100 000 visiteurs/mois |
| Belmo.io | 1 service / 512 MB RAM / 0.5 vCPU | ~30 000 ventes/mois |
| Supabase | 500 MB DB | ~30 000 ventes avec snapshots |
| Supabase | 1 GB storage fichiers | ~5 000 images produits |

> 💡 Pour une petite boutique, ces limites sont **largement suffisantes** (plusieurs mois d'utilisation intensive).

---

## 🆘 Dépannage

### "Network Error" sur le frontend
- Vérifiez `REACT_APP_API_URL` dans Vercel
- Doit pointer vers `https://votre-service.belmo.app/api` (avec `/api`)
- Pas de slash final, pas de `/api/` avec le slash final

### "CORS error" dans la console
- Vérifiez `FRONTEND_URL` dans Belmo
- Doit correspondre exactement à l'URL Vercel (avec https://)

### "Invalid API key" sur Supabase
- Vous avez copié la mauvaise clé
- Prenez `service_role` (pas `anon`) dans Settings → API

### Le frontend ne se met pas à jour
- Vercel redéploie automatiquement
- Videz le cache (Ctrl+Shift+R) ou ouvrez en navigation privée

---

## 💡 Astuces

### Domaine personnalisé gratuit
- Frontend : Vercel permet de connecter un domaine gratuit `.vercel.app` (déjà inclus)
- Vous pouvez aussi acheter un domaine (ex: `gestocaisse.com`) et le connecter

### Monitoring
- Vercel : onglet **Analytics** (gratuit) — visiteurs, performance
- Cyclic : onglet **Logs** — voir les requêtes en temps réel
- Supabase : onglet **Reports** — usage DB

### Sauvegardes
- Supabase fait des backups automatiques quotidiens (plan gratuit : 7 jours de rétention)

---

## 📚 Sources

- [Belmo.io](https://belmo.io) — Backend gratuit, toujours actif, pas de carte
- [Vercel Pricing](https://vercel.com/pricing) — Plan Hobby gratuit
- [Supabase Pricing](https://supabase.com/pricing) — Tier gratuit permanent
