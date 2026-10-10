import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { rapportsAPI } from '../services/api';
import { formatFCFA } from '../utils/format';
import Skeleton, { DashboardSkeleton } from '../components/ui/Skeleton';
import AnimatedCounter from '../components/ui/AnimatedCounter';
import {
  TrendingUp, ShoppingCart, Package, Users, AlertTriangle,
  ArrowRight, RefreshCw, Receipt, BarChart3,
  Clock, Zap, Heart, Sparkles, ArrowUpRight, Bell,
  Wallet, PiggyBank, Boxes, Award,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const BAR_COLORS = ['#059669', '#0d9488', '#0891b2', '#0284c7', '#6366f1', '#8b5cf6', '#ec4899'];

const modeColor = (m: string) =>
  m === 'especes' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
  m === 'momo'    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
  m === 'carte'   ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                     'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';

const modeLabel = (m: string) =>
  m === 'especes' ? 'Espèces' :
  m === 'momo'    ? 'MoMo' :
  m === 'carte'   ? 'Carte' : 'Crédit';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [alertes, setAlertes] = useState<any[]>([]);
  const [ventes, setVentes] = useState<any[]>([]);
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
      setVentes(((rv.data.data as any)?.ventes || []).slice(0, 5));
    } catch {}
    setLoading(false);
  };

  const isAdmin = user?.role === 'admin';
  const plan = isAdmin ? 'business' : (user?.boutique?.plan || 'starter');
  const planConfig: Record<string, { label: string; color: string; gradient: string }> = {
    starter:  { label: 'Starter',  color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200', gradient: 'from-gray-400 to-gray-600' },
    pro:      { label: 'Pro',      color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', gradient: 'from-emerald-400 to-teal-600' },
    business: { label: 'Business', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300', gradient: 'from-blue-400 to-indigo-600' },
  };

  const cartes = stats ? [
    {
      title: "Ventes aujourd'hui",
      value: stats.ventes_jour || 0,
      suffix: ' ventes',
      icon: ShoppingCart,
      gradient: 'from-blue-500 to-blue-600',
      shadow: 'shadow-blue-500/30',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: "CA aujourd'hui",
      value: stats.ca_jour || 0,
      icon: Wallet,
      suffix: ' FCFA',
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/30',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      fcfa: true,
    },
    {
      title: 'Bénéfice estimé',
      value: stats.benefice_jour || 0,
      icon: PiggyBank,
      suffix: ' FCFA',
      gradient: 'from-purple-500 to-pink-600',
      shadow: 'shadow-purple-500/30',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      fcfa: true,
    },
    {
      title: 'Produits en stock',
      value: stats.total_produits || 0,
      suffix: ' réf.',
      icon: Boxes,
      gradient: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/30',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Bonjour, <span className="text-[#1f6f52] dark:text-emerald-300">{user?.prenom}</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 flex items-center gap-2 flex-wrap">
            <Clock size={13}/>
            <span>{new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</span>
            <span className={`${planConfig[plan].color} px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1`}>
              <Award size={11}/> Plan {planConfig[plan].label}
            </span>
          </p>
        </div>
        <button onClick={charger} className="btn btn-secondary btn-md gap-2 self-start sm:self-auto">
          <RefreshCw size={15}/> Actualiser
        </button>
      </div>

      {/* Alerte plan Starter */}
      {!isAdmin && plan === 'starter' && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 p-5 text-white shadow-xl shadow-emerald-500/20 slide-up">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"/>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"/>
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-extrabold text-lg flex items-center gap-2">
                <Sparkles size={18}/> Passez au plan Pro
              </p>
              <p className="text-emerald-50 text-sm mt-1">
                Produits illimités, mode hors-ligne, rapports avancés — 1 000 FCFA/mois
              </p>
            </div>
            <Link to="/app/abonnement" className="btn bg-white text-emerald-700 hover:bg-emerald-50 btn-md flex-shrink-0 shadow-lg font-bold">
              Voir les plans <ArrowRight size={14}/>
            </Link>
          </div>
        </div>
      )}

      {/* Cartes stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {cartes.map((c, i) => (
          <div key={i} className="group relative card p-4 hover:-translate-y-1 transition-transform slide-up overflow-hidden" style={{animationDelay: `${i*80}ms`}}>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 leading-tight">{c.title}</p>
                <div className={`w-10 h-10 bg-[#e5efe7] dark:bg-emerald-900/40 rounded-lg flex items-center justify-center`}>
                  <c.icon size={18} className="text-[#1f6f52] dark:text-emerald-300"/>
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-baseline gap-1">
                <AnimatedCounter value={c.value} className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-baseline gap-1"/>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  {c.fcfa ? 'FCFA' : c.suffix}
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Statistiques globales */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-extrabold text-gray-900 dark:text-white text-base">Performance globale</p>
            {stats?.boutique_created_at && (
              <p className="text-xs text-gray-400 mt-0.5">Depuis le {new Date(stats.boutique_created_at).toLocaleDateString('fr-FR')}</p>
            )}
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
            <BarChart3 size={16} className="text-emerald-600 dark:text-emerald-400"/>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Toutes les ventes</p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-2">
              <AnimatedCounter value={stats?.nb_ventes_total || 0} suffix=" ventes" className="text-2xl font-extrabold text-gray-900 dark:text-white"/>
            </p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-emerald-900/5 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800/40">
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">CA total</p>
            <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-2">
              <AnimatedCounter value={stats?.ca_total || 0} className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300"/> <span className="text-sm">FCFA</span>
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-purple-900/5 rounded-xl p-4 border border-purple-100 dark:border-purple-800/40">
            <p className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">Bénéfice total</p>
            <p className="text-2xl font-extrabold text-purple-700 dark:text-purple-300 mt-2">
              <AnimatedCounter value={stats?.benefice_total || 0} className="text-2xl font-extrabold text-purple-700 dark:text-purple-300"/> <span className="text-sm">FCFA</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Dernières ventes */}
        <div className="card lg:col-span-2 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <Receipt size={14} className="text-emerald-600 dark:text-emerald-400"/>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">Dernières ventes</span>
            </div>
            <Link to="/app/rapports" className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 group">
              Tout voir <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform"/>
            </Link>
          </div>
          {ventes.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Receipt size={28} className="opacity-40"/>
              </div>
              <p className="text-sm font-medium">Aucune vente aujourd'hui</p>
              <Link to="/app/caisse" className="btn btn-primary btn-md mt-4 inline-flex shadow-lg shadow-emerald-500/20">
                <ShoppingCart size={14}/> Ouvrir la caisse
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {ventes.map((v, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-900/20 rounded-xl flex items-center justify-center">
                      <ShoppingCart size={15} className="text-emerald-600 dark:text-emerald-400"/>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{v.numero || `Vente #${i+1}`}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {v.created_at ? new Date(v.created_at).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'}) : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">{formatFCFA(v.total_final)}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block ${modeColor(v.mode_paiement)}`}>
                      {modeLabel(v.mode_paiement)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertes stock */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <Bell size={14} className="text-amber-600 dark:text-amber-400"/>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">Alertes stock</span>
            {alertes.length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-md shadow-red-500/30">
                {alertes.length}
              </span>
            )}
          </div>
          {alertes.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <Package size={28} className="text-emerald-400 opacity-60"/>
              </div>
              <p className="text-sm font-bold text-gray-600 dark:text-gray-300">Tout est en stock ✅</p>
              <p className="text-xs text-gray-400 mt-1">Aucune alerte</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto scrollbar-thin">
              {alertes.map((p, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">{p.nom}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.unite}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span className={`text-base font-extrabold ${p.stock_actuel === 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {p.stock_actuel}
                    </span>
                    <p className="text-[10px] text-gray-400">min {p.stock_minimum}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {alertes.length > 0 && (
            <div className="p-3 border-t border-gray-100 dark:border-gray-700">
              <Link to="/app/stock" className="btn btn-secondary btn-sm w-full text-xs font-bold">
                <Package size={12}/> Gérer le stock
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Top produits + Fidélité */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top 5 produits */}
        <div className="card lg:col-span-2 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400"/>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">Top 5 produits vendus</span>
          </div>
          {stats?.top_produits?.length > 0 ? (
            <div className="p-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={stats.top_produits}
                  layout="vertical"
                  margin={{ left: 0, right: 20, top: 10, bottom: 10 }}
                  barSize={14}
                >
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${v}`} stroke="#9ca3af"/>
                  <YAxis type="category" dataKey="nom" tick={{ fontSize: 11, fontWeight: 600 }} width={110} stroke="#9ca3af"/>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                    formatter={(v: any) => [`${v} unités`, 'Quantité']}
                  />
                  <Bar dataKey="quantite" radius={[0, 6, 6, 0]}>
                    {stats.top_produits.map((_: any, i: number) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="p-10 text-center text-gray-400">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Package size={28} className="opacity-40"/>
              </div>
              <p className="text-sm font-medium">Pas encore de ventes enregistrées</p>
            </div>
          )}
        </div>

        {/* Fidélité */}
        <div className="space-y-4">
          <div className="card p-5 overflow-hidden relative">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-100 dark:bg-rose-900/20 rounded-full blur-2xl"/>
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center">
                  <Heart size={14} className="text-rose-500"/>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">Fidélité clients</span>
              </div>
              <div className="text-center py-2">
                <p className="text-5xl font-extrabold bg-gradient-to-br from-rose-500 to-pink-600 bg-clip-text text-transparent">
                  {stats?.taux_fidelite ?? 0}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">clients avec 2+ achats</p>
              </div>
              <div className="mt-4 bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-rose-500 to-pink-500 h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${Math.min(stats?.taux_fidelite ?? 0, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                Sur {stats?.total_clients_achat ?? 0} client{(stats?.total_clients_achat ?? 0) > 1 ? 's' : ''} ayant acheté
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Accès rapides */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Accès rapides</p>
          <Link to="/app/caisse" className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 hover:gap-1.5 transition-all">
            Ouvrir la caisse <ArrowUpRight size={12}/>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/app/caisse',   icon: ShoppingCart, label: 'Caisse',         gradient: 'from-emerald-500 to-teal-600',   shadow: 'shadow-emerald-500/30', bg: 'bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30' },
            { to: '/app/stock',    icon: Package,      label: 'Stock',          gradient: 'from-blue-500 to-blue-600',       shadow: 'shadow-blue-500/30',    bg: 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30' },
            { to: '/app/clients',  icon: Users,        label: 'Clients',        gradient: 'from-purple-500 to-purple-600',   shadow: 'shadow-purple-500/30',  bg: 'bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30' },
            { to: '/app/rapports', icon: BarChart3,    label: 'Rapports',       gradient: 'from-amber-500 to-orange-600',    shadow: 'shadow-amber-500/30',   bg: 'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30' },
          ].map(({ to, icon: Icon, label, gradient, shadow, bg }) => (
            <Link
              key={to}
              to={to}
              className={`group relative ${bg} rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center transition-all hover:-translate-y-1 active:scale-95 overflow-hidden border border-transparent hover:border-current/10`}
            >
              <div className={`w-11 h-11 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-lg ${shadow} group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
                <Icon size={19} className="text-white"/>
              </div>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200 leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
