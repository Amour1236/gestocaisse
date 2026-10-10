const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../database/supabase');

const genToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '2h' });

// ─── COMPTE DÉMO ─────────────────────────────────────────────────────────────
const DEMO_EMAIL = 'demo@gestocaisse.app';
const DEMO_PASSWORD = 'Demo1234!';

// ─── SEED DONNÉES DÉMO ───────────────────────────────────────────────────────
async function seedDemoData(boutiqueId, userId) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Catégories
  const catAlimId = crypto.randomUUID();
  const catBoissonsId = crypto.randomUUID();
  const catSnacksId = crypto.randomUUID();
  const catLaitId = crypto.randomUUID();

  const { error: catError } = await supabase.from('categories').insert([
    { id: catAlimId,      boutique_id: boutiqueId, nom: 'Alimentaire',         couleur: '#10b981' },
    { id: catBoissonsId,  boutique_id: boutiqueId, nom: 'Boissons',            couleur: '#3b82f6' },
    { id: catSnacksId,    boutique_id: boutiqueId, nom: 'Snacks',              couleur: '#f59e0b' },
    { id: catLaitId,      boutique_id: boutiqueId, nom: 'Produits laitiers',    couleur: '#8b5cf6' },
  ]);
  if (catError) throw new Error('Catégories: ' + catError.message);

  // Produits
  const { data: produits, error: prodError } = await supabase.from('produits').insert([
    { boutique_id: boutiqueId, nom: 'Biscuit Oléo',       categorie_id: catSnacksId,  prix_vente: 500,  prix_achat: 400,  stock_actuel: 80, stock_minimum: 10, unite: 'paquet' },
    { boutique_id: boutiqueId, nom: 'Pain de mie',        categorie_id: catAlimId,    prix_vente: 700,  prix_achat: 550,  stock_actuel: 25, stock_minimum: 5,  unite: 'paquet' },
    { boutique_id: boutiqueId, nom: 'Riz local 1kg',     categorie_id: catAlimId,    prix_vente: 1500, prix_achat: 1200, stock_actuel: 40, stock_minimum: 10, unite: 'sac' },
    { boutique_id: boutiqueId, nom: 'Huile végétale 1L',  categorie_id: catAlimId,    prix_vente: 2000, prix_achat: 1600, stock_actuel: 30, stock_minimum: 5,  unite: 'bouteille' },
    { boutique_id: boutiqueId, nom: 'Sucre 1kg',          categorie_id: catAlimId,    prix_vente: 800,  prix_achat: 600,  stock_actuel: 35, stock_minimum: 10, unite: 'sac' },
    { boutique_id: boutiqueId, nom: 'Coca-Cola 1.5L',     categorie_id: catBoissonsId, prix_vente: 800,  prix_achat: 600,  stock_actuel: 60, stock_minimum: 12, unite: 'bouteille' },
    { boutique_id: boutiqueId, nom: 'Eau minérale 1.5L', categorie_id: catBoissonsId, prix_vente: 300,  prix_achat: 200,  stock_actuel: 100,stock_minimum: 20, unite: 'bouteille' },
    { boutique_id: boutiqueId, nom: 'Jus de fruit 1L',    categorie_id: catBoissonsId, prix_vente: 1200, prix_achat: 900,  stock_actuel: 20, stock_minimum: 5,  unite: 'bouteille' },
    { boutique_id: boutiqueId, nom: 'Lait frais 500ml',   categorie_id: catLaitId,    prix_vente: 600,  prix_achat: 450,  stock_actuel: 45, stock_minimum: 10, unite: 'carton' },
    { boutique_id: boutiqueId, nom: 'Yaourt Danone',      categorie_id: catLaitId,    prix_vente: 400,  prix_achat: 300,  stock_actuel: 50, stock_minimum: 10, unite: 'pot' },
    { boutique_id: boutiqueId, nom: 'Fromage gouda',      categorie_id: catLaitId,    prix_vente: 1500, prix_achat: 1100, stock_actuel: 15, stock_minimum: 5,  unite: 'barquette' },
    { boutique_id: boutiqueId, nom: 'Biscuit Choc',       categorie_id: catSnacksId,  prix_vente: 350,  prix_achat: 270,  stock_actuel: 70, stock_minimum: 15, unite: 'paquet' },
    { boutique_id: boutiqueId, nom: 'Chips Salem',        categorie_id: catSnacksId,  prix_vente: 250,  prix_achat: 180,  stock_actuel: 90, stock_minimum: 20, unite: 'sac' },
    { boutique_id: boutiqueId, nom: 'Pain au chocolat',   categorie_id: catAlimId,    prix_vente: 400,  prix_achat: 300,  stock_actuel: 20, stock_minimum: 5,  unite: 'pièce' },
    { boutique_id: boutiqueId, nom: 'Bananes (douzaine)',categorie_id: catAlimId,    prix_vente: 1000, prix_achat: 750,  stock_actuel: 18, stock_minimum: 5,  unite: 'douzaine' },
  ]).select();
  if (prodError) throw new Error('Produits: ' + prodError.message);

  // Clients
  const { data: clients, error: clientError } = await supabase.from('clients').insert([
    { boutique_id: boutiqueId, nom: 'Aïcha Diallo',      telephone: '+22890123456', credit_encours: 0 },
    { boutique_id: boutiqueId, nom: 'Kossi Mensah',      telephone: '+22890234567', credit_encours: 2500 },
    { boutique_id: boutiqueId, nom: 'Aminata Souleymane', telephone: '+22890345678', credit_encours: 0 },
    { boutique_id: boutiqueId, nom: 'Komlan Amegah',     telephone: '+22890456789', credit_encours: 0 },
    { boutique_id: boutiqueId, nom: 'Fati Abalo',        telephone: '+22890567890', credit_encours: 1800 },
  ]).select();
  if (clientError) throw new Error('Clients: ' + clientError.message);

  // Ventes des 7 derniers jours
  const ventesData = [];
  const lignesData = [];

  for (let d = 6; d >= 0; d--) {
    const jour = new Date(today);
    jour.setDate(jour.getDate() - d);
    const nbVentes = d === 0 ? 8 : Math.floor(Math.random() * 5) + 3; // Aujourd'hui = 8 ventes

    for (let v = 0; v < nbVentes; v++) {
      const venteId = `vente-${d}-${v}-${Date.now()}`;
      const heure = 7 + Math.floor(Math.random() * 11); // 7h à 18h
      const venteDate = new Date(jour);
      venteDate.setHours(heure, Math.floor(Math.random() * 60), 0);

      const nbArticles = Math.floor(Math.random() * 4) + 1;
      const lignesVente = [];
      let totalVente = 0;

      for (let a = 0; a < nbArticles; a++) {
        const p = produits[Math.floor(Math.random() * produits.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        totalVente += p.prix_vente * qty;
        lignesVente.push({ produit_id: p.id, quantite: qty, prix_unitaire: p.prix_vente });
      }

      const modes = ['Espèces', 'MoMo', 'Espèces', 'Espèces', 'Carte'];
      const mode = modes[Math.floor(Math.random() * modes.length)];

      ventesData.push({
        id: venteId,
        boutique_id: boutiqueId,
        caissier_id: userId,
        client_id: d < 3 && clients?.length ? clients[Math.floor(Math.random() * clients.length)].id : null,
        total: totalVente,
        montant_recu: mode === 'Espèces' ? Math.ceil(totalVente / 500) * 500 : totalVente,
        mode_paiement: mode,
        date_vente: venteDate.toISOString(),
        status: 'terminee',
        created_at: venteDate.toISOString(),
      });

      lignesData.push(...lignesVente.map(l => ({ ...l, vente_id: venteId })));
    }
  }

  await supabase.from('ventes').insert(ventesData);
  if (lignesData.length > 0) await supabase.from('lignes_vente').insert(lignesData);

  return { produits: produits?.length || 0, clients: clients?.length || 0, ventes: ventesData.length };
}

// ─── CRÉER / RESET COMPTE DÉMO ──────────────────────────────────────────────
async function assureDemoAccount() {
  console.log('[Demo] Recherche utilisateur démo...');
  const { data: existing, error: userError } = await supabase
    .from('users').select('*, boutiques!users_boutique_id_fkey(*)').eq('email', DEMO_EMAIL).limit(1).maybeSingle();

  if (userError) { console.error('[Demo] Erreur user:', userError); throw userError; }
  console.log('[Demo] Utilisateur existant:', existing?.id);

  if (existing) {
    // Reset: supprimer toutes les données de la boutique démo
    const boutiqueId = existing.boutique_id;
    if (boutiqueId) {
      const { data: ventes } = await supabase.from('ventes').select('id').eq('boutique_id', boutiqueId);
      if (ventes?.length) {
        await supabase.from('lignes_vente').delete().in('vente_id', ventes.map(v => v.id));
      }
      await supabase.from('ventes').delete().eq('boutique_id', boutiqueId);
      await supabase.from('credits').delete().eq('boutique_id', boutiqueId);
      await supabase.from('clients').delete().eq('boutique_id', boutiqueId);
      await supabase.from('mouvements_stock').delete().eq('boutique_id', boutiqueId);
      await supabase.from('produits').delete().eq('boutique_id', boutiqueId);
      await supabase.from('categories').delete().eq('boutique_id', boutiqueId);
    }
    return existing;
  }

  // Créer le compte démo
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const { data: boutique } = await supabase.from('boutiques').insert({
    nom: 'Boutique Démo GestoCaisse',
    plan: 'pro',
    plan_expire_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  }).select().single();

  const { data: user } = await supabase.from('users').insert({
    nom: 'Demo',
    prenom: 'Utilisateur',
    email: DEMO_EMAIL,
    mot_de_passe: hash,
    role: 'proprietaire',
    boutique_id: boutique.id,
    email_verifie: true,
  }).select().single();

  return user;
}

// ─── ROUTE PRINCIPALE : CRÉER + CONNECTER DÉMO ───────────────────────────────
router.post('/demarrer', async (req, res) => {
  try {
    const user = await assureDemoAccount();
    if (!user || !user.boutique_id) {
      return res.status(500).json({ success: false, message: 'Compte démo introuvable.' });
    }
    const { produits, clients, ventes } = await seedDemoData(user.boutique_id, user.id);

    const { data: boutique } = await supabase.from('boutiques').select('*').eq('id', user.boutique_id).single();

    const userSafe = { ...user };
    delete userSafe.mot_de_passe;

    res.json({
      success: true,
      message: 'Compte démo prêt !',
      token: genToken(user.id),
      user: { ...userSafe, boutique },
      demo: { produits, clients, ventes },
    });
  } catch (err) {
    console.error('[demo/demarrer]', err);
    res.status(500).json({ success: false, message: 'Erreur: ' + err.message });
  }
});

// ─── INFO COMPTE DÉMO (optionnel) ────────────────────────────────────────────
router.get('/info', (req, res) => {
  res.json({
    success: true,
    demo: {
      email: DEMO_EMAIL,
      hasAccount: true,
      features: ['20+ produits', '5 clients', '50+ ventes', 'Plan Pro actif'],
    },
  });
});

module.exports = router;
