const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger, checkPlan } = require('../middleware/auth');

router.get('/dashboard', proteger, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const debutMois = today.slice(0,7) + '-01';
    const debut = today + 'T00:00:00.000Z', fin = today + 'T23:59:59.999Z';
    
    const [vj, vm, ventesJ, ventesTotal, boutique, allP, credits] = await Promise.all([
      supabase.from('ventes').select('total_final').eq('boutique_id', req.boutique_id).neq('statut','annulee').gte('created_at', today + 'T00:00:00Z'),
      supabase.from('ventes').select('total_final').eq('boutique_id', req.boutique_id).neq('statut','annulee').gte('created_at', debutMois + 'T00:00:00Z'),
      supabase.from('ventes').select('*, lignes_vente(*)').eq('boutique_id', req.boutique_id).neq('statut','annulee').gte('created_at', debut).lte('created_at', fin),
      supabase.from('ventes').select('*, lignes_vente(*)').eq('boutique_id', req.boutique_id).neq('statut','annulee'),
      supabase.from('boutiques').select('created_at').eq('id', req.boutique_id).maybeSingle(),
      supabase.from('produits').select('stock_actuel,stock_minimum').eq('boutique_id', req.boutique_id).eq('actif', true),
      supabase.from('clients').select('credit_encours').eq('boutique_id', req.boutique_id),
    ]);
    
    // Calcul du bénéfice du jour
    let benefice_jour = 0, total_remises = 0;
    ventesJ.data?.forEach(v => {
      total_remises += v.remise || 0;
      v.lignes_vente?.forEach(l => {
        benefice_jour += (l.prix_unitaire - l.prix_achat) * l.quantite;
      });
    });
    benefice_jour -= total_remises;

    let benefice_total = 0;
    ventesTotal.data?.forEach(v => {
      benefice_total -= v.remise || 0;
      v.lignes_vente?.forEach(l => {
        benefice_total += (l.prix_unitaire - l.prix_achat) * l.quantite;
      });
    });
    
    const nb_alertes = allP.data?.filter(p => p.stock_actuel <= p.stock_minimum).length || 0;
    const total_credits = credits.data?.reduce((s,c) => s + (c.credit_encours||0), 0) || 0;
    const total_produits = allP.data?.length || 0;
    
    res.json({ success: true, data: {
      ventes_jour: vj.data?.length || 0,
      ca_jour: vj.data?.reduce((s,v) => s+v.total_final,0) || 0,
      benefice_jour: Math.max(0, benefice_jour),
      total_produits: total_produits,
      ca_mois: vm.data?.reduce((s,v) => s+v.total_final,0) || 0,
      nb_ventes_mois: vm.data?.length || 0,
      ca_total: ventesTotal.data?.reduce((s,v) => s+v.total_final,0) || 0,
      nb_ventes_total: ventesTotal.data?.length || 0,
      benefice_total: Math.max(0, benefice_total),
      boutique_created_at: boutique.data?.created_at,
      nb_alertes_stock: nb_alertes,
      total_credits_encours: total_credits,
    }});
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/global', proteger, async (req, res) => {
  try {
    const [ventesRes, boutiqueRes] = await Promise.all([
      supabase.from('ventes').select('*, lignes_vente(*)').eq('boutique_id', req.boutique_id).neq('statut','annulee').order('created_at', { ascending: false }),
      supabase.from('boutiques').select('created_at').eq('id', req.boutique_id).maybeSingle(),
    ]);
    const ventes = ventesRes.data || [];
    const ca = ventes.reduce((s,v) => s + v.total_final, 0);
    let benefice = 0;
    const modes = {}, prodMap = {};
    ventes.forEach(v => {
      benefice -= v.remise || 0;
      modes[v.mode_paiement] = (modes[v.mode_paiement]||0) + v.total_final;
      v.lignes_vente?.forEach(l => {
        benefice += (l.prix_unitaire - l.prix_achat) * l.quantite;
        if (!prodMap[l.nom_produit]) prodMap[l.nom_produit] = { nom: l.nom_produit, quantite: 0, total: 0 };
        prodMap[l.nom_produit].quantite += l.quantite;
        prodMap[l.nom_produit].total += l.total;
      });
    });
    const top_produits = Object.values(prodMap).sort((a,b) => b.total - a.total).slice(0, 10);
    res.json({ success: true, data: {
      depuis: boutiqueRes.data?.created_at,
      ca,
      nb_ventes: ventes.length,
      benefice: Math.max(0, benefice),
      panier_moyen: ventes.length ? ca / ventes.length : 0,
      modes,
      top_produits,
    } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/jour', proteger, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const debut = date + 'T00:00:00.000Z', fin = date + 'T23:59:59.999Z';
    const { data: ventes } = await supabase.from('ventes').select('*, lignes_vente(*)').eq('boutique_id', req.boutique_id).neq('statut','annulee').gte('created_at', debut).lte('created_at', fin);
    const ca = ventes.reduce((s,v) => s + v.total_final, 0);
    let benefice = 0, total_remises = ventes.reduce((s,v) => s + v.remise, 0);
    const modes = {}, prodMap = {};
    ventes.forEach(v => {
      modes[v.mode_paiement] = (modes[v.mode_paiement]||0) + v.total_final;
      v.lignes_vente.forEach(l => {
        benefice += (l.prix_unitaire - l.prix_achat) * l.quantite;
        if (!prodMap[l.nom_produit]) prodMap[l.nom_produit] = { nom: l.nom_produit, quantite: 0, total: 0 };
        prodMap[l.nom_produit].quantite += l.quantite;
        prodMap[l.nom_produit].total += l.total;
      });
    });
    benefice -= total_remises;
    const top_produits = Object.values(prodMap).sort((a,b) => b.total - a.total).slice(0,5);
    res.json({ success: true, data: { date, ca, nb_ventes: ventes.length, benefice, total_remises, modes, top_produits, ventes } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/mois', proteger, checkPlan('pro'), async (req, res) => {
  try {
    const annee = req.query.annee || new Date().getFullYear();
    const mois = req.query.mois || (new Date().getMonth() + 1);
    const debut = annee + '-' + String(mois).padStart(2,'0') + '-01T00:00:00.000Z';
    const finDate = new Date(annee, mois, 0); finDate.setHours(23,59,59,999);
    const { data: ventes } = await supabase.from('ventes').select('*, lignes_vente(*)').eq('boutique_id', req.boutique_id).neq('statut','annulee').gte('created_at', debut).lte('created_at', finDate.toISOString());
    const ca = ventes.reduce((s,v) => s + v.total_final, 0);
    let benefice = 0; const parJour = {};
    ventes.forEach(v => {
      const j = v.created_at.split('T')[0];
      parJour[j] = (parJour[j]||0) + v.total_final;
      v.lignes_vente.forEach(l => { benefice += (l.prix_unitaire - l.prix_achat) * l.quantite; });
    });
    const graphData = Object.entries(parJour).map(([date,total]) => ({ date, total })).sort((a,b) => a.date.localeCompare(b.date));
    res.json({ success: true, data: { ca, nb_ventes: ventes.length, benefice, graphData } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
