const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { supabase } = require('./supabase');
const bcrypt = require('bcryptjs');

const COMPTES_DEMO = [
  {
    prenom: 'Super', nom: 'Admin',
    email: process.env.ADMIN_EMAIL,
    mot_de_passe: process.env.ADMIN_PASSWORD,
    nom_boutique: process.env.ADMIN_BOUTIQUE_NOM || 'GestoCaisse Admin',
    plan: 'business',
    role: 'admin',
  },
];

const PRODUITS_DEMO = [
  { nom: 'Lait Gloria 400g',      prix_vente: 1500, prix_achat: 1200, stock_actuel: 24, stock_minimum: 5,  unite: 'boîte',    cat: 0 },
  { nom: 'Sucre 1kg',             prix_vente: 700,  prix_achat: 550,  stock_actuel: 50, stock_minimum: 10, unite: 'kg',       cat: 0 },
  { nom: 'Riz local 5kg',         prix_vente: 3500, prix_achat: 2800, stock_actuel: 30, stock_minimum: 5,  unite: 'sac',      cat: 0 },
  { nom: 'Huile Dinor 1L',        prix_vente: 1200, prix_achat: 950,  stock_actuel: 18, stock_minimum: 5,  unite: 'bouteille',cat: 0 },
  { nom: 'Pâte tomate Cora',      prix_vente: 250,  prix_achat: 180,  stock_actuel: 45, stock_minimum: 10, unite: 'boîte',    cat: 0 },
  { nom: 'Sardines 125g',         prix_vente: 900,  prix_achat: 700,  stock_actuel: 20, stock_minimum: 5,  unite: 'boîte',    cat: 0 },
  { nom: 'Coca-Cola 50cl',        prix_vente: 600,  prix_achat: 450,  stock_actuel: 48, stock_minimum: 12, unite: 'bouteille',cat: 1 },
  { nom: 'Eau Possotomè 1L',      prix_vente: 400,  prix_achat: 300,  stock_actuel: 3,  stock_minimum: 12, unite: 'bouteille',cat: 1 },
  { nom: 'Bière Béninoise 65cl',  prix_vente: 800,  prix_achat: 600,  stock_actuel: 36, stock_minimum: 6,  unite: 'bouteille',cat: 1 },
  { nom: 'Savon Monganga',        prix_vente: 350,  prix_achat: 250,  stock_actuel: 60, stock_minimum: 10, unite: 'unité',    cat: 2 },
  { nom: 'Brosse à dents',        prix_vente: 500,  prix_achat: 350,  stock_actuel: 2,  stock_minimum: 5,  unite: 'unité',    cat: 2 },
  { nom: 'Allumettes (lot 10)',   prix_vente: 200,  prix_achat: 150,  stock_actuel: 100,stock_minimum: 20, unite: 'lot',      cat: 3 },
];

const CLIENTS_DEMO = [
  { nom: 'Fatou Bello',    telephone: '22961111111', credit_encours: 3500 },
  { nom: 'Kofi Mensah',   telephone: '22962222222', credit_encours: 0 },
  { nom: 'Marie Ganhou',  telephone: '22963333333', credit_encours: 7200 },
];

async function creerCompte(compte) {
  // Vérifier si existe
  const { data: existing } = await supabase
    .from('users').select('id,email,boutique_id').eq('email', compte.email).maybeSingle();
  if (existing) {
    const hash = await bcrypt.hash(compte.mot_de_passe, 12);
    let boutiqueId = existing.boutique_id;
    if (!boutiqueId) {
      const { data: boutique, error: be } = await supabase
        .from('boutiques')
        .insert({ nom: compte.nom_boutique, plan: compte.plan, proprietaire_id: existing.id })
        .select().single();
      if (be) throw new Error('Boutique: ' + be.message);
      boutiqueId = boutique.id;
    } else {
      await supabase
        .from('boutiques')
        .update({ plan: compte.plan, actif: true })
        .eq('id', boutiqueId);
    }
    const { error: ue } = await supabase
      .from('users')
      .update({
        mot_de_passe: hash,
        role: compte.role,
        email_verifie: true,
        actif: true,
        boutique_id: boutiqueId,
      })
      .eq('id', existing.id);
    if (ue) throw new Error('User: ' + ue.message);
    console.log(`  OK ${compte.email} / ${compte.mot_de_passe} - repare`);
    return;
  }

  const hash = await bcrypt.hash(compte.mot_de_passe, 12);

  // 1. Créer l'utilisateur d'abord (sans boutique_id)
  const { data: user, error: ue } = await supabase
    .from('users')
    .insert({
      nom: compte.nom, prenom: compte.prenom,
      email: compte.email, mot_de_passe: hash,
      role: compte.role,
      email_verifie: true,
    })
    .select().single();
  if (ue) throw new Error('User: ' + ue.message);

  // 2. Créer la boutique avec proprietaire_id = user.id
  const { data: boutique, error: be } = await supabase
    .from('boutiques')
    .insert({ nom: compte.nom_boutique, plan: compte.plan, proprietaire_id: user.id })
    .select().single();
  if (be) throw new Error('Boutique: ' + be.message);

  // 3. Mettre à jour l'utilisateur avec boutique_id
  await supabase.from('users').update({ boutique_id: boutique.id }).eq('id', user.id);

  // Données démo pour le compte proprietaire
  if (compte.role === 'proprietaire') {
    // Catégories
    const CATS = [
      { nom: 'Alimentaire', couleur: '#10b981' },
      { nom: 'Boissons',    couleur: '#3b82f6' },
      { nom: 'Hygiène',     couleur: '#8b5cf6' },
      { nom: 'Divers',      couleur: '#f59e0b' },
    ];
    const catIds = [];
    for (const c of CATS) {
      const { data } = await supabase.from('categories')
        .insert({ ...c, boutique_id: boutique.id }).select().single();
      catIds.push(data.id);
    }

    // Produits
    for (const p of PRODUITS_DEMO) {
      const { data: prod } = await supabase.from('produits').insert({
        nom: p.nom, prix_vente: p.prix_vente, prix_achat: p.prix_achat,
        stock_actuel: p.stock_actuel, stock_minimum: p.stock_minimum,
        unite: p.unite, categorie_id: catIds[p.cat], boutique_id: boutique.id,
      }).select().single();
      if (p.stock_actuel > 0) {
        await supabase.from('mouvements_stock').insert({
          boutique_id: boutique.id, produit_id: prod.id,
          type: 'entree', quantite: p.stock_actuel,
          stock_avant: 0, stock_apres: p.stock_actuel, motif: 'Stock initial',
        });
      }
    }

    // Clients
    for (const c of CLIENTS_DEMO) {
      await supabase.from('clients').insert({ ...c, boutique_id: boutique.id });
    }
  }

  console.log(`  ✅ ${compte.email} / ${compte.mot_de_passe} — créé`);
}

async function main() {
  // Créer la table recus_envoyes si elle n'existe pas
  try {
    await supabase.query(`
      CREATE TABLE IF NOT EXISTS public.recus_envoyes (
        id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        vente_id    uuid REFERENCES public.ventes(id) ON DELETE SET NULL,
        boutique_id uuid REFERENCES public.boutiques(id) ON DELETE CASCADE,
        canal       text NOT NULL CHECK (canal IN ('sms', 'whatsapp', 'email')),
        telephone   text,
        contenu     text,
        provider    text,
        externe_id  text,
        created_at  timestamptz DEFAULT now()
      );
    `);
    console.log('  ✅ Table recus_envoyes OK');
  } catch (e) {
    // Table existe peut-être — on ignore
  }

  // ─── Tables pour crédits avancés (rappels, tontines) ─────────────────
  try {
    await supabase.query(`
      CREATE TABLE IF NOT EXISTS public.rappels_credit (
        id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        credit_id   uuid REFERENCES public.credits(id) ON DELETE SET NULL,
        boutique_id uuid REFERENCES public.boutiques(id) ON DELETE CASCADE,
        client_id   uuid REFERENCES public.clients(id) ON DELETE SET NULL,
        canal       text NOT NULL,
        telephone   text,
        contenu     text,
        provider    text,
        externe_id  text,
        created_at  timestamptz DEFAULT now()
      );
    `);
    console.log('  ✅ Table rappels_credit OK');
  } catch (e) { /* existe */ }

  try {
    await supabase.query(`
      CREATE TABLE IF NOT EXISTS public.tontines (
        id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        boutique_id         uuid REFERENCES public.boutiques(id) ON DELETE CASCADE,
        nom                 text NOT NULL,
        montant_cotisation  numeric(12,0) NOT NULL DEFAULT 0,
        frequence           text DEFAULT 'hebdomadaire',
        date_debut          date,
        statut              text DEFAULT 'active',
        created_at          timestamptz DEFAULT now()
      );
    `);
    console.log('  ✅ Table tontines OK');
  } catch (e) { /* existe */ }

  try {
    await supabase.query(`
      CREATE TABLE IF NOT EXISTS public.tontine_membres (
        id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        tontine_id  uuid REFERENCES public.tontines(id) ON DELETE CASCADE,
        client_id   uuid REFERENCES public.clients(id) ON DELETE CASCADE,
        ordre       integer DEFAULT 1,
        created_at  timestamptz DEFAULT now(),
        UNIQUE(tontine_id, client_id)
      );
    `);
    console.log('  ✅ Table tontine_membres OK');
  } catch (e) { /* existe */ }

  try {
    await supabase.query(`
      CREATE TABLE IF NOT EXISTS public.tontine_cotisations (
        id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        tontine_id       uuid REFERENCES public.tontines(id) ON DELETE CASCADE,
        membre_id        uuid REFERENCES public.tontine_membres(id) ON DELETE CASCADE,
        montant          numeric(12,0) NOT NULL DEFAULT 0,
        tour             integer DEFAULT 1,
        date_cotisation  timestamptz DEFAULT now()
      );
    `);
    console.log('  ✅ Table tontine_cotisations OK');
  } catch (e) { /* existe */ }

  // Colonnes supplémentaires pour crédits (date_echeance, description, taux)
  try {
    await supabase.query(`
      ALTER TABLE public.credits
        ADD COLUMN IF NOT EXISTS date_echeance date,
        ADD COLUMN IF NOT EXISTS description text,
        ADD COLUMN IF NOT EXISTS taux_interet numeric(5,2) DEFAULT 0;
    `);
    console.log('  ✅ Colonnes crédits avancées OK');
  } catch (e) { /* existe */ }

  // Table fidélité (programme de points + cashback)
  try {
    await supabase.query(`
      CREATE TABLE IF NOT EXISTS public.fidelite_programmes (
        id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        boutique_id     uuid REFERENCES public.boutiques(id) ON DELETE CASCADE,
        nom             text NOT NULL DEFAULT 'Programme de fidélité',
        points_par_fcfa numeric(8,4) DEFAULT 0.001,
        fcfa_par_point  numeric(8,2) DEFAULT 100,
        cashback_pct    numeric(5,2) DEFAULT 0,
        actif           boolean DEFAULT true,
        created_at      timestamptz DEFAULT now()
      );
    `);
    console.log('  ✅ Table fidelite_programmes OK');
  } catch (e) { /* existe */ }

  try {
    await supabase.query(`
      CREATE TABLE IF NOT EXISTS public.fidelite_points (
        id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        client_id   uuid REFERENCES public.clients(id) ON DELETE CASCADE,
        boutique_id uuid REFERENCES public.boutiques(id) ON DELETE CASCADE,
        points      integer DEFAULT 0,
        total_gagne integer DEFAULT 0,
        total_utilise integer DEFAULT 0,
        updated_at  timestamptz DEFAULT now(),
        UNIQUE(client_id, boutique_id)
      );
    `);
    console.log('  ✅ Table fidelite_points OK');
  } catch (e) { /* existe */ }

  try {
    await supabase.query(`
      CREATE TABLE IF NOT EXISTS public.fidelite_mouvements (
        id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        client_id   uuid REFERENCES public.clients(id) ON DELETE CASCADE,
        boutique_id uuid REFERENCES public.boutiques(id) ON DELETE CASCADE,
        vente_id    uuid REFERENCES public.ventes(id) ON DELETE SET NULL,
        type        text NOT NULL,
        points      integer NOT NULL,
        cashback_montant numeric(12,0) DEFAULT 0,
        note        text,
        created_at  timestamptz DEFAULT now()
      );
    `);
    console.log('  ✅ Table fidelite_mouvements OK');
  } catch (e) { /* existe */ }

  // Table transferts de stock inter-boutiques
  try {
    await supabase.query(`
      CREATE TABLE IF NOT EXISTS public.transferts_stock (
        id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        boutique_source   uuid REFERENCES public.boutiques(id) ON DELETE CASCADE,
        boutique_destination uuid REFERENCES public.boutiques(id) ON DELETE CASCADE,
        produit_id        uuid REFERENCES public.produits(id) ON DELETE CASCADE,
        quantite          integer NOT NULL,
        statut            text DEFAULT 'en_attente' CHECK (statut IN ('en_attente','valide','annule','recu')),
        motif             text,
        created_by        uuid REFERENCES public.users(id),
        validated_by      uuid REFERENCES public.users(id),
        created_at        timestamptz DEFAULT now(),
        validated_at      timestamptz,
        received_at       timestamptz
      );
    `);
    console.log('  ✅ Table transferts_stock OK');
  } catch (e) { /* existe */ }

  // Table factures normalisées OHADA
  try {
    await supabase.query(`
      CREATE TABLE IF NOT EXISTS public.factures_ohada (
        id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        vente_id      uuid REFERENCES public.ventes(id) ON DELETE SET NULL,
        boutique_id   uuid REFERENCES public.boutiques(id) ON DELETE CASCADE,
        numero        text NOT NULL,
        date_facture  date NOT NULL,
        client_nom    text,
        client_nif    text,
        client_tel    text,
        client_adresse text,
        sous_total_ht numeric(12,2) DEFAULT 0,
        tva_taux      numeric(5,2) DEFAULT 0,
        tva_montant   numeric(12,2) DEFAULT 0,
        total_ttc     numeric(12,2) DEFAULT 0,
        timbre        numeric(12,2) DEFAULT 0,
        net_a_payer   numeric(12,2) DEFAULT 0,
        lignes        jsonb,
        created_at    timestamptz DEFAULT now()
      );
    `);
    console.log('  ✅ Table factures_ohada OK');
  } catch (e) { /* existe */ }

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error('\n❌ ERREUR: ADMIN_EMAIL et ADMIN_PASSWORD requis dans .env');
    console.error('   Renseignez des identifiants forts (jamais les valeurs par défaut).\n');
    process.exit(1);
  }
  if (process.env.ADMIN_PASSWORD.length < 12) {
    console.error('\n❌ ERREUR: ADMIN_PASSWORD doit faire au moins 12 caractères\n');
    process.exit(1);
  }
  console.log('\n🚀 GestoCaisse — Création des comptes démo\n');

  // Test connexion Supabase
  const { error: pingError } = await supabase.from('users').select('id').limit(1);
  if (pingError) {
    console.error('❌ Impossible de se connecter à Supabase.');
    console.error('   Vérifiez SUPABASE_URL et SUPABASE_SERVICE_KEY dans .env');
    console.error('   Détail:', pingError.message);
    console.error('\n   Si erreur "relation does not exist":');
    console.error('   → Exécutez SCHEMA_SQL.sql dans Supabase > SQL Editor\n');
    process.exit(1);
  }
  console.log('✅ Connexion Supabase OK\n');

  for (const compte of COMPTES_DEMO) {
    try {
      await creerCompte(compte);
    } catch (err) {
      console.error(`  ❌ Erreur pour ${compte.email}:`, err.message);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Setup terminé !');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🛡  Admin créé avec les identifiants du .env');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Erreur fatale:', err.message);
  process.exit(1);
});
