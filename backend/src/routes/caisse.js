const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger, exigerPermission } = require('../middleware/auth');
const { auditLog } = require('../services/audit');

router.get('/session-active', proteger, exigerPermission('gerer_caisse'), async (req, res) => {
  const { data } = await supabase
    .from('caisse_sessions')
    .select('*')
    .eq('boutique_id', req.boutique_id)
    .eq('caissier_id', req.user.id)
    .eq('statut', 'ouverte')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  res.json({ success: true, data });
});

router.post('/ouvrir', proteger, exigerPermission('gerer_caisse'), async (req, res) => {
  try {
    const { data: active } = await supabase
      .from('caisse_sessions')
      .select('id')
      .eq('boutique_id', req.boutique_id)
      .eq('caissier_id', req.user.id)
      .eq('statut', 'ouverte')
      .maybeSingle();
    if (active) return res.status(400).json({ success: false, message: 'Une session de caisse est déjà ouverte.' });

    const { fond_initial = 0, notes = '' } = req.body;
    const { data, error } = await supabase.from('caisse_sessions').insert({
      boutique_id: req.boutique_id,
      caissier_id: req.user.id,
      fond_initial,
      notes_ouverture: notes,
    }).select().single();
    if (error) throw error;
    await auditLog(req, { action: 'open', entity: 'caisse_sessions', entity_id: data.id, after_data: data });
    res.status(201).json({ success: true, data, message: 'Caisse ouverte.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/mouvements', proteger, exigerPermission('gerer_caisse'), async (req, res) => {
  try {
    const { session_id, type, montant, motif = '' } = req.body;
    if (!session_id || !['entree','sortie'].includes(type) || Number(montant) <= 0) {
      return res.status(400).json({ success: false, message: 'Mouvement invalide.' });
    }
    const { data: session } = await supabase.from('caisse_sessions').select('*').eq('id', session_id).eq('boutique_id', req.boutique_id).eq('statut', 'ouverte').single();
    if (!session) return res.status(404).json({ success: false, message: 'Session ouverte introuvable.' });
    const { data, error } = await supabase.from('caisse_mouvements').insert({
      session_id, boutique_id: req.boutique_id, user_id: req.user.id, type, montant, motif
    }).select().single();
    if (error) throw error;
    const patch = type === 'entree'
      ? { total_entrees: Number(session.total_entrees || 0) + Number(montant) }
      : { total_sorties: Number(session.total_sorties || 0) + Number(montant) };
    await supabase.from('caisse_sessions').update(patch).eq('id', session_id);
    await auditLog(req, { action: 'cash_movement', entity: 'caisse_mouvements', entity_id: data.id, after_data: data });
    res.status(201).json({ success: true, data, message: 'Mouvement enregistré.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/fermer/:id', proteger, exigerPermission('gerer_caisse'), async (req, res) => {
  try {
    const { fond_final = 0, notes = '' } = req.body;
    const { data: session } = await supabase.from('caisse_sessions').select('*').eq('id', req.params.id).eq('boutique_id', req.boutique_id).eq('statut', 'ouverte').single();
    if (!session) return res.status(404).json({ success: false, message: 'Session ouverte introuvable.' });

    const { data: ventes } = await supabase
      .from('ventes')
      .select('total_final')
      .eq('boutique_id', req.boutique_id)
      .neq('statut','annulee')
      .gte('created_at', session.opened_at)
      .lte('created_at', new Date().toISOString());
    const total_ventes = (ventes || []).reduce((s, v) => s + Number(v.total_final || 0), 0);
    const attendu = Number(session.fond_initial || 0) + total_ventes + Number(session.total_entrees || 0) - Number(session.total_sorties || 0);
    const ecart = Number(fond_final) - attendu;
    const patch = {
      statut: 'fermee',
      fond_final,
      total_ventes,
      ecart,
      notes_fermeture: notes,
      closed_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('caisse_sessions').update(patch).eq('id', req.params.id).select().single();
    if (error) throw error;
    await auditLog(req, { action: 'close', entity: 'caisse_sessions', entity_id: data.id, before_data: session, after_data: data });
    res.json({ success: true, data, message: 'Caisse fermée.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/sessions', proteger, exigerPermission('voir_rapports'), async (req, res) => {
  const { debut, fin } = req.query;
  let q = supabase.from('caisse_sessions').select('*, users(nom,prenom,email)').eq('boutique_id', req.boutique_id).order('opened_at', { ascending: false });
  if (debut) q = q.gte('opened_at', debut);
  if (fin) q = q.lte('opened_at', fin);
  const { data, error } = await q;
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data: data || [] });
});

router.get('/sessions/:id', proteger, exigerPermission('voir_rapports'), async (req, res) => {
  const [sessionRes, mouvementsRes] = await Promise.all([
    supabase.from('caisse_sessions').select('*, users(nom,prenom,email)').eq('id', req.params.id).eq('boutique_id', req.boutique_id).single(),
    supabase.from('caisse_mouvements').select('*').eq('session_id', req.params.id).order('created_at'),
  ]);
  if (sessionRes.error) return res.status(404).json({ success: false, message: 'Session introuvable.' });
  res.json({ success: true, data: { ...sessionRes.data, mouvements: mouvementsRes.data || [] } });
});

module.exports = router;
