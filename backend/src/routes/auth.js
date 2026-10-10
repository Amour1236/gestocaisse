const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../database/supabase');
const { proteger, getEffectivePlan } = require('../middleware/auth');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
};

const normaliserEmail = (email) => String(email || '').trim().toLowerCase();

const getTokenExpiry = () => process.env.NODE_ENV === 'production' ? '30m' : '2h';
const genToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: getTokenExpiry() });

// Validation email
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));

// Validation mot de passe: min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 spécial
const validatePassword = (pwd) => {
  if (!pwd || pwd.length < 8) return 'Mot de passe minimum 8 caractères.';
  if (!/[A-Z]/.test(pwd)) return 'Mot de passe doit contenir au moins 1 majuscule.';
  if (!/[a-z]/.test(pwd)) return 'Mot de passe doit contenir au moins 1 minuscule.';
  if (!/[0-9]/.test(pwd)) return 'Mot de passe doit contenir au moins 1 chiffre.';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) return 'Mot de passe doit contenir au moins 1 caractère spécial.';
  return null;
};

// ─── INSCRIPTION (compte activé immédiatement) ────────────────────────────────
router.post('/inscription',
  body('nom').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Nom requis (1-100 chars).'),
  body('prenom').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Prénom requis (1-100 chars).'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalide.'),
  body('mot_de_passe').isLength({ min: 8 }).withMessage('Mot de passe minimum 8 caractères.'),
  body('nom_boutique').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Nom boutique requis.'),
  handleValidation,
  async (req, res) => {
  try {
    const { nom, prenom, email, mot_de_passe, confirm_mot_de_passe, nom_boutique } = req.body;
    if (!nom || !prenom || !email || !mot_de_passe || !nom_boutique)
      return res.status(400).json({ success: false, message: 'Tous les champs sont requis.' });
    const emailNormalise = normaliserEmail(email);
    if (!isValidEmail(emailNormalise))
      return res.status(400).json({ success: false, message: 'Email invalide.' });
    const pwdError = validatePassword(mot_de_passe);
    if (pwdError) return res.status(400).json({ success: false, message: pwdError });
    if (confirm_mot_de_passe && mot_de_passe !== confirm_mot_de_passe)
      return res.status(400).json({ success: false, message: 'Les mots de passe ne correspondent pas.' });

    const { data: existing, error: existingError } = await supabase
      .from('users').select('id').eq('email', emailNormalise).limit(1).maybeSingle();
    if (existingError) throw existingError;
    if (existing) return res.status(400).json({ success: false, message: 'Cet email est déjà utilisé.' });

    const nomBoutiqueNormalise = String(nom_boutique).trim();
    const { data: boutiqueExistante } = await supabase
      .from('boutiques')
      .select('id')
      .ilike('nom', nomBoutiqueNormalise)
      .maybeSingle();
    if (boutiqueExistante) return res.status(400).json({ success: false, message: 'Ce nom de boutique est déjà utilisé.' });

    const hash = await bcrypt.hash(mot_de_passe, 12);

    // 1. Créer l'utilisateur d'abord (sans boutique_id)
    const { data: user, error: ue } = await supabase.from('users')
      .insert({
        nom, prenom, email: emailNormalise,
        mot_de_passe: hash,
        email_verifie: true, // ✅ ACTIVÉ DIRECTEMENT — pas besoin de confirmer l'email
      }).select().single();
    if (ue) throw ue;

    // 2. Créer la boutique avec proprietaire_id = user.id
    const { data: boutique, error: be } = await supabase.from('boutiques')
      .insert({ nom: nomBoutiqueNormalise, proprietaire_id: user.id }).select().single();
    if (be) throw be;

    // 3. Mettre à jour l'utilisateur avec boutique_id
    await supabase.from('users').update({ boutique_id: boutique.id }).eq('id', user.id);

    // Catégories par défaut
    await supabase.from('categories').insert([
      { boutique_id: boutique.id, nom: 'Alimentaire', couleur: '#10b981' },
      { boutique_id: boutique.id, nom: 'Boissons',    couleur: '#3b82f6' },
      { boutique_id: boutique.id, nom: 'Hygiène',     couleur: '#8b5cf6' },
      { boutique_id: boutique.id, nom: 'Divers',      couleur: '#f59e0b' },
    ]);

    // Connecter directement après inscription
    const userSafe = { ...user };
    delete userSafe.mot_de_passe;
    const { data: boutiqueData } = await supabase.from('boutiques').select('*').eq('id', boutique.id).single();

    const token = genToken(user.id);
    res.cookie('gc_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: process.env.NODE_ENV === 'production' ? 30 * 60 * 1000 : 2 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: 'Compte créé ! Bienvenue sur GestoCaisse.',
      token: token, // Conservé temporairement pour compatibilité avec les clients existants
      user: { ...userSafe, boutique: boutiqueData },
    });
  } catch (err) {
    console.error('[inscription]', err);
    res.status(500).json({ success: false, message: 'Une erreur est survenue. Veuillez réessayer.' });
  }
});

// ─── CONNEXION ────────────────────────────────────────────────────────────────
router.post('/connexion',
  body('email').isEmail().normalizeEmail().withMessage('Email invalide.'),
  body('mot_de_passe').exists().withMessage('Mot de passe requis.'),
  handleValidation,
  async (req, res) => {
    try {
      const { email, mot_de_passe } = req.body;

    const emailNormalise = normaliserEmail(email);
    const { data: user, error: userError } = await supabase.from('users')
      .select('*').eq('email', emailNormalise).limit(1).maybeSingle();
    if (userError) throw userError;
    if (!user) return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });
    if (user.actif === false) return res.status(403).json({ success: false, message: 'Compte desactive.' });
    if (!user.mot_de_passe) return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });

    const ok = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!ok) return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });

    const { data: boutique } = await supabase.from('boutiques').select('*').eq('id', user.boutique_id).maybeSingle();
    if (user.role === 'admin') {
      if (boutique) {
        boutique.plan = 'business';
        boutique.plan_expire_at = null;
      }
    } else if (boutique && boutique.plan_expire_at && new Date(boutique.plan_expire_at).getTime() <= Date.now() && boutique.plan !== 'starter') {
      await supabase.from('boutiques').update({ plan: 'starter' }).eq('id', boutique.id);
      boutique.plan = 'starter';
      boutique.plan_expire_at = null;
    }
    const userSafe = { ...user };
    delete userSafe.mot_de_passe;

    const token = genToken(user.id);
    res.cookie('gc_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: process.env.NODE_ENV === 'production' ? 30 * 60 * 1000 : 2 * 60 * 60 * 1000,
    });

    res.json({ success: true, token: token, user: { ...userSafe, boutique } });
  } catch (err) {
    console.error('[connexion]', err);
    res.status(500).json({ success: false, message: 'Erreur de connexion.' });
  }
});

// ─── MOI ─────────────────────────────────────────────────────────────────────
router.get('/moi', proteger, async (req, res) => {
  try {
    const { data: boutique } = await supabase.from('boutiques').select('*').eq('id', req.user.boutique_id).maybeSingle();
    if (req.user.role === 'admin') {
      if (boutique) {
        boutique.plan = 'business';
        boutique.plan_expire_at = null;
      }
    } else if (boutique && boutique.plan_expire_at && new Date(boutique.plan_expire_at).getTime() <= Date.now() && boutique.plan !== 'starter') {
      await supabase.from('boutiques').update({ plan: 'starter', plan_expire_at: null }).eq('id', boutique.id);
      boutique.plan = 'starter';
      boutique.plan_expire_at = null;
    }
    const userSafe = { ...req.user }; delete userSafe.mot_de_passe;
    res.json({ success: true, user: { ...userSafe, boutique } });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur lors de la récupération des données utilisateur.' }); }
});

// ─── MOT DE PASSE OUBLIÉ ─────────────────────────────────────────────────────
router.post('/mot-de-passe-oublie',
  body('email').isEmail().normalizeEmail().withMessage('Email invalide.'),
  handleValidation,
  async (req, res) => {
  try {
    const { email } = req.body;
    const emailLower = email?.toLowerCase() || '';

    // Toujours exécuter les mêmes opérations pour prévenir l'énumération et les timing attacks
    const { data: user } = await supabase.from('users').select('*').eq('email', emailLower).maybeSingle();

    // Simuler le même traitement que l'utilisateur existe ou non
    const fakeToken = uuidv4(); // Générer un token factice pour maintenir le même temps de traitement

    if (user) {
      const token = uuidv4();
      await supabase.from('users').update({ reset_token: token, reset_expire: new Date(Date.now() + 3600000) }).eq('id', user.id);
      try {
        const { sendEmail } = require('../services/email');
        await sendEmail(email, 'resetPassword', user.prenom, token, process.env.FRONTEND_URL);
      } catch {
        console.log(`[Dev] Reset: ${process.env.FRONTEND_URL}/reset-password/${token}`);
      }
    } else {
      // Toujours simuler l'update et l'envoi d'email pour maintenir un timing constant
      await new Promise(resolve => setTimeout(resolve, 50)); // Délai constant de 50ms
    }

    res.json({ success: true, message: 'Si cet email existe, un lien a été envoyé.' });
  } catch (err) {
    // Même message d'erreur générique quel que soit l'erreur
    res.status(500).json({ success: false, message: 'Erreur lors du traitement de la demande.' });
  }
});

router.post('/reset-password/:token',
  body('mot_de_passe').isLength({ min: 8 }).withMessage('Mot de passe minimum 8 caractères.'),
  handleValidation,
  async (req, res) => {
  try {
    const { mot_de_passe } = req.body;
    const pwdError = validatePassword(mot_de_passe || '');
    if (pwdError) return res.status(400).json({ success: false, message: pwdError });
    const { data: user } = await supabase.from('users').select('*').eq('reset_token', req.params.token).gt('reset_expire', new Date().toISOString()).maybeSingle();
    if (!user) return res.status(400).json({ success: false, message: 'Lien invalide ou expiré.' });
    const hash = await bcrypt.hash(mot_de_passe, 12);
    await supabase.from('users').update({ mot_de_passe: hash, reset_token: '', reset_expire: null }).eq('id', user.id);
    res.json({ success: true, message: 'Mot de passe réinitialisé.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur interne du serveur.' }); }
});

router.put('/profil', proteger, handleValidation, async (req, res) => {
  try {
    const { nom, prenom } = req.body;
    await supabase.from('users').update({ nom, prenom }).eq('id', req.user.id);
    res.json({ success: true, message: 'Profil mis à jour.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du profil.' }); }
});

router.post('/deconnexion', proteger, (req, res) => {
  res.clearCookie('gc_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.json({ success: true, message: 'Déconnecté.' });
});

router.put('/mot-de-passe', proteger, async (req, res) => {
  try {
    const { ancien, nouveau } = req.body;
    const { data: user } = await supabase.from('users').select('mot_de_passe').eq('id', req.user.id).single();
    const ok = await bcrypt.compare(ancien, user.mot_de_passe);
    if (!ok) return res.status(400).json({ success: false, message: 'Ancien mot de passe incorrect.' });
    const pwdError = validatePassword(nouveau || '');
    if (pwdError) return res.status(400).json({ success: false, message: pwdError });
    const hash = await bcrypt.hash(nouveau, 12);
    await supabase.from('users').update({ mot_de_passe: hash }).eq('id', req.user.id);
    res.json({ success: true, message: 'Mot de passe modifié.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur lors du changement de mot de passe.' }); }
});

const supprimerBoutiqueEnTouteSecurite = async (boutiqueId) => {
  const { data: ventes } = await supabase.from('ventes').select('id').eq('boutique_id', boutiqueId);
  const { data: produits } = await supabase.from('produits').select('id').eq('boutique_id', boutiqueId);
  const { data: clients } = await supabase.from('clients').select('id').eq('boutique_id', boutiqueId);

  if (ventes?.length) await supabase.from('lignes_vente').delete().in('vente_id', ventes.map(v => v.id));
  if (produits?.length) await supabase.from('mouvements_stock').delete().in('produit_id', produits.map(p => p.id));
  if (clients?.length) await supabase.from('credits').delete().in('client_id', clients.map(c => c.id));

  await supabase.from('abonnements').delete().eq('boutique_id', boutiqueId);
  await supabase.from('credits').delete().eq('boutique_id', boutiqueId);
  await supabase.from('clients').delete().eq('boutique_id', boutiqueId);
  await supabase.from('mouvements_stock').delete().eq('boutique_id', boutiqueId);
  await supabase.from('ventes').delete().eq('boutique_id', boutiqueId);
  await supabase.from('produits').delete().eq('boutique_id', boutiqueId);
  await supabase.from('categories').delete().eq('boutique_id', boutiqueId);
  await supabase.from('users').delete().eq('boutique_id', boutiqueId);
  await supabase.from('boutiques').delete().eq('id', boutiqueId);
};

router.delete('/compte', proteger, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Le compte administrateur ne peut pas être supprimé.' });
    }

    if (req.user.role === 'caissier') {
      await supabase.from('ventes').update({ caissier_id: null }).eq('caissier_id', req.user.id);
      await supabase.from('boutiques').update({ proprietaire_id: null }).eq('proprietaire_id', req.user.id);
      await supabase.from('users').delete().eq('id', req.user.id);
      return res.json({ success: true, message: 'Compte supprime.' });
    }

    if (req.user.role === 'proprietaire' && req.user.boutique_id) {
      await supabase.from('ventes').update({ caissier_id: null }).eq('boutique_id', req.user.boutique_id);
      await supabase.from('boutiques').update({ proprietaire_id: null }).eq('id', req.user.boutique_id);
      await supprimerBoutiqueEnTouteSecurite(req.user.boutique_id);
      return res.json({ success: true, message: 'Compte et boutique supprimes.' });
    }

    res.status(400).json({ success: false, message: 'Suppression impossible pour ce compte.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
