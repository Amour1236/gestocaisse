const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger } = require('../middleware/auth');

const money = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;

/**
 * GET /api/fidelite/programme — Programme de fidélité de la boutique
 */
router.get('/programme', proteger, async (req, res) => {
  try {
    let { data } = await supabase
      .from('fidelite_programmes')
      .select('*').eq('boutique_id', req.boutique_id)
      .single();

    // Créer un programme par défaut si inexistant
    if (!data) {
      ({ data } = await supabase.from('fidelite_programmes').insert({
        boutique_id: req.boutique_id,
        nom: 'Programme de fidélité',
        points_par_fcfa: 0.001, // 1 point pour 1000 FCFA
        fcfa_par_point: 100,
        cashback_pct: 0,
        actif: false,
      }).select().single());
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/fidelite/programme — Modifier le programme
 */
router.put('/programme', proteger, async (req, res) => {
  try {
    const { nom, points_par_fcfa, fcfa_par_point, cashback_pct, actif } = req.body;
    const update = {};
    if (nom !== undefined) update.nom = nom;
    if (points_par_fcfa !== undefined) update.points_par_fcfa = Number(points_par_fcfa);
    if (fcfa_par_point !== undefined) update.fcfa_par_point = Number(fcfa_par_point);
    if (cashback_pct !== undefined) update.cashback_pct = Number(cashback_pct);
    if (actif !== undefined) update.actif = actif;

    let { data } = await supabase
      .from('fidelite_programmes')
      .select('id').eq('boutique_id', req.boutique_id).single();

    if (data) {
      ({ data } = await supabase.from('fidelite_programmes')
        .update(update).eq('id', data.id).select().single());
    } else {
      ({ data } = await supabase.from('fidelite_programmes')
        .insert({ boutique_id: req.boutique_id, ...update }).select().single());
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/fidelite/clients — Points de fidélité de tous les clients
 */
router.get('/clients', proteger, async (req, res) => {
  try {
    const { data } = await supabase
      .from('fidelite_points')
      .select('*, clients(nom,telephone)')
      .eq('boutique_id', req.boutique_id)
      .order('points', { ascending: false });
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/fidelite/clients/:id — Points d'un client
 */
router.get('/clients/:id', proteger, async (req, res) => {
  try {
    let { data: points } = await supabase
      .from('fidelite_points')
      .select('*')
      .eq('client_id', req.params.id)
      .eq('boutique_id', req.boutique_id)
      .single();

    if (!points) {
      // Créer l'entrée fidélité du client
      ({ data: points } = await supabase.from('fidelite_points').insert({
        client_id: req.params.id,
        boutique_id: req.boutique_id,
        points: 0,
        total_gagne: 0,
        total_utilise: 0,
      }).select().single());
    }

    const { data: mouvements } = await supabase
      .from('fidelite_mouvements')
      .select('*')
      .eq('client_id', req.params.id)
      .eq('boutique_id', req.boutique_id)
      .order('created_at', { ascending: false })
      .limit(50);

    res.json({ success: true, data: { ...points, mouvements: mouvements || [] } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/fidelite/utiliser — Utiliser des points (rembourser en cashback)
 * Body: { client_id, points, methode: 'cashback_momo' | 'avoir' }
 */
router.post('/utiliser', proteger, async (req, res) => {
  try {
    const { client_id, points, methode = 'avoir' } = req.body;
    if (!client_id || !points) return res.status(400).json({ success: false, message: 'client_id et points requis.' });

    let { data: pts } = await supabase
      .from('fidelite_points')
      .select('*')
      .eq('client_id', client_id).eq('boutique_id', req.boutique_id)
      .single();

    if (!pts) return res.status(404).json({ success: false, message: 'Client non trouvé dans le programme.' });
    if (pts.points < points) return res.status(400).json({ success: false, message: `Points insuffisants. Disponible: ${pts.points}` });

    // Calculer la valeur en FCFA
    const { data: prog } = await supabase
      .from('fidelite_programmes').select('fcfa_par_point')
      .eq('boutique_id', req.boutique_id).single();
    const fcfa_par_point = prog?.fcfa_par_point || 100;
    const valeurFcfa = points * fcfa_par_point;

    // Déduire les points
    const newPoints = pts.points - points;
    await supabase.from('fidelite_points').update({
      points: newPoints,
      total_utilise: (pts.total_utilise || 0) + points,
      updated_at: new Date().toISOString(),
    }).eq('id', pts.id);

    // Enregistrer le mouvement
    await supabase.from('fidelite_mouvements').insert({
      client_id,
      boutique_id: req.boutique_id,
      type: methode === 'cashback_momo' ? 'cashback' : 'utilisation',
      points: -points,
      cashback_montant: methode === 'cashback_momo' ? valeurFcfa : 0,
      note: methode === 'cashback_momo'
        ? `Cashback mobile money: ${money(valeurFcfa)}`
        : `Avoir utilisé: ${points} pts`,
    });

    res.json({ success: true, message: `${points} pts utilisés = ${money(valeurFcfa)}`, nouvelle_solde: newPoints });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/fidelite/attribuer — Attribuer des points après une vente
 * Appelé automatiquement par la route ventes ou manuellement
 */
router.post('/attribuer', proteger, async (req, res) => {
  try {
    const { vente_id, vente_total } = req.body;
    if (!vente_id) return res.status(400).json({ success: false, message: 'vente_id requis.' });

    const { data: vente } = await supabase
      .from('ventes').select('*, clients(id)')
      .eq('id', vente_id).eq('boutique_id', req.boutique_id).single();
    if (!vente?.clients?.id) return res.status(400).json({ success: false, message: 'La vente n\'a pas de client.' });

    const { data: prog } = await supabase
      .from('fidelite_programmes').select('*')
      .eq('boutique_id', req.boutique_id).single();
    if (!prog?.actif) return res.json({ success: true, message: 'Programme inactif.' });

    const total = vente_total || vente.total_final || 0;
    const pointsGagnes = Math.floor(total * (prog.points_par_fcfa || 0));

    if (pointsGagnes <= 0) return res.json({ success: true, message: 'Montant trop faible pour générer des points.' });

    // Créer ou mettre à jour les points du client
    let { data: pts } = await supabase
      .from('fidelite_points')
      .select('*')
      .eq('client_id', vente.clients.id).eq('boutique_id', req.boutique_id)
      .single();

    if (pts) {
      await supabase.from('fidelite_points').update({
        points: pts.points + pointsGagnes,
        total_gagne: (pts.total_gagne || 0) + pointsGagnes,
        updated_at: new Date().toISOString(),
      }).eq('id', pts.id);
    } else {
      ({ data: pts } = await supabase.from('fidelite_points').insert({
        client_id: vente.clients.id,
        boutique_id: req.boutique_id,
        points: pointsGagnes,
        total_gagne: pointsGagnes,
        total_utilise: 0,
      }).select().single());
    }

    // Enregistrer le mouvement
    await supabase.from('fidelite_mouvements').insert({
      client_id: vente.clients.id,
      boutique_id: req.boutique_id,
      vente_id,
      type: 'gain',
      points: pointsGagnes,
      note: `Achat: ${money(total)} → ${pointsGagnes} pts`,
    });

    res.json({ success: true, message: `${pointsGagnes} points attribués !`, nouvelle_solde: (pts?.points || 0) + pointsGagnes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
