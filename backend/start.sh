#!/bin/bash
# Script de démarrage pour Belmo.io / Render / Heroku
# Belmo utilise automatiquement `npm start` donc ce script est optionnel

echo "🚀 Démarrage GestoCaisse Backend"
echo "   NODE_ENV: $NODE_ENV"
echo "   PORT: $PORT"
echo "   FRONTEND_URL: $FRONTEND_URL"

# Vérification des variables critiques
if [ -z "$SUPABASE_URL" ]; then
  echo "❌ ERREUR: SUPABASE_URL manquant"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "❌ ERREUR: SUPABASE_SERVICE_KEY manquant"
  exit 1
fi

if [ -z "$JWT_SECRET" ]; then
  echo "❌ ERREUR: JWT_SECRET manquant"
  exit 1
fi

# Démarrage
exec node src/server.js
