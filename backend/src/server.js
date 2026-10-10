const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { sanitize } = require('./middleware/sanitize');

// ─── VALIDATION DES VARIABLES D'ENVIRONNEMENT SÉCURISÉES ─────────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('\n❌ ERREUR: JWT_SECRET doit être défini avec minimum 32 caractères');
  console.error('   Générer avec: openssl rand -hex 32');
  process.exit(1);
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('\n❌ ERREUR: SUPABASE_URL et SUPABASE_SERVICE_KEY requis');
  process.exit(1);
}

const app = express();

// ─── MIDDLEWARES ─────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://*.supabase.co'],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://*.supabase.co'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    }
  }
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL].filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:3001', process.env.FRONTEND_URL].filter(Boolean),
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.options('*', cors()); // preflight
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitize); // Protection contre XSS, NoSQL injection et prototype pollution
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Rate limit
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, max: 500,
  message: { success: false, message: 'Trop de requêtes.' }
}));

app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { success: false, message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  skipSuccessfulRequests: true,
}));

// ─── HEALTH ──────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ ok: true, app: 'GestoCaisse API v1.0' }));
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/boutique',      require('./routes/boutique'));
app.use('/api/produits',      require('./routes/produits'));
app.use('/api/categories',    require('./routes/categories'));
app.use('/api/ventes',        require('./routes/ventes'));
app.use('/api/stock',         require('./routes/stock'));
app.use('/api/clients',       require('./routes/clients'));
app.use('/api/rapports',      require('./routes/rapports'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/momo',          require('./routes/momo'));
app.use('/api/caisse',         require('./routes/caisse'));
app.use('/api/documents',      require('./routes/documents'));
app.use('/api/notifications',  require('./routes/notifications'));
app.use('/api/audit',          require('./routes/audit'));
app.use('/api/recus',          require('./routes/recus'));
app.use('/api/credit',          require('./routes/credit_avance'));
app.use('/api/ohada',           require('./routes/ohada'));
app.use('/api/fidelite',        require('./routes/fidelite'));
app.use('/api/transferts',      require('./routes/transferts'));
app.use('/api/demo',            require('./routes/demo'));
// ─── MODULE STOCK PROFESSIONNEL ───────────────────────────────────────────────
app.use('/api/inventaires',              require('./routes/inventaires'));
app.use('/api/bons',                     require('./routes/bons'));
app.use('/api/rapports-stock',           require('./routes/rapports_stock'));
app.use('/api/fournisseurs',             require('./routes/fournisseurs'));
app.use('/api/commandes-fournisseurs',   require('./routes/commandes_fournisseurs'));

// Paiements — seulement si Stripe configuré
try {
  const paiements = require('./routes/paiements');
  if (paiements.webhook) {
    app.post('/api/paiements/webhook', express.raw({ type: 'application/json' }), paiements.webhook);
  }
  app.use('/api/paiements', paiements.router);
} catch (e) {
  console.log('⚠️  Paiements Stripe désactivés (clé manquante)');
}

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} introuvable.` });
});

// ─── ERREUR GLOBALE ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Erreur]', err.message);
  // Ne jamais retourner détails sensibles en production
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Erreur serveur interne.',
    detail: process.env.NODE_ENV === 'development' ? undefined : undefined
  });
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║      GestoCaisse API v1.0.0          ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  URL     : http://localhost:${PORT}      ║`);
  console.log(`║  Supabase: ${process.env.SUPABASE_URL?.includes('supabase.co') ? '✅ OK' : '❌ MANQUANT'}                  ║`);
  console.log('╚══════════════════════════════════════╝');
});
