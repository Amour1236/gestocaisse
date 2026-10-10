import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Users, BarChart3,
  Clock, Menu,
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';

const navItems = [
  { to: '/app', icon: LayoutDashboard, label: 'Tableau' },
  { to: '/app/caisse', icon: ShoppingCart, label: 'Caisse' },
  { to: '/app/ventes', icon: Clock, label: 'Historique' },
  { to: '/app/stock', icon: Package, label: 'Stock' },
  { to: '/app/clients', icon: Users, label: 'Clients' },
  { to: '/app/rapports', icon: BarChart3, label: 'Rapports' },
];

export default function BottomNav() {
  const isMobile = useIsMobile();
  const location = useLocation();

  // Hide on non-mobile or on app sub-pages (except main nav items)
  if (!isMobile) return null;

  const isMainRoute = location.pathname === '/app' ||
    navItems.some(item => location.pathname.startsWith(item.to));

  if (!isMainRoute) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 shadow-lg">
      <div className="flex items-center justify-around py-1 safe-area-inset-bottom">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/app'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-[64px] ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`
            }
          >
            <item.icon size={20} />
            <span className="text-[10px] font-bold">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
