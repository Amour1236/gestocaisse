import React, { useEffect, useState } from 'react';
import { auditAPI, caisseAPI, documentsAPI, notificationsAPI } from '../services/api';
import { formatFCFA, formatDateTime } from '../utils/format';
import toast from 'react-hot-toast';
import { Bell, FileText, History, Lock, Plus, RefreshCw, Wallet } from 'lucide-react';

export default function Operations() {
  const [tab, setTab] = useState('caisse');
  const [session, setSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [logs, setLogs] = useState([]);
  const [fondInitial, setFondInitial] = useState('');
  const [fondFinal, setFondFinal] = useState('');
  const [mouvement, setMouvement] = useState({ type: 'entree', montant: '', motif: '' });

  const loadCaisse = async () => {
    const [active, all] = await Promise.all([caisseAPI.sessionActive(), caisseAPI.sessions().catch(() => ({ data: { data: [] } }))]);
    setSession(active.data.data as any);
    setSessions((all.data.data as any[]) || []);
  };

  useEffect(() => { loadCaisse(); }, []);
  useEffect(() => {
    if (tab === 'documents') documentsAPI.liste().then(r => setDocuments((r.data.data as any[]) || []));
    if (tab === 'notifications') notificationsAPI.liste().then(r => setNotifications((r.data.data as any[]) || []));
    if (tab === 'audit') auditAPI.liste().then(r => setLogs((r.data.data as any[]) || []));
  }, [tab]);

  const ouvrir = async () => {
    try {
      await caisseAPI.ouvrir({ fond_initial: Number(fondInitial || 0) });
      setFondInitial('');
      toast.success('Caisse ouverte.');
      loadCaisse();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur ouverture.'); }
  };

  const ajouterMouvement = async () => {
    if (!session) return;
    try {
      await caisseAPI.mouvement({ ...mouvement, session_id: session.id, montant: Number(mouvement.montant || 0) });
      setMouvement({ type: 'entree', montant: '', motif: '' });
      toast.success('Mouvement enregistré.');
      loadCaisse();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur mouvement.'); }
  };

  const fermer = async () => {
    if (!session) return;
    try {
      await caisseAPI.fermer(session.id, { fond_final: Number(fondFinal || 0) });
      setFondFinal('');
      toast.success('Caisse fermée.');
      loadCaisse();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur fermeture.'); }
  };

  const genererAlertes = async () => {
    try {
      const res = await notificationsAPI.generer();
      toast.success(res.data.message);
      const list = await notificationsAPI.liste();
      setNotifications((list.data.data as any[]) || []);
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur notifications.'); }
  };

  const tabs = [
    { id: 'caisse', label: 'Journal de caisse', icon: Wallet },
    { id: 'documents', label: 'PDF / documents', icon: FileText },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'audit', label: 'Audit', icon: History },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Opérations</h1>
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={'px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ' + (tab === t.id ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200')}>
            <t.icon size={15}/> {t.label}
          </button>
        ))}
      </div>

      {tab === 'caisse' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-5 space-y-3">
            <h2 className="font-bold flex items-center gap-2"><Wallet size={18}/> Session actuelle</h2>
            {session ? (
              <>
                <p className="text-sm text-gray-500">Ouverte le {formatDateTime(session.opened_at)}</p>
                <p className="text-sm">Fond initial: <strong>{formatFCFA(session.fond_initial)}</strong></p>
                <div className="grid grid-cols-2 gap-2">
                  <select className="input" value={mouvement.type} onChange={e => setMouvement({...mouvement, type:e.target.value})}>
                    <option value="entree">Entrée</option>
                    <option value="sortie">Sortie</option>
                  </select>
                  <input className="input" type="number" placeholder="Montant" value={mouvement.montant} onChange={e => setMouvement({...mouvement, montant:e.target.value})}/>
                </div>
                <input className="input" placeholder="Motif" value={mouvement.motif} onChange={e => setMouvement({...mouvement, motif:e.target.value})}/>
                <button onClick={ajouterMouvement} className="btn btn-secondary btn-md w-full"><Plus size={16}/> Ajouter mouvement</button>
                <input className="input" type="number" placeholder="Fond final compté" value={fondFinal} onChange={e => setFondFinal(e.target.value)}/>
                <button onClick={fermer} className="btn btn-primary btn-md w-full"><Lock size={16}/> Fermer la caisse</button>
              </>
            ) : (
              <>
                <input className="input" type="number" placeholder="Fond initial" value={fondInitial} onChange={e => setFondInitial(e.target.value)}/>
                <button onClick={ouvrir} className="btn btn-primary btn-md w-full">Ouvrir la caisse</button>
              </>
            )}
          </div>
          <div className="card overflow-hidden lg:col-span-2">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th className="px-4 py-3 text-left">Caissier</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3 text-right">Ventes</th><th className="px-4 py-3 text-right">Écart</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map(s => <tr key={s.id}><td className="px-4 py-3">{s.users?.prenom} {s.users?.nom}<p className="text-xs text-gray-400">{formatDateTime(s.opened_at)}</p></td><td className="px-4 py-3 text-center"><span className="badge badge-gray">{s.statut}</span></td><td className="px-4 py-3 text-right">{formatFCFA(s.total_ventes)}</td><td className="px-4 py-3 text-right font-bold">{formatFCFA(s.ecart)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm"><thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th className="px-4 py-3 text-left">Document</th><th className="px-4 py-3">Type</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3"></th></tr></thead><tbody className="divide-y divide-gray-50">
            {documents.map(d => <tr key={d.id}><td className="px-4 py-3 font-mono">{d.numero}<p className="text-xs text-gray-400">{formatDateTime(d.created_at)}</p></td><td className="px-4 py-3 text-center">{d.type}</td><td className="px-4 py-3 text-right">{formatFCFA(d.total)}</td><td className="px-4 py-3 text-right"><a className="btn btn-secondary btn-sm" href={documentsAPI.htmlUrl(d.id)} target="_blank" rel="noreferrer">Ouvrir PDF</a></td></tr>)}
            {documents.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-gray-400">Aucun document généré</td></tr>}
          </tbody></table>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="space-y-3">
          <button onClick={genererAlertes} className="btn btn-primary btn-md"><RefreshCw size={16}/> Générer les alertes</button>
          <div className="card divide-y divide-gray-50">{notifications.map(n => <div key={n.id} className="p-4 flex justify-between gap-3"><div><p className="font-semibold">{n.titre}</p><p className="text-sm text-gray-500">{n.message}</p></div><span className="badge badge-gray">{n.statut}</span></div>)}</div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm"><thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th className="px-4 py-3 text-left">Action</th><th className="px-4 py-3">Objet</th><th className="px-4 py-3 text-left">Utilisateur</th><th className="px-4 py-3 text-right">Date</th></tr></thead><tbody className="divide-y divide-gray-50">
            {logs.map(l => <tr key={l.id}><td className="px-4 py-3 font-semibold">{l.action}</td><td className="px-4 py-3 text-center">{l.entity}</td><td className="px-4 py-3">{l.users?.prenom} {l.users?.nom}</td><td className="px-4 py-3 text-right text-gray-500">{formatDateTime(l.created_at)}</td></tr>)}
          </tbody></table>
        </div>
      )}
    </div>
  );
}
