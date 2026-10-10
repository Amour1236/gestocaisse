const { supabase } = require('../database/supabase');

const nettoyerReferencesUtilisateur = async (userId) => {
  await supabase.from('ventes').update({ caissier_id: null }).eq('caissier_id', userId);
  await supabase.from('boutiques').update({ proprietaire_id: null }).eq('proprietaire_id', userId);
};

const supprimerBoutiqueEnTouteSecurite = async (boutiqueId) => {
  const { data: ventes } = await supabase.from('ventes').select('id').eq('boutique_id', boutiqueId);
  const { data: produits } = await supabase.from('produits').select('id').eq('boutique_id', boutiqueId);
  const { data: clients } = await supabase.from('clients').select('id').eq('boutique_id', boutiqueId);

  if (ventes?.length) {
    await supabase.from('lignes_vente').delete().in('vente_id', ventes.map(v => v.id));
  }
  if (produits?.length) {
    await supabase.from('mouvements_stock').delete().in('produit_id', produits.map(p => p.id));
  }
  if (clients?.length) {
    await supabase.from('credits').delete().in('client_id', clients.map(c => c.id));
  }

  await supabase.from('abonnements').delete().eq('boutique_id', boutiqueId);
  await supabase.from('credits').delete().eq('boutique_id', boutiqueId);
  await supabase.from('clients').delete().eq('boutique_id', boutiqueId);
  await supabase.from('mouvements_stock').delete().eq('boutique_id', boutiqueId);
  await supabase.from('ventes').delete().eq('boutique_id', boutiqueId);
  await supabase.from('produits').delete().eq('boutique_id', boutiqueId);
  await supabase.from('categories').delete().eq('boutique_id', boutiqueId);
  await supabase.from('users').delete().eq('boutique_id', boutiqueId);
  await supabase.from('boutiques').delete().eq('id', boutiqueId);
};

module.exports = {
  nettoyerReferencesUtilisateur,
  supprimerBoutiqueEnTouteSecurite,
};
