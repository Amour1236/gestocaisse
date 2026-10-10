import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { rapportsStockAPI, categoriesAPI } from '../../services/api';
import { formatFCFA } from '../../utils/format';
import {
  Printer, Package, AlertTriangle, TrendingUp, TrendingDown,
  History, Filter, Download, X, Loader2, BarChart3, Clock, Truck,
  MapPin, Package2, ArrowRight, CheckCircle2, ClipboardList, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function RapportsStock() {
  const [tab, setTab] = useState<'etat' | 'mouvements' | 'alertes' | 'velocity' | 'synthese'>('etat');
  const [loading, setLoading] = useState(false);

  // État du stock
  const [etatData, setEtatData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [catFilter, setCatFilter] = useState('');
  const [rapportHtml, setRapportHtml] = useState<string | null>(null);

  // Mouvements
  const [mouvements, setMouvements] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [debutFilter, setDebutFilter] = useState('');
  const [finFilter, setFinFilter] = useState('');

  // Alertes
  const [alertesData, setAlertesData] = useState<any>(null);

  // Velocity
  const [velocityData, setVelocityData] = useState<any[]>([]);
  const [velocityStats, setVelocityStats] = useState<any>({});
  const [velocityJours, setVelocityJours] = useState(30);
  const [joursInput, setJoursInput] = useState('30');

  // Synthèse
  const [syntheseData, setSyntheseData] = useState<any>(null);
  const [syntheseDebut, setSyntheseDebut] = useState('');
  const [syntheseFin, setSyntheseFin] = useState('');

  useEffect(() => {
    categoriesAPI.liste().then(r => setCategories(r.data.data || [])).catch(() => {});
  }, []);

  // Charger données selon onglet
  useEffect(() => {
    if (tab === 'etat') chargerEtat();
    else if (tab === 'mouvements') chargerMouvements();
    else if (tab === 'alertes') chargerAlertes();
    else if (tab === 'velocity') chargerVelocity();
    else if (tab === 'synthese') chargerSynthese();
  }, [tab, catFilter]);

  const chargerEtat = async () => {
    setLoading(true);
    try {
      const res = await rapportsStockAPI.etat({ categorie: catFilter || undefined });
      setEtatData(res.data.data);
    } catch {
      toast.error('Erreur chargement état du stock');
    }
    setLoading(false);
  };

  const chargerMouvements = async () => {
    setLoading(true);
    try {
      const res = await rapportsStockAPI.mouvements({
        type: typeFilter || undefined,
        debut: debutFilter || undefined,
        fin: finFilter || undefined,
        limit: 200,
      });
      setMouvements((res.data.data as any[]) || []);
    } catch {
      toast.error('Erreur chargement mouvements');
    }
    setLoading(false);
  };

  const chargerAlertes = async () => {
    setLoading(true);
    try {
      const res = await rapportsStockAPI.alertes();
      setAlertesData(res.data.data);
    } catch {
      toast.error('Erreur chargement alertes');
    }
    setLoading(false);
  };

  const chargerVelocity = async () => {
    setLoading(true);
    try {
      const jours = Number(joursInput) || 30;
      setVelocityJours(jours);
      const res = await rapportsStockAPI.velocity({ jours });
      setVelocityData((res.data.data as any[]) || []);
      setVelocityStats((res.data as any)?.stats || {});
    } catch {
      toast.error('Erreur calcul vitesse');
    }
    setLoading(false);
  };

  const chargerSynthese = async () => {
    setLoading(true);
    try {
      const res = await rapportsStockAPI.synthese({
        debut: syntheseDebut || undefined,
        fin: syntheseFin || undefined,
      });
      setSyntheseData(res.data.data);
    } catch {
      toast.error('Erreur chargement synthèse');
    }
    setLoading(false);
  };

  // ─── IMPRESSIONS A4 ──────────────────────────────────────────────────────────────

  const printA4 = (html: string) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 300);
    w.close();
  };

  const genererSyntheseA4 = () => {
    if (!syntheseData) return;
    const { boutique, stats, generated_at } = syntheseData;
    const now = new Date().toLocaleString('fr-FR');
    const produits = syntheseData.produits || [];

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Synthèse Stock — ${boutique?.nom || 'Boutique'}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid #059669; padding-bottom: 15px; }
    .header h1 { font-size: 20px; color: #059669; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; }
    .header p { font-size: 10px; color: #666; }
    .info-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 20px; }
    .info-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 8px; border-radius: 6px; text-align: center; }
    .info-box .value { font-size: 16px; font-weight: 800; color: #059669; }
    .info-box .label { font-size: 8px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
    h2 { font-size: 12px; color: #059669; border-bottom: 1px solid #059669; padding-bottom: 4px; margin: 15px 0 8px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #059669; color: white; padding: 6px 4px; text-align: left; font-size: 9px; text-transform: uppercase; }
    td { padding: 5px 4px; border-bottom: 1px solid #e5e7eb; font-size: 9px; vertical-align: middle; }
    tr:nth-child(even) { background: #f9fafb; }
    .rupture { color: #dc2626; font-weight: 700; }
    .surstock { color: #2563eb; font-weight: 600; }
    .ok { color: #16a34a; font-weight: 600; }
    .total-row { font-weight: 800; background: #dcfce7 !important; }
    .footer { margin-top: 20px; text-align: center; font-size: 8px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    .stat-block { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px; }
    .stat-item { background: #f3f4f6; border-radius: 6px; padding: 8px; text-align: center; }
    .stat-item .val { font-size: 14px; font-weight: 700; color: #374151; }
    .stat-item .lab { font-size: 8px; color: #9ca3af; text-transform: uppercase; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${boutique?.nom || 'Ma Boutique'}</h1>
    <p>${boutique?.adresse || ''} — Tél: ${boutique?.telephone || ''}</p>
    <p style="margin-top:10px; font-size:13px; font-weight:700; color:#059669;">RAPPORT DE SYNTHÈSE STOCK</p>
    <p>Généré le ${now}</p>
  </div>

  <div class="stat-block">
    <div class="stat-item"><div class="val">${stats.total_produits || 0}</div><div class="lab">Total Produits</div></div>
    <div class="stat-item"><div class="val">${stats.total_stock || 0}</div><div class="lab">Stock Total</div></div>
    <div class="stat-item"><div class="val">${formatFCFA(stats.valeur_stock || 0)}</div><div class="lab">Valeur Stock</div></div>
    <div class="stat-item"><div class="val" style="color:#dc2626">${stats.ruptures || 0}</div><div class="lab">Ruptures</div></div>
    <div class="stat-item"><div class="val" style="color:#d97706">${stats.alertes || 0}</div><div class="lab">Stocks Faibles</div></div>
    <div class="stat-item"><div class="val" style="color:#2563eb">${stats.entrees || 0}</div><div class="lab">Entrées (période)</div></div>
  </div>

  <h2>📦 ÉTAT DU STOCK PAR PRODUIT</h2>
  <table>
    <thead>
      <tr>
        <th>Désignation</th><th>Catégorie</th><th>Emplacement</th>
        <th style="text-align:right">Prix Achat</th><th style="text-align:center">Stock</th>
        <th style="text-align:center">Min</th><th style="text-align:center">Max</th>
        <th style="text-align:right">Valeur</th><th style="text-align:center">Statut</th>
      </tr>
    </thead>
    <tbody>
      ${produits.map(p => {
        const stock = p.stock_actuel || 0;
        const min = p.stock_minimum || 5;
        const statut = stock === 0 ? '<span class="rupture">RUPTURE</span>'
          : stock <= min ? '<span style="color:#d97706;font-weight:600">FAIBLE</span>'
          : p.stock_maximum && stock > p.stock_maximum ? '<span class="surstock">SURSTOCK</span>'
          : '<span class="ok">OK</span>';
        return `<tr>
          <td><strong>${p.nom}</strong>${p.code_barre ? `<br><small style="color:#9ca3af">${p.code_barre}</small>` : ''}</td>
          <td>${p.categories?.nom || '—'}</td>
          <td>${p.emplacement || '—'}</td>
          <td style="text-align:right">${formatFCFA(p.prix_achat || 0)}</td>
          <td style="text-align:center"><strong>${stock}</strong></td>
          <td style="text-align:center">${min}</td>
          <td style="text-align:center">${p.stock_maximum || '—'}</td>
          <td style="text-align:right;font-weight:600">${formatFCFA(stock * (p.prix_achat || 0))}</td>
          <td style="text-align:center">${statut}</td>
        </tr>`;
      }).join('')}
      <tr class="total-row">
        <td colspan="4"><strong>TOTAUX</strong></td>
        <td style="text-align:center;font-weight:800">${stats.total_stock || 0}</td>
        <td colspan="2"></td>
        <td style="text-align:right;font-weight:800">${formatFCFA(stats.valeur_stock || 0)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Document généré par GestoCaisse le ${now} —CONFIDENTIEL—
  </div>
</body>
</html>`;

    printA4(html);
  };

  const genererVelocityA4 = () => {
    if (!velocityData.length) return;
    const now = new Date().toLocaleString('fr-FR');
    const boutique = etatData?.boutique;

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Vitesse de Vente — ${boutique?.nom || 'Boutique'}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #111; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid #7c3aed; padding-bottom: 12px; }
    .header h1 { font-size: 18px; color: #7c3aed; text-transform: uppercase; letter-spacing: 1px; }
    .header p { font-size: 10px; color: #666; }
    .stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 15px; }
    .stat-box { background: #f5f3ff; border: 1px solid #c4b5fd; padding: 8px; border-radius: 6px; text-align: center; }
    .stat-box .v { font-size: 16px; font-weight: 800; color: #7c3aed; }
    .stat-box .l { font-size: 8px; color: #6b7280; text-transform: uppercase; }
    h2 { font-size: 11px; color: #7c3aed; border-bottom: 1px solid #c4b5fd; padding-bottom: 3px; margin: 12px 0 6px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #7c3aed; color: white; padding: 5px 3px; text-align: left; font-size: 8px; text-transform: uppercase; }
    td { padding: 4px 3px; border-bottom: 1px solid #e5e7eb; font-size: 9px; vertical-align: middle; }
    tr:nth-child(even) { background: #faf5ff; }
    .rupture { color: #dc2626; font-weight: 800; }
    .urgent { color: #dc2626; font-weight: 700; }
    .bientot { color: #d97706; font-weight: 600; }
    .ok { color: #16a34a; }
    .badge-r { background: #fef2f2; color: #dc2626; padding: 1px 4px; border-radius: 3px; font-size: 8px; font-weight: 700; }
    .badge-u { background: #fef2f2; color: #ea580c; padding: 1px 4px; border-radius: 3px; font-size: 8px; font-weight: 700; }
    .badge-b { background: #fffbeb; color: #d97706; padding: 1px 4px; border-radius: 3px; font-size: 8px; }
    .badge-o { background: #f0fdf4; color: #16a34a; padding: 1px 4px; border-radius: 3px; font-size: 8px; }
    .footer { margin-top: 15px; text-align: center; font-size: 8px; color: #999; }
    @media print { body { print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${boutique?.nom || 'Ma Boutique'} — ANALYSE VITESSE DE VENTE</h1>
    <p>Basé sur ${velocityJours} derniers jours — Généré le ${now}</p>
  </div>

  <div class="stat-row">
    <div class="stat-box"><div class="v">${velocityStats.total_produits || 0}</div><div class="l">Produits</div></div>
    <div class="stat-box"><div class="v" style="color:#dc2626">${velocityStats.rupture || 0}</div><div class="l">Ruptures</div></div>
    <div class="stat-box"><div class="v" style="color:#ea580c">${velocityStats.urgent || 0}</div><div class="l">Urgents</div></div>
    <div class="stat-box"><div class="v">${formatFCFA(velocityStats.montant_estime || 0)}</div><div class="l">Coût réappro.</div></div>
  </div>

  <h2>🔴 PRODUITS EN RUPTURE — Commander immédiatement</h2>
  <table>
    <thead><tr><th>Désignation</th><th>Catégorie</th><th>Stock</th><th>Vitesse/jour</th><th>Stock Min</th><th>Qté à commander</th><th>Montant estimé</th></tr></thead>
    <tbody>
      ${velocityData.filter((p: any) => p.urgence === 'rupture').map((p: any) => `
        <tr>
          <td><strong>${p.nom}</strong>${p.emplacement ? `<br><small>📍 ${p.emplacement}</small>` : ''}</td>
          <td>${p.categorie || '—'}</td>
          <td class="rupture">${p.stock_actuel}</td>
          <td class="rupture">${p.vitesse_moyenne}/j</td>
          <td>${p.stock_minimum}</td>
          <td class="rupture">${p.quantite_suggeree}</td>
          <td style="font-weight:700">${formatFCFA(p.montant_estime)}</td>
        </tr>`).join('')}
      ${!velocityData.some((p: any) => p.urgence === 'rupture') ?
        '<tr><td colspan="7" style="text-align:center;color:#16a34a;font-weight:700">✓ Aucun produit en rupture</td></tr>' : ''}
    </tbody>
  </table>

  <h2>🟠 PRODUITS URGENTS — Commander sous ${velocityJours} jours</h2>
  <table>
    <thead><tr><th>Désignation</th><th>Stock</th><th>Stock Min</th><th>Vitesse/jour</th><th>Jours restants</th><th>Qté à commander</th><th>Date suggérée</th></tr></thead>
    <tbody>
      ${velocityData.filter((p: any) => p.urgence === 'urgent').map((p: any) => `
        <tr>
          <td><strong>${p.nom}</strong>${p.emplacement ? `<br><small>📍 ${p.emplacement}</small>` : ''}</td>
          <td class="urgent">${p.stock_actuel}</td>
          <td>${p.stock_minimum}</td>
          <td>${p.vitesse_moyenne}/j</td>
          <td class="urgent">${p.jours_avant_rupture}j</td>
          <td class="urgent">${p.quantite_suggeree}</td>
          <td><strong>${p.date_suggestion || 'Immédiat'}</strong></td>
        </tr>`).join('')}
      ${!velocityData.some((p: any) => p.urgence === 'urgent') ?
        '<tr><td colspan="7" style="text-align:center;color:#6b7280">Aucun produit urgent</td></tr>' : ''}
    </tbody>
  </table>

  <h2>🟡 PRODUITS À SURVEILLER — Bientôt à commander</h2>
  <table>
    <thead><tr><th>Désignation</th><th>Stock</th><th>Vitesse/jour</th><th>Jours restants</th><th>Date suggérée</th></tr></thead>
    <tbody>
      ${velocityData.filter((p: any) => p.urgence === 'bientot').map((p: any) => `
        <tr>
          <td><strong>${p.nom}</strong></td>
          <td class="bientot">${p.stock_actuel}</td>
          <td>${p.vitesse_moyenne}/j</td>
          <td class="bientot">${p.jours_avant_rupture}j</td>
          <td>${p.date_suggestion || '—'}</td>
        </tr>`).join('')}
      ${!velocityData.some((p: any) => p.urgence === 'bientot') ?
        '<tr><td colspan="5" style="text-align:center;color:#6b7280">Aucun produit à surveiller</td></tr>' : ''}
    </tbody>
  </table>

  <div class="footer">
    Rapport généré par GestoCaisse le ${now} —Confidentiel—
  </div>
</body>
</html>`;

    printA4(html);
  };

  const genererMouvementsA4 = () => {
    if (!mouvements.length) return;
    const now = new Date().toLocaleString('fr-FR');

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Historique Mouvements</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 9px; color: #111; }
    .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #059669; padding-bottom: 10px; }
    .header h1 { font-size: 16px; color: #059669; text-transform: uppercase; }
    .header p { font-size: 9px; color: #666; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #059669; color: white; padding: 5px 4px; text-align: left; font-size: 8px; text-transform: uppercase; }
    td { padding: 4px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) { background: #f9fafb; }
    .entree { color: #16a34a; font-weight: 700; }
    .sortie { color: #dc2626; font-weight: 700; }
    .footer { margin-top: 15px; text-align: center; font-size: 8px; color: #999; }
    @media print { body { print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>HISTORIQUE DES MOUVEMENTS DE STOCK</h1>
    <p>Du ${debutFilter || 'début'} au ${finFilter || 'aujourd\'hui'} — Généré le ${now}</p>
  </div>
  <table>
    <thead>
      <tr><th>Date/Heure</th><th>Produit</th><th>Catégorie</th><th>Type</th><th>Quantité</th><th>Stock Avant</th><th>Stock Après</th><th>Motif</th></tr>
    </thead>
    <tbody>
      ${mouvements.map(m => `
        <tr>
          <td>${new Date(m.created_at).toLocaleString('fr-FR')}</td>
          <td><strong>${m.produit?.nom || '—'}</strong></td>
          <td>${m.produit?.categories?.nom || '—'}</td>
          <td class="${m.quantite > 0 ? 'entree' : 'sortie'}">${m.type}</td>
          <td class="${m.quantite > 0 ? 'entree' : 'sortie'}">${m.quantite > 0 ? '+' : ''}${m.quantite}</td>
          <td>${m.stock_avant}</td>
          <td>${m.stock_apres}</td>
          <td>${m.motif || '—'}</td>
        </tr>`).join('')}
    </tbody>
  </table>
  <div class="footer">GestoCaisse — ${now}</div>
</body>
</html>`;

    printA4(html);
  };
  const genererEtImprimer = () => {
    if (!etatData) return;

    const boutique = etatData.boutique || {};
    const produits = etatData.produits || [];
    const stats = etatData.stats || {};
    const now = new Date().toLocaleString('fr-FR');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>État du Stock - ${boutique.nom || 'Boutique'}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #333; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #059669; padding-bottom: 15px; }
    .header h1 { font-size: 18px; color: #059669; margin-bottom: 5px; }
    .header p { font-size: 10px; color: #666; }
    .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
    .info-box { background: #f3f4f6; padding: 10px; border-radius: 5px; text-align: center; }
    .info-box .value { font-size: 16px; font-weight: bold; color: #059669; }
    .info-box .label { font-size: 9px; color: #666; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { background: #059669; color: white; padding: 8px 5px; text-align: left; font-size: 10px; }
    td { padding: 6px 5px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
    tr:nth-child(even) { background: #f9fafb; }
    .rupture { color: #dc2626; font-weight: bold; }
    .surstock { color: #f59e0b; font-weight: bold; }
    .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    .total-row { font-weight: bold; background: #e5e7eb !important; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${boutique.nom || 'Ma Boutique'}</h1>
    <p>${boutique.adresse || ''} • Tél: ${boutique.telephone || ''}</p>
    <p style="margin-top:10px; font-size:14px; font-weight:bold;">ÉTAT DU STOCK</p>
    <p>Généré le ${now}</p>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="value">${stats.total_produits || 0}</div>
      <div class="label">Produits</div>
    </div>
    <div class="info-box">
      <div class="value">${stats.total_stock || 0}</div>
      <div class="label">Stock Total</div>
    </div>
    <div class="info-box">
      <div class="value">${formatFCFA(stats.valeur_stock || 0)}</div>
      <div class="label">Valeur Stock</div>
    </div>
    <div class="info-box">
      <div class="value" style="color:${stats.produits_en_rupture > 0 ? '#dc2626' : '#059669'}">${stats.produits_en_rupture || 0}</div>
      <div class="label">Ruptures</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>N°</th>
        <th>Désignation</th>
        <th>Catégorie</th>
        <th style="text-align:right">Prix Achat</th>
        <th style="text-align:right">Prix Vente</th>
        <th style="text-align:center">Stock</th>
        <th style="text-align:center">Min</th>
        <th style="text-align:right">Valeur</th>
        <th style="text-align:center">Statut</th>
      </tr>
    </thead>
    <tbody>
      ${produits.map((p: any, i: number) => {
        const valeur = (p.stock_actuel || 0) * (p.prix_achat || 0);
        const statut = p.alerte?.rupture ? 'Rupture' :
          p.alerte?.sous_stock ? 'Alerte' :
          p.alerte?.surstock ? 'Surstock' : 'OK';
        const statutClass = p.alerte?.rupture ? 'rupture' : p.alerte?.surstock ? 'surstock' : '';
        return `
          <tr>
            <td>${i + 1}</td>
            <td><strong>${p.nom}</strong>${p.code_barre ? `<br><small>${p.code_barre}</small>` : ''}</td>
            <td>${p.categories?.nom || '—'}</td>
            <td style="text-align:right">${formatFCFA(p.prix_achat || 0)}</td>
            <td style="text-align:right">${formatFCFA(p.prix_vente || 0)}</td>
            <td style="text-align:center"><strong>${p.stock_actuel || 0}</strong></td>
            <td style="text-align:center">${p.stock_minimum || 5}</td>
            <td style="text-align:right">${formatFCFA(valeur)}</td>
            <td style="text-align:center" class="${statutClass}">${statut}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="footer">
    Document généré par GestoCaisse le ${now}
  </div>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
    w.close();
  };

  const exporterCsv = () => {
    if (!etatData?.produits) return;

    const headers = ['Référence', 'Désignation', 'Catégorie', 'Prix Achat', 'Prix Vente', 'Stock', 'Stock Min', 'Valeur', 'Statut'];
    const rows = etatData.produits.map((p: any) => [
      p.code_barre || '',
      p.nom,
      p.categories?.nom || '',
      p.prix_achat || 0,
      p.prix_vente || 0,
      p.stock_actuel || 0,
      p.stock_minimum || 5,
      (p.stock_actuel || 0) * (p.prix_achat || 0),
      p.alerte?.rupture ? 'Rupture' : p.alerte?.sous_stock ? 'Alerte' : p.alerte?.surstock ? 'Surstock' : 'OK',
    ]);

    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etat-stock-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const imprimerMouvements = () => {
    if (!mouvements.length) return;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Historique Mouvements</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #333; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #059669; padding-bottom: 10px; }
    .header h1 { font-size: 16px; color: #059669; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #059669; color: white; padding: 6px; text-align: left; font-size: 9px; }
    td { padding: 5px; border-bottom: 1px solid #e5e7eb; }
    .entree { color: #059669; font-weight: bold; }
    .sortie { color: #dc2626; font-weight: bold; }
    .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <h1>HISTORIQUE DES MOUVEMENTS DE STOCK</h1>
    <p>Du ${debutFilter || ' début'} au ${finFilter || 'aujourd\'hui'}</p>
    <p>Généré le ${new Date().toLocaleString('fr-FR')}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Produit</th>
        <th>Type</th>
        <th>Quantité</th>
        <th>Stock Avant</th>
        <th>Stock Après</th>
        <th>Motif</th>
      </tr>
    </thead>
    <tbody>
      ${mouvements.map(m => `
        <tr>
          <td>${new Date(m.created_at).toLocaleString('fr-FR')}</td>
          <td>${m.produit?.nom || '—'}</td>
          <td class="${m.quantite > 0 ? 'entree' : 'sortie'}">${m.type}</td>
          <td class="${m.quantite > 0 ? 'entree' : 'sortie'}">${m.quantite > 0 ? '+' : ''}${m.quantite}</td>
          <td>${m.stock_avant}</td>
          <td>${m.stock_apres}</td>
          <td>${m.motif || '—'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="footer">GestoCaisse</div>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
    w.close();
  };

  const imprimerAlertes = () => {
    if (!alertesData) return;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Rapport Alertes Stock</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #333; }
    .header { text-align: center; margin-bottom: 20px; }
    .header h1 { font-size: 16px; color: #dc2626; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 12px; margin-bottom: 10px; padding: 5px; }
    .section.critique h2 { background: #fef2f2; color: #dc2626; border-left: 4px solid #dc2626; }
    .section.warning h2 { background: #fffbeb; color: #f59e0b; border-left: 4px solid #f59e0b; }
    .section.info h2 { background: #eff6ff; color: #3b82f6; border-left: 4px solid #3b82f6; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f3f4f6; padding: 5px; text-align: left; font-size: 9px; }
    td { padding: 4px; border-bottom: 1px solid #e5e7eb; }
    .badge-critique { color: #dc2626; font-weight: bold; }
    .badge-warning { color: #f59e0b; }
    .badge-info { color: #3b82f6; }
  </style>
</head>
<body>
  <div class="header">
    <h1>RAPPORT D'ALERTES DE STOCK</h1>
    <p>Généré le ${new Date().toLocaleString('fr-FR')}</p>
  </div>

  <div class="section critique">
    <h2>⚠️ RUPTURES DE STOCK (${alertesData.ruptures?.length || 0})</h2>
    ${alertesData.ruptures?.length ? `
    <table>
      <thead><tr><th>Désignation</th><th>Stock</th><th>Catégorie</th></tr></thead>
      <tbody>
        ${alertesData.ruptures.map((p: any) => `
          <tr><td>${p.nom}</td><td class="badge-critique">${p.stock_actuel}</td><td>${p.categories?.nom || '—'}</td></tr>
        `).join('')}
      </tbody>
    </table>` : '<p>Aucune rupture</p>'}
  </div>

  <div class="section warning">
    <h2>⚡ STOCKS FAIBLES (${alertesData.sous_stock?.length || 0})</h2>
    ${alertesData.sous_stock?.length ? `
    <table>
      <thead><tr><th>Désignation</th><th>Stock</th><th>Minimum</th><th>Écart</th><th>Catégorie</th></tr></thead>
      <tbody>
        ${alertesData.sous_stock.map((p: any) => `
          <tr><td>${p.nom}</td><td class="badge-warning">${p.stock_actuel}</td><td>${p.stock_minimum}</td><td>${p.ecart}</td><td>${p.categories?.nom || '—'}</td></tr>
        `).join('')}
      </tbody>
    </table>` : '<p>Aucun stock faible</p>'}
  </div>

  <div class="section info">
    <h2>📦 SURSTOCKS (${alertesData.surstock?.length || 0})</h2>
    ${alertesData.surstock?.length ? `
    <table>
      <thead><tr><th>Désignation</th><th>Stock</th><th>Maximum</th><th>Écart</th><th>Catégorie</th></tr></thead>
      <tbody>
        ${alertesData.surstock.map((p: any) => `
          <tr><td>${p.nom}</td><td class="badge-info">${p.stock_actuel}</td><td>${p.stock_maximum}</td><td>+${p.ecart}</td><td>${p.categories?.nom || '—'}</td></tr>
        `).join('')}
      </tbody>
    </table>` : '<p>Aucun surstock</p>'}
  </div>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
    w.close();
  };

  // ── Navigation commune ────────────────────────────────────────────────────────
  const NAVIGATION = (
    <div className="flex flex-wrap gap-2 mb-4">
      <Link to="/app/stock" className="btn btn-secondary btn-sm"><Package size={14}/> Produits</Link>
      <Link to="/app/stock/inventaire" className="btn btn-secondary btn-sm"><ClipboardList size={14}/> Inventaire</Link>
      <Link to="/app/stock/bons" className="btn btn-secondary btn-sm"><FileText size={14}/> Bons</Link>
      <Link to="/app/stock/fournisseurs" className="btn btn-secondary btn-sm"><MapPin size={14}/> Fournisseurs</Link>
      <Link to="/app/stock/commandes" className="btn btn-secondary btn-sm"><Package2 size={14}/> Commandes</Link>
      <Link to="/app/stock/rapports" className="btn btn-primary btn-sm"><BarChart3 size={14}/> Rapports</Link>
    </div>
  );

  const TABS = [
    { key: 'etat', label: 'État du Stock', icon: Package },
    { key: 'velocity', label: 'Vitesse de Vente', icon: TrendingUp },
    { key: 'mouvements', label: 'Mouvements', icon: History },
    { key: 'alertes', label: 'Alertes', icon: AlertTriangle },
    { key: 'synthese', label: 'Synthèse A4', icon: Printer },
  ];

  // ── Vue État du stock ──────────────────────────────────────────────────────
  if (tab === 'etat') {
    return (
      <div className="space-y-4">
        {NAVIGATION}
        {/* Onglets */}
        <div className="flex flex-wrap gap-2 border-b pb-3">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key as any)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === t.key
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}>
                <Icon size={15}/>
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={24} className="text-emerald-600"/>
            État du Stock
          </h1>
          <div className="flex gap-2">
            <button onClick={exporterCsv} className="btn btn-secondary">
              <Download size={16}/> Export CSV
            </button>
            <button onClick={genererEtImprimer} className="btn btn-primary">
              <Printer size={16}/> Imprimer A4
            </button>
          </div>
        </div>

        {/* Stats */}
        {etatData?.stats && (
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{etatData.stats.total_produits}</p>
              <p className="text-xs text-gray-500">Produits</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{etatData.stats.total_stock}</p>
              <p className="text-xs text-gray-500">Stock Total</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{formatFCFA(etatData.stats.valeur_stock)}</p>
              <p className="text-xs text-gray-500">Valeur</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{etatData.stats.produits_en_rupture}</p>
              <p className="text-xs text-gray-500">Ruptures</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{etatData.stats.produits_en_alerte}</p>
              <p className="text-xs text-gray-500">Stocks Faibles</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{etatData.stats.produits_surstock}</p>
              <p className="text-xs text-gray-500">Surstocks</p>
            </div>
          </div>
        )}

        {/* Filtre */}
        <div className="flex gap-2">
          <select className="input w-48" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">Toutes catégories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>

        {/* Tableau */}
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-emerald-600"/></div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Produit</th>
                    <th className="px-4 py-3 text-right">Prix Achat</th>
                    <th className="px-4 py-3 text-right">Prix Vente</th>
                    <th className="px-4 py-3 text-center">Stock</th>
                    <th className="px-4 py-3 text-center">Min</th>
                    <th className="px-4 py-3 text-center">Max</th>
                    <th className="px-4 py-3 text-right">Valeur</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(etatData?.produits || []).map((p: any) => {
                    const statut = p.alerte?.rupture ? 'Rupture' :
                      p.alerte?.sous_stock ? 'Alerte' :
                      p.alerte?.surstock ? 'Surstock' : 'OK';
                    const statutClass = p.alerte?.rupture ? 'bg-red-100 text-red-700' :
                      p.alerte?.sous_stock ? 'bg-amber-100 text-amber-700' :
                      p.alerte?.surstock ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700';

                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{p.nom}</p>
                          {p.code_barre && <p className="text-xs text-gray-400 font-mono">{p.code_barre}</p>}
                        </td>
                        <td className="px-4 py-3 text-right">{formatFCFA(p.prix_achat)}</td>
                        <td className="px-4 py-3 text-right">{formatFCFA(p.prix_vente)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold ${p.alerte?.rupture ? 'text-red-600' : p.alerte?.sous_stock ? 'text-amber-600' : 'text-gray-900'}`}>
                            {p.stock_actuel}
                          </span>
                          <span className="text-gray-400 text-xs ml-1">{p.unite}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500">{p.stock_minimum || 5}</td>
                        <td className="px-4 py-3 text-center text-gray-500">{p.stock_maximum || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatFCFA((p.stock_actuel || 0) * (p.prix_achat || 0))}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`badge text-xs ${statutClass}`}>{statut}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Vue Mouvements ──────────────────────────────────────────────────────────
  if (tab === 'mouvements') {
    return (
      <div className="space-y-4">
        {NAVIGATION}
        <div className="flex flex-wrap gap-2 border-b pb-3">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key as any)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === t.key ? 'bg-emerald-600 text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}>
                <Icon size={15}/> {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <History size={24} className="text-emerald-600"/>
            Historique des Mouvements
          </h1>
          <button onClick={genererMouvementsA4} className="btn btn-primary">
            <Printer size={16}/> Imprimer A4
          </button>
        </div>

        {/* Filtres */}
        <div className="card p-4">
          <div className="flex flex-wrap gap-3">
            <select className="input w-40" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">Tous types</option>
              <option value="entree">Entrées</option>
              <option value="sortie">Sorties</option>
              <option value="vente">Ventes</option>
              <option value="retour">Retours</option>
              <option value="ajustement">Ajustements</option>
            </select>
            <input type="date" className="input" value={debutFilter} onChange={e => setDebutFilter(e.target.value)} placeholder="Date début"/>
            <input type="date" className="input" value={finFilter} onChange={e => setFinFilter(e.target.value)} placeholder="Date fin"/>
            <button onClick={chargerMouvements} className="btn btn-secondary">
              <Filter size={16}/> Filtrer
            </button>
          </div>
        </div>

        {/* Tableau */}
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-emerald-600"/></div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Produit</th>
                    <th className="px-4 py-3 text-center">Type</th>
                    <th className="px-4 py-3 text-center">Qté</th>
                    <th className="px-4 py-3 text-center">Stock Avant</th>
                    <th className="px-4 py-3 text-center">Stock Après</th>
                    <th className="px-4 py-3 text-left">Motif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {mouvements.map((m: any) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(m.created_at).toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 font-medium">{m.produit?.nom || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge ${
                          m.type === 'entree' ? 'badge-green' :
                          m.type === 'sortie' || m.type === 'vente' ? 'badge-red' :
                          'badge-gray'
                        }`}>{m.type}</span>
                      </td>
                      <td className={`px-4 py-3 text-center font-bold ${
                        m.quantite > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {m.quantite > 0 ? '+' : ''}{m.quantite}
                      </td>
                      <td className="px-4 py-3 text-center">{m.stock_avant}</td>
                      <td className="px-4 py-3 text-center">{m.stock_apres}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{m.motif || '—'}</td>
                    </tr>
                  ))}
                  {mouvements.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-gray-400">Aucun mouvement trouvé</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Vue Velocity ─────────────────────────────────────────────────────────────
  if (tab === 'velocity') {
    const stats = velocityStats;
    return (
      <div className="space-y-4">
        {NAVIGATION}
        <div className="flex flex-wrap gap-2 border-b pb-3">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key as any)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === t.key ? 'bg-emerald-600 text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}>
                <Icon size={15}/> {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp size={24} className="text-violet-600"/>
            Analyse Vitesse de Vente
          </h1>
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="7"
                max="365"
                className="input w-24"
                placeholder="30"
                value={joursInput}
                onChange={e => setJoursInput(e.target.value)}
              />
              <span className="text-sm text-gray-500">jours</span>
            </div>
            <button onClick={chargerVelocity} className="btn btn-secondary">
              <Filter size={16}/> Actualiser
            </button>
            <button onClick={genererVelocityA4} className="btn btn-primary">
              <Printer size={16}/> Imprimer A4
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total_produits || 0}</p>
            <p className="text-xs text-gray-500">Produits</p>
          </div>
          <div className="card p-4 text-center border-2 border-red-200 bg-red-50">
            <p className="text-2xl font-bold text-red-600">{stats.rupture || 0}</p>
            <p className="text-xs text-red-500">En rupture</p>
          </div>
          <div className="card p-4 text-center border-2 border-orange-200 bg-orange-50">
            <p className="text-2xl font-bold text-orange-600">{stats.urgent || 0}</p>
            <p className="text-xs text-orange-500">Urgent à commander</p>
          </div>
          <div className="card p-4 text-center border-2 border-amber-200 bg-amber-50">
            <p className="text-2xl font-bold text-amber-600">{stats.bientot || 0}</p>
            <p className="text-xs text-amber-500">À surveiller</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-violet-600">{formatFCFA(stats.montant_estime || 0)}</p>
            <p className="text-xs text-gray-500">Coût réappro.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-emerald-600"/></div>
        ) : (
          <div className="space-y-6">
            {/* Urgents */}
            {velocityData.filter((p: any) => p.urgence === 'rupture' || p.urgence === 'urgent').length > 0 && (
              <div className="card overflow-hidden">
                <div className="p-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
                  <h2 className="font-bold text-red-700 flex items-center gap-2">
                    <AlertTriangle size={18}/> À COMMANDER IMMÉDIATEMENT ({velocityData.filter((p: any) => p.urgence === 'rupture' || p.urgence === 'urgent').length})
                  </h2>
                  <Link to="/app/stock/commandes" className="btn btn-error btn-sm">
                    <Truck size={14}/> Créer commande
                  </Link>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-red-50 text-red-700 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Produit</th>
                      <th className="px-4 py-3 text-center">Stock</th>
                      <th className="px-4 py-3 text-center">Stock Min</th>
                      <th className="px-4 py-3 text-center">Vitesse/jour</th>
                      <th className="px-4 py-3 text-center">Jours restants</th>
                      <th className="px-4 py-3 text-center">Qté suggérée</th>
                      <th className="px-4 py-3 text-center">Date commande</th>
                      <th className="px-4 py-3 text-center">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {velocityData
                      .filter((p: any) => p.urgence === 'rupture' || p.urgence === 'urgent')
                      .map((p: any) => (
                        <tr key={p.id} className="bg-red-50/30 hover:bg-red-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-red-700">{p.nom}</p>
                            <p className="text-xs text-gray-400">{p.categorie}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold text-lg ${p.urgence === 'rupture' ? 'text-red-600' : 'text-orange-600'}`}>
                              {p.stock_actuel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-500">{p.stock_minimum}</td>
                          <td className="px-4 py-3 text-center font-semibold text-gray-700">
                            {p.vitesse_moyenne} /j
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${p.urgence === 'rupture' ? 'text-red-600 text-lg' : 'text-orange-600'}`}>
                              {p.jours_avant_rupture !== null ? `${p.jours_avant_rupture}j` : '∞'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2 py-1 rounded-lg bg-red-100 text-red-700 font-bold text-sm">
                              {p.quantite_suggeree}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold">
                            {p.date_suggestion ? (
                              <span className="text-red-600">{p.date_suggestion}</span>
                            ) : (
                              <span className="text-red-600 font-bold">IMMÉDIAT</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900">
                            {formatFCFA(p.montant_estime)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* À surveiller */}
            {velocityData.filter((p: any) => p.urgence === 'bientot').length > 0 && (
              <div className="card overflow-hidden">
                <div className="p-4 bg-amber-50 border-b border-amber-100">
                  <h2 className="font-bold text-amber-700 flex items-center gap-2">
                    <Clock size={18}/> À SURVEILLER — Commander sous {velocityJours} jours
                  </h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-amber-50 text-amber-700 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Produit</th>
                      <th className="px-4 py-3 text-center">Stock</th>
                      <th className="px-4 py-3 text-center">Vitesse/jour</th>
                      <th className="px-4 py-3 text-center">Jours restants</th>
                      <th className="px-4 py-3 text-center">Date suggérée</th>
                      <th className="px-4 py-3 text-center">Qté</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {velocityData
                      .filter((p: any) => p.urgence === 'bientot')
                      .map((p: any) => (
                        <tr key={p.id} className="hover:bg-amber-50/30">
                          <td className="px-4 py-3 font-medium text-gray-900">{p.nom}</td>
                          <td className="px-4 py-3 text-center font-bold text-amber-600">{p.stock_actuel}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{p.vitesse_moyenne}/j</td>
                          <td className="px-4 py-3 text-center font-bold text-amber-600">{p.jours_avant_rupture}j</td>
                          <td className="px-4 py-3 text-center text-sm">{p.date_suggestion}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold text-xs">
                              {p.quantite_suggeree}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* OK */}
            {velocityData.filter((p: any) => p.urgence === 'ok').length > 0 && (
              <div className="card overflow-hidden">
                <div className="p-4 bg-green-50 border-b border-green-100 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-600"/>
                  <h2 className="font-bold text-green-700">STOCKS CORRECTES ({velocityData.filter((p: any) => p.urgence === 'ok').length})</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-green-50 text-green-700 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Produit</th>
                        <th className="px-4 py-3 text-center">Stock</th>
                        <th className="px-4 py-3 text-center">Stock Min</th>
                        <th className="px-4 py-3 text-center">Vitesse/jour</th>
                        <th className="px-4 py-3 text-center">Jours restants</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {velocityData
                        .filter((p: any) => p.urgence === 'ok')
                        .map((p: any) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{p.nom}</td>
                            <td className="px-4 py-3 text-center font-bold text-green-600">{p.stock_actuel}</td>
                            <td className="px-4 py-3 text-center text-gray-400">{p.stock_minimum}</td>
                            <td className="px-4 py-3 text-center text-gray-600">{p.vitesse_moyenne}/j</td>
                            <td className="px-4 py-3 text-center font-bold text-green-600">
                              {p.jours_avant_rupture !== null ? `${p.jours_avant_rupture}j` : '∞'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Vue Synthèse A4 ────────────────────────────────────────────────────────
  if (tab === 'synthese') {
    return (
      <div className="space-y-4">
        {NAVIGATION}
        <div className="flex flex-wrap gap-2 border-b pb-3">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key as any)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === t.key ? 'bg-emerald-600 text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}>
                <Icon size={15}/> {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Printer size={24} className="text-emerald-600"/>
            Rapport de Synthèse Complet
          </h1>
          <button onClick={genererSyntheseA4} className="btn btn-primary" disabled={!syntheseData}>
            <Printer size={16}/> Imprimer A4
          </button>
        </div>

        {/* Filtres période */}
        <div className="card p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="label">Date début</label>
              <input type="date" className="input w-40" value={syntheseDebut}
                onChange={e => setSyntheseDebut(e.target.value)}/>
            </div>
            <div>
              <label className="label">Date fin</label>
              <input type="date" className="input w-40" value={syntheseFin}
                onChange={e => setSyntheseFin(e.target.value)}/>
            </div>
            <button onClick={chargerSynthese} className="btn btn-primary">
              <Filter size={16}/> Charger
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-emerald-600"/></div>
        ) : syntheseData ? (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total Produits', value: syntheseData.stats.total_produits, color: 'text-gray-900' },
                { label: 'Stock Total', value: syntheseData.stats.total_stock, color: 'text-emerald-600' },
                { label: 'Valeur', value: formatFCFA(syntheseData.stats.valeur_stock), color: 'text-gray-900' },
                { label: 'Entrées', value: syntheseData.stats.entrees, color: 'text-green-600' },
                { label: 'Ruptures', value: syntheseData.stats.ruptures, color: 'text-red-600' },
                { label: 'Alertes', value: syntheseData.stats.alertes, color: 'text-amber-600' },
              ].map((s, i) => (
                <div key={i} className="card p-4 text-center">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="card p-4 bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-emerald-800">Rapport de synthèse complet prêt !</p>
                <p className="text-sm text-emerald-600">Inclut état du stock, ruptures, alertes et mouvements de la période.</p>
              </div>
              <button onClick={genererSyntheseA4} className="btn btn-primary">
                <Printer size={16}/> Imprimer A4
              </button>
            </div>
          </div>
        ) : (
          <div className="card p-10 text-center">
            <Printer size={40} className="mx-auto text-gray-300 mb-3"/>
            <p className="text-gray-500">Cliquez sur "Charger" pour générer le rapport de synthèse.</p>
          </div>
        )}
      </div>
    );
  }

  // ── Vue Alertes ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {NAVIGATION}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t.key ? 'bg-emerald-600 text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}>
              <Icon size={15}/> {t.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <AlertTriangle size={24} className="text-amber-600"/>
          Alertes de Stock
        </h1>
        <button onClick={() => genererSyntheseA4()} className="btn btn-primary">
          <Printer size={16}/> Imprimer A4
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-emerald-600"/></div>
      ) : (
        <>
          {/* Ruptures */}
          <div className="card overflow-hidden">
            <div className="p-4 bg-red-50 border-b border-red-100">
              <h2 className="font-bold text-red-700 flex items-center gap-2">
                <AlertTriangle size={18}/> Ruptures de Stock ({alertesData?.ruptures?.length || 0})
              </h2>
            </div>
            {alertesData?.ruptures?.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-red-50 text-red-700 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Produit</th>
                    <th className="px-4 py-3 text-left">Catégorie</th>
                    <th className="px-4 py-3 text-center">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {alertesData.ruptures.map((p: any) => (
                    <tr key={p.id} className="hover:bg-red-50/50">
                      <td className="px-4 py-3 font-semibold text-red-700">{p.nom}</td>
                      <td className="px-4 py-3 text-gray-500">{p.categories?.nom || '—'}</td>
                      <td className="px-4 py-3 text-center font-bold text-red-600">{p.stock_actuel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-400">Aucune rupture de stock ✓</div>
            )}
          </div>

          {/* Stocks faibles */}
          <div className="card overflow-hidden">
            <div className="p-4 bg-amber-50 border-b border-amber-100">
              <h2 className="font-bold text-amber-700 flex items-center gap-2">
                <TrendingDown size={18}/> Stocks Faibles ({alertesData?.sous_stock?.length || 0})
              </h2>
            </div>
            {alertesData?.sous_stock?.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-amber-50 text-amber-700 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Produit</th>
                    <th className="px-4 py-3 text-left">Catégorie</th>
                    <th className="px-4 py-3 text-center">Stock</th>
                    <th className="px-4 py-3 text-center">Minimum</th>
                    <th className="px-4 py-3 text-center">Écart</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {alertesData.sous_stock.map((p: any) => (
                    <tr key={p.id} className="hover:bg-amber-50/50">
                      <td className="px-4 py-3 font-semibold text-amber-700">{p.nom}</td>
                      <td className="px-4 py-3 text-gray-500">{p.categories?.nom || '—'}</td>
                      <td className="px-4 py-3 text-center font-bold text-amber-600">{p.stock_actuel}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{p.stock_minimum}</td>
                      <td className="px-4 py-3 text-center text-red-500">-{p.ecart}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-400">Tous les stocks sont OK ✓</div>
            )}
          </div>

          {/* Surstocks */}
          <div className="card overflow-hidden">
            <div className="p-4 bg-blue-50 border-b border-blue-100">
              <h2 className="font-bold text-blue-700 flex items-center gap-2">
                <TrendingUp size={18}/> Surstocks ({alertesData?.surstock?.length || 0})
              </h2>
            </div>
            {alertesData?.surstock?.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-blue-50 text-blue-700 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Produit</th>
                    <th className="px-4 py-3 text-left">Catégorie</th>
                    <th className="px-4 py-3 text-center">Stock</th>
                    <th className="px-4 py-3 text-center">Maximum</th>
                    <th className="px-4 py-3 text-center">Écart</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {alertesData.surstock.map((p: any) => (
                    <tr key={p.id} className="hover:bg-blue-50/50">
                      <td className="px-4 py-3 font-semibold text-blue-700">{p.nom}</td>
                      <td className="px-4 py-3 text-gray-500">{p.categories?.nom || '—'}</td>
                      <td className="px-4 py-3 text-center font-bold text-blue-600">{p.stock_actuel}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{p.stock_maximum}</td>
                      <td className="px-4 py-3 text-center text-blue-500">+{p.ecart}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-400">Aucun surstock ✓</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
