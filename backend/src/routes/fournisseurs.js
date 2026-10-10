const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger } = require('../middleware/auth');

/**
 * @route GET /fournisseurs
 * @desc Liste des fournisseurs
 * @access Privé
 */
router.get('/', proteger, async (req, res) => {
  try {
    const { actif } = req.query;
    let q = supabase
      .from('fournisseurs')
      .select('*')
      .eq('boutique_id', req.boutique_id)
      .order('nom');

    if (actif !== undefined) q = q.eq('actif', actif === 'true');

    const { data, error } = await q;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[Fournisseurs] Erreur liste:', err);
    if (err.code === 'PGRST205') {
      return res.json({ success: true, data: [], warning: 'La table fournisseurs doit être créée avec MIGRATION_STOCK_PRO.sql.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /fournisseurs
 * @desc Créer un fournisseur
 * @access Privé
 */
router.post('/', proteger, async (req, res) => {
  try {
    const { nom, telephone, email, adresse, delai_livraison, notes } = req.body;
    if (!nom || !nom.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom du fournisseur est requis.' });
    }

    const { data, error } = await supabase
      .from('fournisseurs')
      .insert({
        boutique_id: req.boutique_id,
        nom: nom.trim(),
        telephone: telephone || '',
        email: email || '',
        adresse: adresse || '',
        delai_livraison: Number(delai_livraison) || 7,
        notes: notes || '',
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data, message: 'Fournisseur créé.' });
  } catch (err) {
    console.error('[Fournisseurs] Erreur création:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route PUT /fournisseurs/:id
 * @desc Modifier un fournisseur
 * @access Privé
 */
router.put('/:id', proteger, async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, telephone, email, adresse, delai_livraison, notes, actif } = req.body;

    const { data, error } = await supabase
      .from('fournisseurs')
      .update({
        nom: nom?.trim(),
        telephone: telephone || '',
        email: email || '',
        adresse: adresse || '',
        delai_livraison: Number(delai_livraison) || 7,
        notes: notes || '',
        actif: actif !== undefined ? actif : true,
      })
      .eq('id', id)
      .eq('boutique_id', req.boutique_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Fournisseur introuvable.' });
    res.json({ success: true, data, message: 'Fournisseur mis à jour.' });
  } catch (err) {
    console.error('[Fournisseurs] Erreur modification:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route DELETE /fournisseurs/:id
 * @desc Supprimer un fournisseur
 * @access Privé
 */
router.delete('/:id', proteger, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si des commandes sont liées
    const { data: cmds } = await supabase
      .from('commandes_fournisseurs')
      .select('id')
      .eq('fournisseur_id', id)
      .limit(1);

    if (cmds?.length > 0) {
      // Désactiver au lieu de supprimer
      await supabase
        .from('fournisseurs')
        .update({ actif: false })
        .eq('id', id)
        .eq('boutique_id', req.boutique_id);
      return res.json({ success: true, message: 'Fournisseur désactivé (commandes existantes).' });
    }

    const { error } = await supabase
      .from('fournisseurs')
      .delete()
      .eq('id', id)
      .eq('boutique_id', req.boutique_id);

    if (error) throw error;
    res.json({ success: true, message: 'Fournisseur supprimé.' });
  } catch (err) {
    console.error('[Fournisseurs] Erreur suppression:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /fournisseurs/:id
 * @desc Détail d'un fournisseur
 * @access Privé
 */
router.get('/:id', proteger, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('fournisseurs')
      .select('*')
      .eq('id', id)
      .eq('boutique_id', req.boutique_id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Fournisseur introuvable.' });
    }

    // Récupérer les commandes récentes
    const { data: commandes } = await supabase
      .from('commandes_fournisseurs')
      .select('id, reference, date_commande, statut, montant_total')
      .eq('fournisseur_id', id)
      .eq('boutique_id', req.boutique_id)
      .order('date_commande', { ascending: false })
      .limit(10);

    res.json({ success: true, data: { ...data, commandes: commandes || [] } });
  } catch (err) {
    console.error('[Fournisseurs] Erreur détail:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
