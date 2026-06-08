import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import {
  LayoutDashboard, ShoppingCart, Package, Users, BarChart3,
  Settings, CreditCard, LogOut, Menu, X, ChevronDown, Shield, Home, Moon, Sun, Receipt
} from 'lucide-react';

const navItems = [
  { to: '/app', icon: LayoutDashboard, label: 'Tableau de bord', exact: true },
  { to: '/app/caisse', icon: ShoppingCart, label: 'Caisse' },
  { to: '/app/ventes', icon: Receipt, label: 'Historique' },
  { to: '/app/stock', icon: Package, label: 'Stock' },
  { to: '/app/clients', icon: Users, label: 'Clients' },
  { to: '/app/rapports', icon: BarChart3, label: 'Rapports' },
];

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
  const plan = boutique?.plan || 'starter';
  const planColors = { starter: 'badge-gray', pro: 'badge-green', business: 'badge-blue' };

  const NavItem = ({ to, icon: Icon, label, exact }) => (
    <NavLink to={to} end={exact}
      className={({ isActive }) =>
        'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ' +
        (isActive ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')
      }
      onClick={() => setSidebarOpen(false)}>
      <Icon size={18} />
      {label}
    </NavLink>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={
        'fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex flex-col transition-transform duration-300 ' +
        (sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')
      }>
        {/* Logo */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xl font-extrabold text-gray-900 dark:text-white">Gesto<span className="text-emerald-600">Caisse</span></span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 truncate max-w-[120px]">{boutique?.nom || '-'}</span>
                <span className={'badge text-xs ' + planColors[plan]}>{plan}</span>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-hide">
          {navItems.map(item => <NavItem key={item.to} {...item} />)}
          {user?.role === 'admin' && <NavItem to="/app/admin" icon={Shield} label="Admin" />}
        </nav>

        <div className="p-3 border-t border-gray-100 dark:border-gray-700 space-y-1">
          <NavItem to="/app/abonnement" icon={CreditCard} label="Abonnement" />
          <NavItem to="/app/parametres" icon={Settings} label="Parametres" />
          <NavLink to="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-all">
            <Home size={18}/> Accueil
          </NavLink>
          <button onClick={toggleTheme} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all">
            {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
            {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          </button>
          <button onClick={() => setShowDeconnexionModal(true)} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all">
            <LogOut size={18}/> Deconnexion
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-gray-100">
            <Menu size={20} />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            {plan === 'starter' && (
              <NavLink to="/app/abonnement" className="btn btn-sm btn-primary hidden sm:flex">
                ? Passer au Pro
              </NavLink>
            )}
            <div className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-emerald-700 font-bold text-sm">{user?.prenom?.[0]}{user?.nom?.[0]}</span>
                </div>
                <span className="hidden sm:block text-sm font-medium">{user?.prenom}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 w-52 z-50">
                  <div className="px-4 py-2 border-b border-gray-50">
                    <p className="text-sm font-semibold text-gray-900">{user?.prenom} {user?.nom}</p>
                    <p className="text-xs text-gray-400">{user?.email}</p>
                  </div>
                  <NavLink to="/app/parametres" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    <Settings size={14}/> Parametres
                  </NavLink>
                  <button onClick={toggleTheme} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    {theme === 'dark' ? <Sun size={14}/> : <Moon size={14}/>}
                    {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
                  </button>
                  <button onClick={() => { setShowDeconnexionModal(true); setProfileOpen(false); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                    <LogOut size={14}/> Deconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 dark:bg-gray-950">
          <Outlet />
        </main>
      </div>

      {/* Modal Deconnexion */}
      {showDeconnexionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in">
          <div className="card p-6 w-full max-w-sm card-shadow dark:bg-gray-800">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <LogOut size={24} className="text-red-600"/>
            </div>
            <h3 className="font-bold text-lg text-center text-gray-900 dark:text-white mb-2">Confirmer la deconnexion</h3>
            <p className="text-center text-gray-600 dark:text-gray-400 text-sm mb-6">
              Etes-vous sur de vouloir vous deconnecter de votre compte ?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeconnexionModal(false)} className="btn btn-secondary btn-md flex-1">
                Annuler
              </button>
              <button onClick={handleDeconnexion} className="btn btn-error btn-md flex-1">
                Deconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
