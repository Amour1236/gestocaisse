const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger } = require('../middleware/auth');
const sms = require('../services/sms');

const money = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;
const fmtDate = (d) => new Date(d).toLocaleString('fr-FR');

/**
 * Construit le texte du reçu pour SMS / WhatsApp
 */
const construireRecu = (vente, boutique, lignes, client) => {
  const lignesTxt = (lignes || []).map(
    (l, i) => `${i + 1}. ${l.nom_produit || l.nom || 'Article'} x${l.quantite} — ${money(l.total)}`
  ).join('\n');

  const clientTxt = client ? `\nClient: ${client.nom} (${client.telephone || 'N/A'})` : '';
  const remiseTxt = vente.remise > 0 ? `\nRemise: -${money(vente.remise)}` : '';

  return (
`━━━━━━━━━━━━━━━━━━━━━━━━
🧾 REÇU — ${boutique?.nom || 'Boutique'}
📍 ${boutique?.adresse || ''} | 📞 ${boutique?.telephone || ''}
━━━━━━━━━━━━━━━━━━━━━━━━
N° ${vente.numero}
📅 ${fmtDate(vente.created_at)}
${clientTxt}
${lignesTxt}
━━━━━━━━━━━━━━━━━━━━━━━━
Sous-total : ${money(vente.total)}
${remiseTxt}
TOTAL    : ${money(vente.total_final)}
💳 Payé  : ${vente.mode_paiement?.toUpperCase() || 'N/A'}
${vente.montant_recu ? `Reçu    : ${money(vente.montant_recu)}\nRendu   : ${money(Math.max(0, vente.montant_recu - vente.total_final))}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━
Merci de votre confiance !
${boutique?.nom || 'GestoCaisse'}
`
  ).trim();
};

/**
 * Construit le reçu HTML pour impression / email
 */
const construireRecuHtml = (vente, boutique, lignes, client) => {
  const rows = (lignes || []).map(l =>
    `<tr><td>${l.nom_produit || ''}</td><td style="text-align:center">${l.quantite}</td><td style="text-align:right">${money(l.prix_unitaire)}</td><td style="text-align:right">${money(l.total)}</td></tr>`
  ).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body{font-family:Arial,sans-serif;color:#111;margin:24px;font-size:13px}
.header{border-bottom:3px solid #059669;padding-bottom:10px;margin-bottom:14px}
h1{font-size:18px;margin:0;color:#059669}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{padding:7px 8px;border-bottom:1px solid #e5e7eb}
th{background:#f3f4f6;font-size:11px;text-transform:uppercase;color:#666}
.right{text-align:right}
.totals{margin-top:10px;text-align:right;font-size:15px}
.total-row{font-weight:800;font-size:17px;border-top:2px solid #111;padding-top:6px}
.bonus{background:#f0fdf4;border-radius:8px;padding:10px;margin-top:10px}
.footer{border-top:2px solid #059669;padding-top:10px;margin-top:20px;text-align:center;color:#666;font-size:11px}
@media print{button{display:none}body{margin:8px}}
</style></head><body>
<div class="header">
  <h1>${boutique?.nom || 'Boutique'}</h1>
  <p style="margin:4px 0 0;font-size:12px;color:#666">${boutique?.adresse || ''} | ${boutique?.telephone || ''}</p>
</div>
<div class="info-grid">
  <div><strong>Reçu N°</strong><br>${vente.numero}</div>
  <div style="text-align:right"><strong>Date</strong><br>${fmtDate(vente.created_at)}</div>
  ${client ? `<div><strong>Client</strong><br>${client.nom}<br>${client.telephone || ''}</div>` : '<div></div>'}
  <div style="text-align:right"><strong>Paiement</strong><br>${(vente.mode_paiement || '').toUpperCase()}</div>
</div>
<table><thead><tr><th>Désignation</th><th style="text-align:center">Qté</th><th style="text-align:right">PU</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table>
<div class="totals">
  ${vente.remise > 0 ? `<div>Sous-total: ${money(vente.total)}</div><div style="color:#dc2626">Remise: -${money(vente.remise)}</div>` : ''}
  <div class="total-row">TOTAL: ${money(vente.total_final)}</div>
  ${vente.montant_recu ? `<div style="font-size:13px;margin-top:4px">Reçu: ${money(vente.montant_recu)} — Rendu: ${money(Math.max(0, vente.montant_recu - vente.total_final))}</div>` : ''}
</div>
${vente.mode_paiement === 'credit' ? '<div class="bonus">⚠️ Paiement à CRÉDIT — voir historique client</div>' : ''}
<div class="footer">Merci de votre confiance !<br>${boutique?.nom || 'GestoCaisse'} · GestoCaisse</div>
<button onclick="window.print()" style="margin-top:16px">Imprimer</button></body></html>`;
};

/**
 * POST /api/recus/envoyer — Envoyer un reçu par SMS / WhatsApp
 */
router.post('/envoyer', proteger, async (req, res) => {
  try {
    const { vente_id, canal = 'sms', telephone = null } = req.body;
    if (!vente_id) return res.status(400).json({ success: false, message: 'vente_id requis.' });

    // Récupérer la vente complète
    const { data: vente, error: ve } = await supabase
      .from('ventes').select('*, lignes_vente(*), clients(*)')
      .eq('id', vente_id).eq('boutique_id', req.boutique_id).single();
    if (ve || !vente) return res.status(404).json({ success: false, message: 'Vente introuvable.' });

    // Récupérer la boutique
    const { data: boutique } = await supabase
      .from('boutiques').select('*').eq('id', req.boutique_id).single();

    // Numéro cible
    const destinataire = telephone || vente.clients?.telephone || '';
    if (!destinataire) return res.status(400).json({ success: false, message: 'Numéro de téléphone requis.' });

    // Construire le reçu
    const recuTxt = construireRecu(vente, boutique, vente.lignes_vente, vente.clients);

    let resultat;
    if (canal === 'whatsapp') {
      if (!sms.whatsappEstConfigure()) {
        return res.status(503).json({ success: false, message: "WhatsApp non configuré sur ce serveur." });
      }
      resultat = await sms.envoyerWhatsApp({ to: destinataire, message: recuTxt });
    } else {
      if (!sms.estConfigure()) {
        return res.status(503).json({ success: false, message: "SMS non configuré sur ce serveur." });
      }
      resultat = await sms.envoyer({ to: destinataire, message: recuTxt });
    }

    // Enregistrer dans l'historique (logs des reçus envoyés)
    await supabase.from('recus_envoyes').insert({
      vente_id,
      boutique_id: req.boutique_id,
      canal,
      telephone: destinataire,
      contenu: recuTxt,
      provider: resultat.provider,
      externe_id: resultat.id,
    });

    res.json({ success: true, message: `Reçu envoyé par ${canal === 'whatsapp' ? 'WhatsApp' : 'SMS'}.`, id: resultat.id });
  } catch (err) {
    console.error('[Recus] Erreur:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/recus/vente/:id — Obtenir le reçu d'une vente
 */
router.get('/vente/:id', proteger, async (req, res) => {
  try {
    const { data: vente } = await supabase
      .from('ventes').select('*, lignes_vente(*), clients(*)')
      .eq('id', req.params.id).eq('boutique_id', req.boutique_id).single();
    if (!vente) return res.status(404).json({ success: false, message: 'Vente introuvable.' });

    const { data: boutique } = await supabase
      .from('boutiques').select('*').eq('id', req.boutique_id).single();

    const recuTxt = construireRecu(vente, boutique, vente.lignes_vente, vente.clients);
    const recuHtml = construireRecuHtml(vente, boutique, vente.lignes_vente, vente.clients);

    res.json({ success: true, data: { vente, boutique, recuTxt, recuHtml } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/recus/envoyes — Liste des reçus envoyés
 */
router.get('/envoyes', proteger, async (req, res) => {
  try {
    const { data } = await supabase
      .from('recus_envoyes')
      .select('*, ventes(numero)')
      .eq('boutique_id', req.boutique_id)
      .order('created_at', { ascending: false })
      .limit(100);
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/recus/preview — Aperçu du reçu (texte) pour une vente en cours
 * Reçoit les données de la vente directement (pas d'ID)
 */
router.post('/preview', proteger, async (req, res) => {
  try {
    const { vente_id, vente_data } = req.body;
    let vente, boutique, lignes, client;

    if (vente_id) {
      ({ data: vente } = await supabase
        .from('ventes').select('*, lignes_vente(*), clients(*)')
        .eq('id', vente_id).eq('boutique_id', req.boutique_id).single());
      ({ data: boutique } = await supabase
        .from('boutiques').select('*').eq('id', req.boutique_id).single());
    } else if (vente_data) {
      vente = vente_data;
      ({ data: boutique } = await supabase
        .from('boutiques').select('*').eq('id', req.boutique_id).single());
    } else {
      return res.status(400).json({ success: false, message: 'vente_id ou vente_data requis.' });
    }

    if (!vente) return res.status(404).json({ success: false, message: 'Vente introuvable.' });
    lignes = vente.lignes_vente || [];
    client = vente.clients || null;

    const recuTxt = construireRecu(vente, boutique, lignes, client);
    const config = {
      smsConfigure: sms.estConfigure(),
      whatsappConfigure: sms.whatsappEstConfigure(),
    };

    res.json({ success: true, data: { recuTxt, config } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
