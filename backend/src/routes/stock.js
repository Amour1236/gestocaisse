const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger } = require('../middleware/auth');
const { sendEmail } = require('../services/email');
const { notifierStockFaible } = require('../services/stockAlerts');

router.post('/ajustement', proteger, async (req, res) => {
  try {
    const { produit_id, quantite, type='ajustement', motif='' } = req.body;
    const { data: produit } = await supabase.from('produits').select('*').eq('id', produit_id).eq('boutique_id', req.boutique_id).single();
    if (!produit) return res.status(404).json({ success: false, message: 'Produit introuvable.' });
    const stock_avant = produit.stock_actuel;
    const stock_apres = type === 'entree' ? stock_avant + Number(quantite) : Math.max(0, stock_avant - Number(quantite));
    await supabase.from('produits').update({ stock_actuel: stock_apres, updated_at: new Date() }).eq('id', produit_id);
    await supabase.from('mouvements_stock').insert({ boutique_id: req.boutique_id, produit_id, type, quantite: type === 'entree' ? quantite : -quantite, stock_avant, stock_apres, motif });
    if (stock_avant > produit.stock_minimum && stock_apres <= produit.stock_minimum) {
      await notifierStockFaible(req.boutique_id, [{ ...produit, stock_actuel: stock_apres }]);
    }
    res.json({ success: true, message: 'Stock ajusté.', stock_apres });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/mouvements', proteger, async (req, res) => {
  try {
    const { produit_id, type, limit=100 } = req.query;
    let q = supabase.from('mouvements_stock').select('*, produits(nom)').eq('boutique_id', req.boutique_id).order('created_at', { ascending: false }).limit(Number(limit));
    if (produit_id) q = q.eq('produit_id', produit_id);
    if (type) q = q.eq('type', type);
    const { data } = await q;
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/alertes', proteger, async (req, res) => {
  try {
    const { data } = await supabase.from('produits').select('*, categories(nom)').eq('boutique_id', req.boutique_id).eq('actif', true).order('stock_actuel');
    const alertes = data.filter(p => p.stock_actuel <= p.stock_minimum);
    res.json({ success: true, data: alertes, count: alertes.length });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/alertes/email', proteger, async (req, res) => {
  try {
    const { data } = await supabase.from('produits').select('*').eq('boutique_id', req.boutique_id).eq('actif', true);
    const faibles = data.filter(p => p.stock_actuel <= p.stock_minimum);
    if (faibles.length === 0) return res.json({ success: true, message: 'Aucun stock faible.' });
    const { data: boutique } = await supabase.from('boutiques').select('nom').eq('id', req.boutique_id).single();
    const envoyee = await sendEmail(req.user.email, 'alerteStock', req.user.prenom, faibles, boutique.nom);
    if (!envoyee) return res.status(500).json({ success: false, message: 'Impossible d envoyer l email de stock. Vérifiez la configuration de l email.' });
    res.json({ success: true, message: 'Alerte envoyée pour ' + faibles.length + ' produit(s).' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
