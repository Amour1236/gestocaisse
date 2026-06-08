const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger, autoriser } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const PLANS = {
  pro_mensuel: { montant_fcfa: 1000, montant_eur: 1.52, plan: 'pro', label: 'Pro Mensuel', jours: 30 },
  pro_annuel: { montant_fcfa: 10000, montant_eur: 15.24, plan: 'pro', label: 'Pro Annuel', jours: 365 },
  business_mensuel: { montant_fcfa: 3000, montant_eur: 4.57, plan: 'business', label: 'Business Mensuel', jours: 30 },
  business_annuel: { montant_fcfa: 30000, montant_eur: 45.73, plan: 'business', label: 'Business Annuel', jours: 365 },
};

async function verifierAbonnementUnique(boutiqueId) {
  const { data, error } = await supabase
    .from('abonnements')
    .select('id, statut')
    .eq('boutique_id', boutiqueId)
    .in('statut', ['actif', 'en_attente'])
    .limit(1);

  if (error) throw error;
  return (data || []).length > 0;
}

// Stripe optionnel
let stripe = null;
try {
  const key = process.env.STRIPE_SECRET_KEY;
  if (key && key !== 'sk_test_placeholder_no_stripe_needed' && !key.includes(' ')) {
    stripe = require('stripe')(key);
  }
} catch {}

// Checkout Stripe
router.post('/stripe/checkout', proteger, async (req, res) => {
  if (!stripe) {
    return res.status(400).json({ success: false, message: 'Paiement par carte non configuré. Utilisez MTN MoMo.' });
  }
  try {
    const plan_id = req.body.plan_id || req.body;
    const plan = PLANS[plan_id];
    if (!plan) return res.status(400).json({ success: false, message: 'Plan invalide.' });
    if (await verifierAbonnementUnique(req.boutique_id)) {
      return res.status(409).json({ success: false, message: 'Cette boutique a déjà un abonnement actif ou un paiement en attente.' });
    }
    const montant_eur = plan.montant_eur;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'eur', product_data: { name: 'GestoCaisse ' + plan.label }, unit_amount: Math.round(montant_eur * 100) }, quantity: 1 }],
      mode: 'payment',
      success_url: process.env.FRONTEND_URL + '/app/abonnement?success=1',
      cancel_url: process.env.FRONTEND_URL + '/app/abonnement',
      metadata: { boutique_id: req.boutique_id, plan_id },
    });
    res.json({ success: true, url: session.url });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Initier paiement MoMo
router.post('/momo/initier', proteger, async (req, res) => {
  try {
    const plan_id = req.body.plan_id || req.body;
    const plan = PLANS[plan_id];
    if (!plan) return res.status(400).json({ success: false, message: 'Plan invalide.' });
    if (await verifierAbonnementUnique(req.boutique_id)) {
      return res.status(409).json({ success: false, message: 'Cette boutique a déjà un abonnement actif ou un paiement en attente.' });
    }
    const reference = 'GC-' + uuidv4().slice(0, 8).toUpperCase();
    const fin = new Date(Date.now() + plan.jours * 86400000);
    const { error } = await supabase.from('abonnements').insert({
      boutique_id: req.boutique_id,
      plan: plan.plan,
      montant_fcfa: plan.montant_fcfa,
      montant_eur: plan.montant_eur,
      statut: 'en_attente',
      methode: 'momo',
      reference_momo: reference,
      fin,
    });
    if (error) return res.status(500).json({ success: false, message: error.message });

    res.json({
      success: true,
      reference,
      montant: plan.montant_fcfa,
      numero_momo: process.env.MOMO_NUMERO || '22900000000',
      message: `Envoyez ${plan.montant_fcfa} FCFA au ${process.env.MOMO_NUMERO || '22900000000'} avec la référence: ${reference}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Confirmer MoMo
router.post('/momo/confirmer/:reference', proteger, autoriser('admin'), async (req, res) => {
  try {
    const reference = String(req.params.reference || '').trim().toUpperCase();
    if (!reference) return res.status(400).json({ success: false, message: 'Référence manquante.' });

    const { data: abo, error: selectError } = await supabase
      .from('abonnements')
      .select('*, boutiques(nom, proprietaire_id)')
      .eq('reference_momo', reference)
      .maybeSingle();

    if (selectError) return res.status(500).json({ success: false, message: selectError.message });
    if (!abo) return res.status(404).json({ success: false, message: 'Référence introuvable.' });
    if (abo.statut !== 'en_attente') {
      return res.status(400).json({ success: false, message: `Cet abonnement est déjà ${abo.statut}.` });
    }

    const { error: aboError } = await supabase
      .from('abonnements')
      .update({ statut: 'actif' })
      .eq('reference_momo', reference);
    if (aboError) return res.status(500).json({ success: false, message: aboError.message });

    const { error: boutiqueError } = await supabase
      .from('boutiques')
      .update({ plan: abo.plan, plan_expire_at: abo.fin })
      .eq('id', abo.boutique_id);
    if (boutiqueError) return res.status(500).json({ success: false, message: boutiqueError.message });

    res.json({ success: true, message: 'Abonnement activé.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Mes paiements
router.get('/mes-paiements', proteger, async (req, res) => {
  const { data, error } = await supabase
    .from('abonnements')
    .select('*')
    .eq('boutique_id', req.boutique_id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data: data || [] });
});

// Webhook Stripe (no-op si Stripe non configuré)
const webhook = async (req, res) => {
  if (!stripe) return res.json({ received: true });
  let event;
  try { event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET); }
  catch { return res.status(400).send('Webhook error'); }
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object;
    const plan = PLANS[s.metadata?.plan_id];
    if (plan) {
      const fin = new Date(Date.now() + plan.jours * 86400000);
      await supabase.from('boutiques').update({ plan: plan.plan, plan_expire_at: fin }).eq('id', s.metadata.boutique_id);
    }
  }
  res.json({ received: true });
};

module.exports = { router, webhook };
