import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { commandesFournisseursAPI, fournisseursAPI, produitsAPI, categoriesAPI, fournisseursAPI as fAPI } from '../../services/api';
import { formatDate, formatFCFA } from '../../utils/format';
import {
  Plus, Search, X, Loader2, Package, ClipboardList, FileText,
  BarChart3, Phone, Eye, ArrowLeft, Check, CheckCircle2,
  Truck, Clock, AlertTriangle, Edit2, Trash2, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface LignePanier {
  produit_id: string;
  nom: string;
  quantite: number;
  prix_unitaire: number;
}

const STATUTS = {
  en_attente: { label: 'En attente', color: 'badge-amber' },
  confirmee: { label: 'Confirmée', color: 'badge-blue' },
  recue: { label: 'Reçue', color: 'badge-green' },
  partiellement_recue: { label: 'Partiel', color: 'badge-orange' },
  annulee: { label: 'Annulée', color: 'badge-gray' },
};

export default function Commandes() {
  const [searchParams] = useSearchParams();
  const fournisseurIdPrefill = searchParams.get('fournisseur');

  const [commandes, setCommandes] = useState<any[]>([]);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'liste' | 'form' | 'detail' | 'reception'>('liste');
  const [detailCmd, setDetailCmd] = useState<any>(null);

  // Formulaire
  const [fournisseurId, setFournisseurId] = useState(fournisseurIdPrefill || '');
  const [ref, setRef] = useState('');
  const [dateLivraison, setDateLivraison] = useState('');
  const [notes, setNotes] = useState('');
  const [lignes, setLignes] = useState<LignePanier[]>([]);
  const [produits, setProduits] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [catFilter, setCatFilter] = useState('');
  const [searchProd, setSearchProd] = useState('');
  const [statutFilter, setStatutFilter] = useState('');

  // Réception
  const [receptionLignes, setReceptionLignes] = useState<any[]>([]);

  const chargerCommandes = async () => {
    setLoading(true);
    try {
      const [rc, rf] = await Promise.all([
        commandesFournisseursAPI.liste({ statut: statutFilter || undefined }),
        fAPI.liste(),
      ]);
      setCommandes(rc.data.data || []);
      setFournisseurs(rf.data.data || []);
    } catch {
      toast.error('Erreur chargement');
    }
    setLoading(false);
  };

  useEffect(() => { chargerCommandes(); }, [statutFilter]);

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

  const ouvrirFormulaire = async () => {
    await chargerDonneesForm();
    setRef(`CMD-${Date.now().toString(36).toUpperCase()}`);
    setNotes('');
    setLignes([]);
    if (fournisseurIdPrefill) setFournisseurId(fournisseurIdPrefill);
    setTab('form');
  };

  const fermerFormulaire = () => { setTab('liste'); setLignes([]); };

  const ajouterProduit = (produit: any) => {
    const existe = lignes.find(l => l.produit_id === produit.id);
    if (existe) {
      setLignes(prev => prev.map(l =>
        l.produit_id === produit.id ? { ...l, quantite: l.quantite + 1 } : l
      ));
    } else {
      setLignes(prev => [...prev, {
        produit_id: produit.id,
        nom: produit.nom,
        quantite: 1,
        prix_unitaire: produit.prix_achat || 0,
      }]);
    }
  };

  const modifierQte = (produit_id: string, delta: number) => {
    setLignes(prev => prev.map(l => {
      if (l.produit_id !== produit_id) return l;
      const newQte = l.quantite + delta;
      return newQte > 0 ? { ...l, quantite: newQte } : null;
    }).filter(Boolean) as LignePanier[]);
  };

  const supprimerLigne = (produit_id: string) => {
    setLignes(prev => prev.filter(l => l.produit_id !== produit_id));
  };

  const total = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);

  const soumettreCommande = async () => {
    if (!fournisseurId) return toast.error('Sélectionnez un fournisseur.');
    if (lignes.length === 0) return toast.error('Ajoutez au moins un produit.');

    setLoading(true);
    try {
      await commandesFournisseursAPI.creer({
        fournisseur_id: fournisseurId,
        reference: ref.trim(),
        date_livraison_prevue: dateLivraison || undefined,
        notes: notes.trim(),
        lignes: lignes.map(l => ({
          produit_id: l.produit_id,
          nom_produit: l.nom,
          quantite_commandee: l.quantite,
          prix_unitaire: l.prix_unitaire,
        })),
      });
      toast.success('Commande créée !');
      fermerFormulaire();
      chargerCommandes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur création commande.');
    }
    setLoading(false);
  };

  const voirDetail = async (id: string) => {
    setLoading(true);
    try {
      const res = await commandesFournisseursAPI.detail(id);
      setDetailCmd(res.data.data);
      setTab('detail');
    } catch {
      toast.error('Erreur chargement détail');
    }
    setLoading(false);
  };

  const ouvrirReception = (cmd: any) => {
    const lignesRecues = (cmd.lignes || []).map((l: any) => ({
      id: l.id,
      nom_produit: l.nom_produit,
      quantite_commandee: l.quantite_commandee,
      quantite_recue: l.quantite_recue || 0,
      conforme: l.conforme !== false,
      remarque: l.remarque_qualite || '',
    }));
    setDetailCmd({ ...cmd, lignesReception: lignesRecues });
    setTab('reception' as const);
  };

  const handleReceptionChange = (ligneId: string, field: string, value: any) => {
    setDetailCmd((prev: any) => ({
      ...prev,
      lignesReception: (prev.lignesReception || []).map((l: any) =>
        l.id === ligneId ? { ...l, [field]: value } : l
      ),
    }));
  };

  const confirmerReception = async () => {
    if (!detailCmd) return;
    setLoading(true);
    try {
      await commandesFournisseursAPI.recevoir(detailCmd.id,
        (detailCmd.lignesReception || []).map((l: any) => ({
          ligneId: l.id,
          quantite_recue: l.quantite_recue,
          conforme: l.conforme,
          remarque: l.remarque || '',
        }))
      );
      toast.success('Réception enregistrée !');
      setTab('liste');
      chargerCommandes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur réception.');
    }
    setLoading(false);
  };

  const confirmerCommande = async (id: string) => {
    try {
      await commandesFournisseursAPI.modifier(id, { statut: 'confirmee' });
      toast.success('Commande confirmée.');
      chargerCommandes();
    } catch { toast.error('Erreur.'); }
  };

  const annulerCommande = async (id: string) => {
    if (!confirm('Annuler cette commande ?')) return;
    try {
      await commandesFournisseursAPI.supprimer(id);
      toast.success('Commande annulée.');
      chargerCommandes();
    } catch { toast.error('Erreur.'); }
  };

  const produitsFiltres = produits.filter(p => {
    const ok = p.actif;
    const s = !searchProd || p.nom.toLowerCase().includes(searchProd.toLowerCase());
    const c = !catFilter || p.categorie_id === catFilter;
    return ok && s && c;
  });

  const fourActifs = fournisseurs.filter(f => f.actif);
  const totalReception = (detailCmd?.lignesReception || []).reduce((s: number, l: any) => s + (l.quantite_recue || 0) * l.prix_unitaire, 0);

  // ── Vue réception ───────────────────────────────────────────────────────────
  if (tab === 'reception' && detailCmd) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setTab('liste')} className="btn btn-secondary">
            <ArrowLeft size={16}/> Retour
          </button>
          <h1 className="text-xl font-bold">Réception CMD #{detailCmd.reference}</h1>
          <div/>
        </div>

        <div className="card p-4 bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700">
            <Truck size={18}/>
            <span className="font-medium">Fournisseur : {detailCmd.fournisseur?.nom}</span>
            {detailCmd.date_livraison_prevue && (
              <span className="text-sm text-blue-500">
                — Prévue: {formatDate(detailCmd.date_livraison_prevue)}
              </span>
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="font-bold">Contrôle de réception</h2>
            <p className="text-xs text-gray-500 mt-1">
              Saisissez la quantité reçue et cochez si les produits sont conformes.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Produit</th>
                <th className="px-4 py-3 text-center">Commandé</th>
                <th className="px-4 py-3 text-center">Reçu</th>
                <th className="px-4 py-3 text-center">Prix U.</th>
                <th className="px-4 py-3 text-center">Conforme</th>
                <th className="px-4 py-3 text-left">Remarque</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(detailCmd.lignesReception || []).map((l: any) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-medium">{l.nom_produit}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{l.quantite_commandee}</td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number"
                      min="0"
                      max={l.quantite_commandee * 2}
                      className="input w-20 text-center"
                      value={l.quantite_recue}
                      onChange={e => handleReceptionChange(l.id, 'quantite_recue', Number(e.target.value))}
                    />
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{formatFCFA(l.prix_unitaire)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleReceptionChange(l.id, 'conforme', !l.conforme)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        l.conforme
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-500'
                      }`}
                    >
                      {l.conforme ? <Check size={16}/> : <X size={16}/>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="input text-xs"
                      placeholder="Ex: 2 unités défectueuses..."
                      value={l.remarque || ''}
                      onChange={e => handleReceptionChange(l.id, 'remarque', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-bold">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-right">TOTAL:</td>
                <td className="px-4 py-3 text-center">{formatFCFA(totalReception)}</td>
                <td colSpan={3}/>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setTab('liste')} className="btn btn-secondary flex-1">Annuler</button>
          <button onClick={confirmerReception} disabled={loading} className="btn btn-primary flex-1">
            {loading ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>}
            Confirmer la réception
          </button>
        </div>
      </div>
    );
  }

  // ── Vue détail ──────────────────────────────────────────────────────────────
  if (tab === 'detail' && detailCmd) {
    const cmd = detailCmd;
    const statut = STATUTS[cmd.statut as keyof typeof STATUTS] || STATUTS.en_attente;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setTab('liste')} className="btn btn-secondary">
            <ArrowLeft size={16}/> Retour
          </button>
          <h1 className="text-xl font-bold">CMD #{cmd.reference}</h1>
          <span className={`badge ${statut.color}`}>{statut.label}</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card p-4">
            <p className="text-xs text-gray-500">Fournisseur</p>
            <p className="font-semibold">{cmd.fournisseur?.nom || '—'}</p>
            {cmd.fournisseur?.telephone && <p className="text-xs text-gray-400">{cmd.fournisseur.telephone}</p>}
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500">Date commande</p>
            <p className="font-semibold">{formatDate(cmd.date_commande)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500">Livraison prévue</p>
            <p className="font-semibold">{cmd.date_livraison_prevue ? formatDate(cmd.date_livraison_prevue) : '—'}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500">Montant total</p>
            <p className="font-bold text-emerald-600">{formatFCFA(cmd.montant_total)}</p>
          </div>
        </div>

        {/* Lignes */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-bold">Lignes de la commande</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Produit</th>
                <th className="px-4 py-3 text-right">Qté cmd</th>
                <th className="px-4 py-3 text-right">Qté reçue</th>
                <th className="px-4 py-3 text-right">Prix U.</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(cmd.lignes || []).map((l: any) => {
                const qteRecue = l.quantite_recue || 0;
                const total = l.quantite_commandee * l.prix_unitaire;
                const estComplete = qteRecue >= l.quantite_commandee;
                return (
                  <tr key={l.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{l.nom_produit}</p>
                      {l.remarque_qualite && <p className="text-xs text-red-500">{l.remarque_qualite}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{l.quantite_commandee}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${!estComplete && qteRecue > 0 ? 'text-amber-600' : ''}`}>
                        {qteRecue}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{formatFCFA(l.prix_unitaire)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatFCFA(total)}</td>
                    <td className="px-4 py-3 text-center">
                      {qteRecue === 0 ? (
                        <span className="badge badge-gray">Non reçue</span>
                      ) : estComplete ? (
                        <span className="badge badge-green flex items-center gap-1 w-fit mx-auto"><Check size={12}/> Complète</span>
                      ) : (
                        <span className="badge badge-amber flex items-center gap-1 w-fit mx-auto"><AlertTriangle size={12}/> Partielle</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {cmd.statut === 'en_attente' && (
            <>
              <button onClick={() => confirmerCommande(cmd.id)} className="btn btn-secondary">
                <Check size={16}/> Confirmer
              </button>
              <button onClick={() => annulerCommande(cmd.id)} className="btn btn-error">
                <Trash2 size={16}/> Annuler
              </button>
            </>
          )}
          {(cmd.statut === 'confirmee' || cmd.statut === 'partiellement_recue') && (
            <button onClick={() => ouvrirReception(cmd)} className="btn btn-primary">
              <Truck size={16}/> Réceptionner
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Vue formulaire ─────────────────────────────────────────────────────────
  if (tab === 'form') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={fermerFormulaire} className="btn btn-secondary">
            <ArrowLeft size={16}/> Retour
          </button>
          <h1 className="text-xl font-bold">Nouvelle commande fournisseur</h1>
          <div/>
        </div>

        <div className="card p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Fournisseur *</label>
              <select className="input" value={fournisseurId}
                onChange={e => setFournisseurId(e.target.value)}>
                <option value="">Sélectionner...</option>
                {fourActifs.map(f => (
                  <option key={f.id} value={f.id}>{f.nom} ({f.delai_livraison}j)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Référence</label>
              <input className="input" value={ref}
                onChange={e => setRef(e.target.value)} placeholder="Auto-généré si vide"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Date livraison prévue</label>
              <input type="date" className="input" value={dateLivraison}
                onChange={e => setDateLivraison(e.target.value)}/>
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={notes}
              onChange={e => setNotes(e.target.value)} placeholder="Instructions spéciales..."/>
          </div>
        </div>

        {/* Sélecteur produits */}
        <div className="card p-4">
          <h3 className="font-semibold mb-3">Ajouter des produits</h3>
          <div className="flex gap-2 mb-3">
            <input className="input flex-1" placeholder="Rechercher..."
              value={searchProd} onChange={e => setSearchProd(e.target.value)}/>
            <select className="input w-40" value={catFilter}
              onChange={e => setCatFilter(e.target.value)}>
              <option value="">Toutes</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {produitsFiltres.slice(0, 20).map(p => (
              <button key={p.id} onClick={() => ajouterProduit(p)}
                className="text-left p-2 rounded-lg border hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
                <p className="text-sm font-medium truncate">{p.nom}</p>
                <p className="text-xs text-gray-400">Stock: {p.stock_actuel} • {formatFCFA(p.prix_achat || 0)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Lignes sélectionnées */}
        {lignes.length > 0 && (
          <div className="card overflow-hidden">
            <div className="p-4 bg-gray-50 border-b font-bold">
              Produits sélectionnés ({lignes.length})
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Produit</th>
                  <th className="px-4 py-2 text-center">Quantité</th>
                  <th className="px-4 py-2 text-right">Prix U.</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lignes.map(l => (
                  <tr key={l.produit_id}>
                    <td className="px-4 py-2 font-medium">{l.nom}</td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => modifierQte(l.produit_id, -1)}
                          className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200">−</button>
                        <span className="w-8 text-center font-semibold">{l.quantite}</span>
                        <button onClick={() => modifierQte(l.produit_id, +1)}
                          className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200">+</button>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input type="number" className="input w-20 text-right text-sm"
                        value={l.prix_unitaire}
                        onChange={e => setLignes(prev => prev.map(item =>
                          item.produit_id === l.produit_id
                            ? { ...item, prix_unitaire: parseFloat(e.target.value) || 0 }
                            : item
                        ))}/>
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">{formatFCFA(l.quantite * l.prix_unitaire)}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => supprimerLigne(l.produit_id)}
                        className="text-red-500 hover:text-red-700">
                        <X size={16}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-emerald-50 font-bold">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right">TOTAL:</td>
                  <td className="px-4 py-3 text-right text-emerald-700">{formatFCFA(total)}</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={fermerFormulaire} className="btn btn-secondary flex-1">Annuler</button>
          <button onClick={soumettreCommande} disabled={loading || lignes.length === 0 || !fournisseurId}
            className="btn btn-primary flex-1">
            {loading ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}
            Créer la commande
          </button>
        </div>
      </div>
    );
  }

  // ── Vue liste ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex flex-wrap gap-2">
        <Link to="/app/stock" className="btn btn-secondary btn-sm"><Package size={14}/> Produits</Link>
        <Link to="/app/stock/inventaire" className="btn btn-secondary btn-sm"><ClipboardList size={14}/> Inventaire</Link>
        <Link to="/app/stock/bons" className="btn btn-secondary btn-sm"><FileText size={14}/> Bons</Link>
        <Link to="/app/stock/fournisseurs" className="btn btn-secondary btn-sm"><Phone size={14}/> Fournisseurs</Link>
        <Link to="/app/stock/commandes" className="btn btn-primary btn-sm"><Package size={14}/> Commandes</Link>
        <Link to="/app/stock/rapports" className="btn btn-secondary btn-sm"><BarChart3 size={14}/> Rapports</Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package size={24} className="text-emerald-600"/>
          Commandes fournisseurs
        </h1>
        <button onClick={ouvrirFormulaire} className="btn btn-primary">
          <Plus size={16}/> Nouvelle commande
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        {Object.entries(STATUTS).map(([key, val]) => (
          <button key={key} onClick={() => setStatutFilter(statutFilter === key ? '' : key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              statutFilter === key
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
            {val.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(STATUTS).map(([key, val]) => {
          const nb = commandes.filter(c => c.statut === key).length;
          return (
            <div key={key} className="card p-3 text-center cursor-pointer hover:shadow transition-shadow"
              onClick={() => setStatutFilter(statutFilter === key ? '' : key)}>
              <p className="text-xl font-bold">{nb}</p>
              <p className={`text-xs font-medium ${
                key === 'en_attente' ? 'text-amber-600' :
                key === 'recue' ? 'text-green-600' :
                key === 'annulee' ? 'text-gray-400' : 'text-gray-500'
              }`}>{val.label}</p>
            </div>
          );
        })}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-emerald-600"/></div>
      ) : commandes.length === 0 ? (
        <div className="card p-10 text-center">
          <Package size={40} className="mx-auto text-gray-300 mb-3"/>
          <p className="text-gray-500 font-medium">Aucune commande</p>
          <p className="text-gray-400 text-sm mt-1">Créez une commande pour approvisionner votre stock.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {commandes.map(cmd => {
            const statut = STATUTS[cmd.statut as keyof typeof STATUTS] || STATUTS.en_attente;
            return (
              <div key={cmd.id} className="card p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => voirDetail(cmd.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      cmd.statut === 'recue' ? 'bg-green-100 text-green-600' :
                      cmd.statut === 'en_attente' ? 'bg-amber-100 text-amber-600' :
                      cmd.statut === 'annulee' ? 'bg-gray-100 text-gray-400' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {cmd.statut === 'recue' ? <CheckCircle2 size={20}/> :
                       cmd.statut === 'en_attente' ? <Clock size={20}/> :
                       cmd.statut === 'annulee' ? <X size={20}/> :
                       <Truck size={20}/>}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">#{cmd.reference}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        {cmd.fournisseur?.nom}
                        <span className="text-gray-300">•</span>
                        {formatDate(cmd.date_commande)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatFCFA(cmd.montant_total)}</p>
                      {cmd.date_livraison_prevue && (
                        <p className="text-xs text-gray-400">Prévu: {formatDate(cmd.date_livraison_prevue)}</p>
                      )}
                    </div>
                    <span className={`badge ${statut.color}`}>{statut.label}</span>
                    <ChevronRight size={16} className="text-gray-400"/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
