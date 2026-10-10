const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger } = require('../middleware/auth');

/**
 * @route GET /rapports-stock/etat
 * @desc État complet du stock pour rapport A4
 * @access Privé
 */
router.get('/etat', proteger, async (req, res) => {
  try {
    const { categorie, statut } = req.query;

    let q = supabase
      .from('produits')
      .select('*, categories(id, nom, couleur)')
      .eq('boutique_id', req.boutique_id)
      .eq('actif', true)
      .order('nom');

    if (categorie) q = q.eq('categorie_id', categorie);

    const { data: produits, error } = await q;
    if (error) throw error;

    // Récupérer les infos boutique
    const { data: boutique } = await supabase
      .from('boutiques')
      .select('*')
      .eq('id', req.boutique_id)
      .single();

    // Statistiques globales
    const stats = {
      total_produits: produits?.length || 0,
      total_stock: produits?.reduce((s, p) => s + (p.stock_actuel || 0), 0) || 0,
      valeur_stock: produits?.reduce((s, p) => s + ((p.stock_actuel || 0) * (p.prix_achat || 0)), 0) || 0,
      produits_en_rupture: produits?.filter(p => (p.stock_actuel || 0) <= 0).length || 0,
      produits_en_alerte: produits?.filter(p => (p.stock_actuel || 0) <= (p.stock_minimum || 5) && (p.stock_actuel || 0) > 0).length || 0,
      produits_surstock: produits?.filter(p => p.stock_maximum && (p.stock_actuel || 0) > p.stock_maximum).length || 0,
    };

    // Ajouter les alertes par produit
    const produitsAvecAlertes = (produits || []).map(p => {
      const alerte = {
        rupture: (p.stock_actuel || 0) <= 0,
        sous_stock: (p.stock_actuel || 0) > 0 && (p.stock_actuel || 0) <= (p.stock_minimum || 5),
        surstock: p.stock_maximum && (p.stock_actuel || 0) > p.stock_maximum,
      };
      return { ...p, alerte };
    });

    res.json({
      success: true,
      data: {
        boutique,
        produits: produitsAvecAlertes,
        stats,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[RapportsStock] Erreur état:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /rapports-stock/mouvements
 * @desc Historique des mouvements de stock
 * @access Privé
 */
router.get('/mouvements', proteger, async (req, res) => {
  try {
    const { produit_id, type, debut, fin, limit = 100 } = req.query;

    let q = supabase
      .from('mouvements_stock')
      .select('*, produit:produit_id(id, nom, categories(nom))', { count: 'exact' })
      .eq('boutique_id', req.boutique_id)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (produit_id) q = q.eq('produit_id', produit_id);
    if (type) q = q.eq('type', type);
    if (debut) q = q.gte('created_at', debut);
    if (fin) q = q.lte('created_at', fin);

    const { data, count, error } = await q;
    if (error) throw error;

    // Statistiques par type
    const statsParType = {};
    (data || []).forEach(m => {
      if (!statsParType[m.type]) {
        statsParType[m.type] = { entrees: 0, sorties: 0 };
      }
      if (m.quantite > 0) {
        statsParType[m.type].entrees += m.quantite;
      } else {
        statsParType[m.type].sorties += Math.abs(m.quantite);
      }
    });

    res.json({
      success: true,
      data: data || [],
      total: count || 0,
      stats_par_type: statsParType,
    });
  } catch (err) {
    console.error('[RapportsStock] Erreur mouvements:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /rapports-stock/velocity
 * @desc Calcule la vitesse de vente et suggère les réapprovisionnements
 * @access Privé
 */
router.get('/velocity', proteger, async (req, res) => {
  try {
    const { jours = 30 } = req.query;
    const nbJours = Number(jours) || 30;
    const dateDebut = new Date(Date.now() - nbJours * 24 * 60 * 60 * 1000).toISOString();

    // Récupérer tous les produits actifs
    const { data: produits, error: prodError } = await supabase
      .from('produits')
      .select('*, categories(nom)')
      .eq('boutique_id', req.boutique_id)
      .eq('actif', true);

    if (prodError) throw prodError;

    // Récupérer les mouvements de vente sur la période
    const { data: mouvements } = await supabase
      .from('mouvements_stock')
      .select('produit_id, quantite, type, created_at')
      .eq('boutique_id', req.boutique_id)
      .eq('type', 'vente')
      .gte('created_at', dateDebut)
      .order('created_at', { ascending: false });

    // Calculer la vitesse par produit
    const ventesParProduit = {};
    (mouvements || []).forEach(m => {
      if (!ventesParProduit[m.produit_id]) {
        ventesParProduit[m.produit_id] = { total: 0, nbJoursReels: new Set() };
      }
      ventesParProduit[m.produit_id].total += Math.abs(m.quantite);
      ventesParProduit[m.produit_id].nbJoursReels.add(m.created_at.split('T')[0]);
    });

    // Construire les données avec suggestions
    const suggestions = (produits || []).map(p => {
      const venteData = ventesParProduit[p.id] || { total: 0, nbJoursReels: new Set() };
      const nbJoursVente = venteData.nbJoursReels.size || 1;
      const vitesseMoyenne = venteData.total / nbJoursVente; // unités vendues par jour
      const delaiReappro = p.delai_reapprovisionnement || 7;
      const stockActuel = p.stock_actuel || 0;
      const stockMinimum = p.stock_minimum || 5;

      // Jours avant rupture = stock / vitesse (si vitesse > 0)
      const joursAvantRupture = vitesseMoyenne > 0
        ? Math.floor(stockActuel / vitesseMoyenne)
        : 999;

      // Quantité suggérée = vitesse * (delai + stock sécurité) - stock actuel
      const stockSecurite = stockMinimum * 2;
      const qteSuggerée = Math.max(0,
        Math.ceil(vitesseMoyenne * (delaiReappro + 3)) - stockActuel
      );

      // Date suggérée = aujourd'hui + joursAvantRupture - delaiReappro
      const joursAvantCommande = Math.max(0, joursAvantRupture - delaiReappro);
      const dateSuggerée = new Date(Date.now() + joursAvantCommande * 24 * 60 * 60 * 1000);

      let urgence = 'ok';
      if (stockActuel === 0) urgence = 'rupture';
      else if (joursAvantRupture <= delaiReappro) urgence = 'urgent';
      else if (joursAvantRupture <= delaiReappro * 2) urgence = 'bientot';

      return {
        id: p.id,
        nom: p.nom,
        categorie: p.categories?.nom,
        emplacement: p.emplacement,
        stock_actuel: stockActuel,
        stock_minimum: stockMinimum,
        stock_maximum: p.stock_maximum,
        prix_achat: p.prix_achat,
        vente_total_periode: venteData.total,
        nb_jours_vente: nbJoursVente,
        vitesse_moyenne: Math.round(vitesseMoyenne * 100) / 100,
        delai_reappro: delaiReappro,
        jours_avant_rupture: joursAvantRupture >= 999 ? null : joursAvantRupture,
        quantite_suggeree: qteSuggerée,
        date_suggestion: qteSuggerée > 0 ? dateSuggerée.toLocaleDateString('fr-FR') : null,
        montant_estime: qteSuggerée * (p.prix_achat || 0),
        urgence,
        fournisseur_id: p.fournisseur_id,
      };
    });

    // Statistiques
    const stats = {
      total_produits: suggestions.length,
      rupture: suggestions.filter(s => s.urgence === 'rupture').length,
      urgent: suggestions.filter(s => s.urgence === 'urgent').length,
      bientot: suggestions.filter(s => s.urgence === 'bientot').length,
      a_commander: suggestions.filter(s => s.quantite_suggeree > 0).length,
      montant_estime: suggestions.reduce((s, sug) => s + (sug.montant_estime || 0), 0),
    };

    res.json({
      success: true,
      data: suggestions,
      stats,
      periode: { jours: nbJours, debut: dateDebut, fin: new Date().toISOString() },
    });
  } catch (err) {
    console.error('[RapportsStock] Erreur velocity:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /rapports-stock/suggestions
 * @desc Liste des produits à commander (simplifié)
 * @access Privé
 */
router.get('/suggestions', proteger, async (req, res) => {
  try {
    // Rediriger vers velocity avec les bons produits
    const { data } = await res.app.get('/api/rapports-stock/velocity')
      ? await Promise.resolve({ data: null })
      : { data: null };

    // Reprendre la logique ici directement
    const { jours = 30 } = req.query;
    const nbJours = Number(jours) || 30;
    const dateDebut = new Date(Date.now() - nbJours * 24 * 60 * 60 * 1000).toISOString();

    const { data: produits } = await supabase
      .from('produits')
      .select('*, categories(nom)')
      .eq('boutique_id', req.boutique_id)
      .eq('actif', true);

    const { data: mouvements } = await supabase
      .from('mouvements_stock')
      .select('produit_id, quantite')
      .eq('boutique_id', req.boutique_id)
      .eq('type', 'vente')
      .gte('created_at', dateDebut);

    const ventesParProduit = {};
    (mouvements || []).forEach(m => {
      if (!ventesParProduit[m.produit_id]) ventesParProduit[m.produit_id] = 0;
      ventesParProduit[m.produit_id] += Math.abs(m.quantite);
    });

    const suggestions = (produits || [])
      .filter(p => {
        const stock = p.stock_actuel || 0;
        const min = p.stock_minimum || 5;
        return stock <= min;
      })
      .map(p => {
        const venteData = ventesParProduit[p.id] || 0;
        const vitesse = venteData / nbJours;
        const delai = p.delai_reapprovisionnement || 7;
        const qteSug = Math.max(0, Math.ceil(vitesse * (delai + 3)) - (p.stock_actuel || 0));
        return {
          id: p.id,
          nom: p.nom,
          categorie: p.categories?.nom,
          stock_actuel: p.stock_actuel || 0,
          stock_minimum: p.stock_minimum || 5,
          quantite_suggeree: qteSug,
          prix_achat: p.prix_achat || 0,
          montant_estime: qteSug * (p.prix_achat || 0),
          fournisseur_id: p.fournisseur_id,
        };
      })
      .filter(s => s.quantite_suggeree > 0);

    res.json({ success: true, data: suggestions });
  } catch (err) {
    console.error('[RapportsStock] Erreur suggestions:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /rapports-stock/synthese
 * @desc Rapport de synthèse complet pour impression A4
 * @access Privé
 */
router.get('/synthese', proteger, async (req, res) => {
  try {
    const { debut, fin } = req.query;

    // Récupérer boutique
    const { data: boutique } = await supabase
      .from('boutiques')
      .select('*')
      .eq('id', req.boutique_id)
      .single();

    // Récupérer produits
    const { data: produits } = await supabase
      .from('produits')
      .select('*, categories(nom)')
      .eq('boutique_id', req.boutique_id)
      .eq('actif', true);

    // Récupérer mouvements
    let qMvts = supabase
      .from('mouvements_stock')
      .select('*')
      .eq('boutique_id', req.boutique_id)
      .gte('created_at', debut || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (fin) qMvts = qMvts.lte('created_at', fin);

    const { data: mouvements } = await qMvts;

    // Statistiques
    const stats = {
      total_produits: produits?.length || 0,
      total_stock: produits?.reduce((s, p) => s + (p.stock_actuel || 0), 0) || 0,
      valeur_stock: produits?.reduce((s, p) => s + ((p.stock_actuel || 0) * (p.prix_achat || 0)), 0) || 0,
      ruptures: produits?.filter(p => (p.stock_actuel || 0) <= 0).length || 0,
      alertes: produits?.filter(p => (p.stock_actuel || 0) <= (p.stock_minimum || 5) && (p.stock_actuel || 0) > 0).length || 0,
      entrees: mouvements?.filter(m => m.type === 'entree').reduce((s, m) => s + m.quantite, 0) || 0,
      sorties: Math.abs(mouvements?.filter(m => m.type === 'vente' || m.type === 'sortie').reduce((s, m) => s + m.quantite, 0) || 0),
      ajustements_pos: mouvements?.filter(m => m.type === 'ajustement' && m.quantite > 0).reduce((s, m) => s + m.quantite, 0) || 0,
      ajustements_neg: Math.abs(mouvements?.filter(m => m.type === 'ajustement' && m.quantite < 0).reduce((s, m) => s + m.quantite, 0) || 0),
    };

    res.json({
      success: true,
      data: {
        boutique,
        produits: produits || [],
        mouvements: mouvements || [],
        stats,
        periode: { debut: debut || '30 derniers jours', fin: fin || 'aujourd\'hui' },
        generated_at: new Date().toLocaleString('fr-FR'),
      },
    });
  } catch (err) {
    console.error('[RapportsStock] Erreur synthèse:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /rapports-stock/alertes
 * @desc Toutes les alertes (rupture + surstock)
 * @access Privé
 */
router.get('/alertes', proteger, async (req, res) => {
  try {
    const { data: produits, error } = await supabase
      .from('produits')
      .select('*, categories(nom, couleur)')
      .eq('boutique_id', req.boutique_id)
      .eq('actif', true)
      .order('stock_actuel');

    if (error) throw error;

    const alertes = {
      ruptures: [], // stock = 0
      sous_stock: [], // stock <= minimum
      surstock: [], // stock > maximum
    };

    (produits || []).forEach(p => {
      const stock = p.stock_actuel || 0;
      const minimum = p.stock_minimum || 5;

      if (stock === 0) {
        alertes.ruptures.push({
          ...p,
          message: 'Rupture de stock',
          priorite: 'critique',
        });
      } else if (stock <= minimum) {
        alertes.sous_stock.push({
          ...p,
          message: `Stock faible (${stock} / ${minimum})`,
          priorite: 'warning',
          ecart: minimum - stock,
        });
      }

      if (p.stock_maximum && stock > p.stock_maximum) {
        alertes.surstock.push({
          ...p,
          message: `Surstock (${stock} / ${p.stock_maximum})`,
          priorite: 'info',
          ecart: stock - p.stock_maximum,
        });
      }
    });

    res.json({
      success: true,
      data: alertes,
      count: alertes.ruptures.length + alertes.sous_stock.length + alertes.surstock.length,
    });
  } catch (err) {
    console.error('[RapportsStock] Erreur alertes:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /rapports-stock/inventaire/:id
 * @desc Génère le texte du rapport d'inventaire pour impression A4
 * @access Privé
 */
router.get('/inventaire/:id', proteger, async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer l'inventaire
    const { data: inventaire, error: invError } = await supabase
      .from('inventaires')
      .select('*, utilisateur:utilisateur_id(nom, prenom), boutique:boutique_id(*)')
      .eq('id', id)
      .eq('boutique_id', req.boutique_id)
      .single();

    if (invError || !inventaire) {
      return res.status(404).json({ success: false, message: 'Inventaire introuvable.' });
    }

    // Récupérer les lignes
    const { data: lignes, error: ligError } = await supabase
      .from('lignes_inventaire')
      .select('*, produit:produit_id(nom, code_barre)')
      .eq('inventaire_id', id)
      .order('created_at');

    if (ligError) throw ligError;

    inventaire.lignes = lignes || [];

    // Générer le texte formaté pour impression
    const boutique = inventaire.boutique;
    const now = new Date().toLocaleString('fr-FR');

    let texte = `
════════════════════════════════════════════════════════════════════════════════
                              RAPPORT D'INVENTAIRE PHYSIQUE
════════════════════════════════════════════════════════════════════════════════

${boutique.nom || 'Ma Boutique'}
${boutique.adresse || ''}
Tél: ${boutique.telephone || ''}

────────────────────────────────────────────────────────────────────────────────
 INFORMATIONS DE L'INVENTAIRE
────────────────────────────────────────────────────────────────────────────────
 N° Inventaire   : ${id.substring(0, 8).toUpperCase()}
 Date            : ${new Date(inventaire.date_inventaire).toLocaleDateString('fr-FR')}
 Statut          : ${inventaire.statut.toUpperCase()}
 Réalisé par     : ${inventaire.utilisateur?.prenom} ${inventaire.utilisateur?.nom}
 Notes           : ${inventaire.notes || 'Aucune'}

────────────────────────────────────────────────────────────────────────────────
                                RÉSULTATS DE L'INVENTAIRE
────────────────────────────────────────────────────────────────────────────────
 Total produits comptés : ${lignes?.length || 0}
 Produits sans écart    : ${lignes?.filter(l => l.ecart === 0).length || 0}
 Excédents (écart > 0) : ${lignes?.filter(l => l.ecart > 0).length || 0}
 Manquants (écart < 0) : ${lignes?.filter(l => l.ecart < 0).length || 0}

────────────────────────────────────────────────────────────────────────────────
                              DÉTAIL DES PRODUITS
────────────────────────────────────────────────────────────────────────────────
 Référence  | Désignation                    | Théorique | Physique | Écart
------------|--------------------------------|-----------|----------|-------
`;

    (lignes || []).forEach(l => {
      const ref = l.produit?.code_barre || '';
      const nom = (l.produit?.nom || '').substring(0, 30).padEnd(30);
      const th = String(l.stock_theorique).padStart(9);
      const ph = String(l.stock_physique ?? 'NC').padStart(9);
      const ec = l.stock_physique === null ? 'Non cnt' : String(l.ecart).padStart(5);
      texte += ` ${ref.substring(0, 10).padEnd(10)}| ${nom} | ${th} | ${ph} | ${ec}\n`;
    });

    texte += `
────────────────────────────────────────────────────────────────────────────────
                                  SIGNATURES
────────────────────────────────────────────────────────────────────────────────

 Inventorié par : _____________________    Vérifié par : _____________________

      Nom : _______________________         Nom : _______________________

      Date : _____________________         Date : _____________________

────────────────────────────────────────────────────────────────────────────────
 Document généré le ${now} par GestoCaisse
────────────────────────────────────────────────────────────────════════════════
`;

    res.json({
      success: true,
      data: {
        texte,
        inventaire,
        meta: {
          generated_at: now,
          boutique: boutique.nom,
        },
      },
    });
  } catch (err) {
    console.error('[RapportsStock] Erreur rapport inventaire:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /rapports-stock/bon/:id
 * @desc Génère le texte du bon pour impression A4
 * @access Privé
 */
router.get('/bon/:id', proteger, async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer le bon
    const { data: bon, error: bonError } = await supabase
      .from('bons')
      .select('*, utilisateur:utilisateur_id(nom, prenom), boutique:boutique_id(*)')
      .eq('id', id)
      .eq('boutique_id', req.boutique_id)
      .single();

    if (bonError || !bon) {
      return res.status(404).json({ success: false, message: 'Bon introuvable.' });
    }

    // Récupérer les lignes
    const { data: lignes, error: ligError } = await supabase
      .from('lignes_bon')
      .select('*')
      .eq('bon_id', id)
      .order('created_at');

    if (ligError) throw ligError;

    bon.lignes = lignes || [];

    const boutique = bon.boutique;
    const now = new Date().toLocaleString('fr-FR');
    const typeLibelle = bon.type_bon === 'reception' ? 'BON DE RÉCEPTION' : 'BON DE SORTIE';
    const tiersLibelle = bon.type_bon === 'reception'
      ? `Fournisseur : ${bon.fournisseur || 'Non précisé'}`
      : `Client/Destination : ${bon.client || bon.notes || 'Non précisé'}`;

    let texte = `
╔════════════════════════════════════════════════════════════════════════════════╗
║                              ${typeLibelle.padEnd(64)}║
╠════════════════════════════════════════════════════════════════════════════════╣
║ ${(boutique.nom || 'Ma Boutique').toUpperCase().padEnd(78)} ║
║ ${(boutique.adresse || '').padEnd(78)} ║
║ ${(`Tél: ${boutique.telephone || ''}`).padEnd(78)} ║
╠════════════════════════════════════════════════════════════════════════════════╣
║  N° Bon      : ${bon.reference.padEnd(63)} ║
║  Date        : ${new Date(bon.date_bon).toLocaleDateString('fr-FR').padEnd(63)} ║
║  ${typeLibelle === 'BON DE RÉCEPTION    ' ? 'Fournisseur' : 'Client/Dest.'} : ${((bon.type_bon === 'reception' ? bon.fournisseur : bon.client || bon.notes) || 'Non précisé').substring(0, 55).padEnd(55)} ║
║  Statut      : ${bon.statut.toUpperCase().padEnd(63)} ║
╠════════════════════════════════════════════════════════════════════════════════╣
║  N° | Désignation                    | Qté      | Prix U.   | Total      ║
╠════════════════════════════════════════════════════════════════════════════════╣
`;

    let totalGeneral = 0;
    let numLigne = 1;
    (lignes || []).forEach(l => {
      const nom = (l.nom_produit || '').substring(0, 28).padEnd(28);
      const qte = String(l.quantite).padStart(6);
      const prix = (l.prix_unitaire || 0).toLocaleString('fr-FR').padStart(9);
      const total = (l.quantite * (l.prix_unitaire || 0));
      totalGeneral += total;
      const totalStr = total.toLocaleString('fr-FR').padStart(11);
      texte += `║ ${String(numLigne++).padStart(2)} | ${nom} | ${qte} | ${prix} | ${totalStr} ║\n`;
    });

    const totalStr = totalGeneral.toLocaleString('fr-FF').padStart(11);
    texte += `╠════════════════════════════════════════════════════════════════════════════════╣
║                                                   TOTAL GÉNÉRAL : ${totalStr.padStart(13)} FCFA ║
╠════════════════════════════════════════════════════════════════════════════════╣
║  Établi par : ${(bon.utilisateur?.prenom + ' ' + bon.utilisateur?.nom || 'Non précisé').padEnd(66)} ║
╠════════════════════════════════════════════════════════════════════════════════╣
║                                SIGNATURES                                     ║
╠════════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Émetteur : ____________________     Récepteur : ____________________        ║
║                                                                              ║
║  Date : _____________________          Date : _____________________         ║
║                                                                              ║
╠════════════════════════════════════════════════════════════════════════════════╣
║  Document généré le ${now.padEnd(53)} ║
║  Powered by GestoCaisse 🇧🇯                                             ║
╚════════════════════════════════════════════════════════════════════════════════╝
`;

    res.json({
      success: true,
      data: {
        texte,
        bon,
        meta: {
          generated_at: now,
          boutique: boutique.nom,
          total: totalGeneral,
          nb_articles: lignes?.reduce((s, l) => s + l.quantite, 0) || 0,
        },
      },
    });
  } catch (err) {
    console.error('[RapportsStock] Erreur rapport bon:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
