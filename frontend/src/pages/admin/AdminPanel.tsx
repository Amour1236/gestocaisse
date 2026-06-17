import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { formatFCFA, formatDate } from '../../utils/format';
import ConfirmModal from '../../components/ui/ConfirmModal';

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [boutiques, setBoutiques] = useState([]);
  const [attente, setAttente] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('stats');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, usersRes, boutiquesRes, paiementsRes] = await Promise.all([
        adminAPI.stats(),
        adminAPI.users(),
        adminAPI.boutiques(),
        adminAPI.paiements(),
      ]);
      setStats(statsRes.data.data);
      setUsers(usersRes.data.data || []);
      setBoutiques(boutiquesRes.data.data || []);
      setAttente(paiementsRes.data.data || []);
    } catch (err) {
      const message = err.response?.data?.message || 'Impossible de charger les données admin.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const confirmerMomo = async (ref) => {
    if (!ref) {
      toast.error('Référence MoMo manquante.');
      return;
    }

    try {
      await adminAPI.confirmerMomo(ref);
      toast.success('Abonnement activé !');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    }
  };

  const toggleBoutique = async (id) => {
    try {
      await adminAPI.toggle(id);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    }
  };

  const supprimerBoutique = async (id) => {
    try {
      await adminAPI.supprimerBoutique(id);
      toast.success('Compte supprime.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    }
  };

  const supprimerUtilisateur = async (id) => {
    try {
      await adminAPI.supprimerUser(id);
      toast.success('Utilisateur supprimé.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Panel Admin</h1>

      {error && <div className="card p-4 text-sm text-red-700 bg-red-50 border border-red-200">{error}</div>}

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center"><p className="text-3xl font-extrabold text-primary-600">{stats.nb_boutiques}</p><p className="text-sm text-gray-500">Boutiques actives</p></div>
          <div className="card p-4 text-center"><p className="text-3xl font-extrabold text-blue-600">{stats.nb_users}</p><p className="text-sm text-gray-500">Utilisateurs</p></div>
          <div className="card p-4 text-center"><p className="text-2xl font-extrabold text-green-600">{formatFCFA(stats.mrr)}</p><p className="text-sm text-gray-500">MRR</p></div>
        </div>
      )}

      <div className="flex gap-2">
        {['stats','users','boutiques','momo'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={'px-4 py-2 rounded-xl text-sm font-medium transition-all ' + (tab===t ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50')}>
            {t === 'momo' ? 'Abonnements en attente' + (attente.length > 0 ? ' ('+attente.length+')' : '') : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Utilisateur</th>
                  <th className="px-4 py-3 text-center">Rôle</th>
                  <th className="px-4 py-3 text-center">Boutique</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{u.prenom} {u.nom}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-center"><span className="badge badge-blue capitalize">{u.role}</span></td>
                    <td className="px-4 py-3 text-center">{u.boutiques?.nom || '-'}</td>
                    <td className="px-4 py-3 text-center"><span className={'badge ' + (u.actif ? 'badge-green' : 'badge-gray')}>{u.actif ? 'Actif' : 'Inactif'}</span></td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setConfirmAction({ type: 'user', user: u })}
                        disabled={u.role === 'admin'}
                        className={'btn btn-danger btn-sm ' + (u.role === 'admin' ? 'opacity-50 cursor-not-allowed' : '')}
                      >
                        {u.role === 'admin' ? 'Protégé' : 'Supprimer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'momo' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h2 className="font-bold">Abonnements à confirmer</h2></div>
          {loading ? <p className="text-center py-8 text-gray-400 text-sm">Chargement des abonnements...</p> :
          attente.length === 0 ? <p className="text-center py-8 text-gray-400 text-sm">Aucun abonnement en attente</p> :
           <div className="divide-y divide-gray-50">
             {attente.map(a => (
               <div key={a.id} className="flex items-center justify-between px-4 py-3">
                 <div>
                   <p className="font-medium">{a.boutiques?.nom || 'Boutique inconnue'}</p>
                    <p className="text-xs text-gray-500">Réf: <span className="font-mono">{a.reference_momo || '-'}</span> - {a.plan} - {a.methode} - {a.montant_fcfa?.toLocaleString()} FCFA</p>
                   <p className="text-xs text-gray-400">{formatDate(a.created_at)}</p>
                 </div>
                 <button onClick={() => confirmerMomo(a.reference_momo)} disabled={!a.reference_momo} className="btn btn-primary btn-sm">Confirmer le paiement</button>
               </div>
             ))}
           </div>
          }
        </div>
      )}

      {tab === 'boutiques' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Boutique</th>
                  <th className="px-4 py-3 text-center">Plan</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {boutiques.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{b.nom}</p>
                      <p className="text-xs text-gray-400">{formatDate(b.created_at)}</p>
                    </td>
                    <td className="px-4 py-3 text-center"><span className="badge badge-blue capitalize">{b.plan}</span></td>
                    <td className="px-4 py-3 text-center"><span className={'badge ' + (b.actif ? 'badge-green' : 'badge-gray')}>{b.actif ? 'Actif' : 'Suspendu'}</span></td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleBoutique(b.id)} className="btn btn-secondary btn-sm">{b.actif ? 'Suspendre' : 'Réactiver'}</button>
                      <button onClick={() => setConfirmAction({ type: 'boutique', boutique: b })} className="btn btn-danger btn-sm ml-2">Supprimer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.type === 'user' ? 'Supprimer l’utilisateur' : 'Supprimer la boutique'}
        message={confirmAction?.type === 'user'
          ? `Supprimer définitivement l’utilisateur "${confirmAction.user?.prenom} ${confirmAction.user?.nom}" ?`
          : `Supprimer définitivement le compte "${confirmAction?.boutique?.nom}" et ses utilisateurs ?`}
        confirmLabel="Supprimer"
        onConfirm={() => {
          const action = confirmAction;
          setConfirmAction(null);
          if (action?.type === 'user') return supprimerUtilisateur(action.user.id);
          if (action?.type === 'boutique') return supprimerBoutique(action.boutique.id);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
