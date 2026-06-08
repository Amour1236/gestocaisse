const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// ─── MIDDLEWARES ─────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', process.env.FRONTEND_URL].filter(Boolean),
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.options('*', cors()); // preflight
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Rate limit
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, max: 500,
  message: { success: false, message: 'Trop de requêtes.' }
}));

// ─── HEALTH ──────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ ok: true, app: 'GestoCaisse API v1.0' }));
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/boutique',   require('./routes/boutique'));
app.use('/api/produits',   require('./routes/produits'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/ventes',     require('./routes/ventes'));
app.use('/api/stock',      require('./routes/stock'));
app.use('/api/clients',    require('./routes/clients'));
app.use('/api/rapports',   require('./routes/rapports'));
app.use('/api/admin',      require('./routes/admin'));

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
  res.status(500).json({
    success: false, message: 'Erreur serveur.',
    detail: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║      GestoCaisse API v1.0.0          ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  URL     : http://localhost:${PORT}      ║`);
  console.log(`║  Supabase: ${process.env.SUPABASE_URL?.includes('supabase.co') ? '✅ OK' : '❌ MANQUANT'}                  ║`);
  console.log('╚══════════════════════════════════════╝');
});
