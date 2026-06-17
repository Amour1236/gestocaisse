import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { produitsAPI, categoriesAPI, stockAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, AlertTriangle, ArrowUp, ArrowDown, Edit2, Trash2, X, Loader2, Package } from 'lucide-react';
import { formatFCFA } from '../../utils/format';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useAuthStore } from '../../store/authStore';

const EMPTY_FORM = { nom:'', prix_vente:'', prix_achat:'', stock_actuel:'', stock_minimum:5, categorie_id:'', code_barre:'', unite:'unite', description:'' };

export default function Stock() {
  const { user } = useAuthStore();
  const [produits, setProduits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [ajustModal, setAjustModal] = useState(null);
  const [ajustQte, setAjustQte] = useState('');
  const [ajustType, setAjustType] = useState('entree');
  const [ajustMotif, setAjustMotif] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('produits');
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const planActuel = user?.boutique?.plan || 'starter';
  const starterLimitReached = planActuel === 'starter' && produits.length >= 5;

  const load = () => Promise.all([
    produitsAPI.liste().then(r => setProduits(r.data.data)),
    categoriesAPI.liste().then(r => setCategories(r.data.data)),
    stockAPI.alertes().then(r => setAlertes(r.data.data)),
  ]);

  useEffect(() => { load(); }, []);

  const filtres = produits.filter(p =>
    p.nom.toLowerCase().includes(search.toLowerCase()) &&
    (!catFilter || p.categorie_id === catFilter)
  );

  const openEdit = (p) => {
    setForm({ nom:p.nom, prix_vente:p.prix_vente, prix_achat:p.prix_achat, stock_actuel:p.stock_actuel, stock_minimum:p.stock_minimum, categorie_id:p.categorie_id||'', code_barre:p.code_barre||'', unite:p.unite||'unite', description:p.description||'' });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nom || !form.prix_vente) return toast.error('Nom et prix requis.');
    setLoading(true);
    try {
      if (editingId) { await produitsAPI.modifier(editingId, form as any); toast.success('Produit mis a jour.'); }
      else { await produitsAPI.creer(form as any); toast.success('Produit cree.'); }
      setShowForm(false); setForm(EMPTY_FORM); setEditingId(null);
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur.';
      if (err.response?.data?.requireUpgrade) toast.error(msg, { duration: 5000 });
      else toast.error(msg);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await produitsAPI.supprimer(deleteTarget.id);
    toast.success('Supprime.');
    setDeleteTarget(null);
    load();
  };

  const handleAjustement = async () => {
    if (!ajustQte || Number(ajustQte) <= 0) return toast.error('Quantite invalide.');
    try {
      await stockAPI.ajustement({ produit_id: ajustModal.id, quantite: Number(ajustQte), type: ajustType, motif: ajustMotif });
      toast.success('Stock ajuste.');
      setAjustModal(null); setAjustQte(''); setAjustMotif('');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur.'); }
  };

  const envoyerAlerte = async () => {
    try { await stockAPI.envoyerAlerte(); toast.success('Rapport envoye par email !'); }
    catch { toast.error('Erreur envoi email.'); }
  };

  const creerCategorieEtAssigner = async () => {
    if (!newCatName.trim()) return toast.error('Nom de categorie requis');
    try {
      const res = await categoriesAPI.creer({ nom: newCatName });
      const newCat = res.data.data;
      setForm({ ...form, categorie_id: newCat.id });
      setShowNewCat(false);
      setNewCatName('');
      await categoriesAPI.liste().then(r => setCategories(r.data.data));
      toast.success('Categorie creee et selectionnee !');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur creation categorie');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }} className="btn btn-primary btn-md">
          <Plus size={16}/> Ajouter
        </button>
      </div>

      {starterLimitReached && (
        <div className="card p-4 border border-amber-200 bg-amber-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-bold text-amber-900">Limite du plan gratuit atteinte</p>
            <p className="text-sm text-amber-800 mt-1">Le plan Starter permet jusqu'a 5 produits. Passez au Pro pour ajouter des produits illimites.</p>
          </div>
          <Link to="/app/abonnement" className="btn btn-primary btn-md flex-shrink-0">
            Voir les plans
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {['produits','alertes'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={'px-4 py-2 rounded-xl text-sm font-medium transition-all ' +
              (tab === t ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200')}>
            {t === 'produits' ? 'Tous les produits' : 'Alertes'} {t === 'alertes' && alertes.length > 0 && <span className="ml-1 badge badge-red">{alertes.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'alertes' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500"/> {alertes.length} produit(s) en stock faible</h2>
            <button onClick={envoyerAlerte} className="btn btn-secondary btn-sm">Recevoir par email</button>
          </div>
          {alertes.length === 0 ? <p className="text-gray-400 text-sm">? Tous les stocks sont OK !</p> :
           <div className="space-y-2">
             {alertes.map(p => (
               <div key={p.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                 <div>
                   <p className="font-medium text-gray-900">{p.nom}</p>
                   <p className="text-xs text-gray-500">{p.categories?.nom}</p>
                 </div>
                 <div className="text-right">
                   <p className="font-bold text-red-600">{p.stock_actuel} {p.unite}</p>
                   <p className="text-xs text-gray-400">min: {p.stock_minimum}</p>
                 </div>
                 <button onClick={() => setAjustModal(p)} className="btn btn-secondary btn-sm ml-3">Reappro.</button>
               </div>
             ))}
           </div>
          }
        </div>
      )}

      {tab === 'produits' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input className="input pl-9" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input sm:w-48" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="">Toutes categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Produit</th>
                  <th className="px-4 py-3 text-right">Prix vente</th>
                  <th className="px-4 py-3 text-right">Marge</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtres.map(p => {
                  const marge = p.prix_achat > 0 ? Math.round(((p.prix_vente - p.prix_achat) / p.prix_achat) * 100) : null;
                  const alerte = p.stock_actuel <= p.stock_minimum;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.nom}</p>
                        <p className="text-xs text-gray-400">{p.categories?.nom || 'Sans categorie'}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{formatFCFA(p.prix_vente)}</td>
                      <td className="px-4 py-3 text-right">
                        {marge !== null ? <span className={'text-xs font-bold ' + (marge > 20 ? 'text-green-600' : marge > 0 ? 'text-amber-600' : 'text-red-600')}>{marge}%</span> : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={'font-bold ' + (alerte ? 'text-red-600' : 'text-gray-900')}>{p.stock_actuel}</span>
                        <span className="text-gray-400 text-xs ml-1">{p.unite}</span>
                        {alerte && <AlertTriangle size={12} className="inline ml-1 text-amber-500"/>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setAjustModal(p)} title="Ajuster stock" className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"><ArrowUp size={14}/></button>
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"><Edit2 size={14}/></button>
                          <button onClick={() => setDeleteTarget(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtres.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400">Aucun produit trouve</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Ajustement */}
      {ajustModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Ajuster le stock</h3>
              <button onClick={() => setAjustModal(null)}><X size={18}/></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">{ajustModal.nom} - Stock actuel: <strong>{ajustModal.stock_actuel} {ajustModal.unite}</strong></p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button onClick={() => setAjustType('entree')} className={'p-3 rounded-xl flex items-center gap-2 text-sm font-medium border-2 ' + (ajustType==='entree' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600')}>
                <ArrowUp size={16}/> Entree
              </button>
              <button onClick={() => setAjustType('sortie')} className={'p-3 rounded-xl flex items-center gap-2 text-sm font-medium border-2 ' + (ajustType==='sortie' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600')}>
                <ArrowDown size={16}/> Sortie
              </button>
            </div>
            <div className="space-y-3">
              <div><label className="label">Quantite</label><input type="number" min="1" className="input" placeholder="Ex: 50" value={ajustQte} onChange={e => setAjustQte(e.target.value)} /></div>
              <div><label className="label">Motif (optionnel)</label><input className="input" placeholder="Reapprovisionnement..." value={ajustMotif} onChange={e => setAjustMotif(e.target.value)} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setAjustModal(null)} className="btn btn-secondary btn-md flex-1">Annuler</button>
              <button onClick={handleAjustement} className="btn btn-primary btn-md flex-1">Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{editingId ? 'Modifier le produit' : 'Nouveau produit'}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); }}><X size={18}/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div><label className="label">Nom du produit *</label><input className="input" placeholder="Ex: Lait Gloria 400g" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Prix de vente (FCFA) *</label><input type="number" min="0" className="input" placeholder="0" value={form.prix_vente} onChange={e => setForm({...form, prix_vente: e.target.value})} required /></div>
                <div><label className="label">Prix d'achat (FCFA)</label><input type="number" min="0" className="input" placeholder="0" value={form.prix_achat} onChange={e => setForm({...form, prix_achat: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Stock actuel</label><input type="number" min="0" className="input" value={form.stock_actuel} onChange={e => setForm({...form, stock_actuel: e.target.value})} /></div>
                <div><label className="label">Stock minimum</label><input type="number" min="0" className="input" value={form.stock_minimum} onChange={e => setForm({...form, stock_minimum: Number(e.target.value)})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Categorie</label>
                  <select className="input" value={form.categorie_id} onChange={e => setForm({...form, categorie_id: e.target.value})}>
                    <option value="">Sans categorie</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
                <div><label className="label">Unite</label>
                  <select className="input" value={form.unite} onChange={e => setForm({...form, unite: e.target.value})}>
                    {['unite','kg','g','l','ml','carton','sac','paquet','boite'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <button type="button" onClick={() => setShowNewCat(true)} className="w-full px-3 py-2 rounded-lg text-sm text-primary-600 border border-primary-200 hover:bg-primary-50 transition-colors">
                <Plus size={14} className="inline mr-1"/> Creer une categorie
              </button>
              <div><label className="label">Code barre</label><input className="input" placeholder="Optionnel" value={form.code_barre} onChange={e => setForm({...form, code_barre: e.target.value})} /></div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="btn btn-secondary btn-md flex-1">Annuler</button>
                <button type="submit" disabled={loading} className="btn btn-primary btn-md flex-1">
                  {loading ? <Loader2 size={16} className="animate-spin"/> : editingId ? 'Modifier' : 'Creer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Creer Categorie */}
      {showNewCat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Nouvelle categorie</h3>
              <button onClick={() => setShowNewCat(false)}><X size={18}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Nom de la categorie *</label>
                <input 
                  type="text"
                  className="input" 
                  placeholder="Ex: Produits laitiers" 
                  value={newCatName} 
                  onChange={e => setNewCatName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowNewCat(false)} className="btn btn-secondary btn-md flex-1">Annuler</button>
                <button onClick={creerCategorieEtAssigner} className="btn btn-primary btn-md flex-1">Creer</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!deleteTarget}
        title="Supprimer le produit"
        message={deleteTarget ? `Supprimer "${deleteTarget.nom}" du stock ?` : ''}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
