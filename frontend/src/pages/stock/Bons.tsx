import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bonsAPI, produitsAPI, categoriesAPI } from '../../services/api';
import { formatDate, formatFCFA } from '../../utils/format';
import {
  Plus, Search, X, Printer, ArrowDown, ArrowUp, Package,
  Loader2, Truck, ArrowLeft, Trash2, Edit2, FileText,
  MapPin, Package2, BarChart3, ClipboardList, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

interface LignePanier {
  produit_id: string;
  nom: string;
  quantite: number;
  prix_unitaire: number;
  stock: number;
}

export default function Bons() {
  const [tab, setTab] = useState<'reception' | 'sortie'>('reception');
  const [bons, setBons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [detailBon, setDetailBon] = useState<any>(null);
  const [rapportTexte, setRapportTexte] = useState<string | null>(null);
  const [rapportLoading, setRapportLoading] = useState(false);

  // Formulaire
  const [reference, setReference] = useState('');
  const [fournisseur, setFournisseur] = useState('');
  const [client, setClient] = useState('');
  const [notes, setNotes] = useState('');
  const [lignes, setLignes] = useState<LignePanier[]>([]);
  const [produits, setProduits] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [catFilter, setCatFilter] = useState('');
  const [searchProd, setSearchProd] = useState('');

  const chargerBons = async () => {
    setLoading(true);
    try {
      const res = await bonsAPI.liste({ type: tab, limit: 50 });
      setBons(res.data.data || []);
    } catch {
      toast.error('Erreur chargement bons');
    }
    setLoading(false);
  };

  const chargerDonneesForm = async () => {
    try {
      const [rp, rc] = await Promise.all([
        produitsAPI.liste({}),
        categoriesAPI.liste(),
      ]);
      setProduits(rp.data.data || []);
      setCategories(rc.data.data || []);
    } catch {}
  };

  useEffect(() => {
    chargerBons();
  }, [tab]);

  const ouvrirFormulaire = async () => {
    await chargerDonneesForm();
    setReference(`BR-${Date.now().toString(36).toUpperCase()}`);
    setFournisseur('');
    setClient('');
    setNotes('');
    setLignes([]);
    setShowForm(true);
  };

  const fermerFormulaire = () => {
    setShowForm(false);
    setLignes([]);
  };

  const ajouterProduit = (produit: any) => {
    const existe = lignes.find(l => l.produit_id === produit.id);
    if (existe) {
      if (tab === 'sortie' && existe.quantite >= produit.stock_actuel) {
        toast.error('Stock maximum atteint');
        return;
      }
      setLignes(prev => prev.map(l =>
        l.produit_id === produit.id
          ? { ...l, quantite: l.quantite + 1 }
          : l
      ));
    } else {
      if (tab === 'sortie' && produit.stock_actuel <= 0) {
        toast.error('Produit en rupture de stock');
        return;
      }
      setLignes(prev => [...prev, {
        produit_id: produit.id,
        nom: produit.nom,
        quantite: 1,
        prix_unitaire: produit.prix_achat || 0,
        stock: produit.stock_actuel,
      }]);
    }
  };

  const modifierQuantite = (produit_id: string, delta: number) => {
    setLignes(prev => prev.map(l => {
      if (l.produit_id !== produit_id) return l;
      const newQte = l.quantite + delta;
      if (newQte <= 0) return null;
      if (tab === 'sortie' && newQte > l.stock) {
        toast.error('Quantité dépasse le stock disponible');
        return l;
      }
      return { ...l, quantite: newQte };
    }).filter(Boolean) as LignePanier[]);
  };

  const supprimerLigne = (produit_id: string) => {
    setLignes(prev => prev.filter(l => l.produit_id !== produit_id));
  };

  const total = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);

  const soumettreBon = async () => {
    if (lignes.length === 0) {
      toast.error('Ajoutez au moins un produit');
      return;
    }
    if (tab === 'reception' && !fournisseur.trim()) {
      toast.error('Fournisseur requis');
      return;
    }
    if (tab === 'sortie' && !client.trim() && !notes.trim()) {
      toast.error('Client ou motif requis');
      return;
    }

    setLoading(true);
    try {
      await bonsAPI.creer({
        type_bon: tab,
        reference: reference.trim(),
        fournisseur: tab === 'reception' ? fournisseur.trim() : '',
        client: tab === 'sortie' ? client.trim() : '',
        notes: notes.trim(),
        lignes: lignes.map(l => ({
          produit_id: l.produit_id,
          quantite: l.quantite,
          prix_unitaire: l.prix_unitaire,
        })),
      });
      toast.success(`${tab === 'reception' ? 'Bon de réception' : 'Bon de sortie'} créé !`);
      fermerFormulaire();
      chargerBons();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur création bon');
    }
    setLoading(false);
  };

  const voirDetail = async (id: string) => {
    setLoading(true);
    try {
      const res = await bonsAPI.detail(id);
      setDetailBon(res.data.data);
    } catch {
      toast.error('Erreur chargement détail');
    }
    setLoading(false);
  };

  const supprimerBon = async (id: string) => {
    if (!confirm('Annuler ce bon ? Les stocks seront restaurés.')) return;
    setLoading(true);
    try {
      await bonsAPI.supprimer(id);
      toast.success('Bon annulé');
      setDetailBon(null);
      chargerBons();
    } catch {
      toast.error('Erreur annulation');
    }
    setLoading(false);
  };

  const genererRapport = async (id: string) => {
    setRapportLoading(true);
    try {
      const res = await fetch(`/api/rapports-stock/bon/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('gc_token')}` },
      });
      const data = await res.json();
      if (data.success) {
        setRapportTexte(data.data.texte);
      } else {
        toast.error(data.message || 'Erreur génération rapport');
      }
    } catch {
      toast.error('Erreur génération rapport');
    }
    setRapportLoading(false);
  };

  const imprimerRapport = () => {
    if (!rapportTexte) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Bon</title>
    <style>
      body { font-family: 'Courier New', monospace; font-size: 11px; margin: 20px; white-space: pre-wrap; }
      @media print { body { margin: 0; } }
    </style></head><body>${rapportTexte}</body></html>`);
    w.document.close();
    w.print();
    w.close();
  };

  const produitsFiltres = produits.filter(p => {
    const ok = p.actif && (tab === 'reception' || p.stock_actuel > 0);
    const s = !searchProd || p.nom.toLowerCase().includes(searchProd.toLowerCase());
    const c = !catFilter || p.categorie_id === catFilter;
    return ok && s && c;
  });

  // ── Vue détail ──────────────────────────────────────────────────────────────
  if (detailBon) {
    const isReception = detailBon.type_bon === 'reception';
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setDetailBon(null)} className="btn btn-secondary">
            <ArrowLeft size={16}/> Retour
          </button>
          <h1 className="text-xl font-bold">
            {isReception ? 'Bon de Réception' : 'Bon de Sortie'} #{detailBon.reference}
          </h1>
          <button
            onClick={() => genererRapport(detailBon.id)}
            disabled={rapportLoading}
            className="btn btn-primary"
          >
            <Printer size={16}/> Imprimer
          </button>
        </div>

        <div className="card p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-semibold">{formatDate(detailBon.date_bon)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Statut</p>
              <span className={`badge ${detailBon.statut === 'valide' ? 'badge-green' : 'badge-gray'}`}>
                {detailBon.statut === 'valide' ? 'Validé' : 'Annulé'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">{isReception ? 'Fournisseur' : 'Client/Destination'}</p>
              <p className="font-semibold">{isReception ? detailBon.fournisseur : (detailBon.client || detailBon.notes)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Établi par</p>
              <p className="font-semibold">{detailBon.utilisateur?.prenom} {detailBon.utilisateur?.nom}</p>
            </div>
          </div>

          <h3 className="font-bold mb-3">Lignes du bon</h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Produit</th>
                <th className="px-4 py-2 text-right">Qté</th>
                <th className="px-4 py-2 text-right">Prix U.</th>
                <th className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(detailBon.lignes || []).map((l: any) => (
                <tr key={l.id}>
                  <td className="px-4 py-2">{l.nom_produit}</td>
                  <td className="px-4 py-2 text-right">{l.quantite}</td>
                  <td className="px-4 py-2 text-right">{formatFCFA(l.prix_unitaire)}</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatFCFA(l.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-bold">
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right">TOTAL</td>
                <td className="px-4 py-2 text-right">{formatFCFA(detailBon.stats?.total || 0)}</td>
              </tr>
            </tfoot>
          </table>

          {detailBon.statut === 'valide' && (
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => supprimerBon(detailBon.id)}
                disabled={loading}
                className="btn btn-error"
              >
                <Trash2 size={16}/> Annuler ce bon
              </button>
            </div>
          )}
        </div>

        {/* Modal rapport */}
        {rapportTexte && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="card w-full max-w-3xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-bold">Impression du Bon</h3>
                <button onClick={() => setRapportTexte(null)}><X size={18}/></button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <pre className="text-xs font-mono whitespace-pre-wrap bg-gray-50 p-4 rounded-xl">
                  {rapportTexte}
                </pre>
              </div>
              <div className="p-4 border-t flex gap-2">
                <button onClick={imprimerRapport} className="btn btn-primary flex-1">
                  <Printer size={16}/> Imprimer
                </button>
                <button onClick={() => setRapportTexte(null)} className="btn btn-secondary">Fermer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Vue principale ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Navigation Links */}
      <div className="flex flex-wrap gap-2">
        <Link to="/app/stock" className="btn btn-secondary btn-sm">
          <Package size={14}/> Produits
        </Link>
        <Link to="/app/stock/inventaire" className="btn btn-secondary btn-sm">
          <ClipboardList size={14}/> Inventaire
        </Link>
        <Link to="/app/stock/bons" className="btn btn-primary btn-sm">
          <FileText size={14}/> Bons
        </Link>
        <Link to="/app/stock/fournisseurs" className="btn btn-secondary btn-sm">
          <MapPin size={14}/> Fournisseurs
        </Link>
        <Link to="/app/stock/commandes" className="btn btn-secondary btn-sm">
          <Package2 size={14}/> Commandes
        </Link>
        <Link to="/app/stock/rapports" className="btn btn-secondary btn-sm">
          <BarChart3 size={14}/> Rapports
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText size={24} className="text-emerald-600"/>
          Bons {tab === 'reception' ? 'de réception' : 'de sortie'}
        </h1>
        <button onClick={ouvrirFormulaire} className="btn btn-primary">
          <Plus size={16}/> Nouveau bon
        </button>
      </div>

      {/* Onglets */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('reception')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
            tab === 'reception'
              ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <ArrowUp size={16} className={tab === 'reception' ? 'text-emerald-600' : ''}/> Réceptions
        </button>
        <button
          onClick={() => setTab('sortie')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
            tab === 'sortie'
              ? 'bg-red-100 text-red-700 border-2 border-red-500'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <ArrowDown size={16} className={tab === 'sortie' ? 'text-red-600' : ''}/> Sorties
        </button>
      </div>

      {/* Liste des bons */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-emerald-600"/></div>
      ) : bons.length === 0 ? (
        <div className="card p-10 text-center">
          <Package size={40} className="mx-auto text-gray-300 mb-3"/>
          <p className="text-gray-500 font-medium">Aucun bon de {tab === 'reception' ? 'réception' : 'sortie'}</p>
          <p className="text-gray-400 text-sm mt-1">Créez un nouveau bon pour enregistrer vos {tab === 'reception' ? 'entrées' : 'sorties'}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bons.map((bon) => (
            <div
              key={bon.id}
              className="card p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => voirDetail(bon.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    tab === 'reception' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {tab === 'reception' ? <Truck size={20}/> : <ArrowDown size={20}/>}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">#{bon.reference}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(bon.date_bon)} • {tab === 'reception' ? bon.fournisseur : (bon.client || '—')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatFCFA(bon.total)}</p>
                    <p className="text-xs text-gray-400">{bon.nb_articles} article{bon.nb_articles !== 1 ? 's' : ''}</p>
                  </div>
                  <span className={`badge ${bon.statut === 'valide' ? 'badge-green' : 'badge-gray'}`}>
                    {bon.statut === 'valide' ? 'Validé' : 'Annulé'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="card w-full max-w-5xl my-4 flex flex-col max-h-[calc(100vh-2rem)]">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg">
                {tab === 'reception' ? 'Nouveau bon de réception' : 'Nouveau bon de sortie'}
              </h3>
              <button onClick={fermerFormulaire}><X size={18}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Infos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Référence</label>
                  <input
                    className="input"
                    value={reference}
                    onChange={e => setReference(e.target.value)}
                    placeholder="Auto-généré si vide"
                  />
                </div>
                {tab === 'reception' ? (
                  <div>
                    <label className="label">Fournisseur *</label>
                    <input
                      className="input"
                      value={fournisseur}
                      onChange={e => setFournisseur(e.target.value)}
                      placeholder="Nom du fournisseur"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="label">Client / Destination *</label>
                    <input
                      className="input"
                      value={client}
                      onChange={e => setClient(e.target.value)}
                      placeholder="Nom du client ou motif"
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Informations complémentaires..."
                  rows={2}
                />
              </div>

              {/* Sélecteur de produits */}
              <div className="border rounded-xl p-4">
                <h4 className="font-semibold mb-3">Ajouter des produits</h4>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    className="input flex-1"
                    placeholder="Rechercher un produit..."
                    value={searchProd}
                    onChange={e => setSearchProd(e.target.value)}
                  />
                  <select
                    className="input w-40"
                    value={catFilter}
                    onChange={e => setCatFilter(e.target.value)}
                  >
                    <option value="">Toutes catégories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {produitsFiltres.slice(0, 20).map(p => (
                    <button
                      key={p.id}
                      onClick={() => ajouterProduit(p)}
                      className="text-left p-2 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <p className="text-sm font-medium truncate">{p.nom}</p>
                      <p className="text-xs text-gray-400">
                        Stock: {p.stock_actuel} • {formatFCFA(p.prix_achat || 0)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lignes du bon */}
              {lignes.length > 0 && (
                <div className="border rounded-xl">
                  <h4 className="font-semibold p-4 border-b">Produits sélectionnés</h4>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Produit</th>
                        <th className="px-4 py-2 text-center">Stock</th>
                        <th className="px-4 py-2 text-center">Quantité</th>
                        <th className="px-4 py-2 text-right">Prix U.</th>
                        <th className="px-4 py-2 text-right">Total</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {lignes.map(l => (
                        <tr key={l.produit_id}>
                          <td className="px-4 py-2">{l.nom}</td>
                          <td className="px-4 py-2 text-center text-gray-500">{l.stock}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => modifierQuantite(l.produit_id, -1)}
                                className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200"
                              >−</button>
                              <span className="w-8 text-center font-semibold">{l.quantite}</span>
                              <button
                                onClick={() => modifierQuantite(l.produit_id, +1)}
                                className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200"
                              >+</button>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <input
                              type="number"
                              className="input w-20 text-right"
                              value={l.prix_unitaire}
                              onChange={e => setLignes(prev => prev.map(item =>
                                item.produit_id === l.produit_id
                                  ? { ...item, prix_unitaire: parseFloat(e.target.value) || 0 }
                                  : item
                              ))}
                            />
                          </td>
                          <td className="px-4 py-2 text-right font-semibold">
                            {formatFCFA(l.quantite * l.prix_unitaire)}
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => supprimerLigne(l.produit_id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={16}/>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-4 bg-gray-50 font-bold text-right">
                    TOTAL: {formatFCFA(total)}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t flex gap-2">
              <button onClick={fermerFormulaire} className="btn btn-secondary flex-1">Annuler</button>
              <button
                onClick={soumettreBon}
                disabled={loading || lignes.length === 0}
                className="btn btn-primary flex-1"
              >
                {loading ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}
                {loading ? 'Création...' : 'Créer le bon'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-emerald-600"/>
        </div>
      )}
    </div>
  );
}
