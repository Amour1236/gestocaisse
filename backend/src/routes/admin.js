const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger, autoriser } = require('../middleware/auth');

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

router.get('/stats', proteger, autoriser('admin'), async (req, res) => {
  try {
    const [b, u, abos] = await Promise.all([
      supabase.from('boutiques').select('id', { count: 'exact' }).eq('actif', true),
      supabase.from('users').select('id', { count: 'exact' }).eq('actif', true),
      supabase.from('abonnements').select('montant_fcfa').eq('statut', 'actif'),
    ]);
    const mrr = abos.data?.reduce((s,a) => s + a.montant_fcfa, 0) || 0;
    res.json({ success: true, data: { nb_boutiques: b.count, nb_users: u.count, mrr } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/users', proteger, autoriser('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, nom, prenom, email, role, actif, created_at, boutique_id, boutiques(nom)')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/boutiques', proteger, autoriser('admin'), async (req, res) => {
  const { data, error } = await supabase.from('boutiques').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data: data || [] });
});

router.get('/paiements-attente', proteger, autoriser('admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('abonnements')
    .select('*, boutiques(nom)')
    .eq('statut', 'en_attente')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data: data || [] });
});

router.patch('/boutiques/:id/toggle', proteger, autoriser('admin'), async (req, res) => {
  const { data: b, error } = await supabase.from('boutiques').select('actif').eq('id', req.params.id).single();
  if (error || !b) return res.status(404).json({ success: false, message: 'Boutique introuvable.' });

  const { error: updateError } = await supabase.from('boutiques').update({ actif: !b.actif }).eq('id', req.params.id);
  if (updateError) return res.status(500).json({ success: false, message: updateError.message });

  res.json({ success: true });
});

router.delete('/users/:id', proteger, autoriser('admin'), async (req, res) => {
  try {
    const { data: user, error: userError } = await supabase.from('users').select('id, role').eq('id', req.params.id).single();
    if (userError || !user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Le compte administrateur ne peut pas être supprimé.' });
    }

    await nettoyerReferencesUtilisateur(user.id);
    const { error } = await supabase.from('users').delete().eq('id', user.id);
    if (error) return res.status(500).json({ success: false, message: error.message });

    res.json({ success: true, message: 'Compte utilisateur supprimé.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/boutiques/:id', proteger, autoriser('admin'), async (req, res) => {
  const { data: boutique, error } = await supabase.from('boutiques').select('id').eq('id', req.params.id).single();
  if (error || !boutique) return res.status(404).json({ success: false, message: 'Boutique introuvable.' });

  try {
    await supprimerBoutiqueEnTouteSecurite(req.params.id);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }

  res.json({ success: true, message: 'Compte boutique supprime.' });
});

module.exports = router;
