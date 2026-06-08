const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger } = require('../middleware/auth');

router.get('/', proteger, async (req, res) => {
  const { data } = await supabase.from('categories').select('*').eq('boutique_id', req.boutique_id).order('nom');
  res.json({ success: true, data });
});
router.post('/', proteger, async (req, res) => {
  const { nom, couleur='#059669' } = req.body;
  if (!nom) return res.status(400).json({ success: false, message: 'Nom requis.' });
  const { data, error } = await supabase.from('categories').insert({ nom, couleur, boutique_id: req.boutique_id }).select().single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});
router.put('/:id', proteger, async (req, res) => {
  const { nom, couleur } = req.body;
  const { data } = await supabase.from('categories').update({ nom, couleur }).eq('id', req.params.id).eq('boutique_id', req.boutique_id).select().single();
  res.json({ success: true, data });
});
router.delete('/:id', proteger, async (req, res) => {
  await supabase.from('categories').delete().eq('id', req.params.id).eq('boutique_id', req.boutique_id);
  res.json({ success: true, message: 'Catégorie supprimée.' });
});
module.exports = router;
