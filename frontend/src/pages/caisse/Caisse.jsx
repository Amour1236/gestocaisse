import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { produitsAPI, ventesAPI, clientsAPI } from '../../services/api';
import { offlineStore } from '../../services/offlineDb';
import { formatFCFA, formatDateTime } from '../../utils/format';
import toast from 'react-hot-toast';
import {
  Search, ShoppingCart, Trash2, Plus, Minus, X, Printer,
  CheckCircle2, User, CreditCard, Smartphone, Banknote,
  Receipt, Loader2, Package, Tag, ChevronDown, ArrowLeft
} from 'lucide-react';

const MODES = [
  { id: 'especes', label: 'Espèces',    icon: Banknote,    color: 'bg-emerald-500' },
  { id: 'momo',    label: 'MTN MoMo',   icon: Smartphone,  color: 'bg-amber-500' },
  { id: 'carte',   label: 'Carte',      icon: CreditCard,  color: 'bg-blue-500' },
  { id: 'credit',  label: 'Crédit',     icon: User,        color: 'bg-red-500' },
];

export default function Caisse() {
  const { user } = useAuthStore();
  const boutique = user?.boutique;
  const receiptTheme = {
    primary: boutique?.ticket_primary_color || '#059669',
    secondary: boutique?.ticket_secondary_color || '#0f766e',
    text: boutique?.ticket_text_color || '#111827',
    footer: boutique?.ticket_footer || 'Merci pour votre achat !',
    message: boutique?.ticket_message || 'À bientôt 😊',
  };

  const [produits, setProduits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [panier, setPanier] = useState([]);
  const [mode, setMode] = useState('especes');
  const [remise, setRemise] = useState(0);
  const [clientId, setClientId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProd, setLoadingProd] = useState(true);
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(0);
  const [vente, setVente] = useState(null); // ticket affiché après vente
  const [monnaieRendue, setMonnaieRendue] = useState(0);
  const [montantRecu, setMontantRecu] = useState('');
  const ticketRef = useRef(null);
  const panierRef = useRef([]);

  useEffect(() => {
    panierRef.current = panier;
  }, [panier]);

  useEffect(() => {
    charger();
    refreshPendingCount();

    const handleOnline = async () => {
      setOffline(false);
      await synchroniserVentes();
      charger();
    };
    const handleOffline = () => setOffline(true);
    const handleFocus = () => {
      if (navigator.onLine) charger({ silent: true });
    };
    const stockInterval = setInterval(() => {
      if (navigator.onLine && !document.hidden) charger({ silent: true });
    }, 5000);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      clearInterval(stockInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const refreshPendingCount = async () => {
    try {
      setPendingCount(await offlineStore.getPendingCount());
    } catch {}
  };

  const ajusterPanierAvecStock = (panierCourant, produitsData) => {
    const stockParProduit = new Map(produitsData.map(p => [p.id, p]));
    let ajustements = 0;

    const panierAjuste = (panierCourant || [])
      .map(item => {
        const produitActuel = stockParProduit.get(item.id);
        if (!produitActuel || !produitActuel.actif || Number(produitActuel.stock_actuel || 0) <= 0) {
          ajustements += 1;
          return null;
        }

        const stockActuel = Number(produitActuel.stock_actuel || 0);
        const qte = Math.min(item.qte, stockActuel);
        if (qte !== item.qte) ajustements += 1;

        return { ...item, ...produitActuel, qte };
      })
      .filter(Boolean);

    return { panierAjuste, ajustements };
  };

  const charger = async ({ silent = false } = {}) => {
    if (!silent) setLoadingProd(true);
    try {
      const [rp, rc] = await Promise.all([produitsAPI.liste(), clientsAPI.liste().catch(() => ({ data: { data: [] } }))]);
      const produitsData = rp.data.data || [];
      const clientsData = rc.data.data || [];
      const { panierAjuste, ajustements } = ajusterPanierAvecStock(panierRef.current, produitsData);

      setProduits(produitsData);
      if (ajustements > 0) {
        setPanier(panierAjuste);
      }

      const cats = [...new Set(produitsData.map(p => p.categories).filter(Boolean).map(c => JSON.stringify(c)))].map(s => JSON.parse(s));
      setCategories(cats);
      setClients(clientsData);
      await offlineStore.cacheCatalogue({ produits: produitsData, clients: clientsData });
      setOffline(false);
    } catch (e) {
      const cached = await offlineStore.getCatalogue();
      setProduits(cached.produits || []);
      const cats = [...new Set((cached.produits || []).map(p => p.categories).filter(Boolean).map(c => JSON.stringify(c)))].map(s => JSON.parse(s));
      setCategories(cats);
      setClients(cached.clients || []);
      setOffline(true);
      if (!silent) {
        if ((cached.produits || []).length === 0) toast.error('Aucun catalogue hors ligne disponible');
        else toast.error('Mode hors ligne: catalogue cache charge');
      }
    }
    if (!silent) setLoadingProd(false);
  };

  const synchroniserVentes = async () => {
    if (!navigator.onLine) return;
    try {
      const result = await offlineStore.syncVentes((payload) => ventesAPI.creer(payload));
      await refreshPendingCount();
      if (result.synced > 0) toast.success(`${result.synced} vente(s) synchronisee(s)`);
      if (result.conflicts > 0) toast.error(`${result.conflicts} vente(s) en conflit de stock`);
    } catch {}
  };

  const produitsFiltres = produits.filter(p => {
    const ok = p.actif && p.stock_actuel > 0;
    const s = search ? (p.nom.toLowerCase().includes(search.toLowerCase()) || (p.code_barre || '').includes(search)) : true;
    const c = catFilter === 'all' ? true : p.categorie_id === catFilter;
    return ok && s && c;
  });

  const ajouterAuPanier = (produit) => {
    setPanier(prev => {
      const idx = prev.findIndex(i => i.id === produit.id);
      if (idx >= 0) {
        if (prev[idx].qte >= produit.stock_actuel) { toast.error(`Stock insuffisant (${produit.stock_actuel} disponible)`); return prev; }
        const updated = [...prev]; updated[idx] = { ...updated[idx], qte: updated[idx].qte + 1 }; return updated;
      }
      return [...prev, { ...produit, qte: 1 }];
    });
  };

  const modifierQte = (id, delta) => {
    setPanier(prev => prev.map(i => {
      if (i.id !== id) return i;
      const nq = i.qte + delta;
      if (nq < 1) return null;
      if (nq > i.stock_actuel) { toast.error('Stock insuffisant'); return i; }
      return { ...i, qte: nq };
    }).filter(Boolean));
  };

  const total = panier.reduce((s, i) => s + i.prix_vente * i.qte, 0);
  const totalFinal = Math.max(0, total - remise);
  const montantRecuNumber = Number(montantRecu) || 0;
  const monnaie = mode === 'especes' && montantRecu ? Math.max(0, montantRecuNumber - totalFinal) : 0;
  const resteAPayer = mode === 'especes' ? Math.max(0, totalFinal - montantRecuNumber) : 0;

  const enregistrerVenteHorsLigne = async (payload) => {
    const queued = await offlineStore.queueVente(payload, {
      boutique_id: boutique?.id,
      lignes: panier,
      client: clients.find(c => c.id === clientId),
      boutique,
      caissier: user,
      total,
      total_final: totalFinal,
    });
    await refreshPendingCount();
    const cached = await offlineStore.getCatalogue();
    setProduits(cached.produits || produits);
    setOffline(true);
    setVente({
      id: queued.local_id,
      numero: queued.local_id,
      total,
      remise,
      total_final: totalFinal,
      mode_paiement: mode,
      created_at: queued.created_at,
      lignes: panier,
      boutique,
      client: clients.find(c => c.id === clientId),
      montant_recu: montantRecu || null,
      monnaieRendue: monnaie,
      local: true,
    });
    setMonnaieRendue(monnaie);
    setPanier([]); setRemise(0); setNotes(''); setClientId(''); setMontantRecu('');
    toast.success('Vente enregistree hors ligne');
  };

  const encaisser = async () => {
    if (!panier.length) return toast.error('Panier vide');
    if (mode === 'credit' && !clientId) return toast.error('Sélectionnez un client pour le crédit');
    if (mode === 'especes' && montantRecuNumber < totalFinal) {
      toast.error(`Montant insuffisant. Il manque ${formatFCFA(totalFinal - montantRecuNumber)} à payer.`);
      return;
    }
    setLoading(true);
    const payload = {
      lignes: panier.map(i => ({ produit_id: i.id, quantite: i.qte, prix_unitaire: i.prix_vente, prix_achat: i.prix_achat || 0, nom_produit: i.nom })),
      mode_paiement: mode, remise, notes,
      client_id: clientId || undefined,
      montant_recu: montantRecu ? Number(montantRecu) : undefined,
    };
    try {
      if (offline || !navigator.onLine) {
        await enregistrerVenteHorsLigne(payload);
        setLoading(false);
        return;
      }

      const { data } = await ventesAPI.creer(payload);
      if (data.success) {
        setVente({ ...data.data, lignes: panier, boutique, client: clients.find(c => c.id === clientId), montant_recu: montantRecu || data.data.montant_recu, monnaieRendue: monnaie });
        setMonnaieRendue(monnaie);
        setPanier([]); setRemise(0); setNotes(''); setClientId(''); setMontantRecu('');
        charger();
        toast.success('Vente enregistrée !', { icon: '🎉' });
      }
    } catch (e) {
      if (!e.response) {
        await enregistrerVenteHorsLigne(payload);
      } else {
        toast.error(e.response?.data?.message || 'Erreur vente');
      }
    }
    setLoading(false);
  };

  const imprimerTicket = () => {
    const printContent = ticketRef.current?.innerHTML;
    if (!printContent) return;
    const w = window.open('', '_blank', 'width=400,height=700');
    w.document.write(`<!DOCTYPE html><html><head><title>Ticket</title>
    <style>
      body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 10px; width: 80mm; }
      .center { text-align: center; } .right { text-align: right; }
      .bold { font-weight: bold; } .big { font-size: 16px; }
      .sep { border-top: 1px dashed #333; margin: 6px 0; }
      .row { display: flex; justify-content: space-between; }
      .total-row { font-size: 14px; font-weight: bold; }
      h1 { font-size: 18px; margin: 0 0 2px; }
    </style></head><body>${printContent}</body></html>`);
    w.document.close(); w.print(); w.close();
  };

  // ÉCRAN TICKET après vente
  if (vente) {
    const numVente = 'GC-' + Date.now().toString().slice(-6);
    const ticketTotal = Number(vente.total || 0);
    const ticketRemise = Number(vente.remise || 0);
    const ticketTotalFinal = Number(vente.total_final || 0);
    const ticketMode = vente.mode_paiement || mode;
    const ticketMontantRecu = vente.montant_recu !== null && vente.montant_recu !== undefined && vente.montant_recu !== ''
      ? Number(vente.montant_recu)
      : null;
    const ticketMonnaie = ticketMode === 'especes' && ticketMontantRecu !== null
      ? Math.max(0, ticketMontantRecu - ticketTotalFinal)
      : 0;
    const ticketResteAPayer = ticketMode === 'credit'
      ? ticketTotalFinal
      : ticketMode === 'especes' && ticketMontantRecu !== null
        ? Math.max(0, ticketTotalFinal - ticketMontantRecu)
        : 0;
    const ticketQuantite = vente.lignes.reduce((s,l)=>s+l.qte,0);
    return (
      <div className="max-w-md mx-auto slide-up">
        <div className="card shadow-xl overflow-hidden">
          {/* Header succès */}
          <div className="p-6 text-center text-white" style={{background: `linear-gradient(135deg, ${receiptTheme.primary}, ${receiptTheme.secondary})`}}>
            <CheckCircle2 size={48} className="mx-auto mb-2 bounce-in"/>
            <h2 className="text-xl font-bold">Vente enregistrée !</h2>
            {ticketMonnaie > 0 && (
              <p className="mt-2 text-emerald-100 text-lg font-semibold">
                💰 Monnaie à rendre : <span className="text-white font-extrabold">{formatFCFA(ticketMonnaie)}</span>
              </p>
            )}
          </div>

          {/* TICKET */}
          <div ref={ticketRef} className="p-5 bg-white" style={{fontFamily:"'Courier New', monospace", color: receiptTheme.text}}>
            {/* En-tête boutique */}
            <div className="text-center mb-3 pb-3" style={{borderBottom:'2px dashed #ddd'}}>
              {boutique?.logo && <img src={boutique.logo} alt="Logo boutique" className="mx-auto h-12 w-12 object-contain rounded-lg mb-2" />}
              <div className="text-xl font-extrabold tracking-wider uppercase" style={{color: receiptTheme.text}}>{vente.boutique?.nom || 'MA BOUTIQUE'}</div>
              {vente.boutique?.adresse && <div className="text-xs text-gray-500">{vente.boutique.adresse}</div>}
              {vente.boutique?.telephone && <div className="text-xs text-gray-500">Tél: {vente.boutique.telephone}</div>}
            </div>

            {/* Infos ticket */}
            <div className="text-xs space-y-0.5 mb-3 pb-3" style={{borderBottom:'1px dashed #ddd'}}>
              <div className="flex justify-between"><span>N° Ticket:</span><span className="font-bold">{numVente}</span></div>
              <div className="flex justify-between"><span>Date:</span><span>{new Date().toLocaleDateString('fr-FR', {day:'2-digit',month:'2-digit',year:'numeric'})}</span></div>
              <div className="flex justify-between"><span>Heure:</span><span>{new Date().toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'})}</span></div>
              <div className="flex justify-between"><span>Caissier:</span><span>{user?.prenom} {user?.nom?.[0]}.</span></div>
              {vente.client && <div className="flex justify-between"><span>Client:</span><span className="font-semibold">{vente.client.nom}</span></div>}
            </div>

            {/* Produits */}
            <div className="mb-3 pb-3" style={{borderBottom:'1px dashed #ddd'}}>
              <div className="text-xs font-bold mb-2 uppercase tracking-wide">Articles</div>
              {vente.lignes.map((ligne, i) => (
                <div key={i} className="mb-2">
                  <div className="text-xs font-semibold">{ligne.nom}</div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{ligne.qte} × {formatFCFA(ligne.prix_vente)}</span>
                    <span className="font-bold text-gray-900">{formatFCFA(ligne.qte * ligne.prix_vente)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totaux */}
            <div className="space-y-1 mb-3 pb-3" style={{borderBottom:'1px dashed #ddd'}}>
              <div className="flex justify-between text-xs"><span>Total articles ({ticketQuantite} article{ticketQuantite>1?'s':''}):</span><span>{formatFCFA(ticketTotal)}</span></div>
              {ticketRemise > 0 && <div className="flex justify-between text-xs text-emerald-600"><span>Remise:</span><span>- {formatFCFA(ticketRemise)}</span></div>}
              <div className="flex justify-between text-sm font-extrabold pt-1">
                <span>TOTAL À PAYER:</span><span>{formatFCFA(ticketTotalFinal)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Mode de paiement:</span>
                <span className="uppercase font-semibold">{MODES.find(m=>m.id===ticketMode)?.label || ticketMode}</span>
              </div>
              {ticketMode === 'especes' && ticketMontantRecu !== null && (
                <>
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Montant remis:</span><span>{formatFCFA(ticketMontantRecu)}</span>
                  </div>
                  {ticketMonnaie > 0 && (
                    <div className="flex justify-between text-xs font-bold text-emerald-700">
                      <span>Monnaie à rendre:</span><span>{formatFCFA(ticketMonnaie)}</span>
                    </div>
                  )}
                  {ticketResteAPayer > 0 && (
                    <div className="flex justify-between text-xs font-bold text-red-700">
                      <span>Reste à payer:</span><span>{formatFCFA(ticketResteAPayer)}</span>
                    </div>
                  )}
                </>
              )}
              {(ticketMode === 'momo' || ticketMode === 'carte') && (
                <div className="flex justify-between text-xs font-semibold">
                  <span>Montant paye:</span><span>{formatFCFA(ticketTotalFinal)}</span>
                </div>
              )}
              {ticketMode === 'credit' && (
                <div className="flex justify-between text-xs font-bold text-red-700">
                  <span>Reste à payer:</span><span>{formatFCFA(ticketResteAPayer)}</span>
                </div>
              )}
            </div>

            {/* Pied de ticket */}
            <div className="text-center text-xs text-gray-500 space-y-0.5">
              <div>━━━━━━━━━━━━━━━━━━━━━━━━</div>
              <div className="font-semibold">{receiptTheme.footer}</div>
              <div>{receiptTheme.message}</div>
              <div>━━━━━━━━━━━━━━━━━━━━━━━━</div>
              <div style={{fontSize:'10px'}}>Powered by GestoCaisse 🇧🇯</div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 bg-gray-50 flex gap-3">
            <button onClick={imprimerTicket}
              className="btn btn-primary btn-lg flex-1">
              <Printer size={18}/> Imprimer le ticket
            </button>
            <button onClick={() => setVente(null)}
              className="btn btn-secondary btn-lg flex-1">
              <ArrowLeft size={18}/> Nouvelle vente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-4 lg:gap-5" style={{minHeight: 'calc(100vh - 120px)'}}>
      {/* ── GAUCHE : Produits ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {(offline || pendingCount > 0) && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            {offline ? 'Mode hors ligne actif.' : 'Connexion retablie.'}
            {pendingCount > 0 && ` ${pendingCount} vente(s) en attente de synchronisation.`}
          </div>
        )}
        {/* Recherche + filtre */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input className="input pl-9" placeholder="Rechercher un produit ou scanner..."
              value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="input w-auto" value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
            <option value="all">Toutes</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>

        {/* Grille produits */}
        {loadingProd ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_,i) => <div key={i} className="skeleton h-24 rounded-xl"/>)}
          </div>
        ) : produitsFiltres.length === 0 ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-3 text-gray-400 py-20">
            <Package size={40}/>
            <p className="font-medium">Aucun produit trouvé</p>
            {search && <p className="text-sm">Essayez un autre terme de recherche</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto scrollbar-thin pr-1 pb-4">
            {produitsFiltres.map(p => {
              const inCart = panier.find(i => i.id === p.id);
              return (
                <button key={p.id} onClick={() => ajouterAuPanier(p)}
                  className={`card-hover text-left p-3 flex flex-col gap-1 relative group active:scale-95 transition-all ${
                    inCart ? 'ring-2 ring-emerald-500 bg-emerald-50' : ''
                  } ${p.stock_actuel <= p.stock_minimum ? 'border-amber-200' : ''}`}>
                  {inCart && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                      {inCart.qte}
                    </div>
                  )}
                  <div className="flex items-center gap-1 mb-1">
                    {p.categorie && <Tag size={11} className="text-gray-400 flex-shrink-0"/>}
                    <span className="text-xs text-gray-400 truncate">{p.categories?.nom || 'Sans catégorie'}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">{p.nom}</span>
                  <span className="text-emerald-700 font-extrabold text-sm">{formatFCFA(p.prix_vente)}</span>
                  <span className={`text-xs font-medium ${p.stock_actuel <= 3 ? 'text-red-500' : p.stock_actuel <= p.stock_minimum ? 'text-amber-500' : 'text-gray-400'}`}>
                    Stock: {p.stock_actuel} {p.unite}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── DROITE : Panier ── */}
      <div className="w-72 lg:w-80 flex flex-col flex-shrink-0">
        <div className="card flex flex-col h-full shadow-md">
          {/* Header panier */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-emerald-600"/>
              <span className="font-bold text-gray-900">Panier</span>
              {panier.length > 0 && (
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">
                  {panier.reduce((s,i)=>s+i.qte,0)}
                </span>
              )}
            </div>
            {panier.length > 0 && (
              <button onClick={() => setPanier([])} className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1">
                <Trash2 size={13}/> Vider
              </button>
            )}
          </div>

          {/* Articles */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
            {panier.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                <ShoppingCart size={36} className="mb-2"/>
                <p className="text-sm font-medium">Panier vide</p>
                <p className="text-xs">Cliquez sur un produit</p>
              </div>
            ) : panier.map(item => (
              <div key={item.id} className="bg-gray-50 rounded-xl p-2.5 fade-in">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-sm font-semibold text-gray-900 leading-tight">{item.nom}</span>
                  <button onClick={() => setPanier(p => p.filter(i => i.id !== item.id))}
                    className="text-gray-300 hover:text-red-500 flex-shrink-0 transition-colors">
                    <X size={14}/>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => modifierQte(item.id, -1)} className="w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                      <Minus size={11}/>
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{item.qte}</span>
                    <button onClick={() => modifierQte(item.id, +1)} className="w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                      <Plus size={11}/>
                    </button>
                  </div>
                  <span className="text-sm font-bold text-emerald-700">{formatFCFA(item.prix_vente * item.qte)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Paiement */}
          {panier.length > 0 && (
            <div className="p-4 border-t border-gray-100 space-y-3">
              {/* Mode paiement */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Mode de paiement</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {MODES.map(m => (
                    <button key={m.id} onClick={() => setMode(m.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                        mode === m.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      <m.icon size={13}/> {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Client (pour crédit) */}
              {mode === 'credit' && (
                <div className="fade-in">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Client *</label>
                  <select className="input text-sm py-2" value={clientId} onChange={e=>setClientId(e.target.value)} required>
                    <option value="">-- Sélectionner un client --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.nom} {c.telephone ? `(${c.telephone})` : ''}</option>)}
                  </select>
                </div>
              )}

              {/* Montant reçu (espèces) */}
              {mode === 'especes' && (
                <div className="fade-in">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Montant reçu (FCFA)</label>
                  <input type="number" className="input text-sm py-2" placeholder={`Min. ${totalFinal}`}
                    value={montantRecu} onChange={e=>setMontantRecu(e.target.value)}/>
                  {montantRecu && montantRecuNumber < totalFinal && (
                    <p className="text-xs text-red-600 font-bold mt-1">
                      ⚠️ Il manque {formatFCFA(resteAPayer)} pour finaliser la vente.
                    </p>
                  )}
                  {montantRecu && montantRecuNumber >= totalFinal && (
                    <p className="text-xs text-emerald-700 font-bold mt-1">
                      💵 Monnaie à rendre : {formatFCFA(Math.max(0, montantRecuNumber - totalFinal))}
                    </p>
                  )}
                </div>
              )}

              {/* Remise */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Remise (FCFA)</label>
                <input type="number" className="input text-sm py-2" placeholder="0" min="0" max={total}
                  value={remise || ''} onChange={e=>setRemise(Number(e.target.value)||0)}/>
              </div>

              {/* Total */}
              <div className="bg-emerald-50 rounded-xl p-3 space-y-1">
                {remise > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Sous-total</span><span>{formatFCFA(total)}</span>
                  </div>
                )}
                {remise > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                    <span>Remise</span><span>- {formatFCFA(remise)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-gray-900">
                  <span>TOTAL</span><span className="text-emerald-700">{formatFCFA(totalFinal)}</span>
                </div>
              </div>

              <button onClick={encaisser} disabled={loading || !panier.length || (mode === 'especes' && montantRecuNumber < totalFinal)}
                className="btn btn-primary btn-lg w-full shadow-lg shadow-emerald-200">
                {loading ? <><Loader2 size={18} className="animate-spin"/>Enregistrement...</> :
                 <><Receipt size={18}/>Encaisser {formatFCFA(totalFinal)}</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
