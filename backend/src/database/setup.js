const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { supabase } = require('./supabase');
const bcrypt = require('bcryptjs');

const COMPTES_DEMO = [
  {
    prenom: 'Super', nom: 'Admin',
    email: 'admin@gestocaisse.com',
    mot_de_passe: 'Admin1234!',
    nom_boutique: 'GestoCaisse Admin',
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
    console.log(`  ⏭  ${compte.email} — existe déjà, ignoré`);
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
  console.log('🛡  Admin : admin@gestocaisse.com / Admin1234!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Erreur fatale:', err.message);
  process.exit(1);
});
