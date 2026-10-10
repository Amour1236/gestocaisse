const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger } = require('../middleware/auth');
const { getClientCreditEncours } = require('../utils/credit');
const { body, validationResult } = require('express-validator');
const { notifierStockFaible } = require('../services/stockAlerts');

const genNumero = () => 'V' + Date.now().toString().slice(-8);

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
};

// ─── VALIDATION ──────────────────────────────────────────────────────────────
const validerLigne = (ligne) => {
  const produit_id = String(ligne.produit_id || '').trim();
  const quantite = parseInt(ligne.quantite, 10);
  if (!produit_id) return 'ID produit manquant.';
  if (!Number.isInteger(quantite) || quantite <= 0) return 'Quantité invalide.';
  return null;
};

const validerVente = (body) => {
  if (!body.lignes || !Array.isArray(body.lignes) || body.lignes.length === 0)
    return 'Panier vide.';
  for (const l of body.lignes) {
    const err = validerLigne(l);
    if (err) return err;
  }
  if (body.remise !== undefined && (isNaN(parseFloat(body.remise)) || parseFloat(body.remise) < 0))
    return 'Remise invalide.';
  return null;
};

// ─── CRÉER VENTE ────────────────────────────────────────────────────────────
router.post('/',
  proteger,
  body('local_id').optional().isString().isLength({ max: 100 }).withMessage('local_id invalide.'),
  handleValidation,
  async (req, res) => {
    try {
      const { lignes, mode_paiement = 'especes', remise = 0, client_id = null, notes = '', montant_recu = null, local_id = null } = req.body;

      // ─── IDEMPOTENCE : si local_id fourni et vente déjà créée, on renvoie la même ───
      if (local_id) {
        const { data: existante } = await supabase
          .from('ventes')
          .select('*, lignes_vente(*)')
          .eq('local_id', local_id)
          .eq('boutique_id', req.boutique_id)
          .maybeSingle();

        if (existante) {
          return res.status(200).json({
            success: true,
            data: existante,
            message: 'Vente déjà synchronisée.',
            idempotent: true,
          });
        }
      }

      // Validation
      const validationError = validerVente(req.body);
      if (validationError) return res.status(400).json({ success: false, message: validationError });

      const modesValides = ['especes', 'momo', 'carte', 'credit'];
      if (!modesValides.includes(mode_paiement))
        return res.status(400).json({ success: false, message: 'Mode de paiement invalide.' });

    // Récupérer TOUS les produits en une seule requête (élimination N+1)
    const produitIds = lignes.map(l => l.produit_id);
    const { data: produits, error: prodError } = await supabase
      .from('produits')
      .select('id, nom, stock_actuel, prix_vente, prix_achat')
      .in('id', produitIds)
      .eq('boutique_id', req.boutique_id)
      .eq('actif', true);

    if (prodError) throw prodError;

    const produitsMap = new Map((produits || []).map(p => [p.id, p]));

    // Valider chaque ligne
    let total = 0;
    const lignesData = [];

    for (const l of lignes) {
      const produit = produitsMap.get(l.produit_id);
      if (!produit) {
        return res.status(400).json({ success: false, message: `Produit ID ${l.produit_id} introuvable.` });
      }
      const quantite = parseInt(l.quantite, 10);
      if (produit.stock_actuel < quantite) {
        return res.status(400).json({
          success: false,
          message: `Stock insuffisant pour ${produit.nom}. Disponible: ${produit.stock_actuel}`
        });
      }
      const ligneTotal = produit.prix_vente * quantite;
      total += ligneTotal;
      lignesData.push({ produit, quantite, total: ligneTotal });
    }

    // Si client_id fourni, vérifier qu'il existe
    if (client_id) {
      const { data: client, error: clientError } = await supabase
        .from('clients').select('id').eq('id', client_id).eq('boutique_id', req.boutique_id).single();
      if (clientError || !client) {
        return res.status(400).json({ success: false, message: 'Client introuvable.' });
      }
    }

    const total_final = Math.max(0, total - parseFloat(remise || 0));
    const venteStatut = mode_paiement === 'credit' ? 'credit' : 'payee';

    // Créer la vente
    const { data: vente, error: ve } = await supabase
      .from('ventes')
      .insert({
        boutique_id: req.boutique_id,
        caissier_id: req.user.id,
        client_id: client_id || null,
        numero: genNumero(),
        local_id: local_id || null, // pour idempotence offline
        total,
        remise: parseFloat(remise || 0),
        total_final,
        mode_paiement,
        notes: String(notes || '').substring(0, 500),
        statut: venteStatut
      })
      .select()
      .single();

    if (ve) throw ve;

    // Préparer les données pour les lignes, mouvements et mise à jour stock
    const lignesInsert = [];
    const mouvementsInsert = [];
    const stockUpdates = [];
    const produitsEnAlerte = [];

    for (const { produit, quantite, total: lt } of lignesData) {
      lignesInsert.push({
        vente_id: vente.id,
        produit_id: produit.id,
        nom_produit: produit.nom,
        quantite,
        prix_unitaire: produit.prix_vente,
        prix_achat: produit.prix_achat,
        total: lt
      });

      const newStock = produit.stock_actuel - quantite;
      mouvementsInsert.push({
        boutique_id: req.boutique_id,
        produit_id: produit.id,
        type: 'vente',
        quantite: -quantite,
        stock_avant: produit.stock_actuel,
        stock_apres: newStock,
        reference_id: vente.id
      });

      stockUpdates.push({ id: produit.id, stock_actuel: newStock });
      if (produit.stock_actuel > produit.stock_minimum && newStock <= produit.stock_minimum) {
        produitsEnAlerte.push({ ...produit, stock_actuel: newStock });
      }
    }

    // Exécuter TOUTES les insertions en parallèle
    try {
      const [lignesResult, mouvementsResult, stockResult] = await Promise.all([
        supabase.from('lignes_vente').insert(lignesInsert),
        supabase.from('mouvements_stock').insert(mouvementsInsert),
        Promise.all(stockUpdates.map(u =>
          supabase.from('produits').update({ stock_actuel: u.stock_actuel, updated_at: new Date().toISOString() }).eq('id', u.id)
        ))
      ]);

      if (lignesResult.error) throw lignesResult.error;
      if (mouvementsResult.error) throw mouvementsResult.error;

      // Vérifier si tous les updates de stock ont réussi
      for (const r of stockResult) {
        if (r.error) throw r.error;
      }
    } catch (batchError) {
      // Rollback : supprimer ce qui a été créé
      console.error('[Vente] Erreur en lot, rollback...', batchError);
      await supabase.from('ventes').delete().eq('id', vente.id);
      return res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement. Transaction annulée.' });
    }

    await notifierStockFaible(req.boutique_id, produitsEnAlerte);

    // Crédit client si mode crédit
    if (mode_paiement === 'credit' && client_id) {
      await supabase.from('credits').insert({
        boutique_id: req.boutique_id,
        client_id,
        vente_id: vente.id,
        montant: total_final,
        statut: 'en_cours'
      });
    }

    // Mise à jour stats client
    if (client_id) {
      const { data: creditRows } = await supabase
        .from('credits')
        .select('montant, montant_rembourse')
        .eq('client_id', client_id)
        .eq('boutique_id', req.boutique_id);

      const creditEncours = getClientCreditEncours(creditRows || []);

      await supabase.rpc('incrementer_client_stats', {
        client_id_param: client_id,
        montant_achat: total_final,
        credit_param: creditEncours
      }).catch(() => {
        // Fallback si la fonction RPC n'existe pas
        supabase.from('clients').select('total_achats, nb_achats').eq('id', client_id).single()
          .then(({ data: cli }) => {
            if (cli) {
              supabase.from('clients').update({
                total_achats: (cli.total_achats || 0) + total_final,
                nb_achats: (cli.nb_achats || 0) + 1,
                credit_encours: creditEncours
              }).eq('id', client_id);
            }
          });
      });
    }

    // Récupérer la vente complète
    const { data: venteComplete } = await supabase
      .from('ventes')
      .select('*, lignes_vente(*)')
      .eq('id', vente.id)
      .single();

    venteComplete.montant_recu = montant_recu;

    res.status(201).json({ success: true, data: venteComplete, message: 'Vente enregistrée.' });

  } catch (err) {
    console.error('[Vente] Erreur:', err);
    res.status(500).json({ success: false, message: err.message || 'Erreur serveur.' });
  }
});

// ─── LISTE VENTES ────────────────────────────────────────────────────────────
router.get('/', proteger, async (req, res) => {
  try {
    const { debut, fin, mode_paiement, page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    let q = supabase
      .from('ventes')
      .select('*, lignes_vente(*), clients(nom,telephone)', { count: 'exact' })
      .eq('boutique_id', req.boutique_id)
      .neq('statut', 'annulee')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (debut) q = q.gte('created_at', debut);
    if (fin) q = q.lte('created_at', fin);
    if (mode_paiement) q = q.eq('mode_paiement', mode_paiement);

    const { data, count, error } = await q;
    if (error) throw error;

    res.json({ success: true, data: data || [], total: count || 0 });
  } catch (err) {
    console.error('[Ventes] Erreur liste:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── HISTORIQUE VENTES ───────────────────────────────────────────────────────
router.get('/historique', proteger, async (req, res) => {
  try {
    const { debut, fin, mode_paiement, page = 1, limit = 100 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 100));
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

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

    // Charger les clients en une seule requête (élimination N+1)
    const clientIds = [...new Set(ventes.map(v => v.client_id).filter(Boolean))];
    let clientsParId = {};
    if (clientIds.length > 0) {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, nom, telephone')
        .eq('boutique_id', req.boutique_id)
        .in('id', clientIds);
      clientsParId = Object.fromEntries((clients || []).map(c => [c.id, c]));
    }

    ventes.forEach(v => {
      v.clients = v.client_id ? clientsParId[v.client_id] || null : null;
    });

    // Calculer le résumé
    const resume = ventes.reduce((acc, vente) => {
      acc.ca += Number(vente.total_final || 0);
      acc.remises += Number(vente.remise || 0);
      acc.articles += (vente.lignes_vente || []).reduce((s, l) => s + Number(l.quantite || 0), 0);
      acc.modes[vente.mode_paiement] = (acc.modes[vente.mode_paiement] || 0) + Number(vente.total_final || 0);
      return acc;
    }, { ca: 0, remises: 0, articles: 0, modes: {} });

    // Grouper par jour
    const groupes = {};
    ventes.forEach(vente => {
      const jour = vente.created_at.split('T')[0];
      if (!groupes[jour]) {
        groupes[jour] = { date: jour, total: 0, remises: 0, articles: 0, ventes: [] };
      }
      groupes[jour].total += Number(vente.total_final || 0);
      groupes[jour].remises += Number(vente.remise || 0);
      groupes[jour].articles += (vente.lignes_vente || []).reduce((s, l) => s + Number(l.quantite || 0), 0);
      groupes[jour].ventes.push(vente);
    });

    res.json({
      success: true,
      data: Object.values(groupes).sort((a, b) => b.date.localeCompare(a.date)),
      resume: { ...resume, nb_ventes: ventes.length },
      total: count || 0,
      page: pageNum,
      limit: limitNum
    });
  } catch (err) {
    console.error('[Ventes] Erreur historique:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DÉTAIL VENTE ───────────────────────────────────────────────────────────
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
    console.error('[Ventes] Erreur détail:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ANNULER VENTE ───────────────────────────────────────────────────────────
router.patch('/:id/annuler', proteger, async (req, res) => {
  try {
    // Récupérer la vente avec ses lignes
    const { data: vente, error: venteError } = await supabase
      .from('ventes')
      .select('*, lignes_vente(*)')
      .eq('id', req.params.id)
      .eq('boutique_id', req.boutique_id)
      .single();

    if (venteError) throw venteError;
    if (!vente) return res.status(404).json({ success: false, message: 'Vente introuvable.' });
    if (vente.statut === 'annulee') {
      return res.status(400).json({ success: false, message: 'Vente déjà annulée.' });
    }

    // Récupérer les produits en une seule requête
    const produitIds = vente.lignes_vente.map(l => l.produit_id);
    const { data: produits } = await supabase
      .from('produits')
      .select('id, stock_actuel')
      .in('id', produitIds);

    const produitsMap = new Map((produits || []).map(p => [p.id, p]));

    // Préparer les mouvements et mises à jour
    const mouvements = [];
    const stockUpdates = [];

    for (const l of vente.lignes_vente) {
      const produit = produitsMap.get(l.produit_id);
      if (produit) {
        const newStock = produit.stock_actuel + l.quantite;
        mouvements.push({
          boutique_id: req.boutique_id,
          produit_id: l.produit_id,
          type: 'retour',
          quantite: l.quantite,
          stock_avant: produit.stock_actuel,
          stock_apres: newStock,
          reference_id: vente.id
        });
        stockUpdates.push({ id: l.produit_id, stock_actuel: newStock });
      }
    }

    // Exécuter en parallèle
    try {
      await Promise.all([
        supabase.from('ventes').update({ statut: 'annulee' }).eq('id', vente.id),
        supabase.from('mouvements_stock').insert(mouvements),
        ...stockUpdates.map(u =>
          supabase.from('produits').update({ stock_actuel: u.stock_actuel }).eq('id', u.id)
        )
      ]);
    } catch (batchError) {
      console.error('[Annulation] Erreur batch:', batchError);
      return res.status(500).json({ success: false, message: 'Erreur lors de l\'annulation.' });
    }

    res.json({ success: true, message: 'Vente annulée et stock restauré.' });
  } catch (err) {
    console.error('[Annulation] Erreur:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
