const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { proteger } = require('../middleware/auth');

// Taux TVA par pays UEMOA/CEMAC
const TAUX_TVA = {
  'bj': 18,  // Bénin
  'bf': 18,  // Burkina Faso
  'cg': 18,  // Congo
  'ci': 18,  // Côte d'Ivoire
  'cm': 19.25, // Cameroun
  'ga': 18,  // Gabon
  'gn': 18,  // Guinée
  'ml': 18,  // Mali
  'ne': 19,  // Niger
  'rdc': 16, // RDC
  'sn': 18,  // Sénégal
  'td': 18,  // Tchad
  'tg': 18,  // Togo
};

const fmtMoney = (n, devise = 'XOF') =>
  `${Number(n || 0).toLocaleString('fr-FR')} ${devise}`;

const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR');

const fmtDateOHADA = (d) => {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
};

/**
 * GET /api/ohada/config — Config TVA et paramètres OHADA de la boutique
 */
router.get('/config', proteger, async (req, res) => {
  try {
    const { data: boutique } = await supabase
      .from('boutiques').select('*, pays, numero_contribuable, registre_commerce, siege_social, forme_juridique')
      .eq('id', req.boutique_id).single();

    const pays = boutique?.pays || 'bj';
    const taux_tva = boutique?.taux_tva || TAUX_TVA[pays] || 18;
    const timbre = boutique?.timbre_fiscal || 1000; // FCFA
    const code_activite = boutique?.code_activite || '00000';

    res.json({
      success: true,
      data: {
        boutique,
        pays,
        taux_tva,
        timbre,
        code_activite,
        taux_tva_disponibles: Object.entries(TAUX_TVA).map(([code, taux]) => ({ code, taux })),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/ohada/config — Mettre à jour les paramètres OHADA de la boutique
 */
router.put('/config', proteger, async (req, res) => {
  try {
    const { pays, taux_tva, timbre_fiscal, numero_contribuable, registre_commerce, siege_social, forme_juridique, code_activite } = req.body;

    const update = {};
    if (pays !== undefined) update.pays = pays;
    if (taux_tva !== undefined) update.taux_tva = Number(taux_tva);
    if (timbre_fiscal !== undefined) update.timbre_fiscal = Number(timbre_fiscal);
    if (numero_contribuable !== undefined) update.numero_contribuable = numero_contribuable;
    if (registre_commerce !== undefined) update.registre_commerce = registre_commerce;
    if (siege_social !== undefined) update.siege_social = siege_social;
    if (forme_juridique !== undefined) update.forme_juridique = forme_juridique;
    if (code_activite !== undefined) update.code_activite = code_activite;

    const { data, error } = await supabase
      .from('boutiques').update(update).eq('id', req.boutique_id)
      .select().single();
    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/ohada/facture — Générer une facture OHADA pour une vente
 * Body: { vente_id, options: { avec_tva, timbre, description } }
 */
router.post('/facture', proteger, async (req, res) => {
  try {
    const { vente_id, avec_tva = true, timbre = null, description = '' } = req.body;
    if (!vente_id) return res.status(400).json({ success: false, message: 'vente_id requis.' });

    // Récupérer vente complète
    const { data: vente, error: ve } = await supabase
      .from('ventes').select('*, lignes_vente(*), clients(*)')
      .eq('id', vente_id).eq('boutique_id', req.boutique_id).single();
    if (ve || !vente) return res.status(404).json({ success: false, message: 'Vente introuvable.' });

    // Récupérer config boutique
    const { data: boutique, error: be } = await supabase
      .from('boutiques').select('*').eq('id', req.boutique_id).single();
    if (be || !boutique) return res.status(404).json({ success: false, message: 'Boutique introuvable.' });

    const pays = boutique.pays || 'bj';
    const taux_tva = boutique.taux_tva || TAUX_TVA[pays] || 18;
    const timbreFiscal = timbre !== null ? Number(timbre) : (boutique.timbre_fiscal || 1000);

    // Calculs OHADA
    const lignes = (vente.lignes_vente || []).map(l => ({
      designation: l.nom_produit || l.nom || 'Article',
      quantity: Number(l.quantite),
      prix_unitaire: Number(l.prix_unitaire),
      total_ht: Number(l.total),
      // Supposons que les prix sont TTC — recalcul en HT si avec_tva
      total_ttc: avec_tva ? Number(l.total) * (1 + taux_tva / 100) : Number(l.total),
    }));

    const sous_total_ht = lignes.reduce((s, l) => s + l.total_ht, 0);
    const tva_montant = avec_tva ? sous_total_ht * (taux_tva / 100) : 0;
    const total_ttc = sous_total_ht + tva_montant;
    const net_a_payer = total_ttc + timbreFiscal;

    // Générer numéro de facture OHADA
    const mois = String(new Date().getMonth() + 1).padStart(2, '0');
    const annee = new Date().getFullYear();
    const { count } = await supabase
      .from('factures_ohada')
      .select('id', { count: 'exact' })
      .eq('boutique_id', req.boutique_id);
    const numero_facture = `FAC-${annee}${mois}-${String((count || 0) + 1).padStart(5, '0')}`;

    // Sauvegarder la facture
    const factureData = {
      vente_id,
      boutique_id: req.boutique_id,
      numero: numero_facture,
      date_facture: new Date().toISOString().split('T')[0],
      client_nom: vente.clients?.nom || '',
      client_nif: vente.clients?.nif || boutique.numero_contribuable || '',
      client_tel: vente.clients?.telephone || '',
      client_adresse: vente.clients?.adresse || '',
      sous_total_ht,
      tva_taux: avec_tva ? taux_tva : 0,
      tva_montant,
      total_ttc,
      timbre: timbreFiscal,
      net_a_payer,
      lignes: JSON.stringify({ articles: lignes, description }),
    };

    const { data: facture, error: fe } = await supabase
      .from('factures_ohada').insert(factureData).select().single();
    if (fe) throw fe;

    const html = générerHtmlOHADA(vente, boutique, {
      ...factureData, lignes, numero_facture, taux_tva, timbreFiscal, avec_tva
    });

    res.status(201).json({
      success: true,
      data: { ...facture, html, lignes },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/ohada/factures — Liste des factures OHADA
 */
router.get('/factures', proteger, async (req, res) => {
  try {
    const { mois, annee, client_nom } = req.query;
    let q = supabase.from('factures_ohada')
      .select('*', { count: 'exact' })
      .eq('boutique_id', req.boutique_id)
      .order('created_at', { ascending: false });

    if (mois && annee) q = q.like('numero', `%-${annee}${String(mois).padStart(2,'0')}-%`);
    if (client_nom) q = q.ilike('client_nom', `%${client_nom}%`);

    const { data, count, error } = await q.limit(100);
    if (error) throw error;

    res.json({ success: true, data: data || [], total: count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/ohada/factures/:id — Détail d'une facture OHADA
 */
router.get('/factures/:id', proteger, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('factures_ohada').select('*')
      .eq('id', req.params.id).eq('boutique_id', req.boutique_id).single();
    if (error || !data) return res.status(404).json({ success: false, message: 'Facture introuvable.' });

    const lignes = data.lignes ? JSON.parse(data.lignes) : {};
    res.json({ success: true, data: { ...data, lignes } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/ohada/factures/:id/pdf — Génère le HTML de la facture pour impression
 */
router.get('/factures/:id/pdf', proteger, async (req, res) => {
  try {
    const { data: facture, error } = await supabase
      .from('factures_ohada').select('*')
      .eq('id', req.params.id).eq('boutique_id', req.boutique_id).single();
    if (error || !facture) return res.status(404).send('Facture introuvable.');

    const { data: vente } = await supabase
      .from('ventes').select('*, lignes_vente(*), clients(*)')
      .eq('id', facture.vente_id).single();
    const { data: boutique } = await supabase
      .from('boutiques').select('*').eq('id', req.boutique_id).single();

    const lignes = facture.lignes ? JSON.parse(facture.lignes) : {};
    const html = générerHtmlOHADA(vente, boutique, { ...facture, lignes });

    res.type('html').send(html);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

/**
 * GET /api/ohada/export — Export pour DGI / déclarations fiscales
 * Body: { mois, annee, format: 'csv' | 'json' }
 */
router.get('/export', proteger, async (req, res) => {
  try {
    const { mois, annee, format = 'csv' } = req.query;
    if (!mois || !annee) return res.status(400).json({ success: false, message: 'mois et annee requis.' });

    const debut = `${annee}-${String(mois).padStart(2,'0')}-01`;
    const finDate = new Date(annee, mois, 0);
    const fin = finDate.toISOString().split('T')[0];

    // Récupérer toutes les factures OHADA du mois
    const { data: factures } = await supabase
      .from('factures_ohada')
      .select('*')
      .eq('boutique_id', req.boutique_id)
      .gte('date_facture', debut)
      .lte('date_facture', fin)
      .order('date_facture');

    // Récupérer les ventes non-facturées
    const { data: ventesSansFacture } = await supabase
      .from('ventes')
      .select('*, lignes_vente(*), clients(*)')
      .eq('boutique_id', req.boutique_id)
      .neq('statut', 'annulee')
      .gte('created_at', debut + 'T00:00:00.000Z')
      .lte('created_at', fin + 'T23:59:59.999Z');

    const boutique = (await supabase.from('boutiques').select('*').eq('id', req.boutique_id).single()).data;
    const taux_tva = boutique?.taux_tva || 18;

    if (format === 'json') {
      const exportData = {
        boutique: {
          nom: boutique?.nom,
          nif: boutique?.numero_contribuable,
          rccm: boutique?.registre_commerce,
          adresse: boutique?.siege_social,
        },
        periode: { mois: Number(mois), annee: Number(annee) },
        factures: (factures || []).map(f => ({
          ...f,
          lignes: f.lignes ? JSON.parse(f.lignes) : null,
        })),
        resume: {
          total_ht: (factures || []).reduce((s, f) => s + Number(f.sous_total_ht || 0), 0),
          total_tva: (factures || []).reduce((s, f) => s + Number(f.tva_montant || 0), 0),
          total_ttc: (factures || []).reduce((s, f) => s + Number(f.total_ttc || 0), 0),
          timbre_total: (factures || []).reduce((s, f) => s + Number(f.timbre || 0), 0),
          nb_factures: (factures || []).length,
          total_ventes: (ventesSansFacture || []).reduce((s, v) => s + Number(v.total_final || 0), 0),
        },
      };
      return res.json({ success: true, data: exportData });
    }

    // CSV pour DGI
    const rows = [
      ['NUMERO', 'DATE', 'CLIENT', 'NIF', 'TEL', 'ADRESSE', 'HT', 'TVA', 'TTC', 'TIMBRE', 'NET'],
      ...(factures || []).map(f => [
        f.numero,
        f.date_facture,
        f.client_nom || '',
        f.client_nif || '',
        f.client_tel || '',
        f.client_adresse || '',
        f.sous_total_ht,
        f.tva_montant,
        f.total_ttc,
        f.timbre,
        f.net_a_payer,
      ]),
    ];

    const totalRow = [
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      rows.slice(1).reduce((s, r) => s + Number(r[6] || 0), 0).toFixed(2),
      rows.slice(1).reduce((s, r) => s + Number(r[7] || 0), 0).toFixed(2),
      rows.slice(1).reduce((s, r) => s + Number(r[8] || 0), 0).toFixed(2),
      rows.slice(1).reduce((s, r) => s + Number(r[9] || 0), 0).toFixed(2),
      rows.slice(1).reduce((s, r) => s + Number(r[10] || 0), 0).toFixed(2),
    ];
    rows.push(totalRow);

    const csv = rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const filename = `DGI_${annee}_${String(mois).padStart(2,'0')}_${boutique?.nom || 'boutique'}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Génération HTML de la facture OHADA ─────────────────────────────────────
function générerHtmlOHADA(vente, boutique, facture) {
  const lignes = facture.lignes?.articles || [];
  const rows = lignes.map(l =>
    `<tr><td>${l.designation}</td><td style="text-align:center">${l.quantity}</td>
     <td style="text-align:right">${fmtMoney(l.prix_unitaire)}</td>
     <td style="text-align:right">${fmtMoney(l.total_ht)}</td></tr>`
  ).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Facture ${facture.numero_facture}</title>
<style>
body{font-family:Arial,sans-serif;color:#111;margin:20px;font-size:12px}
.header{border:2px solid #111;border-radius:4px;padding:12px;margin-bottom:16px;display:flex;justify-content:space-between}
.boutique h1{font-size:16px;margin:0;text-transform:uppercase}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;font-size:11px}
table{width:100%;border-collapse:collapse;margin-bottom:14px}
th,td{padding:7px 8px;border:1px solid #ddd}
th{background:#f3f4f6;font-size:10px;text-transform:uppercase;text-align:left}
.totaux{text-align:right}
.total-row{font-weight:bold;font-size:14px;border-top:2px solid #111;padding-top:6px}
.tva-row{font-size:11px;color:#555}
.footer{border-top:1px solid #ccc;padding-top:8px;font-size:10px;color:#666;text-align:center}
@media print{button{display:none}body{margin:8px}}
</style></head><body>
<button onclick="window.print()" style="margin-bottom:12px">Imprimer / Enregistrer PDF</button>

<div class="header">
  <div class="boutique">
    <h1>${boutique?.nom || 'Boutique'}</h1>
    <p>${boutique?.forme_juridique || 'Entreprise'} | RCCM: ${boutique?.registre_commerce || '—'}</p>
    <p>NIF: ${boutique?.numero_contribuable || '—'} | AI: ${boutique?.code_activite || '—'}</p>
    <p>${boutique?.siege_social || ''}</p>
  </div>
  <div style="text-align:right">
    <h2 style="margin:0;font-size:18px">FACTURE</h2>
    <p><strong>N° ${facture.numero_facture}</strong></p>
    <p>Date: ${fmtDateOHADA(facture.date_facture)}</p>
    <p>${boutique?.pays?.toUpperCase() || ''}</p>
  </div>
</div>

<div class="info-grid">
  <div><strong>Client:</strong> ${facture.client_nom || 'Client final'}<br>
  NIF: ${facture.client_nif || '—'}<br>
  Tél: ${facture.client_tel || '—'}<br>
  ${facture.client_adresse || ''}</div>
  <div style="text-align:right">
    <strong>Caisse:</strong> ${boutique?.nom || ''}<br>
    ${vente?.numero ? `<strong>Vente N°:</strong> ${vente.numero}<br>` : ''}
    <strong>Caissier:</strong> —
  </div>
</div>

<table>
<thead><tr><th>Désignation</th><th>Qté</th><th style="text-align:right">Prix Unit. HT</th><th style="text-align:right">Total HT</th></tr></thead>
<tbody>${rows}</tbody>
</table>

<div class="totaux">
  <p>Sous-total HT: <strong>${fmtMoney(facture.sous_total_ht)}</strong></p>
  ${facture.avec_tva ? `<p class="tva-row">TVA ${facture.taux_tva}%: <strong>${fmtMoney(facture.tva_montant)}</strong></p>` : ''}
  <p>Timbre fiscal: ${fmtMoney(facture.timbre || 0)}</p>
  <p class="total-row">NET À PAYER: <strong style="font-size:18px">${fmtMoney(facture.net_a_payer)}</strong></p>
</div>

<div class="footer">
  Facture conforme au SysCoA/OHADA · GestoCaisse · Géré par ${boutique?.nom || ''}
</div>
</body></html>`;
}

module.exports = router;
