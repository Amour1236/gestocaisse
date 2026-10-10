const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger } = require('../middleware/auth');

// Impact sur le float par type de transaction
const SENS = {
  depot:     -1, // agent débite son float pour créditer le client
  envoi:     -1, // agent envoie de l'argent
  frais:     -1, // frais opérateur
  retrait:   +1, // agent reçoit du float du client
  reception: +1, // agent reçoit de l'argent
  transfert:  0,
};

// ─── PORTEFEUILLES ────────────────────────────────────────────────────────────
router.get('/portefeuilles', proteger, async (req, res) => {
  try {
    const { data } = await supabase.from('momo_portefeuilles')
      .select('*').eq('boutique_id', req.boutique_id).eq('actif', true).order('operateur');
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/portefeuilles', proteger, async (req, res) => {
  try {
    const { operateur, numero, nom = '', solde_initial = 0 } = req.body;
    if (!operateur || !numero)
      return res.status(400).json({ success: false, message: 'Opérateur et numéro requis.' });
    const { data, error } = await supabase.from('momo_portefeuilles')
      .insert({ boutique_id: req.boutique_id, operateur, numero, nom, solde_initial: Number(solde_initial) })
      .select().single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/portefeuilles/:id', proteger, async (req, res) => {
  try {
    const { nom, numero, solde_initial } = req.body;
    const { data } = await supabase.from('momo_portefeuilles')
      .update({ nom, numero, solde_initial: Number(solde_initial) })
      .eq('id', req.params.id).eq('boutique_id', req.boutique_id).select().single();
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/portefeuilles/:id', proteger, async (req, res) => {
  try {
    await supabase.from('momo_portefeuilles')
      .update({ actif: false }).eq('id', req.params.id).eq('boutique_id', req.boutique_id);
    res.json({ success: true, message: 'Portefeuille supprimé.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
router.get('/transactions', proteger, async (req, res) => {
  try {
    const { date, type, portefeuille_id, search } = req.query;
    let q = supabase.from('momo_transactions')
      .select('*, momo_portefeuilles(operateur, numero, nom)')
      .eq('boutique_id', req.boutique_id)
      .order('date_transaction', { ascending: false })
      .limit(200);

    if (date) {
      q = q.gte('date_transaction', date + 'T00:00:00.000Z')
           .lte('date_transaction', date + 'T23:59:59.999Z');
    }
    if (type) q = q.eq('type', type);
    if (portefeuille_id) q = q.eq('portefeuille_id', portefeuille_id);
    // Protection contre injection NoSQL — construction sécurisée des params de recherche
    if (search) {
      const searchTerm = '%' + String(search).replace(/[%_\\]/g, '') + '%';
      q = q.or([
        { numero_client: { ilike: searchTerm } },
        { nom_client: { ilike: searchTerm } },
        { reference: { ilike: searchTerm } },
      ]);
    }

    const { data, error } = await q;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/transactions', proteger, async (req, res) => {
  try {
    const { portefeuille_id, type, montant, commission = 0, numero_client, nom_client = '', reference = '', note = '', date_transaction } = req.body;
    if (!portefeuille_id || !type || !montant || !numero_client)
      return res.status(400).json({ success: false, message: 'Portefeuille, type, montant et numéro requis.' });
    if (!Object.keys(SENS).includes(type))
      return res.status(400).json({ success: false, message: 'Type invalide.' });

    const { data: wallet } = await supabase.from('momo_portefeuilles')
      .select('id').eq('id', portefeuille_id).eq('boutique_id', req.boutique_id).single();
    if (!wallet) return res.status(400).json({ success: false, message: 'Portefeuille introuvable.' });

    const { data, error } = await supabase.from('momo_transactions')
      .insert({
        boutique_id: req.boutique_id,
        portefeuille_id,
        type,
        montant: Number(montant),
        commission: Number(commission),
        numero_client: String(numero_client).trim(),
        nom_client,
        reference,
        note,
        date_transaction: date_transaction || new Date().toISOString(),
        created_by: req.user?.id,
      })
      .select('*, momo_portefeuilles(operateur, numero, nom)')
      .single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/transactions/:id', proteger, async (req, res) => {
  try {
    await supabase.from('momo_transactions')
      .delete().eq('id', req.params.id).eq('boutique_id', req.boutique_id);
    res.json({ success: true, message: 'Transaction supprimée.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── FLOATS (solde calculé par portefeuille) ──────────────────────────────────
router.get('/floats', proteger, async (req, res) => {
  try {
    const [{ data: wallets }, { data: txs }] = await Promise.all([
      supabase.from('momo_portefeuilles').select('*').eq('boutique_id', req.boutique_id).eq('actif', true),
      supabase.from('momo_transactions').select('portefeuille_id, type, montant, commission').eq('boutique_id', req.boutique_id),
    ]);

    const floats = (wallets || []).map(w => {
      const wtxs = (txs || []).filter(t => t.portefeuille_id === w.id);
      let solde = Number(w.solde_initial);
      let total_commissions = 0;
      let nb_transactions = wtxs.length;
      wtxs.forEach(t => {
        solde += (SENS[t.type] || 0) * t.montant;
        total_commissions += t.commission || 0;
      });
      return { ...w, solde_actuel: Math.round(solde), total_commissions: Math.round(total_commissions), nb_transactions };
    });

    res.json({ success: true, data: floats });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── RAPPROCHEMENT JOURNALIER ────────────────────────────────────────────────
router.get('/rapprochement', proteger, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const debut = date + 'T00:00:00.000Z', fin = date + 'T23:59:59.999Z';

    const { data: txs } = await supabase.from('momo_transactions')
      .select('*, momo_portefeuilles(operateur, nom, numero)')
      .eq('boutique_id', req.boutique_id)
      .gte('date_transaction', debut)
      .lte('date_transaction', fin)
      .order('date_transaction', { ascending: false });

    let total_depot = 0, total_retrait = 0, total_envoi = 0, total_reception = 0;
    let total_commissions = 0, total_frais = 0;
    const par_operateur = {};

    (txs || []).forEach(t => {
      total_commissions += t.commission || 0;
      if (t.type === 'depot')     total_depot     += t.montant;
      if (t.type === 'retrait')   total_retrait   += t.montant;
      if (t.type === 'envoi')     total_envoi     += t.montant;
      if (t.type === 'reception') total_reception += t.montant;
      if (t.type === 'frais')     total_frais     += t.montant;

      const op = t.momo_portefeuilles?.operateur || 'autre';
      if (!par_operateur[op]) par_operateur[op] = { nb: 0, volume: 0, commissions: 0 };
      par_operateur[op].nb++;
      par_operateur[op].volume += t.montant;
      par_operateur[op].commissions += t.commission || 0;
    });

    res.json({
      success: true,
      data: {
        date,
        nb_transactions: (txs || []).length,
        total_depot,
        total_retrait,
        total_envoi,
        total_reception,
        total_commissions,
        total_frais,
        variation_float: total_retrait + total_reception - total_depot - total_envoi - total_frais,
        par_operateur,
        transactions: txs || [],
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── HISTORIQUE CLIENT ────────────────────────────────────────────────────────
router.get('/clients/:numero', proteger, async (req, res) => {
  try {
    const { data } = await supabase.from('momo_transactions')
      .select('*, momo_portefeuilles(operateur, nom)')
      .eq('boutique_id', req.boutique_id)
      .eq('numero_client', req.params.numero)
      .order('date_transaction', { ascending: false });

    res.json({
      success: true,
      data: {
        numero: req.params.numero,
        nb_transactions: (data || []).length,
        total_volume: (data || []).reduce((s, t) => s + t.montant, 0),
        total_commissions: (data || []).reduce((s, t) => s + (t.commission || 0), 0),
        transactions: data || [],
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── RAPPORT MENSUEL ──────────────────────────────────────────────────────────
router.get('/rapport', proteger, async (req, res) => {
  try {
    const annee = Number(req.query.annee) || new Date().getFullYear();
    const mois  = Number(req.query.mois)  || (new Date().getMonth() + 1);
    const debut = `${annee}-${String(mois).padStart(2, '0')}-01T00:00:00.000Z`;
    const finDate = new Date(annee, mois, 0); finDate.setHours(23, 59, 59, 999);

    const { data: txs } = await supabase.from('momo_transactions')
      .select('*, momo_portefeuilles(operateur, nom)')
      .eq('boutique_id', req.boutique_id)
      .gte('date_transaction', debut)
      .lte('date_transaction', finDate.toISOString())
      .order('date_transaction');

    let total_depot = 0, total_retrait = 0, total_envoi = 0, total_reception = 0;
    let total_commissions = 0, total_frais = 0;
    const par_type = {}, par_jour = {}, par_operateur = {};

    (txs || []).forEach(t => {
      total_commissions += t.commission || 0;
      if (t.type === 'depot')     total_depot     += t.montant;
      if (t.type === 'retrait')   total_retrait   += t.montant;
      if (t.type === 'envoi')     total_envoi     += t.montant;
      if (t.type === 'reception') total_reception += t.montant;
      if (t.type === 'frais')     total_frais     += t.montant;

      par_type[t.type] = (par_type[t.type] || 0) + 1;

      const jour = t.date_transaction.split('T')[0];
      if (!par_jour[jour]) par_jour[jour] = { volume: 0, commissions: 0, nb: 0 };
      par_jour[jour].volume += t.montant;
      par_jour[jour].commissions += t.commission || 0;
      par_jour[jour].nb++;

      const op = t.momo_portefeuilles?.operateur || 'autre';
      if (!par_operateur[op]) par_operateur[op] = { nb: 0, volume: 0, commissions: 0 };
      par_operateur[op].nb++;
      par_operateur[op].volume += t.montant;
      par_operateur[op].commissions += t.commission || 0;
    });

    const graphData = Object.entries(par_jour)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        annee, mois,
        nb_transactions: (txs || []).length,
        volume_total: (txs || []).reduce((s, t) => s + t.montant, 0),
        total_depot, total_retrait, total_envoi, total_reception,
        total_commissions, total_frais,
        par_type, par_operateur, graphData,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
