const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger } = require('../middleware/auth');

const genNumero = () => 'V' + Date.now().toString().slice(-8);

router.post('/', proteger, async (req, res) => {
  try {
    const { lignes, mode_paiement='especes', remise=0, client_id=null, notes='', montant_recu=null } = req.body;
    if (!lignes || lignes.length === 0) return res.status(400).json({ success: false, message: 'Panier vide.' });
    let total = 0;
    const lignesData = [];
    for (const l of lignes) {
      const { data: produit } = await supabase.from('produits').select('*').eq('id', l.produit_id).eq('boutique_id', req.boutique_id).single();
      if (!produit) return res.status(400).json({ success: false, message: 'Produit introuvable.' });
      if (produit.stock_actuel < l.quantite) return res.status(400).json({ success: false, message: 'Stock insuffisant pour ' + produit.nom + '. Disponible: ' + produit.stock_actuel });
      const ligneTotal = produit.prix_vente * l.quantite;
      total += ligneTotal;
      lignesData.push({ produit, quantite: l.quantite, total: ligneTotal });
    }
    const total_final = Math.max(0, total - remise);
    const { data: vente, error: ve } = await supabase.from('ventes').insert({
      boutique_id: req.boutique_id, caissier_id: req.user.id, client_id,
      numero: genNumero(), total, remise, total_final, mode_paiement, notes,
      statut: mode_paiement === 'credit' ? 'credit' : 'payee'
    }).select().single();
    if (ve) throw ve;
    for (const { produit, quantite, total: lt } of lignesData) {
      await supabase.from('lignes_vente').insert({ vente_id: vente.id, produit_id: produit.id, nom_produit: produit.nom, quantite, prix_unitaire: produit.prix_vente, prix_achat: produit.prix_achat, total: lt });
      const newStock = produit.stock_actuel - quantite;
      await supabase.from('produits').update({ stock_actuel: newStock, updated_at: new Date() }).eq('id', produit.id);
      await supabase.from('mouvements_stock').insert({ boutique_id: req.boutique_id, produit_id: produit.id, type: 'vente', quantite: -quantite, stock_avant: produit.stock_actuel, stock_apres: newStock, reference_id: vente.id });
    }
    if (mode_paiement === 'credit' && client_id) {
      await supabase.from('credits').insert({ boutique_id: req.boutique_id, client_id, vente_id: vente.id, montant: total_final });
    }
    if (client_id) {
      const { data: cli } = await supabase.from('clients').select('total_achats,nb_achats').eq('id', client_id).single();
      await supabase.from('clients').update({ total_achats: (cli?.total_achats||0) + total_final, nb_achats: (cli?.nb_achats||0) + 1 }).eq('id', client_id);
    }
    const { data: venteComplete } = await supabase.from('ventes').select('*, lignes_vente(*)').eq('id', vente.id).single();
    venteComplete.montant_recu = montant_recu;
    res.status(201).json({ success: true, data: venteComplete, message: 'Vente enregistrée.' });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: err.message }); }
});

router.get('/', proteger, async (req, res) => {
  try {
    const { debut, fin, mode_paiement, page=1, limit=50 } = req.query;
    const from = (page-1)*limit, to = from + Number(limit) - 1;
    let q = supabase.from('ventes').select('*, lignes_vente(*), clients(nom,telephone)', { count: 'exact' }).eq('boutique_id', req.boutique_id).neq('statut','annulee').order('created_at', { ascending: false }).range(from, to);
    if (debut) q = q.gte('created_at', debut);
    if (fin) q = q.lte('created_at', fin);
    if (mode_paiement) q = q.eq('mode_paiement', mode_paiement);
    const { data, count } = await q;
    res.json({ success: true, data, total: count });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/historique', proteger, async (req, res) => {
  try {
    const { debut, fin, mode_paiement, page=1, limit=100 } = req.query;
    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;

    let q = supabase
      .from('ventes')
      .select('*, lignes_vente(*)', { count: 'exact' })
      .eq('boutique_id', req.boutique_id)
      .neq('statut', 'annulee')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (debut) q = q.gte('created_at', debut + 'T00:00:00.000Z');
    if (fin) q = q.lte('created_at', fin + 'T23:59:59.999Z');
    if (mode_paiement) q = q.eq('mode_paiement', mode_paiement);

    const { data, count, error } = await q;
    if (error) throw error;

    const ventes = data || [];
    const clientIds = [...new Set(ventes.map(v => v.client_id).filter(Boolean))];
    let clientsParId = {};
    if (clientIds.length > 0) {
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id,nom,telephone')
        .eq('boutique_id', req.boutique_id)
        .in('id', clientIds);
      if (clientsError) throw clientsError;
      clientsParId = Object.fromEntries((clients || []).map(client => [client.id, client]));
    }
    ventes.forEach(vente => {
      vente.clients = vente.client_id ? clientsParId[vente.client_id] || null : null;
    });

    const resume = ventes.reduce((acc, vente) => {
      acc.ca += Number(vente.total_final || 0);
      acc.remises += Number(vente.remise || 0);
      acc.articles += (vente.lignes_vente || []).reduce((s, l) => s + Number(l.quantite || 0), 0);
      acc.modes[vente.mode_paiement] = (acc.modes[vente.mode_paiement] || 0) + Number(vente.total_final || 0);
      return acc;
    }, { ca: 0, remises: 0, articles: 0, modes: {} });

    const groupes = {};
    ventes.forEach(vente => {
      const jour = vente.created_at.split('T')[0];
      if (!groupes[jour]) groupes[jour] = { date: jour, total: 0, remises: 0, articles: 0, ventes: [] };
      groupes[jour].total += Number(vente.total_final || 0);
      groupes[jour].remises += Number(vente.remise || 0);
      groupes[jour].articles += (vente.lignes_vente || []).reduce((s, l) => s + Number(l.quantite || 0), 0);
      groupes[jour].ventes.push(vente);
    });

    res.json({
      success: true,
      data: Object.values(groupes).sort((a, b) => b.date.localeCompare(a.date)),
      resume: { ...resume, nb_ventes: ventes.length },
      total: count,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', proteger, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ventes')
      .select('*, lignes_vente(*), clients(nom,telephone,email)')
      .eq('id', req.params.id)
      .eq('boutique_id', req.boutique_id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Vente introuvable.' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id/annuler', proteger, async (req, res) => {
  try {
    const { data: vente } = await supabase.from('ventes').select('*, lignes_vente(*)').eq('id', req.params.id).eq('boutique_id', req.boutique_id).single();
    if (!vente || vente.statut === 'annulee') return res.status(400).json({ success: false, message: 'Vente introuvable ou déjà annulée.' });
    for (const l of vente.lignes_vente) {
      const { data: p } = await supabase.from('produits').select('stock_actuel').eq('id', l.produit_id).single();
      const newStock = p.stock_actuel + l.quantite;
      await supabase.from('produits').update({ stock_actuel: newStock }).eq('id', l.produit_id);
      await supabase.from('mouvements_stock').insert({ boutique_id: req.boutique_id, produit_id: l.produit_id, type: 'retour', quantite: l.quantite, stock_avant: p.stock_actuel, stock_apres: newStock, reference_id: vente.id });
    }
    await supabase.from('ventes').update({ statut: 'annulee' }).eq('id', req.params.id);
    res.json({ success: true, message: 'Vente annulée et stock restauré.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
