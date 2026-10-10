import React, { useState, useEffect } from 'react';
import { boutiqueAPI, authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { conflits as conflitsStore, ventesOffline, actionsOffline, syncEngine } from '../services/offlineDb';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import toast from 'react-hot-toast';
import { Loader2, Plus, X, MapPin, Phone, Mail, Lock, Users, Store, Shield, Trash2, RefreshCw, Wifi, AlertCircle, CheckCircle2, Database } from 'lucide-react';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function Parametres() {
  const { user, refreshUser } = useAuthStore();
  const boutique = user?.boutique;
  const [tab, setTab] = useState('boutique');
  const [bForm, setBForm] = useState({
    nom: boutique?.nom||'',
    adresse: boutique?.adresse||'',
    telephone: boutique?.telephone||'',
    logo: boutique?.logo||'',
    ticket_primary_color: boutique?.ticket_primary_color || '#059669',
    ticket_secondary_color: boutique?.ticket_secondary_color || '#0f766e',
    ticket_text_color: boutique?.ticket_text_color || '#111827',
    ticket_footer: boutique?.ticket_footer || 'Merci pour votre achat !',
    ticket_message: boutique?.ticket_message || 'À bientôt 😊',
  });
  const [pForm, setPForm] = useState({ nom: user?.nom||'', prenom: user?.prenom||'' });
  const [pwdForm, setPwdForm] = useState({ ancien:'', nouveau:'', confirmer:'' });
  const [caissierForm, setCaissierForm] = useState({ nom:'', prenom:'', email:'', mot_de_passe:'' });
  const [caissiers, setCaissiers] = useState([]);
  const [loadingB, setLoadingB] = useState(false);
  const [loadingP, setLoadingP] = useState(false);
  const [loadingC, setLoadingC] = useState(false);
  const [showCaissier, setShowCaissier] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const maxCaissiers = boutique?.plan === 'pro' ? 2 : boutique?.plan === 'starter' ? 1 : 999;

  React.useEffect(() => {
    if (tab === 'equipe') boutiqueAPI.caissiers().then(r => setCaissiers(r.data.data));
  }, [tab, boutique]);

  const saveBoutique = async (e) => {
    e.preventDefault(); setLoadingB(true);
    try { await boutiqueAPI.update(bForm); toast.success('Boutique mise a jour.'); await refreshUser(); }
    catch { toast.error('Erreur.'); }
    setLoadingB(false);
  };

  const saveProfil = async (e) => {
    e.preventDefault(); setLoadingP(true);
    try { await authAPI.profil(pForm); toast.success('Profil mis a jour.'); await refreshUser(); }
    catch { toast.error('Erreur.'); }
    setLoadingP(false);
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (!pwdForm.nouveau.trim()) return toast.error('Nouveau mot de passe requis');
    if (pwdForm.nouveau.length < 6) return toast.error('Le mot de passe doit contenir au moins 6 caracteres');
    if (pwdForm.nouveau !== pwdForm.confirmer) return toast.error('Les mots de passe ne correspondent pas');
    try { await authAPI.mdp({ ancien: pwdForm.ancien, nouveau: pwdForm.nouveau }); toast.success('Mot de passe modifie avec succes !'); setPwdForm({ ancien:'', nouveau:'', confirmer:'' }); }
    catch (err) { toast.error(err.response?.data?.message || 'Erreur lors du changement de mot de passe.'); }
  };

  const ajouterCaissier = async (e) => {
    e.preventDefault();
    if (caissiers.length >= maxCaissiers) {
      toast.error(`Limite caissiers atteinte pour le plan ${boutique?.plan}.`);
      return;
    }
    setLoadingC(true);
    try {
      await boutiqueAPI.creerCaissier(caissierForm);
      toast.success('Caissier cree.');
      setShowCaissier(false); setCaissierForm({ nom:'', prenom:'', email:'', mot_de_passe:'' });
      boutiqueAPI.caissiers().then(r => setCaissiers(r.data.data));
    } catch (err) {
      const message = err.response?.data?.message || 'Erreur lors de la creation du caissier.';
      toast.error(message);
    }
    setLoadingC(false);
  };

  const toggleCaissier = async (id) => {
    await boutiqueAPI.toggleCaissier(id);
    boutiqueAPI.caissiers().then(r => setCaissiers(r.data.data));
  };

  const supprimerCaissier = async (id) => {
    try {
      await boutiqueAPI.supprimerCaissier(id);
      toast.success('Caissier supprime.');
      boutiqueAPI.caissiers().then(r => setCaissiers(r.data.data));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.');
    }
  };

  const supprimerCompte = async () => {
    try {
      await authAPI.supprimerCompte();
      localStorage.removeItem('gc_token');
      localStorage.removeItem('gc_user');
      toast.success('Compte supprime.');
      window.location.href = '/';
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  // ─── ÉTAT POUR LA SYNCHRONISATION ──────────────────────────────────────────
  const { enLigne, syncing, compteurs, derniereSync, syncMaintenant, refreshCounters } = useOnlineStatus();
  const [conflits, setConflits] = useState<any[]>([]);
  const [loadingConflits, setLoadingConflits] = useState(false);

  const chargerConflits = async () => {
    setLoadingConflits(true);
    try {
      const liste = await conflitsStore.getAll();
      setConflits(liste);
    } catch (e) {
      toast.error('Erreur chargement conflits');
    } finally {
      setLoadingConflits(false);
    }
  };

  useEffect(() => {
    if (tab === 'sync') {
      chargerConflits();
      refreshCounters();
    }
  }, [tab]);

  const resoudreConflit = async (id: string) => {
    try {
      await conflitsStore.resolve(id);
      toast.success('Conflit marqué comme résolu');
      await chargerConflits();
    } catch (e) {
      toast.error('Erreur');
    }
  };

  const resoudreTout = async () => {
    try {
      await conflitsStore.resolveAll();
      toast.success('Tous les conflits marqués comme résolus');
      await chargerConflits();
    } catch (e) {
      toast.error('Erreur');
    }
  };

  const tabs = [{ id:'boutique', label:'Ma boutique' }, { id:'profil', label:'Mon profil' }, { id:'equipe', label:'Mon equipe' }, { id:'sync', label:'Synchronisation' }];

  return (
    <div className="space-y-4 w-full max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">Parametres</h1>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={'px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ' + (tab===t.id ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'boutique' && (
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Store size={24} className="text-emerald-600"/>
              </div>
              <div>
                <h2 className="font-bold text-lg">{boutique?.nom || 'Ma boutique'}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="badge badge-blue">Plan {boutique?.plan || 'starter'}</span>
                  <span className="badge badge-gray">{maxCaissiers === 999 ? 'Caissiers illimites' : `${maxCaissiers} caissier${maxCaissiers>1 ? 's' : ''}`}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Informations generales de votre boutique</p>
              </div>
            </div>
            <form onSubmit={saveBoutique} className="space-y-4">
              <div><label className="label font-semibold">Nom de la boutique</label><input className="input" placeholder="Ma boutique" value={bForm.nom} onChange={e => setBForm({...bForm, nom:e.target.value})} /></div>
              <div><label className="label font-semibold flex items-center gap-2"><MapPin size={14}/> Adresse</label><input className="input" placeholder="Ex: Cotonou, Benin" value={bForm.adresse} onChange={e => setBForm({...bForm, adresse:e.target.value})} /></div>
              <div><label className="label font-semibold flex items-center gap-2"><Phone size={14}/> Telephone</label><input className="input" placeholder="+229 95 XX XX XX" value={bForm.telephone} onChange={e => setBForm({...bForm, telephone:e.target.value})} /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="label font-semibold">Logo (URL)</label><input className="input" placeholder="https://..." value={bForm.logo} onChange={e => setBForm({...bForm, logo:e.target.value})} /></div>
                <div><label className="label font-semibold">Couleur principale</label><input type="color" className="input h-11 p-1" value={bForm.ticket_primary_color} onChange={e => setBForm({...bForm, ticket_primary_color:e.target.value})} /></div>
                <div><label className="label font-semibold">Couleur secondaire</label><input type="color" className="input h-11 p-1" value={bForm.ticket_secondary_color} onChange={e => setBForm({...bForm, ticket_secondary_color:e.target.value})} /></div>
                <div><label className="label font-semibold">Couleur texte</label><input type="color" className="input h-11 p-1" value={bForm.ticket_text_color} onChange={e => setBForm({...bForm, ticket_text_color:e.target.value})} /></div>
              </div>
              <div><label className="label font-semibold">Pied de reçu</label><input className="input" value={bForm.ticket_footer} onChange={e => setBForm({...bForm, ticket_footer:e.target.value})} /></div>
              <div><label className="label font-semibold">Message de fin</label><input className="input" value={bForm.ticket_message} onChange={e => setBForm({...bForm, ticket_message:e.target.value})} /></div>
              <button type="submit" disabled={loadingB} className="btn btn-primary btn-md w-full mt-6">
                {loadingB ? <Loader2 size={16} className="animate-spin"/> : 'Enregistrer les modifications'}
              </button>
            </form>
          </div>

          <div className="card p-6 lg:col-span-2 border border-red-100 bg-red-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center">
                  <Trash2 size={22} className="text-red-600"/>
                </div>
                <div>
                  <h2 className="font-bold text-lg text-red-900">Zone sensible</h2>
                  <p className="text-sm text-red-700 mt-1">
                    Supprimez votre compte uniquement si vous n'avez plus besoin de vos donnees dans GestoCaisse.
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setConfirmAction({ type: 'compte' })} className="btn btn-danger btn-md w-full sm:w-auto">
                <Trash2 size={16}/> Supprimer mon compte
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'profil' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Infos personelles */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Shield size={24} className="text-blue-600"/>
              </div>
              <div>
                <h2 className="font-bold text-lg">Mon profil</h2>
                <p className="text-sm text-gray-500">Vos informations personnelles</p>
              </div>
            </div>
            <form onSubmit={saveProfil} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="label font-semibold">Prenom</label><input className="input" placeholder="Prenom" value={pForm.prenom} onChange={e => setPForm({...pForm, prenom:e.target.value})} /></div>
                <div><label className="label font-semibold">Nom</label><input className="input" placeholder="Nom" value={pForm.nom} onChange={e => setPForm({...pForm, nom:e.target.value})} /></div>
              </div>
              <div><label className="label font-semibold flex items-center gap-2"><Mail size={14}/> Email</label><input className="input bg-gray-50" value={user?.email} disabled /></div>
              <button type="submit" disabled={loadingP} className="btn btn-primary btn-md w-full mt-6">
                {loadingP ? <Loader2 size={16} className="animate-spin"/> : 'Enregistrer mes modifications'}
              </button>
            </form>
          </div>

          {/* Changer mot de passe */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <Lock size={24} className="text-red-600"/>
              </div>
              <div>
                <h2 className="font-bold text-lg">Securite</h2>
                <p className="text-sm text-gray-500">Changer votre mot de passe</p>
              </div>
            </div>
            <form onSubmit={savePassword} className="space-y-4">
              <div><label className="label font-semibold">Ancien mot de passe</label><input type="password" className="input" placeholder="" value={pwdForm.ancien} onChange={e => setPwdForm({...pwdForm, ancien:e.target.value})} required /></div>
              <div><label className="label font-semibold">Nouveau mot de passe</label><input type="password" className="input" placeholder="" value={pwdForm.nouveau} onChange={e => setPwdForm({...pwdForm, nouveau:e.target.value})} required /></div>
              <div><label className="label font-semibold">Confirmer le mot de passe</label><input type="password" className="input" placeholder="" value={pwdForm.confirmer} onChange={e => setPwdForm({...pwdForm, confirmer:e.target.value})} required /></div>
              <button type="submit" className="btn btn-primary btn-md w-full mt-6">Changer le mot de passe</button>
            </form>
          </div>
        </div>
      )}

      {tab === 'sync' && (
        <div className="space-y-4">
          {/* Statut connexion */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${enLigne ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                {enLigne ? <Wifi size={24} className="text-emerald-600"/> : <Wifi size={24} className="text-amber-600"/>}
              </div>
              <div>
                <h2 className="font-bold text-lg">Statut de synchronisation</h2>
                <p className="text-sm text-gray-500">{enLigne ? 'Connecté — données synchronisées avec le serveur' : 'Hors ligne — données en attente de synchronisation'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-2xl font-extrabold text-emerald-600">{compteurs.ventes}</p>
                <p className="text-xs text-gray-500 mt-1">Ventes en attente</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-2xl font-extrabold text-blue-600">{compteurs.actions}</p>
                <p className="text-xs text-gray-500 mt-1">Actions en attente</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-2xl font-extrabold text-red-600">{compteurs.conflicts}</p>
                <p className="text-xs text-gray-500 mt-1">Conflits</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-sm font-extrabold text-gray-600 dark:text-gray-300 truncate">
                  {derniereSync ? new Date(derniereSync).toLocaleString('fr-FR') : 'Jamais'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Dernière sync</p>
              </div>
            </div>
            <button
              onClick={() => syncMaintenant()}
              disabled={syncing || !enLigne}
              className="btn btn-primary btn-md w-full mt-4 flex items-center justify-center gap-2"
            >
              {syncing ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>}
              {syncing ? 'Synchronisation en cours...' : 'Synchroniser maintenant'}
            </button>
          </div>

          {/* Stock local */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Database size={24} className="text-blue-600"/>
              </div>
              <div>
                <h2 className="font-bold text-lg">Catalogue hors ligne</h2>
                <p className="text-sm text-gray-500">Données mises en cache pour fonctionner sans connexion</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Le catalogue (produits et clients) est automatiquement mis en cache dans le navigateur.
              En cas de perte de connexion, les ventes sont enregistrées localement et synchronisées au retour du réseau.
            </p>
          </div>

          {/* Conflits */}
          {conflits.length > 0 && (
            <div className="card border-red-200 dark:border-red-800">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                      <AlertCircle size={20} className="text-red-600"/>
                    </div>
                    <div>
                      <h2 className="font-bold">Conflits de synchronisation</h2>
                      <p className="text-sm text-red-600">{conflits.length} conflit{conflits.length > 1 ? 's' : ''} à résoudre</p>
                    </div>
                  </div>
                  <button onClick={resoudreTout} className="btn btn-sm btn-secondary">
                    Tout marquer résolu
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-80 overflow-y-auto">
                {loadingConflits ? (
                  <div className="p-6 flex justify-center"><Loader2 size={20} className="animate-spin text-gray-400"/></div>
                ) : (
                  conflits.map(c => (
                    <div key={c.id} className="p-4 flex items-start gap-3">
                      <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            c.type === 'stock' ? 'bg-amber-100 text-amber-800' :
                            c.type === 'introuvable' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {c.type}
                          </span>
                          <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString('fr-FR')}</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-200 mt-1 truncate">{c.message}</p>
                        {c.lignes_snapshot?.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {c.lignes_snapshot.length} article(s) — stock insuffisant ou produit introuvable sur le serveur
                          </p>
                        )}
                      </div>
                      <button onClick={() => resoudreConflit(c.id)} className="btn btn-sm btn-secondary flex-shrink-0">
                        <CheckCircle2 size={14}/> Résoudre
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {conflits.length === 0 && compteurs.conflicts === 0 && (
            <div className="card p-6 text-center">
              <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-400"/>
              <p className="font-bold text-lg text-gray-900 dark:text-white">Tout est synchronisé !</p>
              <p className="text-sm text-gray-500 mt-1">Aucun conflit en attente de résolution</p>
            </div>
          )}
        </div>
      )}

      {tab === 'equipe' && (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Users size={24} className="text-purple-600"/>
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Caissiers</h2>
                    <p className="text-sm text-gray-500">{caissiers.length} caissier{caissiers.length > 1 ? 's': ''} inscrit{caissiers.length > 1 ? 's': ''}</p>
                    <p className="text-xs text-gray-400">Plan actuel: <strong>{boutique?.plan}</strong>, limite: {maxCaissiers === 999 ? 'illimite' : maxCaissiers}</p>
                  </div>
                </div>
                <button onClick={() => setShowCaissier(true)} disabled={caissiers.length >= maxCaissiers} className="btn btn-primary btn-md w-full sm:w-auto">
                  <Plus size={16}/> Ajouter un caissier
                </button>
                {caissiers.length >= maxCaissiers && (
                  <p className="text-xs text-red-600 mt-1">Limite caissiers pour le plan {boutique?.plan} atteinte.</p>
                )}
              </div>
            </div>
            <div className="">
              {caissiers.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Users size={40} className="mx-auto mb-3 opacity-30"/>
                  <p className="text-sm font-medium">Aucun caissier pour le moment</p>
                  <p className="text-xs text-gray-400 mt-1">Passez au plan Pro pour en ajouter</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {caissiers.map(c => (
                    <div key={c.id} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{c.prenom} {c.nom}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Mail size={12}/> {c.email}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={'px-3 py-1.5 rounded-lg text-xs font-semibold ' + (c.actif ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600')}>
                          {c.actif ? '? Actif' : 'Inactif'}
                        </span>
                        <button onClick={() => toggleCaissier(c.id)} className={'btn btn-sm ' + (c.actif ? 'btn-secondary' : 'btn-primary')}>
                          {c.actif ? 'Desactiver' : 'Activer'}
                        </button>
                        <button onClick={() => setConfirmAction({ type: 'caissier', caissier: c })} className="btn btn-sm btn-danger">
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCaissier && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in">
          <div className="card p-4 sm:p-6 w-full max-w-md card-shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Plus size={20} className="text-purple-600"/>
                </div>
                <h3 className="font-bold text-lg">Nouveau caissier</h3>
              </div>
              <button onClick={() => setShowCaissier(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><X size={20}/></button>
            </div>
            <form onSubmit={ajouterCaissier} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="label font-semibold">Prenom</label><input className="input" placeholder="Prenom" value={caissierForm.prenom} onChange={e => setCaissierForm({...caissierForm, prenom:e.target.value})} required /></div>
                <div><label className="label font-semibold">Nom</label><input className="input" placeholder="Nom" value={caissierForm.nom} onChange={e => setCaissierForm({...caissierForm, nom:e.target.value})} required /></div>
              </div>
              <div><label className="label font-semibold flex items-center gap-2"><Mail size={14}/> Email</label><input type="email" className="input" placeholder="caissier@exemple.com" value={caissierForm.email} onChange={e => setCaissierForm({...caissierForm, email:e.target.value})} required /></div>
              <div><label className="label font-semibold flex items-center gap-2"><Lock size={14}/> Mot de passe</label><input type="password" className="input" placeholder="Mot de passe securise" value={caissierForm.mot_de_passe} onChange={e => setCaissierForm({...caissierForm, mot_de_passe:e.target.value})} required /></div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
                <button type="button" onClick={() => setShowCaissier(false)} className="btn btn-secondary btn-md flex-1">Annuler</button>
                <button type="submit" disabled={loadingC} className="btn btn-primary btn-md flex-1">
                  {loadingC ? <Loader2 size={16} className="animate-spin"/> : 'Creer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.type === 'compte' ? 'Supprimer le compte' : 'Supprimer le caissier'}
        message={confirmAction?.type === 'compte'
          ? (user?.role === 'proprietaire'
              ? 'Supprimer definitivement votre compte, votre boutique et les caissiers associes ?'
              : 'Supprimer definitivement votre compte ?')
          : confirmAction?.caissier
            ? `Supprimer ${confirmAction.caissier.prenom} ${confirmAction.caissier.nom} de votre equipe ?`
            : ''}
        confirmLabel="Supprimer"
        onConfirm={() => {
          const action = confirmAction;
          setConfirmAction(null);
          if (action?.type === 'compte') supprimerCompte();
          if (action?.type === 'caissier') supprimerCaissier(action.caissier.id);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
