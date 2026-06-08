const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger, exigerPermission } = require('../middleware/auth');
const { auditLog } = require('../services/audit');

const queueNotification = async (req, item) => {
  const { data, error } = await supabase.from('notifications').insert({
    boutique_id: req.boutique_id,
    ...item,
  }).select().single();
  if (error) throw error;
  return data;
};

router.get('/', proteger, exigerPermission('voir_rapports'), async (req, res) => {
  const { data, error } = await supabase.from('notifications').select('*').eq('boutique_id', req.boutique_id).order('created_at', { ascending: false }).limit(100);
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data: data || [] });
});

router.post('/generer-alertes', proteger, exigerPermission('voir_rapports'), async (req, res) => {
  try {
    const [{ data: boutique }, { data: produits }, { data: credits }, { data: abo }] = await Promise.all([
      supabase.from('boutiques').select('*').eq('id', req.boutique_id).single(),
      supabase.from('produits').select('*').eq('boutique_id', req.boutique_id).eq('actif', true),
      supabase.from('credits').select('*, clients(nom,telephone,email)').eq('boutique_id', req.boutique_id).neq('statut', 'rembourse'),
      supabase.from('abonnements').select('*').eq('boutique_id', req.boutique_id).order('fin', { ascending: false }).limit(1).maybeSingle(),
    ]);
    const destinataire = boutique?.telephone || '';
    const created = [];
    for (const p of (produits || []).filter(p => p.stock_actuel <= p.stock_minimum)) {
      created.push(await queueNotification(req, {
        type: 'stock_faible',
        canal: 'app',
        destinataire,
        titre: `Stock faible: ${p.nom}`,
        message: `Stock actuel ${p.stock_actuel} ${p.unite}, minimum ${p.stock_minimum}.`,
      }));
    }
    const today = new Date();
    for (const c of (credits || []).filter(c => c.date_echeance && new Date(c.date_echeance) < today)) {
      created.push(await queueNotification(req, {
        type: 'credit_retard',
        canal: 'app',
        destinataire: c.clients?.telephone || c.clients?.email || destinataire,
        titre: `Crédit en retard: ${c.clients?.nom || 'Client'}`,
        message: `Montant restant: ${Number(c.montant || 0) - Number(c.montant_rembourse || 0)} FCFA.`,
      }));
    }
    if (abo && abo.fin) {
      const days = Math.ceil((new Date(abo.fin) - today) / 86400000);
      if (days <= 7) {
        created.push(await queueNotification(req, {
          type: days < 0 ? 'abonnement_expire' : 'abonnement_bientot_expire',
          canal: 'app',
          destinataire,
          titre: days < 0 ? 'Abonnement expiré' : 'Abonnement bientôt expiré',
          message: days < 0 ? 'Votre abonnement est expiré.' : `Votre abonnement expire dans ${days} jour(s).`,
        }));
      }
    }
    await auditLog(req, { action: 'generate', entity: 'notifications', after_data: { count: created.length } });
    res.json({ success: true, data: created, message: `${created.length} notification(s) générée(s).` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/:id/marquer-envoyee', proteger, exigerPermission('voir_rapports'), async (req, res) => {
  const { data, error } = await supabase.from('notifications').update({ statut: 'sent', sent_at: new Date().toISOString() }).eq('id', req.params.id).eq('boutique_id', req.boutique_id).select().single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

module.exports = router;
