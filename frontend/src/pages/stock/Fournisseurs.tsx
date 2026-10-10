import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fournisseursAPI } from '../../services/api';
import { formatDate } from '../../utils/format';
import {
  Plus, Search, Edit2, Trash2, X, Loader2, Phone, Mail,
  MapPin, Clock, Package, ClipboardList, FileText, BarChart3,
  ArrowLeft, Check, ChevronRight, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Fournisseur {
  id: string;
  nom: string;
  telephone: string;
  email: string;
  adresse: string;
  delai_livraison: number;
  notes: string;
  actif: boolean;
  created_at: string;
  commandes?: { id: string; reference: string; date_commande: string; statut: string; montant_total: number }[];
}

const EMPTY_FORM = {
  nom: '', telephone: '', email: '', adresse: '',
  delai_livraison: 7, notes: ''
};

export default function Fournisseurs() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'liste' | 'detail'>('liste');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [detailFournisseur, setDetailFournisseur] = useState<Fournisseur | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Fournisseur | null>(null);

  const chargerFournisseurs = async () => {
    setLoading(true);
    try {
      const res = await fournisseursAPI.liste();
      setFournisseurs(res.data.data || []);
    } catch {
      toast.error('Erreur chargement fournisseurs');
    }
    setLoading(false);
  };

  useEffect(() => { chargerFournisseurs(); }, []);

  const voirDetail = async (id: string) => {
    setLoading(true);
    try {
      const res = await fournisseursAPI.detail(id);
      setDetailFournisseur(res.data.data);
      setTab('detail');
    } catch {
      toast.error('Erreur chargement détail');
    }
    setLoading(false);
  };

  const ouvrirFormulaire = (four?: Fournisseur) => {
    if (four) {
      setForm({
        nom: four.nom, telephone: four.telephone, email: four.email,
        adresse: four.adresse, delai_livraison: four.delai_livraison, notes: four.notes
      });
      setEditingId(four.id);
    } else {
      setForm(EMPTY_FORM);
      setEditingId(null);
    }
    setShowForm(true);
  };

  const sauvegarder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim()) return toast.error('Nom du fournisseur requis.');

    try {
      if (editingId) {
        await fournisseursAPI.modifier(editingId, form as any);
        toast.success('Fournisseur mis à jour.');
      } else {
        await fournisseursAPI.creer(form as any);
        toast.success('Fournisseur créé.');
      }
      setShowForm(false);
      chargerFournisseurs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur.');
    }
  };

  const supprimer = async () => {
    if (!deleteTarget) return;
    try {
      await fournisseursAPI.supprimer(deleteTarget.id);
      toast.success('Fournisseur supprimé.');
      setDeleteTarget(null);
      chargerFournisseurs();
    } catch {
      toast.error('Erreur suppression.');
    }
  };

  const filtres = fournisseurs.filter(f =>
    f.nom.toLowerCase().includes(search.toLowerCase()) ||
    f.telephone.includes(search) ||
    f.email.toLowerCase().includes(search.toLowerCase())
  );

  // ── Vue détail ──────────────────────────────────────────────────────────────
  if (tab === 'detail' && detailFournisseur) {
    const f = detailFournisseur;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setTab('liste')} className="btn btn-secondary">
            <ArrowLeft size={16}/> Retour
          </button>
          <h1 className="text-xl font-bold">{f.nom}</h1>
          <div className="flex gap-2">
            <button onClick={() => { ouvrirFormulaire(f); setTab('liste'); setShowForm(true); }} className="btn btn-secondary">
              <Edit2 size={16}/> Modifier
            </button>
            <Link to={`/app/stock/commandes?fournisseur=${f.id}`} className="btn btn-primary">
              <Plus size={16}/> Commander
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {f.telephone && (
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Phone size={18} className="text-blue-600"/>
              </div>
              <div>
                <p className="text-xs text-gray-500">Téléphone</p>
                <p className="font-semibold">{f.telephone}</p>
              </div>
            </div>
          )}
          {f.email && (
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Mail size={18} className="text-purple-600"/>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-semibold text-sm">{f.email}</p>
              </div>
            </div>
          )}
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock size={18} className="text-amber-600"/>
            </div>
            <div>
              <p className="text-xs text-gray-500">Délai livraison</p>
              <p className="font-semibold">{f.delai_livraison} jours</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Package size={18} className="text-green-600"/>
            </div>
            <div>
              <p className="text-xs text-gray-500">Commandes</p>
              <p className="font-semibold">{f.commandes?.length || 0}</p>
            </div>
          </div>
        </div>

        {f.adresse && (
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Adresse</p>
            <p className="font-medium flex items-center gap-2"><MapPin size={14}/> {f.adresse}</p>
          </div>
        )}

        {f.notes && (
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Notes</p>
            <p className="text-gray-700">{f.notes}</p>
          </div>
        )}

        {/* Dernières commandes */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold">Dernières commandes</h2>
          </div>
          {f.commandes && f.commandes.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Référence</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {f.commandes.map(c => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-mono text-sm">{c.reference}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(c.date_commande)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{c.montant_total.toLocaleString('fr-FR')} FCFA</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge ${
                        c.statut === 'recue' ? 'badge-green' :
                        c.statut === 'en_attente' ? 'badge-amber' :
                        c.statut === 'annulee' ? 'badge-gray' :
                        'badge-blue'
                      }`}>{c.statut}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-400">Aucune commande</div>
          )}
        </div>

        {/* Modal formulaire */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="card p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-lg">Modifier le fournisseur</h3>
                <button onClick={() => setShowForm(false)}><X size={18}/></button>
              </div>
              <form onSubmit={sauvegarder} className="space-y-4">
                <div><label className="label">Nom *</label>
                  <input className="input" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} required/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Téléphone</label>
                    <input className="input" value={form.telephone} onChange={e => setForm({...form, telephone: e.target.value})}/>
                  </div>
                  <div><label className="label">Email</label>
                    <input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}/>
                  </div>
                </div>
                <div><label className="label">Adresse</label>
                  <input className="input" value={form.adresse} onChange={e => setForm({...form, adresse: e.target.value})}/>
                </div>
                <div><label className="label">Délai de livraison (jours)</label>
                  <input type="number" min="1" className="input" value={form.delai_livraison}
                    onChange={e => setForm({...form, delai_livraison: Number(e.target.value)})}/>
                </div>
                <div><label className="label">Notes</label>
                  <textarea className="input" rows={2} value={form.notes}
                    onChange={e => setForm({...form, notes: e.target.value})}/>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">Annuler</button>
                  <button type="submit" className="btn btn-primary flex-1"><Check size={16}/> Sauvegarder</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Vue liste principale ───────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex flex-wrap gap-2">
        <Link to="/app/stock" className="btn btn-secondary btn-sm"><Package size={14}/> Produits</Link>
        <Link to="/app/stock/inventaire" className="btn btn-secondary btn-sm"><ClipboardList size={14}/> Inventaire</Link>
        <Link to="/app/stock/bons" className="btn btn-secondary btn-sm"><FileText size={14}/> Bons</Link>
        <Link to="/app/stock/fournisseurs" className="btn btn-primary btn-sm"><Phone size={14}/> Fournisseurs</Link>
        <Link to="/app/stock/commandes" className="btn btn-secondary btn-sm"><Package size={14}/> Commandes</Link>
        <Link to="/app/stock/rapports" className="btn btn-secondary btn-sm"><BarChart3 size={14}/> Rapports</Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          Fournisseurs
        </h1>
        <button onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); }}
          className="btn btn-primary">
          <Plus size={16}/> Nouveau fournisseur
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-emerald-600"/></div>
      ) : (
        <>
          {/* Recherche */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input className="input pl-9" placeholder="Rechercher un fournisseur..."
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{fournisseurs.length}</p>
              <p className="text-xs text-gray-500">Fournisseurs</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{fournisseurs.filter(f => f.actif).length}</p>
              <p className="text-xs text-gray-500">Actifs</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">
                {fournisseurs.reduce((s, f) => s + (f.delai_livraison || 0), 0) / Math.max(fournisseurs.length, 1)}j
              </p>
              <p className="text-xs text-gray-500">Délai moyen</p>
            </div>
          </div>

          {/* Liste */}
          {filtres.length === 0 ? (
            <div className="card p-10 text-center">
              <Phone size={40} className="mx-auto text-gray-300 mb-3"/>
              <p className="text-gray-500 font-medium">Aucun fournisseur trouvé</p>
              <p className="text-gray-400 text-sm mt-1">Ajoutez vos fournisseurs pour gérer vos approvisionnements.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtres.map(f => (
                <div key={f.id} className="card p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-lg font-bold text-emerald-700">
                        {f.nom.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{f.nom}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          {f.telephone && <span className="flex items-center gap-1"><Phone size={10}/> {f.telephone}</span>}
                          {f.email && <span className="flex items-center gap-1"><Mail size={10}/> {f.email}</span>}
                          <span className="flex items-center gap-1"><Clock size={10}/> {f.delai_livraison}j</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${f.actif ? 'badge-green' : 'badge-gray'}`}>
                        {f.actif ? 'Actif' : 'Inactif'}
                      </span>
                      <button onClick={() => voirDetail(f.id)} className="btn btn-secondary btn-sm">
                        <Eye size={14}/> Détail
                      </button>
                      <button onClick={() => ouvrirFormulaire(f)} className="btn btn-ghost btn-sm p-1.5">
                        <Edit2 size={14}/>
                      </button>
                      <button onClick={() => setDeleteTarget(f)} className="btn btn-ghost btn-sm p-1.5 text-red-500">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{editingId ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</h3>
              <button onClick={() => setShowForm(false)}><X size={18}/></button>
            </div>
            <form onSubmit={sauvegarder} className="space-y-4">
              <div><label className="label">Nom du fournisseur *</label>
                <input className="input" placeholder="Ex: SOCIMEX SA" value={form.nom}
                  onChange={e => setForm({...form, nom: e.target.value})} required/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Téléphone</label>
                  <input className="input" placeholder="+225 07..." value={form.telephone}
                    onChange={e => setForm({...form, telephone: e.target.value})}/>
                </div>
                <div><label className="label">Email</label>
                  <input className="input" type="email" placeholder="contact@fournisseur.com" value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}/>
                </div>
              </div>
              <div><label className="label">Adresse</label>
                <input className="input" placeholder="Adresse physique ou ville" value={form.adresse}
                  onChange={e => setForm({...form, adresse: e.target.value})}/>
              </div>
              <div><label className="label">Délai de livraison habituel (jours)</label>
                <input type="number" min="1" max="90" className="input" value={form.delai_livraison}
                  onChange={e => setForm({...form, delai_livraison: Number(e.target.value)})}/>
                <p className="text-xs text-gray-400 mt-1">Utilisé pour calculer la date de commande recommandée.</p>
              </div>
              <div><label className="label">Notes</label>
                <textarea className="input" rows={2} placeholder="Informations complémentaires..."
                  value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}/>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">Annuler</button>
                <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                  {loading ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}
                  {editingId ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal suppression */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 w-full max-w-sm">
            <h3 className="font-bold text-lg mb-2">Supprimer le fournisseur ?</h3>
            <p className="text-gray-600 text-sm mb-4">
              Voulez-vous supprimer <strong>{deleteTarget.nom}</strong> ?
              {(deleteTarget as any).commandes?.length > 0 &&
                ' Ce fournisseur a des commandes associées — il sera désactivé.'}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary flex-1">Annuler</button>
              <button onClick={supprimer} className="btn btn-error flex-1">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
