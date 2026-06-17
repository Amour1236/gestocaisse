import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ── App minimale pour les tests (sans Supabase) ──────────────────────────────
const app = express();
app.use(express.json());

// Mock Supabase avant l'import des routes
jest.mock('../database/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    single: jest.fn(),
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$hashed$'),
  compare: jest.fn().mockResolvedValue(true),
}));

// ── Tests utilitaires (sans réseau) ──────────────────────────────────────────
describe('Utilitaires JWT', () => {
  const SECRET = process.env.JWT_SECRET as string;

  it('génère un token JWT valide', () => {
    const token = jwt.sign({ id: 'user-123' }, SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, SECRET) as { id: string };
    expect(decoded.id).toBe('user-123');
  });

  it('rejette un token expiré', () => {
    const token = jwt.sign({ id: 'user-123' }, SECRET, { expiresIn: '-1s' });
    expect(() => jwt.verify(token, SECRET)).toThrow('jwt expired');
  });

  it('rejette un token avec un mauvais secret', () => {
    const token = jwt.sign({ id: 'user-123' }, 'wrong_secret');
    expect(() => jwt.verify(token, SECRET)).toThrow('invalid signature');
  });
});

// ── Tests de validation ───────────────────────────────────────────────────────
describe('Validation des champs requis', () => {
  const validateLogin = (body: Record<string, unknown>) => {
    if (!body.email || !body.mot_de_passe) return { valid: false, message: 'Email et mot de passe requis.' };
    const email = String(body.email).trim().toLowerCase();
    if (!email.includes('@')) return { valid: false, message: 'Email invalide.' };
    if (String(body.mot_de_passe).length < 6) return { valid: false, message: 'Mot de passe minimum 6 caractères.' };
    return { valid: true };
  };

  it('valide un login correct', () => {
    const r = validateLogin({ email: 'user@test.com', mot_de_passe: 'secret123' });
    expect(r.valid).toBe(true);
  });

  it('rejette un email manquant', () => {
    const r = validateLogin({ mot_de_passe: 'secret123' });
    expect(r.valid).toBe(false);
    expect(r.message).toContain('requis');
  });

  it('rejette un mot de passe trop court', () => {
    const r = validateLogin({ email: 'a@b.com', mot_de_passe: '123' });
    expect(r.valid).toBe(false);
  });

  it('rejette un email sans @', () => {
    const r = validateLogin({ email: 'invalide', mot_de_passe: 'secret123' });
    expect(r.valid).toBe(false);
  });
});

// ── Tests de la route health ──────────────────────────────────────────────────
describe('Route /api/health', () => {
  app.get('/api/health', (_req: Request, res: Response) =>
    res.json({ ok: true, time: new Date().toISOString() }));

  it('répond 200 avec ok: true', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.time).toBeDefined();
  });
});

// ── Tests middleware auth ─────────────────────────────────────────────────────
describe('Middleware proteger', () => {
  const SECRET = process.env.JWT_SECRET as string;

  const fakeMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token manquant.' });
    }
    const token = authHeader.split(' ')[1];
    try {
      jwt.verify(token, SECRET);
      next();
    } catch {
      return res.status(401).json({ success: false, message: 'Token invalide ou expiré.' });
    }
  };

  app.get('/api/test-protected', fakeMiddleware, (_req, res) =>
    res.json({ success: true, message: 'Accès autorisé' }));

  it('bloque une requête sans token', async () => {
    const res = await request(app).get('/api/test-protected');
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('manquant');
  });

  it('bloque un token invalide', async () => {
    const res = await request(app)
      .get('/api/test-protected')
      .set('Authorization', 'Bearer token_invalide');
    expect(res.status).toBe(401);
  });

  it('autorise un token valide', async () => {
    const token = jwt.sign({ id: 'user-123' }, SECRET);
    const res = await request(app)
      .get('/api/test-protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── Tests logique métier caisse ───────────────────────────────────────────────
describe('Logique caisse', () => {
  const calculerTotal = (lignes: Array<{ prix_unitaire: number; quantite: number }>) =>
    lignes.reduce((s, l) => s + l.prix_unitaire * l.quantite, 0);

  const calculerMonnaie = (totalFinal: number, montantRecu: number) =>
    Math.max(0, montantRecu - totalFinal);

  it('calcule le total correctement', () => {
    const lignes = [
      { prix_unitaire: 1000, quantite: 2 },
      { prix_unitaire: 500, quantite: 3 },
    ];
    expect(calculerTotal(lignes)).toBe(3500);
  });

  it('calcule la monnaie à rendre', () => {
    expect(calculerMonnaie(3500, 5000)).toBe(1500);
  });

  it('ne rend pas de monnaie négative', () => {
    expect(calculerMonnaie(5000, 3000)).toBe(0);
  });

  it('applique la remise correctement', () => {
    const total = 5000;
    const remise = 500;
    expect(Math.max(0, total - remise)).toBe(4500);
  });
});
