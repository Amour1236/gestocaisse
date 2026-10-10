const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger } = require('../middleware/auth');
const { auditLog } = require('../services/audit');

/**
 * GET /api/transferts — Liste des transferts inter-boutiques
 */
router.get('/', proteger, async (req, res) => {
  try {
    const { statut, boutique_source } = req.query;
    let q = supabase
      .from('transferts_stock')
      .select(`
        *,
        produits(nom,unite,code_barre),
        boutiques_source:nom_boutique_source(name),
        boutiques_dest:nom_boutique_dest(name)
      `)
      .or(`boutique_source.eq.${req.boutique_id},boutique_destination.eq.${req.boutique_id}`)
      .order('created_at', { ascending: false })
      .limit(100);

    if (statut) q = q.eq('statut', statut);

    const { data, error } = await q;
    if (error) throw error;

    // Enrichir avec les noms de boutiques
    const boutiqueIds = [...new Set((data || []).map(t => [t.boutique_source, t.boutique_destination]).flat())];
    let boutiques = {};
    if (boutiqueIds.length) {
      const { data: bs } = await supabase.from('boutiques').select('id,nom').in('id', boutiqueIds);
      boutiques = Object.fromEntries((bs || []).map(b => [b.id, b]));
    }

    const enriched = (data || []).map(t => ({
      ...t,
      boutique_source_nom: boutiques[t.boutique_source]?.nom || '',
      boutique_dest_nom: boutiques[t.boutique_destination]?.nom || '',
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/transferts — Créer un transfert
 * Body: { produit_id, boutique_destination, quantite, motif }
 */
router.post('/', proteger, async (req, res) => {
  try {
    const { produit_id, boutique_destination, quantite, motif = '' } = req.body;
    if (!produit_id || !boutique_destination || !quantite) {
      return res.status(400).json({ success: false, message: 'produit_id, boutique_destination et quantite requis.' });
    }
    if (quantite <= 0) return res.status(400).json({ success: false, message: 'Quantité invalide.' });
    if (boutique_destination === req.boutique_id) {
      return res.status(400).json({ success: false, message: 'La destination ne peut pas être la même boutique.' });
    }

    // Vérifier le stock disponible
    const { data: produit } = await supabase
      .from('produits').select('id,nom,stock_actuel,boutique_id')
      .eq('id', produit_id).eq('boutique_id', req.boutique_id).single();
    if (!produit) return res.status(404).json({ success: false, message: 'Produit introuvable.' });
    if (produit.stock_actuel < quantite) {
      return res.status(400).json({
        success: false,
        message: `Stock insuffisant. Disponible: ${produit.stock_actuel}`
      });
    }

    // Vérifier que la boutique destination existe
    const { data: boutiqueDest } = await supabase
      .from('boutiques').select('id,nom').eq('id', boutique_destination).single();
    if (!boutiqueDest) return res.status(404).json({ success: false, message: 'Boutique destination introuvable.' });

    // Vérifier qu'un produit équivalent existe dans la boutique destination
    const { data: produitDest } = await supabase
      .from('produits').select('id')
      .eq('nom', produit.nom).eq('boutique_id', boutique_destination).maybeSingle();
    if (!produitDest) {
      return res.status(400).json({
        success: false,
        message: `Le produit "${produit.nom}" n'existe pas dans "${boutiqueDest.nom}". Créez-le d'abord.`
      });
    }

    const { data: transfert, error } = await supabase.from('transferts_stock').insert({
      boutique_source: req.boutique_id,
      boutique_destination,
      produit_id,
      quantite,
      motif,
      statut: 'en_attente',
      created_by: req.user.id,
    }).select().single();

    if (error) throw error;

    await auditLog(req, { action: 'create', entity: 'transferts_stock', entity_id: transfert.id, after_data: transfert });

    res.status(201).json({
      success: true,
      data: {
        ...transfert,
        boutique_source_nom: '',
        boutique_dest_nom: boutiqueDest.nom,
        produits: { nom: produit.nom },
      },
      message: `Transfert de ${quantite}x ${produit.nom} vers ${boutiqueDest.nom} — en attente de validation.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/transferts/:id — Valider ou annuler un transfert
 * Body: { action: 'valider' | 'annuler' | 'recu' }
 */
router.patch('/:id', proteger, async (req, res) => {
  try {
    const { action } = req.body;
    if (!['valider', 'annuler', 'recu'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action invalide.' });
    }

    const { data: transfert, error: te } = await supabase
      .from('transferts_stock')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (te || !transfert) return res.status(404).json({ success: false, message: 'Transfert introuvable.' });

    const isSource = transfert.boutique_source === req.boutique_id;
    const isDest = transfert.boutique_destination === req.boutique_id;
    if (!isSource && !isDest) return res.status(403).json({ success: false, message: 'Non autorisé.' });

    if (action === 'annuler') {
      if (transfert.statut !== 'en_attente') {
        return res.status(400).json({ success: false, message: 'Impossible d\'annuler ce transfert.' });
      }
      await supabase.from('transferts_stock')
        .update({ statut: 'annule', validated_by: req.user.id, validated_at: new Date().toISOString() })
        .eq('id', req.params.id);
      await auditLog(req, { action: 'update', entity: 'transferts_stock', entity_id: req.params.id });
      return res.json({ success: true, message: 'Transfert annulé.' });
    }

    if (action === 'valider') {
      // La boutique source valide : décrémenter son stock
      if (!isSource) return res.status(403).json({ success: false, message: 'Seule la boutique source peut valider.' });
      if (transfert.statut !== 'en_attente') {
        return res.status(400).json({ success: false, message: 'Transfert déjà validé ou annulé.' });
      }
      const { data: produit } = await supabase
        .from('produits').select('stock_actuel').eq('id', transfert.produit_id).single();
      if (!produit || produit.stock_actuel < transfert.quantite) {
        return res.status(400).json({ success: false, message: 'Stock insuffisant pour valider.' });
      }

      const newStockSource = produit.stock_actuel - transfert.quantite;
      await Promise.all([
        supabase.from('produits').update({ stock_actuel: newStockSource, updated_at: new Date() }).eq('id', transfert.produit_id),
        supabase.from('transferts_stock').update({
          statut: 'valide',
          validated_by: req.user.id,
          validated_at: new Date().toISOString(),
        }).eq('id', req.params.id),
        supabase.from('mouvements_stock').insert({
          boutique_id: req.boutique_id,
          produit_id: transfert.produit_id,
          type: 'transfert_sortant',
          quantite: -transfert.quantite,
          stock_avant: produit.stock_actuel,
          stock_apres: newStockSource,
          reference_id: req.params.id,
          note: `Transfert vers ${transfert.boutique_destination}`,
        }),
      ]);
      await auditLog(req, { action: 'update', entity: 'transferts_stock', entity_id: req.params.id });
      return res.json({ success: true, message: `Transfert validé. Stock source mis à jour.` });
    }

    if (action === 'recu') {
      // La boutique destination confirme la réception : incrémenter son stock
      if (!isDest) return res.status(403).json({ success: false, message: 'Seule la boutique destination peut confirmer.' });
      if (transfert.statut !== 'valide') {
        return res.status(400).json({ success: false, message: 'Le transfert doit être validé avant la réception.' });
      }
      const { data: produit } = await supabase
        .from('produits').select('stock_actuel')
        .eq('nom', (await supabase.from('produits').select('nom').eq('id', transfert.produit_id).single()).data?.nom)
        .eq('boutique_id', req.boutique_id).single();

      if (!produit) return res.status(404).json({ success: false, message: 'Produit destination introuvable.' });

      const newStockDest = produit.stock_actuel + transfert.quantite;
      await Promise.all([
        supabase.from('produits').update({ stock_actuel: newStockDest, updated_at: new Date() }).eq('id', produit.id),
        supabase.from('transferts_stock').update({
          statut: 'recu',
          received_at: new Date().toISOString(),
        }).eq('id', req.params.id),
        supabase.from('mouvements_stock').insert({
          boutique_id: req.boutique_id,
          produit_id: produit.id,
          type: 'transfert_entrant',
          quantite: transfert.quantite,
          stock_avant: produit.stock_actuel,
          stock_apres: newStockDest,
          reference_id: req.params.id,
          note: `Réception transfert de ${transfert.boutique_source}`,
        }),
      ]);
      await auditLog(req, { action: 'update', entity: 'transferts_stock', entity_id: req.params.id });
      return res.json({ success: true, message: `Réception confirmée. Stock destination mis à jour.` });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/transferts/boutiques — Liste des autres boutiques pour les transferts
 */
router.get('/boutiques', proteger, async (req, res) => {
  try {
    // Récupérer les boutiques du même owner ou toutes les boutiques (selon logique métier)
    // Pour l'instant : toutes les boutiques actives (sauf la courante)
    const { data } = await supabase
      .from('boutiques')
      .select('id,nom,plan')
      .eq('actif', true)
      .neq('id', req.boutique_id);
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
