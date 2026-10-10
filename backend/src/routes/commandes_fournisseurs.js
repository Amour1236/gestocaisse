const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger } = require('../middleware/auth');

/**
 * @route GET /commandes-fournisseurs
 * @desc Liste des commandes fournisseurs
 * @access Privé
 */
router.get('/', proteger, async (req, res) => {
  try {
    const { statut, fournisseur_id } = req.query;
    let q = supabase
      .from('commandes_fournisseurs')
      .select('*, fournisseur:fournisseur_id(nom, telephone), utilisateur:utilisateur_id(nom, prenom)')
      .eq('boutique_id', req.boutique_id)
      .order('date_commande', { ascending: false });

    if (statut) q = q.eq('statut', statut);
    if (fournisseur_id) q = q.eq('fournisseur_id', fournisseur_id);

    const { data, error } = await q;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[CommandesFournisseurs] Erreur liste:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /commandes-fournisseurs
 * @desc Créer une commande fournisseur
 * @access Privé
 */
router.post('/', proteger, async (req, res) => {
  try {
    const { fournisseur_id, reference, date_livraison_prevue, notes, lignes } = req.body;

    if (!fournisseur_id) return res.status(400).json({ success: false, message: 'Fournisseur requis.' });
    if (!lignes || lignes.length === 0) return res.status(400).json({ success: false, message: 'Ajoutez au moins une ligne.' });

    // Vérifier le fournisseur
    const { data: four } = await supabase
      .from('fournisseurs')
      .select('id, nom, delai_livraison')
      .eq('id', fournisseur_id)
      .eq('boutique_id', req.boutique_id)
      .single();

    if (!four) return res.status(404).json({ success: false, message: 'Fournisseur introuvable.' });

    // Générer référence
    const refCmd = reference?.trim() || `CMD-${Date.now().toString(36).toUpperCase()}`;

    // Calculer le total
    const montant_total = lignes.reduce((s, l) => s + ((l.quantite_commandee || 0) * (l.prix_unitaire || 0)), 0);

    // Date livraison par défaut = aujourd'hui + délai fournisseur
    const date_livraison = date_livraison_prevue
      ? new Date(date_livraison_prevue)
      : new Date(Date.now() + (four.delai_livraison || 7) * 24 * 60 * 60 * 1000);

    // Créer la commande
    const { data: commande, error: cmdError } = await supabase
      .from('commandes_fournisseurs')
      .insert({
        boutique_id: req.boutique_id,
        fournisseur_id,
        utilisateur_id: req.user?.id || null,
        reference: refCmd,
        date_livraison_prevue: date_livraison.toISOString(),
        statut: 'en_attente',
        montant_total,
        notes: notes || '',
      })
      .select()
      .single();

    if (cmdError) throw cmdError;

    // Insérer les lignes
    const lignesAInserer = lignes.map(l => ({
      commande_id: commande.id,
      produit_id: l.produit_id || null,
      nom_produit: l.nom_produit || l.nom || 'Produit inconnu',
      quantite_commandee: Number(l.quantite_commandee) || 0,
      quantite_recue: 0,
      prix_unitaire: Number(l.prix_unitaire) || 0,
      total: (Number(l.quantite_commandee) || 0) * (Number(l.prix_unitaire) || 0),
      conforme: true,
      notes: l.notes || '',
    }));

    const { error: ligError } = await supabase
      .from('lignes_commande_fournisseur')
      .insert(lignesAInserer);

    if (ligError) throw ligError;

    res.json({ success: true, data: commande, message: 'Commande créée.' });
  } catch (err) {
    console.error('[CommandesFournisseurs] Erreur création:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /commandes-fournisseurs/:id
 * @desc Détail d'une commande
 * @access Privé
 */
router.get('/:id', proteger, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: commande, error } = await supabase
      .from('commandes_fournisseurs')
      .select('*, fournisseur:fournisseur_id(nom, telephone, email, adresse, delai_livraison), utilisateur:utilisateur_id(nom, prenom)')
      .eq('id', id)
      .eq('boutique_id', req.boutique_id)
      .single();

    if (error || !commande) {
      return res.status(404).json({ success: false, message: 'Commande introuvable.' });
    }

    const { data: lignes } = await supabase
      .from('lignes_commande_fournisseur')
      .select('*')
      .eq('commande_id', id)
      .order('created_at');

    res.json({ success: true, data: { ...commande, lignes: lignes || [] } });
  } catch (err) {
    console.error('[CommandesFournisseurs] Erreur détail:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route PUT /commandes-fournisseurs/:id
 * @desc Modifier une commande (statut, dates, notes)
 * @access Privé
 */
router.put('/:id', proteger, async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, date_livraison_prevue, date_livraison_reelle, notes } = req.body;

    const updateData = {};
    if (statut !== undefined) updateData.statut = statut;
    if (date_livraison_prevue !== undefined) updateData.date_livraison_prevue = date_livraison_prevue;
    if (date_livraison_reelle !== undefined) updateData.date_livraison_reelle = date_livraison_reelle;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from('commandes_fournisseurs')
      .update(updateData)
      .eq('id', id)
      .eq('boutique_id', req.boutique_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Commande introuvable.' });
    res.json({ success: true, data, message: 'Commande mise à jour.' });
  } catch (err) {
    console.error('[CommandesFournisseurs] Erreur modification:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /commandes-fournisseurs/:id/recevoir
 * @desc Réceptionner une commande (met à jour les stocks)
 * @access Privé
 */
router.post('/:id/recevoir', proteger, async (req, res) => {
  try {
    const { id } = req.params;
    const { lignes_recues } = req.body; // [{ ligneId, quantite_recue, conforme, remarque }]

    // Récupérer la commande
    const { data: commande, error: cmdError } = await supabase
      .from('commandes_fournisseurs')
      .select('*')
      .eq('id', id)
      .eq('boutique_id', req.boutique_id)
      .single();

    if (cmdError || !commande) {
      return res.status(404).json({ success: false, message: 'Commande introuvable.' });
    }

    if (commande.statut === 'recue') {
      return res.status(400).json({ success: false, message: 'Commande déjà entièrement reçue.' });
    }

    // Récupérer les lignes
    const { data: lignesExistantes } = await supabase
      .from('lignes_commande_fournisseur')
      .select('*')
      .eq('commande_id', id);

    // Préparer les mises à jour et mouvements de stock
    const misesAJour = [];
    const mouvements = [];

    for (const lr of (lignes_recues || [])) {
      const ligne = lignesExistantes?.find(l => l.id === lr.ligneId);
      if (!ligne) continue;

      // Mettre à jour la ligne
      const qteRecue = Number(lr.quantite_recue) || 0;
      misesAJour.push({
        id: lr.ligneId,
        quantite_recue: qteRecue,
        conforme: lr.conforme !== false,
        remarque_qualite: lr.remarque || '',
      });

      // Si conforme et quantité > 0, mettre à jour le stock
      if (lr.conforme !== false && qteRecue > 0 && ligne.produit_id) {
        // Lire le stock actuel du produit
        const { data: produit } = await supabase
          .from('produits')
          .select('stock_actuel')
          .eq('id', ligne.produit_id)
          .single();

        const stockAvant = produit?.stock_actuel || 0;
        const stockApres = stockAvant + qteRecue;

        mouvements.push({
          boutique_id: req.boutique_id,
          produit_id: ligne.produit_id,
          type: 'entree',
          quantite: qteRecue,
          stock_avant: stockAvant,
          stock_apres: stockApres,
          motif: `Réception CMD ${commande.reference}`,
          reference_id: commande.id,
        });

        // Mettre à jour le stock du produit
        await supabase
          .from('produits')
          .update({ stock_actuel: stockApres, updated_at: new Date().toISOString() })
          .eq('id', ligne.produit_id);
      }
    }

    // Mise à jour des lignes
    for (const maj of misesAJour) {
      await supabase
        .from('lignes_commande_fournisseur')
        .update({
          quantite_recue: maj.quantite_recue,
          conforme: maj.conforme,
          remarque_qualite: maj.remarque_qualite,
        })
        .eq('id', maj.id);
    }

    // Insérer les mouvements de stock
    if (mouvements.length > 0) {
      await supabase.from('mouvements_stock').insert(mouvements);
    }

    // Mettre à jour le statut de la commande
    const toutesRecues = (lignesExistantes || []).every(l => {
      const lr = (lignes_recues || []).find(r => r.ligneId === l.id);
      return !lr || lr.quantite_recue >= l.quantite_commandee;
    });

    const partiellementRecue = (lignes_recues || []).some(lr => lr.quantite_recue > 0);

    const nouveauStatut = toutesRecues ? 'recue' : partiellementRecue ? 'partiellement_recue' : commande.statut;

    await supabase
      .from('commandes_fournisseurs')
      .update({
        statut: nouveauStatut,
        date_livraison_reelle: new Date().toISOString(),
      })
      .eq('id', id);

    res.json({
      success: true,
      message: nouveauStatut === 'recue'
        ? 'Commande entièrement reçue. Stocks mis à jour.'
        : 'Réception partielle enregistrée.',
      statut: nouveauStatut,
    });
  } catch (err) {
    console.error('[CommandesFournisseurs] Erreur réception:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route DELETE /commandes-fournisseurs/:id
 * @desc Annuler une commande
 * @access Privé
 */
router.delete('/:id', proteger, async (req, res) => {
  try {
    const { id } = req.params;

    // Ne pas permettre d'annuler une commande déjà reçue
    const { data: cmd } = await supabase
      .from('commandes_fournisseurs')
      .select('statut')
      .eq('id', id)
      .eq('boutique_id', req.boutique_id)
      .single();

    if (cmd?.statut === 'recue') {
      return res.status(400).json({ success: false, message: 'Impossible d\'annuler une commande déjà reçue.' });
    }

    await supabase
      .from('commandes_fournisseurs')
      .update({ statut: 'annulee' })
      .eq('id', id)
      .eq('boutique_id', req.boutique_id);

    res.json({ success: true, message: 'Commande annulée.' });
  } catch (err) {
    console.error('[CommandesFournisseurs] Erreur annulation:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
