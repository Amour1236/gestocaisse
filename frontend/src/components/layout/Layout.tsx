import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { SyncBanner } from '../ui/SyncBanner';
import BottomNav from './BottomNav';
import {
  LayoutDashboard, ShoppingCart, Package, Users, BarChart3,
  Settings, CreditCard, LogOut, Menu, X, ChevronDown, Shield, Home, Moon, Sun, Receipt,
  LucideIcon, Sparkles, Bell, ArrowUpRight,
} from 'lucide-react';

interface NavItemDef {
  to: string;
  icon: LucideIcon;
  label: string;
  exact?: boolean;
  badge?: string;
}

const navItems: NavItemDef[] = [
  { to: '/app', icon: LayoutDashboard, label: 'Tableau de bord', exact: true },
  { to: '/app/caisse', icon: ShoppingCart, label: 'Caisse' },
  { to: '/app/ventes', icon: Receipt, label: 'Historique' },
  { to: '/app/stock', icon: Package, label: 'Stock' },
  { to: '/app/clients', icon: Users, label: 'Clients' },
  { to: '/app/rapports', icon: BarChart3, label: 'Rapports' },
];

function NavItem({ to, icon: Icon, label, exact }: NavItemDef) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        'group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all relative overflow-hidden ' +
          (isActive
          ? 'bg-[#dce9df] text-[#1f6f52] dark:bg-emerald-900/40 dark:text-emerald-200'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white')
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={18} className={isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors'}/>
          <span className="flex-1">{label}</span>
          {isActive && <ArrowUpRight size={14} className="opacity-70"/>}
        </>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const { user, deconnexion } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showDeconnexionModal, setShowDeconnexionModal] = useState(false);

  const handleDeconnexion = () => {
    deconnexion();
    setShowDeconnexionModal(false);
  };

  const boutique = user?.boutique;
  const isAdmin = user?.role === 'admin';
  const plan = isAdmin ? 'business' : (boutique?.plan || 'starter');
  const planConfig: Record<string, { label: string; color: string }> = {
    starter:  { label: 'Starter',  color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200' },
    pro:      { label: 'Pro',      color: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' },
    business: { label: 'Business', color: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white' },
  };

  return (
    <div className="app-shell flex h-screen bg-[#f4f1ea] dark:bg-[#111614] overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={
        'fixed lg:static inset-y-0 left-0 z-30 w-64 bg-[#18211d] dark:bg-[#101613] border-r border-[#2d3a32] flex flex-col transition-transform duration-300 shadow-2xl lg:shadow-none ' +
        (sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')
      }>
        {/* Logo */}
        <div className="p-5 border-b border-[#2d3a32]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-12 w-12 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden">
                <img src="/Logo.png" alt="Logo GestoCaisse" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0">
                <span className="block text-lg font-extrabold text-[#f5f1e8] tracking-tight truncate">
                  Gesto<span className="text-[#18a874]">Caisse</span>
                </span>
                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                  <span className="text-[10px] text-[#a8b8ad] truncate max-w-[110px] font-medium">
                    {boutique?.nom || 'Ma boutique'}
                  </span>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-[#d6a94a] text-[#18211d]">
                    {planConfig[plan]?.label}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
            >
              <X size={16}/>
            </button>
          </div>
        </div>

        {/* Nav principale */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin" onClick={() => setSidebarOpen(false)}>
          <p className="px-4 py-2 text-[10px] font-extrabold text-[#8da394] uppercase tracking-widest">Menu principal</p>
          {navItems.map((item) => <NavItem key={item.to} {...item} />)}
          {user?.role === 'admin' && (
            <>
              <p className="px-4 py-2 mt-3 text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Administration</p>
              <NavItem to="/app/admin" icon={Shield} label="Admin"/>
            </>
          )}
        </nav>

        {/* Footer sidebar */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
          <p className="px-4 py-1 text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Compte</p>
          {!isAdmin && (
            <NavLink
              to="/app/abonnement"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 dark:hover:text-amber-300 transition-all group"
            >
              <CreditCard size={18} className="text-gray-500 group-hover:text-amber-500 transition-colors"/>
              <span className="flex-1">Abonnement</span>
              {plan === 'starter' && (
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  PRO
                </span>
              )}
            </NavLink>
          )}
          <NavLink
            to="/app/parametres"
            className={({ isActive }) =>
              'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ' +
              (isActive
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white')
            }
          >
            <Settings size={18}/>
            Paramètres
          </NavLink>
          <NavLink
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <Home size={18}/> Accueil
          </NavLink>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
            {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          </button>
          <button
            onClick={() => setShowDeconnexionModal(true)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
          >
            <LogOut size={18}/> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-[#fffdf8] dark:bg-[#18211d] border-b border-[#e3e4dc] dark:border-[#2d3a32] px-4 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors"
            >
              <Menu size={20}/>
            </button>
            <div className="hidden sm:block">
              <h1 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-500"/>
                Bonjour, {user?.prenom}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {!isAdmin && plan === 'starter' && (
              <NavLink
                to="/app/abonnement"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/30 hover:shadow-lg hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all"
              >
                <Sparkles size={12}/> Passer au Pro
              </NavLink>
            )}
            <button
              className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
              aria-label="Notifications"
            >
              <Bell size={18}/>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900"/>
            </button>
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-200"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-500/30">
                  {user?.prenom?.[0]}{user?.nom?.[0]}
                </div>
                <span className="hidden sm:block text-sm font-bold pr-1">{user?.prenom}</span>
                <ChevronDown size={14} className="text-gray-400 dark:text-gray-300 hidden sm:block"/>
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)}/>
                  <div className="absolute right-0 top-12 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 w-60 z-50 overflow-hidden slide-up">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
                      <p className="text-sm font-extrabold text-gray-900 dark:text-white">{user?.prenom} {user?.nom}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{user?.email}</p>
                    </div>
                    <NavLink
                      to="/app/parametres"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <Settings size={14}/> Paramètres
                    </NavLink>
                    <button
                      onClick={toggleTheme}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      {theme === 'dark' ? <Sun size={14}/> : <Moon size={14}/>}
                      {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
                    </button>
                    <div className="border-t border-gray-100 dark:border-gray-700 my-1"/>
                    <button
                      onClick={() => { setShowDeconnexionModal(true); setProfileOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <LogOut size={14}/> Déconnexion
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 pb-20 lg:pb-8">
          <SyncBanner />
          <Outlet/>
        </main>

        {/* Navigation basse mobile */}
        <BottomNav />
      </div>

      {/* Modal de déconnexion */}
      {showDeconnexionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in">
          <div className="card p-6 w-full max-w-sm shadow-2xl dark:bg-gray-800">
            <div className="flex items-center justify-center w-14 h-14 mx-auto bg-red-100 dark:bg-red-900/30 rounded-2xl mb-4">
              <LogOut size={24} className="text-red-600 dark:text-red-400"/>
            </div>
            <h3 className="font-extrabold text-lg text-center text-gray-900 dark:text-white mb-2">Confirmer la déconnexion</h3>
            <p className="text-center text-gray-600 dark:text-gray-400 text-sm mb-6">
              Êtes-vous sûr de vouloir vous déconnecter ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeconnexionModal(false)}
                className="btn btn-secondary btn-md flex-1 font-bold"
              >
                Annuler
              </button>
              <button
                onClick={handleDeconnexion}
                className="btn btn-error btn-md flex-1 font-bold shadow-lg shadow-red-500/30"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
