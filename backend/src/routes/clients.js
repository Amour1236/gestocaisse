const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger } = require('../middleware/auth');

router.get('/', proteger, async (req, res) => {
  try {
    const { search } = req.query;
    let q = supabase.from('clients').select('*').eq('boutique_id', req.boutique_id).order('nom');
    if (search) q = q.ilike('nom', '%' + search + '%');
    const { data } = await q;
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', proteger, async (req, res) => {
  try {
    const { nom, telephone='', email='', adresse='', notes='' } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom requis.' });
    const { data, error } = await supabase.from('clients').insert({ nom, telephone, email, adresse, notes, boutique_id: req.boutique_id }).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', proteger, async (req, res) => {
  try {
    const { nom, telephone, email, adresse, notes } = req.body;
    const { data } = await supabase.from('clients').update({ nom, telephone, email, adresse, notes }).eq('id', req.params.id).eq('boutique_id', req.boutique_id).select().single();
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', proteger, async (req, res) => {
  await supabase.from('clients').delete().eq('id', req.params.id).eq('boutique_id', req.boutique_id);
  res.json({ success: true, message: 'Client supprimé.' });
});

router.get('/:id/ventes', proteger, async (req, res) => {
  try {
    const { data } = await supabase.from('ventes').select('*, lignes_vente(*)').eq('client_id', req.params.id).eq('boutique_id', req.boutique_id).order('created_at', { ascending: false });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/:id/credits', proteger, async (req, res) => {
  try {
    const { data } = await supabase.from('credits').select('*, ventes(numero,total_final,created_at)').eq('client_id', req.params.id).eq('boutique_id', req.boutique_id).order('created_at', { ascending: false });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/credits/:id/rembourser', proteger, async (req, res) => {
  try {
    const { montant } = req.body;
    const { data: credit } = await supabase.from('credits').select('*').eq('id', req.params.id).single();
    const total_rembourse = (credit.montant_rembourse || 0) + Number(montant);
    const statut = total_rembourse >= credit.montant ? 'rembourse' : 'partiel';
    await supabase.from('credits').update({ montant_rembourse: total_rembourse, statut }).eq('id', req.params.id);
    await supabase.from('clients').update({ credit_encours: Math.max(0, credit.montant - total_rembourse) }).eq('id', credit.client_id);
    res.json({ success: true, message: 'Remboursement enregistré.', statut });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
