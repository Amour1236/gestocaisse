const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger } = require('../middleware/auth');

/**
 * @route GET /inventaires
 * @desc Liste des inventaires
 * @access Privé
 */
router.get('/', proteger, async (req, res) => {
  try {
    const { statut, limit = 50 } = req.query;

    let q = supabase
      .from('inventaires')
      .select('*, utilisateur:utilisateur_id(nom, prenom)', { count: 'exact' })
      .eq('boutique_id', req.boutique_id)
      .order('date_inventaire', { ascending: false })
      .limit(Number(limit));

    if (statut) q = q.eq('statut', statut);

    const { data, count, error } = await q;
    if (error) throw error;

    res.json({ success: true, data: data || [], total: count || 0 });
  } catch (err) {
    console.error('[Inventaires] Erreur liste:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /inventaires/:id
 * @desc Détail d'un inventaire avec ses lignes
 * @access Privé
 */
router.get('/:id', proteger, async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer l'inventaire
    const { data: inventaire, error: invError } = await supabase
      .from('inventaires')
      .select('*, utilisateur:utilisateur_id(nom, prenom)')
      .eq('id', id)
      .eq('boutique_id', req.boutique_id)
      .single();

    if (invError || !inventaire) {
      return res.status(404).json({ success: false, message: 'Inventaire introuvable.' });
    }

    // Récupérer les lignes avec les infos produits
    const { data: lignes, error: ligError } = await supabase
      .from('lignes_inventaire')
      .select('*, produit:produit_id(id, nom, code_barre, categories(nom))')
      .eq('inventaire_id', id)
      .order('created_at');

    if (ligError) throw ligError;

    inventaire.lignes = lignes || [];

    // Statistiques
    inventaire.stats = {
      total_lignes: lignes?.length || 0,
      ecarts_positifs: lignes?.filter(l => l.ecart > 0).length || 0,
      ecarts_negatifs: lignes?.filter(l => l.ecart < 0).length || 0,
      lignes_sans_ecart: lignes?.filter(l => l.ecart === 0).length || 0,
    };

    res.json({ success: true, data: inventaire });
  } catch (err) {
    console.error('[Inventaires] Erreur détail:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /inventaires
 * @desc Créer un nouvel inventaire (initialise avec tous les produits)
 * @access Privé (propriétaire uniquement)
 */
router.post('/', proteger, async (req, res) => {
  try {
    const { notes = '' } = req.body;

    // Créer l'inventaire
    const { data: inventaire, error: invError } = await supabase
      .from('inventaires')
      .insert({
        boutique_id: req.boutique_id,
        utilisateur_id: req.user.id,
        notes,
        statut: 'en_cours',
      })
      .select()
      .single();

    if (invError) throw invError;

    // Récupérer tous les produits actifs pour initialiser les lignes
    const { data: produits, error: prodError } = await supabase
      .from('produits')
      .select('id, nom, stock_actuel, categories(nom)')
      .eq('boutique_id', req.boutique_id)
      .eq('actif', true)
      .order('nom');

    if (prodError) throw prodError;

    // Créer les lignes d'inventaire (stock physique = null = non compté)
    if (produits && produits.length > 0) {
      const lignes = produits.map(p => ({
        inventaire_id: inventaire.id,
        produit_id: p.id,
        stock_theorique: p.stock_actuel,
        stock_physique: null, // Non encore compté
        notes: '',
      }));

      const { error: ligError } = await supabase
        .from('lignes_inventaire')
        .insert(lignes);

      if (ligError) throw ligError;
    }

    // Récupérer l'inventaire complet
    const { data: inventaireComplet } = await supabase
      .from('inventaires')
      .select('*, utilisateur:utilisateur_id(nom, prenom)')
      .eq('id', inventaire.id)
      .single();

    res.status(201).json({
      success: true,
      data: inventaireComplet,
      message: `Inventaire créé avec ${produits?.length || 0} produits à compter.`,
    });
  } catch (err) {
    console.error('[Inventaires] Erreur création:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route PUT /inventaires/:id/lignes/:ligneId
 * @desc Mettre à jour le stock physique d'une ligne d'inventaire
 * @access Privé
 */
router.put('/:id/lignes/:ligneId', proteger, async (req, res) => {
  try {
    const { id, ligneId } = req.params;
    const { stock_physique, notes = '' } = req.body;

    // Vérifier que l'inventaire est en cours
    const { data: inventaire, error: invError } = await supabase
      .from('inventaires')
      .select('id, statut')
      .eq('id', id)
      .eq('boutique_id', req.boutique_id)
      .single();

    if (invError || !inventaire) {
      return res.status(404).json({ success: false, message: 'Inventaire introuvable.' });
    }

    if (inventaire.statut !== 'en_cours') {
      return res.status(400).json({ success: false, message: 'Cet inventaire est déjà terminé ou annulé.' });
    }

    // Vérifier que la ligne existe
    const { data: ligne, error: ligError } = await supabase
      .from('lignes_inventaire')
      .select('*')
      .eq('id', ligneId)
      .eq('inventaire_id', id)
      .single();

    if (ligError || !ligne) {
      return res.status(404).json({ success: false, message: 'Ligne introuvable.' });
    }

    // Mettre à jour la ligne
    const stockPhysiqueNum = parseInt(stock_physique, 10);
    if (isNaN(stockPhysiqueNum) || stockPhysiqueNum < 0) {
      return res.status(400).json({ success: false, message: 'Stock physique invalide.' });
    }

    const { data: ligneUpdated, error: updateError } = await supabase
      .from('lignes_inventaire')
      .update({
        stock_physique: stockPhysiqueNum,
        notes,
        date_comptage: new Date().toISOString(),
      })
      .eq('id', ligneId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      data: ligneUpdated,
      message: 'Stock physique enregistré.',
    });
  } catch (err) {
    console.error('[Inventaires] Erreur mise à jour ligne:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /inventaires/:id/lignes/bulk
 * @desc Mettre à jour plusieurs lignes d'inventaire d'un coup
 * @access Privé
 */
router.post('/:id/lignes/bulk', proteger, async (req, res) => {
  try {
    const { id } = req.params;
    const { lignes } = req.body; // [{ ligneId, stock_physique, notes }]

    if (!lignes || !Array.isArray(lignes) || lignes.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucune ligne à mettre à jour.' });
    }

    // Vérifier que l'inventaire est en cours
    const { data: inventaire, error: invError } = await supabase
      .from('inventaires')
      .select('id, statut')
      .eq('id', id)
      .eq('boutique_id', req.boutique_id)
      .single();

    if (invError || !inventaire) {
      return res.status(404).json({ success: false, message: 'Inventaire introuvable.' });
    }

    if (inventaire.statut !== 'en_cours') {
      return res.status(400).json({ success: false, message: 'Cet inventaire est déjà terminé ou annulé.' });
    }

    // Mettre à jour chaque ligne
    const erreurs = [];
    for (const lig of lignes) {
      const stockPhysiqueNum = parseInt(lig.stock_physique, 10);
      if (isNaN(stockPhysiqueNum) || stockPhysiqueNum < 0) {
        erreurs.push({ ligneId: lig.ligneId, message: 'Stock invalide' });
        continue;
      }

      const { error } = await supabase
        .from('lignes_inventaire')
        .update({
          stock_physique: stockPhysiqueNum,
          notes: lig.notes || '',
          date_comptage: new Date().toISOString(),
        })
        .eq('id', lig.ligneId)
        .eq('inventaire_id', id);

      if (error) {
        erreurs.push({ ligneId: lig.ligneId, message: error.message });
      }
    }

    res.json({
      success: true,
      message: `${lignes.length - erreurs.length} ligne(s) mise(s) à jour.`,
      erreurs: erreurs.length > 0 ? erreurs : undefined,
    });
  } catch (err) {
    console.error('[Inventaires] Erreur bulk update:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /inventaires/:id/valider
 * @desc Valider l'inventaire et appliquer les écarts aux stocks
 * @access Privé
 */
router.post('/:id/valider', proteger, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'inventaire est en cours
    const { data: inventaire, error: invError } = await supabase
      .from('inventaires')
      .select('*, utilisateur:utilisateur_id(nom, prenom)')
      .eq('id', id)
      .eq('boutique_id', req.boutique_id)
      .single();

    if (invError || !inventaire) {
      return res.status(404).json({ success: false, message: 'Inventaire introuvable.' });
    }

    if (inventaire.statut !== 'en_cours') {
      return res.status(400).json({ success: false, message: 'Cet inventaire est déjà terminé ou annulé.' });
    }

    // Vérifier que toutes les lignes ont été comptées
    const { data: lignes, error: ligError } = await supabase
      .from('lignes_inventaire')
      .select('*')
      .eq('inventaire_id', id);

    if (ligError) throw ligError;

    const nonComptes = lignes?.filter(l => l.stock_physique === null) || [];
    if (nonComptes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${nonComptes.length} produit(s) n'ont pas encore été comptés.`,
      });
    }

    // Appeler la fonction RPC pour valider l'inventaire
    const { data: result, error: rpcError } = await supabase.rpc('valider_inventaire', {
      p_inventaire_id: id,
    });

    if (rpcError) {
      console.error('[Inventaires] Erreur RPC valider_inventaire:', rpcError);
      return res.status(500).json({ success: false, message: 'Erreur lors de la validation.' });
    }

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Récupérer l'inventaire mis à jour
    const { data: inventaireTermine } = await supabase
      .from('inventaires')
      .select('*, utilisateur:utilisateur_id(nom, prenom)')
      .eq('id', id)
      .single();

    res.json({
      success: true,
      data: inventaireTermine,
      result,
      message: `Inventaire validé ! ${result.lignes_traitees} ligne(s) traitée(s), ${result.ecarts_positifs} excédent(s), ${result.ecarts_negatifs} manquants.`,
    });
  } catch (err) {
    console.error('[Inventaires] Erreur validation:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route DELETE /inventaires/:id
 * @desc Annuler un inventaire
 * @access Privé
 */
router.delete('/:id', proteger, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'inventaire est en cours
    const { data: inventaire, error: invError } = await supabase
      .from('inventaires')
      .select('id, statut')
      .eq('id', id)
      .eq('boutique_id', req.boutique_id)
      .single();

    if (invError || !inventaire) {
      return res.status(404).json({ success: false, message: 'Inventaire introuvable.' });
    }

    if (inventaire.statut === 'termine') {
      return res.status(400).json({ success: false, message: 'Impossible d annuler un inventaire déjà validé.' });
    }

    // Marquer comme annulé
    const { error: deleteError } = await supabase
      .from('inventaires')
      .update({ statut: 'annule' })
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.json({ success: true, message: 'Inventaire annulé.' });
  } catch (err) {
    console.error('[Inventaires] Erreur suppression:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
