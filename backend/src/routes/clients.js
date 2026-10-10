const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger } = require('../middleware/auth');
const { getCreditReste, nextCreditStatut, getClientCreditEncours } = require('../utils/credit');

const toNumber = (value) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const formatFCFA = (value) => Math.max(0, Number(value || 0)).toLocaleString('fr-FR');

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
    const montant = Number(req.body?.montant ?? 0);
    if (!Number.isFinite(montant) || montant <= 0) {
      return res.status(400).json({ success: false, message: 'Montant invalide.' });
    }

    const { data: credit, error: creditError } = await supabase
      .from('credits')
      .select('*')
      .eq('id', req.params.id)
      .eq('boutique_id', req.boutique_id)
      .maybeSingle();

    if (creditError) throw creditError;
    if (!credit) return res.status(404).json({ success: false, message: 'Crédit introuvable.' });

    const reste = getCreditReste(credit);
    if (montant > reste) {
      return res.status(400).json({
        success: false,
        message: `Le montant dépasse le reste à payer (${formatFCFA(reste)} FCFA).`,
      });
    }

    const total_rembourse = toNumber(credit.montant_rembourse) + montant;
    const statut = nextCreditStatut({ montant: credit.montant, montant_rembourse: total_rembourse });

    await supabase
      .from('credits')
      .update({ montant_rembourse: total_rembourse, statut })
      .eq('id', req.params.id)
      .eq('boutique_id', req.boutique_id);

    const { data: creditsClient } = await supabase
      .from('credits')
      .select('montant, montant_rembourse')
      .eq('client_id', credit.client_id)
      .eq('boutique_id', req.boutique_id);

    const creditEncours = getClientCreditEncours(creditsClient || []);
    await supabase
      .from('clients')
      .update({ credit_encours: creditEncours })
      .eq('id', credit.client_id)
      .eq('boutique_id', req.boutique_id);

    res.json({ success: true, message: 'Remboursement enregistré.', statut });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
