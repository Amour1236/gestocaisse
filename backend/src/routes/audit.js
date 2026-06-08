const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger, exigerPermission } = require('../middleware/auth');

router.get('/', proteger, exigerPermission('voir_rapports'), async (req, res) => {
  try {
    const { entity, action, debut, fin, page = 1, limit = 100 } = req.query;
    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;
    let q = supabase
      .from('audit_logs')
      .select('*, users(nom,prenom,email)', { count: 'exact' })
      .eq('boutique_id', req.boutique_id)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (entity) q = q.eq('entity', entity);
    if (action) q = q.eq('action', action);
    if (debut) q = q.gte('created_at', debut);
    if (fin) q = q.lte('created_at', fin);
    const { data, count, error } = await q;
    if (error) throw error;
    res.json({ success: true, data: data || [], total: count || 0 });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
