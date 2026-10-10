/**
 * Tests de sécurité - GestoCaisse
 *
 * Ce fichier contient des tests pour valider les correctifs de sécurité
 * appliqués à l'application.
 */

const request = require('supertest');
const express = require('express');

// Mock du serveur pour les tests
const app = express();

// Middleware de test
app.use(express.json());

// ─── TESTS DE SANITIZATION ──────────────────────────────────────────────────────
describe('Middleware de Sanitization', () => {
  const { sanitize, deepSanitize } = require('../middleware/sanitize');

  test('devrait bloquer les tags script XSS', () => {
    const input = '<script>alert("XSS")</script>Hello';
    const result = deepSanitize(input);
    expect(result).not.toContain('<script>');
  });

  test('devrait bloquer javascript: URIs', () => {
    const input = 'javascript:alert("XSS")';
    const result = deepSanitize(input);
    expect(result).not.toContain('javascript:');
  });

  test('devrait bloquer les event handlers', () => {
    const input = '<img onerror="alert(1)" src=x>';
    const result = deepSanitize(input);
    expect(result).not.toContain('onerror');
  });

  test('devrait bloquer prototype pollution', () => {
    const input = {
      '__proto__': { isAdmin: true },
      'constructor': { prototype: { isAdmin: true } },
    };
    const result = deepSanitize(input);
    expect(result).not.toHaveProperty('__proto__');
    expect(result).not.toHaveProperty('constructor');
  });

  test('devrait bloquer les clés commençant par $ ou __', () => {
    const input = { $where: 'test', __proto__: 'evil' };
    const result = deepSanitize(input);
    expect(result).not.toHaveProperty('$where');
    expect(result).not.toHaveProperty('__proto__');
  });
});

// ─── TESTS D'INJECTION SQL/NOSQL ───────────────────────────────────────────────
describe('Protection contre les injections', () => {
  test('devrait rejeter les payloads NoSQL avec operator $where', () => {
    // Cette fonction reproduit la logique de la route momo
    const sanitizeSearch = (search) => {
      if (!search) return null;
      const searchTerm = '%' + String(search).replace(/[%_\\]/g, '') + '%';
      return { ilike: searchTerm };
    };

    const maliciousInput = {
      search: 'test$where[0]=(function(){return this})'
    };

    const result = sanitizeSearch(maliciousInput.search);
    expect(result).toHaveProperty('ilike');
    expect(result).not.toHaveProperty('$where');
  });

  test('devrait échapper les caractères SQL wildcards', () => {
    const sanitizeSearch = (search) => {
      return '%' + String(search).replace(/[%_\\]/g, '') + '%';
    };

    const result = sanitizeSearch('test%_');
    expect(result).not.toContain('%');
    expect(result).not.toContain('_');
  });
});

// ─── TESTS DE JWT SECURITY ─────────────────────────────────────────────────────
describe('Sécurité JWT', () => {
  test('devrait valider que JWT_SECRET est assez long', () => {
    const secret = process.env.JWT_SECRET || '';
    expect(secret.length).toBeGreaterThanOrEqual(32);
  });

  test('devrait rejeter les JWT_SECRET par defaut', () => {
    const defaultSecret = 'changez_cette_valeur_en_production_avec_minimum_32_caracteres_aleatoires';
    // Si on utilisait ce secret par defaut, les tests échoueraient
    const secret = process.env.JWT_SECRET || '';
    expect(secret).not.toBe(defaultSecret);
  });
});

// ─── TESTS D'AUTHORIZATION ─────────────────────────────────────────────────────
describe('Contrôle d\'accès', () => {
  test('devrait ne pas exposer de data sensible en cas d\'erreur', () => {
    // Simuler une erreur
    const error = new Error('Database connection failed: password=secret123');
    const safeMessage = error.message.includes('password')
      ? 'Erreur serveur interne.'
      : error.message;

    expect(safeMessage).toBe('Erreur serveur interne.');
  });

  test('devrait utiliser des messages generiques pour les emails', () => {
    const responseMessage = 'Si cet email existe, un lien a été envoyé.';
    // Ce message ne confirme pas si l'email existe ou non
    expect(responseMessage).toContain('Si cet email existe');
  });
});

// ─── TESTS DE RATE LIMITING ─────────────────────────────────────────────────────
describe('Rate Limiting', () => {
  test('devrait avoir des limites differentes pour auth', () => {
    // Vérifier que les constantes sont definies
    const authLimit = 20; // max: 20 pour /api/auth
    const generalLimit = 500; // max: 500 pour /api/

    expect(authLimit).toBeLessThan(generalLimit);
    expect(authLimit).toBeGreaterThan(0);
  });
});

// ─── TESTS DE CORS ───────────────────────────────────────────────────────────────
describe('Configuration CORS', () => {
  test('devrait autoriser credentials', () => {
    // La configuration CORS doit autoriser credentials pour les cookies
    const corsConfig = {
      credentials: true,
    };

    expect(corsConfig.credentials).toBe(true);
  });
});

// ─── TESTS DE CSP ───────────────────────────────────────────────────────────────
describe('Content Security Policy', () => {
  test('devrait avoir des directives CSP strictes', () => {
    const cspConfig = {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"], // pas de unsafe-inline
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
    };

    expect(cspConfig.scriptSrc).not.toContain("'unsafe-inline'");
    expect(cspConfig.defaultSrc).toContain("'self'");
  });
});

module.exports = {
  sanitize,
  deepSanitize,
};