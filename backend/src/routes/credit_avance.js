const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger } = require('../middleware/auth');
const { getCreditReste, getClientCreditEncours, nextCreditStatut } = require('../utils/credit');
const { auditLog } = require('../services/audit');
const sms = require('../services/sms');

/**
 * GET /api/credit/credits — Liste des crédits en cours de la boutique
 */
router.get('/credits', proteger, async (req, res) => {
  try {
    const { statut, client_id, enRetard } = req.query;
    let q = supabase
      .from('credits')
      .select('*, clients(nom,telephone,email), ventes(numero,total_final,created_at,mode_paiement)')
      .eq('boutique_id', req.boutique_id)
      .order('created_at', { ascending: false });

    if (statut) q = q.eq('statut', statut);
    if (client_id) q = q.eq('client_id', client_id);

    const { data, error } = await q;
    if (error) throw error;

    let credits = data || [];

    // Filtrer les crédits en retard (date_echeance dépassée et non remboursé)
    if (enRetard === 'true') {
      const today = new Date().toISOString().split('T')[0];
      credits = credits.filter(c =>
        c.date_echeance &&
        c.date_echeance < today &&
        c.statut !== 'rembourse'
      );
    }

    res.json({ success: true, data: credits });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/credit — Créer un nouveau crédit
 * (différent du crédit automatique lié à une vente)
 */
router.post('/', proteger, async (req, res) => {
  try {
    const { client_id, vente_id = null, montant, date_echeance = null, description = '', taux_interet = 0 } = req.body;

    if (!client_id || !montant) {
      return res.status(400).json({ success: false, message: 'client_id et montant requis.' });
    }

    const { data: client } = await supabase
      .from('clients').select('id,credit_encours')
      .eq('id', client_id).eq('boutique_id', req.boutique_id).single();
    if (!client) return res.status(404).json({ success: false, message: 'Client introuvable.' });

    const { data, error } = await supabase.from('credits').insert({
      boutique_id: req.boutique_id,
      client_id,
      vente_id,
      montant: Number(montant),
      montant_rembourse: 0,
      statut: 'en_cours',
      date_echeance,
      description,
      taux_interet: Number(taux_interet) || 0,
    }).select('*, clients(nom,telephone)').single();

    if (error) throw error;

    // Recalculer le total crédit en cours du client
    const { data: creditRows } = await supabase
      .from('credits').select('montant,montant_rembourse')
      .eq('client_id', client_id).eq('boutique_id', req.boutique_id);
    const encours = getClientCreditEncours(creditRows || []);
    await supabase.from('clients').update({ credit_encours: encours }).eq('id', client_id);

    await auditLog(req, { action: 'create', entity: 'credits', entity_id: data.id, after_data: data });
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/credit/:id — Modifier un crédit (échéance, description, taux)
 */
router.put('/:id', proteger, async (req, res) => {
  try {
    const { date_echeance, description, taux_interet } = req.body;
    const update = {};
    if (date_echeance !== undefined) update.date_echeance = date_echeance;
    if (description !== undefined) update.description = description;
    if (taux_interet !== undefined) update.taux_interet = Number(taux_interet);

    const { data, error } = await supabase
      .from('credits')
      .update(update)
      .eq('id', req.params.id).eq('boutique_id', req.boutique_id)
      .select().single();
    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/credit/:id/rappel — Envoyer un rappel de paiement par SMS/WhatsApp
 * Body: { canal: 'sms' | 'whatsapp' }
 */
router.post('/:id/rappel', proteger, async (req, res) => {
  try {
    const { canal = 'sms' } = req.body;
    const { data: credit, error } = await supabase
      .from('credits').select('*, clients(nom,telephone,email), ventes(numero)')
      .eq('id', req.params.id).eq('boutique_id', req.boutique_id).single();
    if (error || !credit) return res.status(404).json({ success: false, message: 'Crédit introuvable.' });

    const reste = getCreditReste(credit);
    if (reste <= 0) return res.status(400).json({ success: false, message: 'Ce crédit est déjà remboursé.' });

    if (!credit.clients?.telephone) {
      return res.status(400).json({ success: false, message: "Le client n'a pas de numéro de téléphone." });
    }

    const echeanceTxt = credit.date_echeance
      ? `Échéance : ${new Date(credit.date_echeance).toLocaleDateString('fr-FR')}`
      : '';
    const enRetard = credit.date_echeance && new Date(credit.date_echeance) < new Date();

    const message = [
      `Bonjour ${credit.clients.nom},`,
      ``,
      enRetard
        ? `⚠️ Vous avez un crédit en retard chez ${credit.boutique?.nom || 'votre commerçant'} :`
        : `Rappel amical de votre crédit chez ${credit.boutique?.nom || 'votre commerçant'} :`,
      ``,
      `Montant restant dû : ${Number(reste).toLocaleString('fr-FR')} FCFA`,
      echeanceTxt,
      credit.ventes?.numero ? `Référence : ${credit.ventes.numero}` : '',
      ``,
      `Merci de bien vouloir procéder au règlement. 🙏`,
    ].filter(Boolean).join('\n');

    let resultat;
    if (canal === 'whatsapp') {
      if (!sms.whatsappEstConfigure()) return res.status(503).json({ success: false, message: 'WhatsApp non configuré.' });
      resultat = await sms.envoyerWhatsApp({ to: credit.clients.telephone, message });
    } else {
      if (!sms.estConfigure()) return res.status(503).json({ success: false, message: 'SMS non configuré.' });
      resultat = await sms.envoyer({ to: credit.clients.telephone, message });
    }

    // Enregistrer le rappel
    await supabase.from('rappels_credit').insert({
      credit_id: credit.id,
      boutique_id: req.boutique_id,
      client_id: credit.client_id,
      canal,
      telephone: credit.clients.telephone,
      contenu: message,
      provider: resultat.provider,
      externe_id: resultat.id,
    });

    res.json({ success: true, message: `Rappel envoyé par ${canal === 'whatsapp' ? 'WhatsApp' : 'SMS'}.` });
  } catch (err) {
    console.error('[Rappel]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/credit/rappels/massifs — Envoyer les rappels pour tous les crédits en retard
 * Body: { canal: 'sms' | 'whatsapp', jours_avant: number }
 */
router.post('/rappels/massifs', proteger, async (req, res) => {
  try {
    const { canal = 'sms', jours_avant = 0 } = req.body;
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() - Number(jours_avant));
    const dateLimiteStr = dateLimite.toISOString().split('T')[0];

    const { data: credits } = await supabase
      .from('credits').select('*, clients(nom,telephone), ventes(numero)')
      .eq('boutique_id', req.boutique_id)
      .neq('statut', 'rembourse')
      .not('date_echeance', 'is', null)
      .lte('date_echeance', dateLimiteStr);

    if (!credits || credits.length === 0) {
      return res.json({ success: true, message: 'Aucun crédit à relancer.', envoyes: 0, echecs: 0 });
    }

    let envoyes = 0, echecs = 0;
    const provider = canal === 'whatsapp'
      ? (sms.whatsappEstConfigure() ? 'whatsapp' : null)
      : (sms.estConfigure() ? 'sms' : null);

    if (!provider) {
      return res.status(503).json({ success: false, message: 'Aucun fournisseur configuré.' });
    }

    for (const credit of credits) {
      if (!credit.clients?.telephone) { echecs++; continue; }
      const reste = getCreditReste(credit);
      const message = `Bonjour ${credit.clients.nom}, rappel de votre crédit de ${Number(reste).toLocaleString('fr-FR')} FCFA, échéance ${credit.date_echeance}. Merci de procéder au règlement.`;
      try {
        const r = provider === 'whatsapp'
          ? await sms.envoyerWhatsApp({ to: credit.clients.telephone, message })
          : await sms.envoyer({ to: credit.clients.telephone, message });
        await supabase.from('rappels_credit').insert({
          credit_id: credit.id, boutique_id: req.boutique_id, client_id: credit.client_id,
          canal: provider, telephone: credit.clients.telephone, contenu: message,
          provider: r.provider, externe_id: r.id,
        });
        envoyes++;
      } catch (e) { echecs++; }
    }

    res.json({ success: true, message: `${envoyes} rappel(s) envoyé(s), ${echecs} échec(s).`, envoyes, echecs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/credit/rappels — Historique des rappels envoyés
 */
router.get('/rappels', proteger, async (req, res) => {
  try {
    const { data } = await supabase
      .from('rappels_credit')
      .select('*, clients(nom,telephone)')
      .eq('boutique_id', req.boutique_id)
      .order('created_at', { ascending: false })
      .limit(100);
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/credit/stats — Statistiques des crédits de la boutique
 */
router.get('/stats', proteger, async (req, res) => {
  try {
    const { data: credits } = await supabase
      .from('credits').select('montant,montant_rembourse,statut,date_echeance,created_at')
      .eq('boutique_id', req.boutique_id);

    const stats = {
      total: (credits || []).length,
      enCours: 0,
      partiel: 0,
      rembourse: 0,
      montantTotal: 0,
      montantRestant: 0,
      enRetard: 0,
      montantEnRetard: 0,
    };
    const today = new Date().toISOString().split('T')[0];

    (credits || []).forEach(c => {
      const reste = getCreditReste(c);
      stats.montantTotal += Number(c.montant);
      stats.montantRestant += reste;
      if (c.statut === 'en_cours') stats.enCours++;
      if (c.statut === 'partiel') stats.partiel++;
      if (c.statut === 'rembourse') stats.rembourse++;
      if (c.statut !== 'rembourse' && c.date_echeance && c.date_echeance < today) {
        stats.enRetard++;
        stats.montantEnRetard += reste;
      }
    });

    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/credit/tontines — Liste des tontines (groupes d'épargne rotative)
 */
router.get('/tontines', proteger, async (req, res) => {
  try {
    const { data } = await supabase
      .from('tontines')
      .select('*, tontine_membres(client_id,clients(nom,telephone))')
      .eq('boutique_id', req.boutique_id)
      .order('created_at', { ascending: false });
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/credit/tontines — Créer une tontine
 */
router.post('/tontines', proteger, async (req, res) => {
  try {
    const { nom, montant_cotisation, frequence = 'hebdomadaire', date_debut, membre_ids = [] } = req.body;
    if (!nom || !montant_cotisation) return res.status(400).json({ success: false, message: 'Nom et montant requis.' });

    const { data: tontine, error } = await supabase.from('tontines').insert({
      boutique_id: req.boutique_id,
      nom,
      montant_cotisation: Number(montant_cotisation),
      frequence,
      date_debut,
      statut: 'active',
    }).select().single();
    if (error) throw error;

    if (membre_ids.length > 0) {
      const membres = membre_ids.map((cid, idx) => ({
        tontine_id: tontine.id,
        client_id: cid,
        ordre: idx + 1,
      }));
      await supabase.from('tontine_membres').insert(membres);
    }

    const { data: complet } = await supabase
      .from('tontines')
      .select('*, tontine_membres(client_id,clients(nom,telephone))')
      .eq('id', tontine.id).single();

    res.status(201).json({ success: true, data: complet });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/credit/tontines/:id/cotiser — Enregistrer une cotisation
 */
router.post('/tontines/:id/cotiser', proteger, async (req, res) => {
  try {
    const { membre_id, montant, tour } = req.body;
    if (!membre_id || !montant) return res.status(400).json({ success: false, message: 'membre_id et montant requis.' });

    const { data, error } = await supabase.from('tontine_cotisations').insert({
      tontine_id: req.params.id,
      membre_id,
      montant: Number(montant),
      tour: tour || 1,
      date_cotisation: new Date().toISOString(),
    }).select().single();
    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/credit/score/:clientId — Calcule un score de crédit simple pour un client
 * Basé sur : historique de paiement, ancienneté, total achats, retards
 */
router.get('/score/:clientId', proteger, async (req, res) => {
  try {
    const { data: client } = await supabase
      .from('clients').select('*')
      .eq('id', req.params.clientId).eq('boutique_id', req.boutique_id).single();
    if (!client) return res.status(404).json({ success: false, message: 'Client introuvable.' });

    const { data: credits } = await supabase
      .from('credits').select('montant,montant_rembourse,statut,date_echeance,created_at')
      .eq('client_id', req.params.clientId).eq('boutique_id', req.boutique_id);

    const totalCredits = (credits || []).length;
    const creditsRembourses = (credits || []).filter(c => c.statut === 'rembourse').length;
    const today = new Date().toISOString().split('T')[0];
    const enRetard = (credits || []).filter(c =>
      c.statut !== 'rembourse' && c.date_echeance && c.date_echeance < today
    ).length;

    // Score 0-100
    let score = 50; // Base
    score += Math.min(30, totalCredits * 2); // +2 par crédit (max 30)
    score += Math.min(20, creditsRembourses * 4); // +4 par crédit remboursé (max 20)
    score -= enRetard * 10; // -10 par crédit en retard
    score += Math.min(10, (client.nb_achats || 0) * 0.5); // +0.5 par achat
    score = Math.max(0, Math.min(100, Math.round(score)));

    let niveau = 'moyen';
    if (score >= 80) niveau = 'excellent';
    else if (score >= 60) niveau = 'bon';
    else if (score >= 40) niveau = 'moyen';
    else if (score >= 20) niveau = 'risqué';
    else niveau = 'très risqué';

    res.json({
      success: true,
      data: {
        score,
        niveau,
        totalCredits,
        creditsRembourses,
        enRetard,
        ancienneteJours: Math.floor((Date.now() - new Date(client.created_at).getTime()) / 86400000),
        recommande: niveau !== 'risqué' && niveau !== 'très risqué',
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
