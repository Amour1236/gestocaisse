import React, { useState, useEffect } from 'react';
import { clientsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, X, ChevronRight, Phone, Mail, Loader2, CreditCard } from 'lucide-react';
import { formatFCFA, formatDate } from '../../utils/format';

const EMPTY = { nom:'', telephone:'', email:'', adresse:'', notes:'' };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [ventes, setVentes] = useState([]);
  const [credits, setCredits] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rembModal, setRembModal] = useState(null);
  const [rembMontant, setRembMontant] = useState('');

  const load = () => clientsAPI.liste().then(r => setClients(r.data.data));
  useEffect(() => { load(); }, []);

  const loadClient = async (c) => {
    setSelected(c);
    const [v, cr] = await Promise.all([clientsAPI.ventes(c.id), clientsAPI.credits(c.id)]);
    setVentes(v.data.data);
    setCredits((cr.data.data as any) || []);
  };

  const filtres = clients.filter(c =>
    c.nom.toLowerCase().includes(search.toLowerCase()) ||
    c.telephone?.includes(search)
  );

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) { await clientsAPI.modifier(editingId, form); toast.success('Client mis à jour.'); }
      else { await clientsAPI.creer(form); toast.success('Client créé.'); }
      setShowForm(false); setForm(EMPTY); setEditingId(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur.'); }
    setLoading(false);
  };

  const handleRembourser = async () => {
    if (!rembMontant || Number(rembMontant) <= 0) return toast.error('Montant invalide.');
    try {
      await clientsAPI.rembourser(rembModal.id, { montant: Number(rembMontant) });
      toast.success('Remboursement enregistré.');
      setRembModal(null); setRembMontant('');
      loadClient(selected);
    } catch { toast.error('Erreur.'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY); }} className="btn btn-primary btn-md">
          <Plus size={16}/> Ajouter
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Liste */}
        <div className="lg:col-span-1 card overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input className="input pl-9" placeholder="Nom ou téléphone..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="divide-y divide-gray-50 max-h-[calc(100vh-16rem)] overflow-y-auto">
            {filtres.map(c => (
              <button key={c.id} onClick={() => loadClient(c)} className={'w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center justify-between ' + (selected?.id === c.id ? 'bg-primary-50' : '')}>
                <div>
                  <p className="font-semibold text-gray-900">{c.nom}</p>
                  {c.telephone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10}/>{c.telephone}</p>}
                  {c.credit_encours > 0 && <p className="text-xs text-red-600 font-medium">Crédit: {formatFCFA(c.credit_encours)}</p>}
                </div>
                <ChevronRight size={16} className="text-gray-300"/>
              </button>
            ))}
            {filtres.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">Aucun client</p>}
          </div>
        </div>

        {/* Détail */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="card p-10 text-center text-gray-400">
              <p>Sélectionnez un client pour voir son historique</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selected.nom}</h2>
                    {selected.telephone && <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><Phone size={14}/>{selected.telephone}</p>}
                    {selected.email && <p className="text-sm text-gray-500 flex items-center gap-1"><Mail size={14}/>{selected.email}</p>}
                  </div>
                  <button onClick={() => { setForm({nom:selected.nom,telephone:selected.telephone||'',email:selected.email||'',adresse:selected.adresse||'',notes:selected.notes||''}); setEditingId(selected.id); setShowForm(true); }} className="btn btn-secondary btn-sm">Modifier</button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-primary-600">{selected.nb_achats || 0}</p>
                    <p className="text-xs text-gray-500">Achats</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-green-600">{formatFCFA(selected.total_achats)}</p>
                    <p className="text-xs text-gray-500">Total dépensé</p>
                  </div>
                  <div className={'rounded-xl p-3 text-center ' + (selected.credit_encours > 0 ? 'bg-red-50' : 'bg-gray-50')}>
                    <p className={'text-xl font-bold ' + (selected.credit_encours > 0 ? 'text-red-600' : 'text-gray-400')}>{formatFCFA(selected.credit_encours)}</p>
                    <p className="text-xs text-gray-500">Crédit encours</p>
                  </div>
                </div>
              </div>

              {/* Crédits */}
              {credits.filter(c => c.statut !== 'rembourse').length > 0 && (
                <div className="card p-5">
                  <h3 className="font-bold mb-3 flex items-center gap-2"><CreditCard size={16} className="text-red-500"/>Crédits en cours</h3>
                  <div className="space-y-2">
                    {credits.filter(c => c.statut !== 'rembourse').map(cr => (
                      <div key={cr.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-gray-900">N° {cr.ventes?.numero} — {formatDate(cr.created_at)}</p>
                          <p className="text-xs text-gray-500">Remboursé: {formatFCFA(cr.montant_rembourse)} / {formatFCFA(cr.montant)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-red-600">{formatFCFA(cr.montant - cr.montant_rembourse)}</span>
                          <button onClick={() => setRembModal(cr)} className="btn btn-secondary btn-sm">Rembourser</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Historique ventes */}
              <div className="card p-5">
                <h3 className="font-bold mb-3">Historique des achats</h3>
                {ventes.length === 0 ? <p className="text-gray-400 text-sm">Aucun achat enregistré</p> :
                 <div className="space-y-2">
                   {ventes.slice(0,10).map(v => (
                     <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                       <div>
                         <p className="text-sm font-medium">N° {v.numero}</p>
                         <p className="text-xs text-gray-400">{formatDate(v.created_at)} — {v.lignes_vente?.length} article(s)</p>
                       </div>
                       <div className="text-right">
                         <p className="font-bold text-primary-600">{formatFCFA(v.total_final)}</p>
                         <p className="text-xs text-gray-400">{v.mode_paiement}</p>
                       </div>
                     </div>
                   ))}
                 </div>
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal remboursement */}
      {rembModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 w-full max-w-sm">
            <h3 className="font-bold mb-4">Remboursement</h3>
            <p className="text-sm text-gray-600 mb-4">Restant dû: <strong className="text-red-600">{formatFCFA(rembModal.montant - rembModal.montant_rembourse)}</strong></p>
            <div className="mb-4"><label className="label">Montant remboursé (FCFA)</label><input type="number" className="input" value={rembMontant} onChange={e => setRembMontant(e.target.value)} /></div>
            <div className="flex gap-2">
              <button onClick={() => setRembModal(null)} className="btn btn-secondary btn-md flex-1">Annuler</button>
              <button onClick={handleRembourser} className="btn btn-primary btn-md flex-1">Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{editingId ? 'Modifier le client' : 'Nouveau client'}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); }}><X size={18}/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div><label className="label">Nom *</label><input className="input" value={form.nom} onChange={e => setForm({...form, nom:e.target.value})} required /></div>
              <div><label className="label">Téléphone</label><input className="input" placeholder="229XXXXXXXX" value={form.telephone} onChange={e => setForm({...form, telephone:e.target.value})} /></div>
              <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm({...form, email:e.target.value})} /></div>
              <div><label className="label">Adresse</label><input className="input" value={form.adresse} onChange={e => setForm({...form, adresse:e.target.value})} /></div>
              <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} /></div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="btn btn-secondary btn-md flex-1">Annuler</button>
                <button type="submit" disabled={loading} className="btn btn-primary btn-md flex-1">
                  {loading ? <Loader2 size={16} className="animate-spin"/> : editingId ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
