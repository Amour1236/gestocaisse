import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { inventairesAPI } from '../../services/api';
import { formatDate } from '../../utils/format';
import {
  Plus, Search, Check, X, Printer, AlertTriangle,
  ChevronRight, Clock, CheckCircle2, XCircle, ArrowLeft, Loader2,
  Package, ClipboardList, RefreshCw, FileText, BarChart3,
  MapPin, Package2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Inventaire() {
  const [inventaires, setInventaires] = useState<any[]>([]);
  const [inventaireActif, setInventaireActif] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [tab, setTab] = useState<'liste' | 'actif'>('liste');
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [rapportTexte, setRapportTexte] = useState<string | null>(null);
  const [rapportLoading, setRapportLoading] = useState(false);
  const [lignesModifiees, setLignesModifiees] = useState<Record<string, number>>({});

  const chargerInventaires = async () => {
    setLoadingList(true);
    try {
      const res = await inventairesAPI.liste({ limit: 50 });
      setInventaires(res.data.data || []);
    } catch {
      toast.error('Erreur chargement inventaires');
    }
    setLoadingList(false);
  };

  useEffect(() => {
    chargerInventaires();
  }, []);

  const creerInventaire = async () => {
    setLoading(true);
    try {
      const res = await inventairesAPI.creer({ notes });
      toast.success('Inventaire créé !');
      const inv = res.data.data;
      // Charger le détail complet
      const detail = await inventairesAPI.detail(inv.id);
      setInventaireActif(detail.data.data);
      setLignesModifiees({});
      setTab('actif');
      setNotes('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur création inventaire');
    }
    setLoading(false);
  };

  const chargerDetailInventaire = async (id: string) => {
    setLoading(true);
    try {
      const res = await inventairesAPI.detail(id);
      setInventaireActif(res.data.data);
      // Initialiser les valeurs de stock physique
      const lignesInit: Record<string, number> = {};
      (res.data.data.lignes || []).forEach((l: any) => {
        if (l.stock_physique !== null) {
          lignesInit[l.id] = l.stock_physique;
        }
      });
      setLignesModifiees(lignesInit);
      setTab('actif');
    } catch {
      toast.error('Erreur chargement inventaire');
    }
    setLoading(false);
  };

  const handleStockChange = (ligneId: string, value: string) => {
    const num = parseInt(value, 10);
    setLignesModifiees(prev => ({
      ...prev,
      [ligneId]: isNaN(num) ? 0 : num,
    }));
  };

  const sauvegarderLigne = async (ligneId: string) => {
    const stockPhysique = lignesModifiees[ligneId];
    if (stockPhysique === undefined) return;

    try {
      await inventairesAPI.updateLigne(inventaireActif.id, ligneId, { stock_physique: stockPhysique });
      toast.success('Stock enregistré !', { icon: '✓' });
    } catch {
      toast.error('Erreur sauvegarde');
    }
  };

  const sauvegarderTout = async () => {
    const lignesNonSauvegardees = inventaireActif.lignes.filter((l: any) =>
      l.stock_physique === null && lignesModifiees[l.id] !== undefined
    );

    if (lignesNonSauvegardees.length === 0) {
      toast.error('Aucune modification à sauvegarder');
      return;
    }

    setLoading(true);
    try {
      const lignes = lignesNonSauvegardees.map((l: any) => ({
        ligneId: l.id,
        stock_physique: lignesModifiees[l.id],
        notes: '',
      }));
      await inventairesAPI.bulkUpdateLignes(inventaireActif.id, lignes);
      toast.success(`${lignes.length} ligne(s) sauvegardée(s) !`);
      // Recharger
      await chargerDetailInventaire(inventaireActif.id);
    } catch {
      toast.error('Erreur sauvegarde');
    }
    setLoading(false);
  };

  const validerInventaire = async () => {
    const nonComptes = inventaireActif.lignes.filter((l: any) =>
      l.stock_physique === null && lignesModifiees[l.id] === undefined
    );

    if (nonComptes.length > 0) {
      toast.error(`${nonComptes.length} produit(s) non compté(s) !`);
      return;
    }

    if (!confirm('Valider cet inventaire ? Les écarts seront appliqués aux stocks.')) return;

    setLoading(true);
    try {
      const res = await inventairesAPI.valider(inventaireActif.id);
      toast.success(res.data.message || 'Inventaire validé !');
      setInventaireActif(null);
      setTab('liste');
      chargerInventaires();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur validation');
    }
    setLoading(false);
  };

  const annulerInventaire = async () => {
    if (!confirm('Annuler cet inventaire ?')) return;
    setLoading(true);
    try {
      await inventairesAPI.supprimer(inventaireActif.id);
      toast.success('Inventaire annulé');
      setInventaireActif(null);
      setTab('liste');
      chargerInventaires();
    } catch {
      toast.error('Erreur annulation');
    }
    setLoading(false);
  };

  const genererRapport = async (id: string) => {
    setRapportLoading(true);
    try {
      const res = await fetch(`/api/rapports-stock/inventaire/${id}`, {
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
    w.document.write(`<!DOCTYPE html><html><head><title>Rapport Inventaire</title>
    <style>
      body { font-family: 'Courier New', monospace; font-size: 12px; margin: 20px; white-space: pre-wrap; }
      @media print { body { margin: 0; } }
    </style></head><body>${rapportTexte}</body></html>`);
    w.document.close();
    w.print();
    w.close();
  };

  const lignesFiltrees = inventaireActif?.lignes?.filter((l: any) =>
    !search ||
    l.produit?.nom?.toLowerCase().includes(search.toLowerCase()) ||
    l.produit?.code_barre?.includes(search)
  ) || [];

  const stats = {
    total: lignesFiltrees.length,
    comptés: inventaireActif?.lignes?.filter((l: any) =>
      l.stock_physique !== null || lignesModifiees[l.id] !== undefined
    ).length || 0,
    avecEcart: inventaireActif?.lignes?.filter((l: any) => {
      const physique = lignesModifiees[l.id] !== undefined ? lignesModifiees[l.id] : l.stock_physique;
      return physique !== null && physique !== l.stock_theorique;
    }).length || 0,
  };

  // ── Vue liste des inventaires ──────────────────────────────────────────────
  if (tab === 'liste') {
    return (
      <div className="space-y-4">
        {/* Navigation Links */}
        <div className="flex flex-wrap gap-2">
          <Link to="/app/stock" className="btn btn-secondary btn-sm">
            <Package size={14}/> Produits
          </Link>
          <Link to="/app/stock/inventaire" className="btn btn-primary btn-sm">
            <ClipboardList size={14}/> Inventaire
          </Link>
          <Link to="/app/stock/bons" className="btn btn-secondary btn-sm">
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
            <ClipboardList size={24} className="text-emerald-600"/>
            Inventaires
          </h1>
          <button
            onClick={() => { setTab('actif'); setInventaireActif(null); setNotes(''); }}
            className="btn btn-primary"
          >
            <Plus size={16}/> Nouvel inventaire
          </button>
        </div>

        {loadingList ? (
          <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-emerald-600"/></div>
        ) : inventaires.length === 0 ? (
          <div className="card p-10 text-center">
            <Package size={40} className="mx-auto text-gray-300 mb-3"/>
            <p className="text-gray-500 font-medium">Aucun inventaire enregistré</p>
            <p className="text-gray-400 text-sm mt-1">Créez un nouvel inventaire pour commencer le comptage.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {inventaires.map((inv) => (
              <div key={inv.id} className="card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      inv.statut === 'termine' ? 'bg-green-100 text-green-600' :
                      inv.statut === 'annule' ? 'bg-gray-100 text-gray-400' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      {inv.statut === 'termine' ? <CheckCircle2 size={20}/> :
                       inv.statut === 'annule' ? <XCircle size={20}/> :
                       <Clock size={20}/>}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Inventaire #{inv.id.substring(0, 8).toUpperCase()}</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(inv.date_inventaire)} • {inv.utilisateur?.prenom} {inv.utilisateur?.nom}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${
                      inv.statut === 'termine' ? 'badge-green' :
                      inv.statut === 'annule' ? 'badge-gray' :
                      'badge-amber'
                    }`}>
                      {inv.statut === 'en_cours' ? 'En cours' :
                       inv.statut === 'termine' ? 'Terminé' : 'Annulé'}
                    </span>
                    {inv.statut === 'termine' && (
                      <button
                        onClick={() => genererRapport(inv.id)}
                        disabled={rapportLoading}
                        className="btn btn-secondary btn-sm"
                      >
                        <Printer size={14}/> Rapport
                      </button>
                    )}
                    {inv.statut === 'en_cours' && (
                      <button
                        onClick={() => chargerDetailInventaire(inv.id)}
                        className="btn btn-primary btn-sm"
                      >
                        Continuer <ChevronRight size={14}/>
                      </button>
                    )}
                  </div>
                </div>
                {inv.notes && <p className="text-sm text-gray-400 mt-2 ml-13">{inv.notes}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Modal rapport */}
        {rapportTexte && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="card w-full max-w-3xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-bold">Rapport d'Inventaire</h3>
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

  // ── Vue inventaire actif ───────────────────────────────────────────────────
  if (!inventaireActif) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setTab('liste')} className="btn btn-secondary">
            <ArrowLeft size={16}/> Retour
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Nouvel Inventaire</h1>
          <div/>
        </div>

        <div className="card p-6 max-w-md mx-auto">
          <h2 className="font-bold text-lg mb-4">Créer un inventaire physique</h2>
          <p className="text-gray-500 text-sm mb-4">
            Cette action créera un inventaire avec tous vos produits. Vous pourrez ensuite compter chaque produit et valider l'inventaire pour mettre à jour les stocks.
          </p>
          <div className="space-y-4">
            <div>
              <label className="label">Notes (optionnel)</label>
              <textarea
                className="input"
                placeholder="Ex: Inventaire mensuel de septembre..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <button
              onClick={creerInventaire}
              disabled={loading}
              className="btn btn-primary btn-lg w-full"
            >
              {loading ? <Loader2 size={18} className="animate-spin"/> : <Plus size={18}/>}
              {loading ? 'Création...' : 'Démarrer l\'inventaire'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const estTermine = inventaireActif.statut === 'termine';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => { setTab('liste'); setInventaireActif(null); }} className="btn btn-secondary">
          <ArrowLeft size={16}/> Retour
        </button>
        <div className="text-center">
          <h1 className="text-xl font-bold">Inventaire #{inventaireActif.id.substring(0, 8).toUpperCase()}</h1>
          <p className="text-sm text-gray-500">{formatDate(inventaireActif.date_inventaire)}</p>
        </div>
        <div className="flex gap-2">
          {!estTermine && (
            <>
              <button onClick={sauvegarderTout} disabled={loading} className="btn btn-secondary">
                <RefreshCw size={16}/> Sauvegarder
              </button>
              <button onClick={validerInventaire} disabled={loading} className="btn btn-primary">
                <Check size={16}/> Valider
              </button>
            </>
          )}
          {inventaireActif.statut === 'en_cours' && (
            <button onClick={annulerInventaire} disabled={loading} className="btn btn-error">
              <X size={16}/> Annuler
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">Produits</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.comptés}</p>
          <p className="text-sm text-gray-500">Comptés</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.avecEcart}</p>
          <p className="text-sm text-gray-500">Avec écart</p>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input
          className="input pl-9"
          placeholder="Rechercher un produit..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Liste des produits */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Produit</th>
              <th className="px-4 py-3 text-center">Stock Système</th>
              <th className="px-4 py-3 text-center">Stock Compté</th>
              <th className="px-4 py-3 text-center">Écart</th>
              {!estTermine && <th className="px-4 py-3 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {lignesFiltrees.map((ligne: any) => {
              const physiqueActuel = lignesModifiees[ligne.id] !== undefined
                ? lignesModifiees[ligne.id]
                : ligne.stock_physique;
              const ecart = physiqueActuel !== null ? physiqueActuel - ligne.stock_theorique : null;
              const aEcart = ecart !== null && ecart !== 0;
              const estModifie = lignesModifiees[ligne.id] !== undefined && lignesModifiees[ligne.id] !== ligne.stock_physique;

              return (
                <tr key={ligne.id} className={`${aEcart ? 'bg-red-50' : physiqueActuel !== null ? 'bg-green-50' : ''} ${estModifie ? 'ring-2 ring-amber-400' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{ligne.produit?.nom || 'Produit inconnu'}</p>
                    {ligne.produit?.code_barre && (
                      <p className="text-xs text-gray-400 font-mono">{ligne.produit.code_barre}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">{ligne.stock_theorique}</td>
                  <td className="px-4 py-3 text-center">
                    {estTermine ? (
                      <span className="font-bold">{physiqueActuel ?? '-'}</span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        className="input w-20 text-center"
                        value={physiqueActuel ?? ''}
                        placeholder="—"
                        onChange={e => handleStockChange(ligne.id, e.target.value)}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {ecart !== null ? (
                      <span className={`font-bold ${ecart > 0 ? 'text-green-600' : ecart < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {ecart > 0 ? '+' : ''}{ecart}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  {!estTermine && (
                    <td className="px-4 py-3 text-center">
                      {estModifie && (
                        <button
                          onClick={() => sauvegarderLigne(ligne.id)}
                          disabled={loading}
                          className="btn btn-primary btn-sm"
                        >
                          <Check size={14}/> OK
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {lignesFiltrees.length === 0 && (
              <tr>
                <td colSpan={estTermine ? 4 : 5} className="text-center py-10 text-gray-400">
                  Aucun produit trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-emerald-600"/>
        </div>
      )}
    </div>
  );
}
