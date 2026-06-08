const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger } = require('../middleware/auth');

router.get('/', proteger, async (req, res) => {
  try {
    const { search, categorie, alerte } = req.query;
    let q = supabase.from('produits').select('*, categories(nom,couleur)').eq('boutique_id', req.boutique_id).eq('actif', true).order('nom');
    if (search) q = q.ilike('nom', '%' + search + '%');
    if (categorie) q = q.eq('categorie_id', categorie);
    const { data, error } = await q;
    if (error) throw error;
    let produits = data;
    if (alerte === 'true') produits = data.filter(p => p.stock_actuel <= p.stock_minimum);
    res.json({ success: true, data: produits });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/barcode/:code', proteger, async (req, res) => {
  try {
    const { data } = await supabase.from('produits').select('*').eq('code_barre', req.params.code).eq('boutique_id', req.boutique_id).eq('actif', true).single();
    if (!data) return res.status(404).json({ success: false, message: 'Produit non trouvé.' });
    res.json({ success: true, data });
  } catch { res.status(404).json({ success: false, message: 'Produit non trouvé.' }); }
});

router.get('/:id', proteger, async (req, res) => {
  try {
    const { data, error } = await supabase.from('produits').select('*, categories(*)').eq('id', req.params.id).eq('boutique_id', req.boutique_id).single();
    if (error || !data) return res.status(404).json({ success: false, message: 'Produit non trouvé.' });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', proteger, async (req, res) => {
  try {
    const { nom, prix_vente, prix_achat=0, stock_actuel=0, stock_minimum=5, categorie_id=null, code_barre='', description='', unite='unité' } = req.body;
    if (!nom || !prix_vente) return res.status(400).json({ success: false, message: 'Nom et prix de vente requis.' });
    const { data: boutique } = await supabase.from('boutiques').select('plan').eq('id', req.boutique_id).single();
    if (boutique.plan === 'starter') {
      const { count } = await supabase.from('produits').select('id', { count: 'exact' }).eq('boutique_id', req.boutique_id).eq('actif', true);
      if (count >= 5) return res.status(402).json({ success: false, message: 'Plan Starter limité à 5 produits. Passez au plan Pro pour continuer.', requireUpgrade: true });
    }
    const { data, error } = await supabase.from('produits').insert({ nom, prix_vente, prix_achat, stock_actuel, stock_minimum, categorie_id, code_barre, description, unite, boutique_id: req.boutique_id }).select('*').single();
    if (error) throw error;
    if (stock_actuel > 0) {
      await supabase.from('mouvements_stock').insert({ boutique_id: req.boutique_id, produit_id: data.id, type: 'entree', quantite: stock_actuel, stock_avant: 0, stock_apres: stock_actuel, motif: 'Stock initial' });
    }
    res.status(201).json({ success: true, data, message: 'Produit créé.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', proteger, async (req, res) => {
  try {
    const { nom, prix_vente, prix_achat, stock_minimum, categorie_id, code_barre, description, unite } = req.body;
    const { data, error } = await supabase.from('produits').update({ nom, prix_vente, prix_achat, stock_minimum, categorie_id, code_barre, description, unite, updated_at: new Date() }).eq('id', req.params.id).eq('boutique_id', req.boutique_id).select().single();
    if (error) throw error;
    res.json({ success: true, data, message: 'Produit mis à jour.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', proteger, async (req, res) => {
  try {
    await supabase.from('produits').update({ actif: false }).eq('id', req.params.id).eq('boutique_id', req.boutique_id);
    res.json({ success: true, message: 'Produit supprimé.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
