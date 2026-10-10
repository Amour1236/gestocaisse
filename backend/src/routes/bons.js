const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger } = require('../middleware/auth');

/**
 * @route GET /bons
 * @desc Liste des bons (réception et sortie)
 * @access Privé
 */
router.get('/', proteger, async (req, res) => {
  try {
    const { type, statut, limit = 50 } = req.query;

    let q = supabase
      .from('bons')
      .select('*, utilisateur:utilisateur_id(nom, prenom)', { count: 'exact' })
      .eq('boutique_id', req.boutique_id)
      .order('date_bon', { ascending: false })
      .limit(Number(limit));

    if (type) q = q.eq('type_bon', type);
    if (statut) q = q.eq('statut', statut);

    const { data, count, error } = await q;
    if (error) throw error;

    // Calculer les totaux pour chaque bon
    const bonsAvecTotaux = await Promise.all(
      (data || []).map(async (bon) => {
        const { data: lignes } = await supabase
          .from('lignes_bon')
          .select('quantite, prix_unitaire')
          .eq('bon_id', bon.id);

        const total = lignes?.reduce((s, l) => s + (l.quantite * (l.prix_unitaire || 0)), 0) || 0;
        const nb_articles = lignes?.reduce((s, l) => s + l.quantite, 0) || 0;

        return { ...bon, total, nb_articles };
      })
    );

    res.json({ success: true, data: bonsAvecTotaux, total: count || 0 });
  } catch (err) {
    console.error('[Bons] Erreur liste:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /bons/:id
 * @desc Détail d'un bon avec ses lignes
 * @access Privé
 */
router.get('/:id', proteger, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: bon, error: bonError } = await supabase
      .from('bons')
      .select('*, utilisateur:utilisateur_id(nom, prenom)')
      .eq('id', id)
      .eq('boutique_id', req.boutique_id)
      .single();

    if (bonError || !bon) {
      return res.status(404).json({ success: false, message: 'Bon introuvable.' });
    }

    const { data: lignes, error: ligError } = await supabase
      .from('lignes_bon')
      .select('*')
      .eq('bon_id', id)
      .order('created_at');

    if (ligError) throw ligError;

    bon.lignes = lignes || [];
    bon.stats = {
      nb_articles: lignes?.reduce((s, l) => s + l.quantite, 0) || 0,
      nb_produits: lignes?.length || 0,
      total: lignes?.reduce((s, l) => s + (l.quantite * (l.prix_unitaire || 0)), 0) || 0,
    };

    res.json({ success: true, data: bon });
  } catch (err) {
    console.error('[Bons] Erreur détail:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /bons
 * @desc Créer un nouveau bon (réception ou sortie)
 * @access Privé
 */
router.post('/', proteger, async (req, res) => {
  try {
    const {
      type_bon, // 'reception' ou 'sortie'
      reference = '',
      fournisseur = '',
      client = '',
      notes = '',
      lignes = [], // [{ produit_id, quantite, prix_unitaire }]
    } = req.body;

    if (!type_bon || !['reception', 'sortie'].includes(type_bon)) {
      return res.status(400).json({ success: false, message: 'Type de bon invalide.' });
    }

    if (type_bon === 'reception' && !fournisseur.trim()) {
      return res.status(400).json({ success: false, message: 'Fournisseur requis pour un bon de réception.' });
    }

    if (type_bon === 'sortie' && !client.trim() && !notes.trim()) {
      return res.status(400).json({ success: false, message: 'Client ou motif requis pour un bon de sortie.' });
    }

    if (!lignes || lignes.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucune ligne dans le bon.' });
    }

    // Valider les lignes
    for (const lig of lignes) {
      if (!lig.produit_id) {
        return res.status(400).json({ success: false, message: 'Produit manquant dans une ligne.' });
      }
      const qte = parseInt(lig.quantite, 10);
      if (isNaN(qte) || qte <= 0) {
        return res.status(400).json({ success: false, message: 'Quantité invalide.' });
      }
    }

    // Récupérer les infos produits
    const produitIds = lignes.map(l => l.produit_id);
    const { data: produits, error: prodError } = await supabase
      .from('produits')
      .select('id, nom, stock_actuel')
      .in('id', produitIds)
      .eq('boutique_id', req.boutique_id)
      .eq('actif', true);

    if (prodError) throw prodError;

    if (produits.length !== produitIds.length) {
      return res.status(400).json({ success: false, message: 'Certains produits sont introuvables.' });
    }

    // Vérifier le stock pour les bons de sortie
    if (type_bon === 'sortie') {
      const produitsMap = new Map(produits.map(p => [p.id, p]));
      for (const lig of lignes) {
        const produit = produitsMap.get(lig.produit_id);
        if (produit && produit.stock_actuel < lig.quantite) {
          return res.status(400).json({
            success: false,
            message: `Stock insuffisant pour ${produit.nom}. Stock actuel: ${produit.stock_actuel}`,
          });
        }
      }
    }

    // Créer le bon
    const { data: bon, error: bonError } = await supabase
      .from('bons')
      .insert({
        boutique_id: req.boutique_id,
        utilisateur_id: req.user.id,
        type_bon,
        reference: reference.trim() || `BR-${Date.now().toString(36).toUpperCase()}`,
        fournisseur: fournisseur.trim(),
        client: client.trim(),
        notes: notes.trim(),
        statut: 'valide',
      })
      .select()
      .single();

    if (bonError) throw bonError;

    // Créer les lignes de bon
    const produitsMap = new Map(produits.map(p => [p.id, p]));
    const lignesInsert = lignes.map(lig => {
      const produit = produitsMap.get(lig.produit_id);
      return {
        bon_id: bon.id,
        produit_id: lig.produit_id,
        nom_produit: produit.nom,
        quantite: parseInt(lig.quantite, 10),
        prix_unitaire: parseFloat(lig.prix_unitaire || 0),
      };
    });

    const { error: ligError } = await supabase
      .from('lignes_bon')
      .insert(lignesInsert);

    if (ligError) throw ligError;

    // Traiter immédiatement le bon (mettre à jour les stocks)
    const { data: result, error: traiterError } = await supabase.rpc('traiter_bon', {
      p_bon_id: bon.id,
    });

    if (traiterError) {
      console.error('[Bons] Erreur traitement RPC:', traiterError);
      // Le bon est créé, on renvoie un avertissement
    }

    // Récupérer le bon complet
    const { data: bonComplet } = await supabase
      .from('bons')
      .select('*, utilisateur:utilisateur_id(nom, prenom)')
      .eq('id', bon.id)
      .single();

    res.status(201).json({
      success: true,
      data: bonComplet,
      result_traitement: result,
      message: type_bon === 'reception'
        ? `Bon de réception créé et stock mis à jour.`
        : `Bon de sortie créé et stock mis à jour.`,
    });
  } catch (err) {
    console.error('[Bons] Erreur création:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route PUT /bons/:id
 * @desc Modifier un bon (seulement si pas encore traité)
 * @access Privé
 */
router.put('/:id', proteger, async (req, res) => {
  try {
    const { id } = req.params;
    const { reference, fournisseur, client, notes } = req.body;

    const { data: bon, error: bonError } = await supabase
      .from('bons')
      .select('*')
      .eq('id', id)
      .eq('boutique_id', req.boutique_id)
      .single();

    if (bonError || !bon) {
      return res.status(404).json({ success: false, message: 'Bon introuvable.' });
    }

    if (bon.statut === 'annule') {
      return res.status(400).json({ success: false, message: 'Impossible de modifier un bon annulé.' });
    }

    const { error: updateError } = await supabase
      .from('bons')
      .update({
        reference: reference || bon.reference,
        fournisseur: fournisseur !== undefined ? fournisseur : bon.fournisseur,
        client: client !== undefined ? client : bon.client,
        notes: notes !== undefined ? notes : bon.notes,
      })
      .eq('id', id);

    if (updateError) throw updateError;

    const { data: bonUpdated } = await supabase
      .from('bons')
      .select('*, utilisateur:utilisateur_id(nom, prenom)')
      .eq('id', id)
      .single();

    res.json({ success: true, data: bonUpdated, message: 'Bon modifié.' });
  } catch (err) {
    console.error('[Bons] Erreur modification:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route DELETE /bons/:id
 * @desc Annuler un bon (invalide le bon et inverse les mouvements de stock)
 * @access Privé
 */
router.delete('/:id', proteger, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: bon, error: bonError } = await supabase
      .from('bons')
      .select('*, utilisateur:utilisateur_id(nom, prenom)')
      .eq('id', id)
      .eq('boutique_id', req.boutique_id)
      .single();

    if (bonError || !bon) {
      return res.status(404).json({ success: false, message: 'Bon introuvable.' });
    }

    if (bon.statut === 'annule') {
      return res.status(400).json({ success: false, message: 'Bon déjà annulé.' });
    }

    // Récupérer les lignes du bon
    const { data: lignes, error: ligError } = await supabase
      .from('lignes_bon')
      .select('*')
      .eq('bon_id', id);

    if (ligError) throw ligError;

    // Inverser les mouvements de stock pour chaque ligne
    for (const lig of lignes || []) {
      // Récupérer le stock actuel
      const { data: produit } = await supabase
        .from('produits')
        .select('id, nom, stock_actuel')
        .eq('id', lig.produit_id)
        .single();

      if (produit) {
        // Inverser le mouvement
        const nouveauStock = bon.type_bon === 'reception'
          ? produit.stock_actuel - lig.quantite
          : produit.stock_actuel + lig.quantite;

        await supabase
          .from('produits')
          .update({ stock_actuel: Math.max(0, nouveauStock), updated_at: new Date().toISOString() })
          .eq('id', lig.produit_id);

        // Ajouter un mouvement de compensation
        await supabase.from('mouvements_stock').insert({
          boutique_id: req.boutique_id,
          produit_id: lig.produit_id,
          type: bon.type_bon === 'reception' ? 'sortie' : 'entree',
          quantite: bon.type_bon === 'reception' ? -lig.quantite : lig.quantite,
          stock_avant: produit.stock_actuel,
          stock_apres: Math.max(0, nouveauStock),
          motif: `Annulation ${bon.type_bon === 'reception' ? 'réception' : 'sortie'} #${bon.reference}`,
          reference_id: id,
        });
      }
    }

    // Marquer le bon comme annulé
    await supabase
      .from('bons')
      .update({ statut: 'annule' })
      .eq('id', id);

    res.json({
      success: true,
      message: `Bon ${bon.type_bon === 'reception' ? 'de réception' : 'de sortie'} annulé. Stock restauré.`,
    });
  } catch (err) {
    console.error('[Bons] Erreur annulation:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
