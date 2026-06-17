import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { rapportsAPI } from '../services/api';
import { formatFCFA, formatDateTime } from '../utils/format';
import {
  TrendingUp, ShoppingCart, Package, Users, AlertTriangle,
  ArrowRight, RefreshCw, Receipt, Loader2, BarChart3,
  ChevronUp, ChevronDown, Clock, Zap
} from 'lucide-react';

function AnimatedNumber({ value, prefix='', suffix='' }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const duration = 800;
    const timer = setInterval(() => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress === 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{prefix}{display.toLocaleString('fr-FR')}{suffix}</span>;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [alertes, setAlertes] = useState([]);
  const [ventes, setVentes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { charger(); }, []);

  const charger = async () => {
    setLoading(true);
    try {
      const [rs, ra, rv] = await Promise.all([
        rapportsAPI.dashboard(),
        rapportsAPI.alertes().catch(() => ({ data: { data: [] } })),
        rapportsAPI.rapportJour().catch(() => ({ data: { data: { ventes: [] } } })),
      ]);
      setStats(rs.data.data || {});
      setAlertes(ra.data.data || []);
      setVentes((rv.data.data?.ventes || []).slice(0, 5));
    } catch {}
    setLoading(false);
  };

  const plan = user?.boutique?.plan || 'starter';
  const planConfig = {
    starter:  { label: 'Starter',  color: 'bg-gray-100 text-gray-700' },
    pro:      { label: 'Pro',      color: 'bg-emerald-100 text-emerald-800' },
    business: { label: 'Business', color: 'bg-blue-100 text-blue-800' },
  };

  const cartes = stats ? [
    { title: "Ventes aujourd'hui",  value: stats.ventes_jour || 0,     prefix: '',     suffix: ' ventes', icon: ShoppingCart, color: 'bg-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-600' },
    { title: "CA aujourd'hui",      value: stats.ca_jour || 0,          prefix: '',     suffix: ' FCFA',   icon: TrendingUp,   color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600', fcfa: true },
    { title: 'Benefice estime',     value: stats.benefice_jour || 0,    prefix: '',     suffix: ' FCFA',   icon: Zap,          color: 'bg-purple-500',  bg: 'bg-purple-50',  text: 'text-purple-600',  fcfa: true },
    { title: 'Produits en stock',   value: stats.total_produits || 0,   prefix: '',     suffix: ' ref.',   icon: Package,      color: 'bg-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-600' },
  ] : [];

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_,i) => <div key={i} className="skeleton h-28 rounded-2xl"/>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(2)].map((_,i) => <div key={i} className="skeleton h-64 rounded-2xl"/>)}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            Bonjour, {user?.prenom}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-2">
            <Clock size={13}/>
            {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            &nbsp;-&nbsp;
            <span className={`${planConfig[plan].color} px-2 py-0.5 rounded-full text-xs font-bold`}>Plan {planConfig[plan].label}</span>
          </p>
        </div>
        <button onClick={charger} className="btn btn-secondary btn-md gap-2">
          <RefreshCw size={15}/> Actualiser
        </button>
      </div>

      {/* Alerte plan Starter */}
      {plan === 'starter' && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-4 text-white flex items-center justify-between slide-up">
          <div>
            <p className="font-bold">? Passez au plan Pro</p>
            <p className="text-emerald-100 text-sm">Produits illimites, mode hors-ligne, rapports avances - 1 000 FCFA/mois</p>
          </div>
          <Link to="/app/abonnement" className="btn bg-white text-emerald-700 hover:bg-emerald-50 btn-md flex-shrink-0">
            Voir les plans <ArrowRight size={14}/>
          </Link>
        </div>
      )}

      {/* Cartes stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {cartes.map((c, i) => (
          <div key={i} className="card p-4 slide-up" style={{animationDelay: `${i*80}ms`}}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 leading-tight">{c.title}</p>
              <div className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center`}>
                <c.icon size={16} className={c.text}/>
              </div>
            </div>
            <p className={`text-xl font-extrabold ${c.text}`}>
              {c.fcfa ? (
                <><AnimatedNumber value={c.value}/> <span className="text-sm font-bold">FCFA</span></>
              ) : (
                <AnimatedNumber value={c.value} suffix={c.suffix}/>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Statistiques globales */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-bold text-gray-900">Depuis la creation de la boutique</p>
            {stats?.boutique_created_at && (
              <p className="text-xs text-gray-400">Depuis le {new Date(stats.boutique_created_at).toLocaleDateString('fr-FR')}</p>
            )}
          </div>
          <BarChart3 size={18} className="text-emerald-600"/>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">Toutes les ventes</p>
            <p className="text-xl font-extrabold text-gray-900"><AnimatedNumber value={stats?.nb_ventes_total || 0} suffix=" ventes"/></p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">CA total</p>
            <p className="text-xl font-extrabold text-emerald-700"><AnimatedNumber value={stats?.ca_total || 0}/> <span className="text-sm">FCFA</span></p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">Benefice total estime</p>
            <p className="text-xl font-extrabold text-purple-700"><AnimatedNumber value={stats?.benefice_total || 0}/> <span className="text-sm">FCFA</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Dernieres ventes */}
        <div className="card lg:col-span-2">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-emerald-600"/>
              <span className="font-bold text-gray-900">Dernieres ventes</span>
            </div>
            <Link to="/app/rapports" className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1">
              Tout voir <ArrowRight size={12}/>
            </Link>
          </div>
          {ventes.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Receipt size={32} className="mx-auto mb-2 opacity-30"/>
              <p className="text-sm">Aucune vente aujourd'hui</p>
              <Link to="/app/caisse" className="btn btn-primary btn-md mt-3 inline-flex">
                <ShoppingCart size={14}/> Ouvrir la caisse
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {ventes.map((v, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <ShoppingCart size={13} className="text-emerald-600"/>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{v.numero || `Vente #${i+1}`}</p>
                      <p className="text-xs text-gray-400">{v.created_at ? new Date(v.created_at).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'}) : '-'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-700">{formatFCFA(v.total_final)}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      v.mode_paiement === 'especes' ? 'bg-green-100 text-green-700' :
                      v.mode_paiement === 'momo'    ? 'bg-amber-100 text-amber-700' :
                      v.mode_paiement === 'carte'   ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>{v.mode_paiement}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertes stock */}
        <div className="card">
          <div className="p-4 border-b border-gray-50 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500"/>
            <span className="font-bold text-gray-900">Alertes stock</span>
            {alertes.length > 0 && (
              <span className="ml-auto bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {alertes.length}
              </span>
            )}
          </div>
          {alertes.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Package size={32} className="mx-auto mb-2 opacity-30"/>
              <p className="text-sm font-medium">Tout est bien approvisionne</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto scrollbar-thin">
              {alertes.map((p, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 leading-tight">{p.nom}</p>
                    <p className="text-xs text-gray-400">{p.unite}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-extrabold ${p.stock_actuel === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                      {p.stock_actuel}
                    </span>
                    <p className="text-xs text-gray-400">/ min {p.stock_minimum}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {alertes.length > 0 && (
            <div className="p-3 border-t border-gray-50">
              <Link to="/app/stock" className="btn btn-secondary btn-sm w-full text-xs">
                <Package size={12}/> Gerer le stock
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Acces rapides */}
      <div>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Acces rapides</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/app/caisse',   icon: ShoppingCart, label: 'Ouvrir la caisse', color: 'bg-emerald-500', bg: 'bg-emerald-50 hover:bg-emerald-100' },
            { to: '/app/stock',    icon: Package,      label: 'Gerer le stock',   color: 'bg-blue-500',    bg: 'bg-blue-50 hover:bg-blue-100' },
            { to: '/app/clients',  icon: Users,        label: 'Mes clients',      color: 'bg-purple-500',  bg: 'bg-purple-50 hover:bg-purple-100' },
            { to: '/app/rapports', icon: BarChart3,    label: 'Voir les rapports',color: 'bg-amber-500',   bg: 'bg-amber-50 hover:bg-amber-100' },
          ].map(({ to, icon: Icon, label, color, bg }) => (
            <Link key={to} to={to}
              className={`${bg} rounded-2xl p-4 flex flex-col items-center gap-2 text-center transition-all hover:-translate-y-0.5 active:scale-95`}>
              <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
                <Icon size={18} className="text-white"/>
              </div>
              <span className="text-sm font-semibold text-gray-700 leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
