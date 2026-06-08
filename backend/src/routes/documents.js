const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger, exigerPermission } = require('../middleware/auth');
const { auditLog } = require('../services/audit');

const numero = (prefix) => `${prefix}-${Date.now().toString().slice(-8)}`;
const money = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;

const htmlPage = ({ title, body, color = '#059669' }) => `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:Arial,sans-serif;color:#111;margin:32px}.header{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:18px}
h1{font-size:22px;margin:0;color:${color}}.muted{color:#666;font-size:12px}.right{text-align:right}table{width:100%;border-collapse:collapse;margin-top:16px}
th,td{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left}th{background:#f9fafb}.total{font-size:18px;font-weight:800}.box{border:1px solid #e5e7eb;padding:12px;margin-top:16px}
button{background:${color};color:white;border:0;border-radius:8px;padding:8px 12px;font-weight:700}
@media print{button{display:none}body{margin:16px}}
</style></head><body><button onclick="window.print()">Imprimer / PDF</button>${body}</body></html>`;

router.post('/facture/vente/:id', proteger, exigerPermission('voir_rapports'), async (req, res) => {
  try {
    const [{ data: vente }, { data: boutique }] = await Promise.all([
      supabase.from('ventes').select('*, lignes_vente(*), clients(*)').eq('id', req.params.id).eq('boutique_id', req.boutique_id).single(),
      supabase.from('boutiques').select('*').eq('id', req.boutique_id).single(),
    ]);
    if (!vente) return res.status(404).json({ success: false, message: 'Vente introuvable.' });
    const doc = {
      boutique_id: req.boutique_id,
      user_id: req.user.id,
      client_id: vente.client_id,
      vente_id: vente.id,
      type: req.body.type || 'facture',
      numero: numero('FAC'),
      total: vente.total_final,
      payload: { vente, boutique },
    };
    const { data, error } = await supabase.from('documents').insert(doc).select().single();
    if (error) throw error;
    await auditLog(req, { action: 'create', entity: 'documents', entity_id: data.id, after_data: data });
    res.status(201).json({ success: true, data, url: `/api/documents/${data.id}/html` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/devis', proteger, async (req, res) => {
  try {
    const { client_id = null, lignes = [], notes = '' } = req.body;
    const total = lignes.reduce((s, l) => s + Number(l.quantite || 0) * Number(l.prix_unitaire || 0), 0);
    const { data, error } = await supabase.from('documents').insert({
      boutique_id: req.boutique_id,
      user_id: req.user.id,
      client_id,
      type: 'devis',
      numero: numero('DEV'),
      statut: 'brouillon',
      total,
      payload: { lignes, notes },
    }).select().single();
    if (error) throw error;
    await auditLog(req, { action: 'create', entity: 'documents', entity_id: data.id, after_data: data });
    res.status(201).json({ success: true, data, url: `/api/documents/${data.id}/html` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/', proteger, exigerPermission('voir_rapports'), async (req, res) => {
  let q = supabase.from('documents').select('*, clients(nom,telephone)').eq('boutique_id', req.boutique_id).order('created_at', { ascending: false });
  if (req.query.type) q = q.eq('type', req.query.type);
  const { data, error } = await q.limit(100);
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data: data || [] });
});

router.get('/:id/html', proteger, exigerPermission('voir_rapports'), async (req, res) => {
  const { data: doc, error } = await supabase.from('documents').select('*, boutiques(*)').eq('id', req.params.id).eq('boutique_id', req.boutique_id).single();
  if (error || !doc) return res.status(404).send('Document introuvable.');
  const boutique = doc.payload?.boutique || doc.boutiques || {};
  const vente = doc.payload?.vente;
  const lignes = vente?.lignes_vente || doc.payload?.lignes || [];
  const rows = lignes.map(l => `<tr><td>${l.nom_produit || l.nom || ''}</td><td>${l.quantite}</td><td>${money(l.prix_unitaire)}</td><td class="right">${money(l.total || l.quantite * l.prix_unitaire)}</td></tr>`).join('');
  const body = `<div class="header"><div><h1>${doc.type.toUpperCase()} ${doc.numero}</h1><p class="muted">${new Date(doc.created_at).toLocaleString('fr-FR')}</p></div><div class="right"><strong>${boutique.nom || 'Boutique'}</strong><p class="muted">${boutique.adresse || ''}<br>${boutique.telephone || ''}</p></div></div>
  ${vente?.clients ? `<div class="box"><strong>Client</strong><br>${vente.clients.nom}<br>${vente.clients.telephone || ''}</div>` : ''}
  <table><thead><tr><th>Désignation</th><th>Qté</th><th>PU</th><th class="right">Total</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="right total">Total: ${money(doc.total)}</p>`;
  res.type('html').send(htmlPage({ title: `${doc.type} ${doc.numero}`, body, color: boutique.couleur_recu || '#059669' }));
});

module.exports = router;
