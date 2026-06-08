const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../database/supabase');
const { proteger } = require('../middleware/auth');

const genToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// ─── INSCRIPTION (compte activé immédiatement) ────────────────────────────────
router.post('/inscription', async (req, res) => {
  try {
    const { nom, prenom, email, mot_de_passe, confirm_mot_de_passe, nom_boutique } = req.body;
    if (!nom || !prenom || !email || !mot_de_passe || !nom_boutique)
      return res.status(400).json({ success: false, message: 'Tous les champs sont requis.' });
    const emailNormalise = String(email).trim().toLowerCase();
    if (mot_de_passe.length < 6)
      return res.status(400).json({ success: false, message: 'Mot de passe minimum 6 caractères.' });
    if (confirm_mot_de_passe && mot_de_passe !== confirm_mot_de_passe)
      return res.status(400).json({ success: false, message: 'Les mots de passe ne correspondent pas.' });

    const { data: existing } = await supabase.from('users').select('id').eq('email', email.toLowerCase()).maybeSingle();
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
        nom, prenom, email: email.toLowerCase(),
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

    res.status(201).json({
      success: true,
      message: 'Compte créé ! Bienvenue sur GestoCaisse.',
      token: genToken(user.id),
      user: { ...userSafe, boutique: boutiqueData },
    });
  } catch (err) {
    console.error('[inscription]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur: ' + err.message });
  }
});

// ─── CONNEXION ────────────────────────────────────────────────────────────────
router.post('/connexion', async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;
    if (!email || !mot_de_passe)
      return res.status(400).json({ success: false, message: 'Email et mot de passe requis.' });

    const emailNormalise = String(email).trim().toLowerCase();
    const { data: user } = await supabase.from('users')
      .select('*').eq('email', emailNormalise).maybeSingle();
    if (!user) return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });
    if (user.actif === false) return res.status(403).json({ success: false, message: 'Compte desactive.' });
    if (!user.mot_de_passe) return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });

    const ok = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!ok) return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });

    const { data: boutique } = await supabase.from('boutiques').select('*').eq('id', user.boutique_id).maybeSingle();
    const userSafe = { ...user };
    delete userSafe.mot_de_passe;

    res.json({ success: true, token: genToken(user.id), user: { ...userSafe, boutique } });
  } catch (err) {
    console.error('[connexion]', err);
    res.status(500).json({ success: false, message: 'Erreur serveur: ' + err.message });
  }
});

// ─── MOI ─────────────────────────────────────────────────────────────────────
router.get('/moi', proteger, async (req, res) => {
  try {
    const { data: boutique } = await supabase.from('boutiques').select('*').eq('id', req.user.boutique_id).maybeSingle();
    const userSafe = { ...req.user }; delete userSafe.mot_de_passe;
    res.json({ success: true, user: { ...userSafe, boutique } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── MOT DE PASSE OUBLIÉ ─────────────────────────────────────────────────────
router.post('/mot-de-passe-oublie', async (req, res) => {
  try {
    const { email } = req.body;
    const { data: user } = await supabase.from('users').select('*').eq('email', email?.toLowerCase()).maybeSingle();
    if (user) {
      const token = uuidv4();
      await supabase.from('users').update({ reset_token: token, reset_expire: new Date(Date.now() + 3600000) }).eq('id', user.id);
      try { const { sendEmail } = require('../services/email'); await sendEmail(email, 'resetPassword', user.prenom, token, process.env.FRONTEND_URL); }
      catch { console.log(`[Dev] Reset: ${process.env.FRONTEND_URL}/reset-password/${token}`); }
    }
    res.json({ success: true, message: 'Si cet email existe, un lien a été envoyé.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/reset-password/:token', async (req, res) => {
  try {
    const { mot_de_passe } = req.body;
    if (!mot_de_passe || mot_de_passe.length < 6)
      return res.status(400).json({ success: false, message: 'Mot de passe min 6 caractères.' });
    const { data: user } = await supabase.from('users').select('*').eq('reset_token', req.params.token).gt('reset_expire', new Date().toISOString()).maybeSingle();
    if (!user) return res.status(400).json({ success: false, message: 'Lien invalide ou expiré.' });
    const hash = await bcrypt.hash(mot_de_passe, 12);
    await supabase.from('users').update({ mot_de_passe: hash, reset_token: '', reset_expire: null }).eq('id', user.id);
    res.json({ success: true, message: 'Mot de passe réinitialisé.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/profil', proteger, async (req, res) => {
  try {
    const { nom, prenom } = req.body;
    await supabase.from('users').update({ nom, prenom }).eq('id', req.user.id);
    res.json({ success: true, message: 'Profil mis à jour.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/mot-de-passe', proteger, async (req, res) => {
  try {
    const { ancien, nouveau } = req.body;
    const { data: user } = await supabase.from('users').select('mot_de_passe').eq('id', req.user.id).single();
    const ok = await bcrypt.compare(ancien, user.mot_de_passe);
    if (!ok) return res.status(400).json({ success: false, message: 'Ancien mot de passe incorrect.' });
    if (!nouveau || nouveau.length < 6) return res.status(400).json({ success: false, message: 'Nouveau mot de passe min 6 caractères.' });
    const hash = await bcrypt.hash(nouveau, 12);
    await supabase.from('users').update({ mot_de_passe: hash }).eq('id', req.user.id);
    res.json({ success: true, message: 'Mot de passe modifié.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
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
