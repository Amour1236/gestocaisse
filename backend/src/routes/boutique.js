const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { supabase } = require('../database/supabase');
const { proteger, autoriser } = require('../middleware/auth');

router.get('/', proteger, async (req, res) => {
  const { data } = await supabase.from('boutiques').select('*').eq('id', req.boutique_id).single();
  res.json({ success: true, data });
});

router.put('/', proteger, autoriser('proprietaire','admin'), async (req, res) => {
  try {
    const {
      nom,
      adresse,
      telephone,
      devise,
      logo,
      ticket_primary_color,
      ticket_secondary_color,
      ticket_text_color,
      ticket_footer,
      ticket_message,
    } = req.body;

    const { data } = await supabase
      .from('boutiques')
      .update({
        nom,
        adresse,
        telephone,
        devise,
        logo,
        ticket_primary_color,
        ticket_secondary_color,
        ticket_text_color,
        ticket_footer,
        ticket_message,
      })
      .eq('id', req.boutique_id)
      .select()
      .single();

    res.json({ success: true, data, message: 'Boutique mise à jour.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/caissiers', proteger, autoriser('proprietaire'), async (req, res) => {
  try {
    const { nom, prenom, email, mot_de_passe } = req.body;
    if (!nom || !email || !mot_de_passe) return res.status(400).json({ success: false, message: 'Nom, email et mot de passe requis.' });

    // Limite de caissiers selon le plan
    const { data: boutique } = await supabase.from('boutiques').select('plan').eq('id', req.boutique_id).single();
    if (!boutique) return res.status(404).json({ success: false, message: 'Boutique introuvable.' });
    const { data: caissiers } = await supabase.from('users').select('id').eq('boutique_id', req.boutique_id).eq('role', 'caissier');
    const maxCaissiers = boutique.plan === 'starter' ? 1 : boutique.plan === 'pro' ? 2 : 999;
    if (caissiers.length >= maxCaissiers) {
      return res.status(403).json({ success: false, message: `Limite dépassée pour le plan ${boutique.plan}. (${maxCaissiers} caissier${maxCaissiers===1 ? '' : 's'})` });
    }

    const hash = await bcrypt.hash(mot_de_passe, 12);
    const { data, error } = await supabase.from('users')
      .insert({ nom, prenom, email, mot_de_passe: hash, role: 'caissier', boutique_id: req.boutique_id, email_verifie: true }).select().single();
    if (error) return res.status(400).json({ success: false, message: 'Email déjà utilisé.' });
    delete data.mot_de_passe;
    res.status(201).json({ success: true, data, message: 'Caissier créé.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/caissiers', proteger, autoriser('proprietaire','admin'), async (req, res) => {
  const { data } = await supabase.from('users').select('id,nom,prenom,email,role,actif,created_at').eq('boutique_id', req.boutique_id).eq('role','caissier');
  res.json({ success: true, data });
});

router.delete('/caissiers/:id', proteger, autoriser('proprietaire','admin'), async (req, res) => {
  try {
    const { data: caissier } = await supabase.from('users').select('id,role,boutique_id').eq('id', req.params.id).single();
    if (!caissier) return res.status(404).json({ success: false, message: 'Caissier introuvable.' });
    if (caissier.boutique_id !== req.boutique_id) return res.status(403).json({ success: false, message: 'Pas autorisé.' });
    if (caissier.role !== 'caissier') return res.status(400).json({ success: false, message: 'Seuls les caissiers peuvent être supprimés ici.' });

    await supabase.from('ventes').update({ caissier_id: null }).eq('caissier_id', req.params.id);
    await supabase.from('users').delete().eq('id', req.params.id);
    res.json({ success: true, message: 'Caissier supprimé.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.patch('/caissiers/:id/toggle', proteger, autoriser('proprietaire'), async (req, res) => {
  const { data: u } = await supabase.from('users').select('actif').eq('id', req.params.id).single();
  await supabase.from('users').update({ actif: !u.actif }).eq('id', req.params.id).eq('boutique_id', req.boutique_id);
  res.json({ success: true, message: !u.actif ? 'Caissier activé.' : 'Caissier désactivé.' });
});

module.exports = router;
