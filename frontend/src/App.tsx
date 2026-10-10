import { lazy, Suspense, useEffect, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import ThemeToggle from './components/ui/ThemeToggle';
import PageTransition from './components/ui/PageTransition';
import { AnimatePresence } from 'framer-motion';

import Accueil from './pages/Accueil';
import Layout from './components/layout/Layout';
import Connexion from './pages/auth/Connexion';
import Inscription from './pages/auth/Inscription';
import { Loader2 } from 'lucide-react';
import { User } from './types';

const ConfirmerEmail = lazy(() => import('./pages/auth/ConfirmerEmail'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Caisse = lazy(() => import('./pages/caisse/Caisse'));
const HistoriqueVentes = lazy(() => import('./pages/ventes/HistoriqueVentes'));
const Stock = lazy(() => import('./pages/stock/Stock'));
const Inventaire = lazy(() => import('./pages/stock/Inventaire'));
const Bons = lazy(() => import('./pages/stock/Bons'));
const Fournisseurs = lazy(() => import('./pages/stock/Fournisseurs'));
const Commandes = lazy(() => import('./pages/stock/Commandes'));
const RapportsStock = lazy(() => import('./pages/stock/RapportsStock'));
const Clients = lazy(() => import('./pages/clients/Clients'));
const Rapports = lazy(() => import('./pages/rapports/Rapports'));
const Parametres = lazy(() => import('./pages/Parametres'));
const Abonnement = lazy(() => import('./pages/Abonnement'));
const AdminPanel = lazy(() => import('./pages/admin/AdminPanel'));

interface ProtectedProps {
  children?: ReactNode;
  roles?: User['role'][];
}

const Protected = ({ children, roles }: ProtectedProps) => {
  const { user, token, initialized } = useAuthStore();
  if (!initialized) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-600 dark:text-gray-300">
      <div className="flex items-center gap-3 font-semibold">
        <Loader2 size={20} className="animate-spin text-emerald-600" />
        Chargement de votre espace...
      </div>
    </div>
  );
  if (!token || !user) return <Navigate to="/connexion" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace />;
  return <>{children}</>;
};

const NotFound = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
    <div className="text-center max-w-md">
      <p className="text-sm font-bold text-emerald-600 mb-2">404</p>
      <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">Page introuvable</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">Cette page n'existe pas ou a ete deplacee.</p>
      <a href="/" className="btn btn-primary btn-md inline-flex">Retour a l'accueil</a>
    </div>
  </div>
);

const PageLoader = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-gray-500 dark:text-gray-300">
    <div className="flex items-center gap-3 font-semibold">
      <Loader2 size={20} className="animate-spin text-emerald-600" />
      Chargement...
    </div>
  </div>
);

const AppRoutes = () => {
  const location = useLocation();
  const showFloatingThemeToggle = !location?.pathname?.startsWith('/app');

  return (
    <>
      {showFloatingThemeToggle && <ThemeToggle floating />}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { borderRadius: '12px', fontFamily: 'Plus Jakarta Sans', fontSize: '14px', fontWeight: '600' },
          success: { iconTheme: { primary: '#059669', secondary: '#fff' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />
      <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.key}>
          <Route path="/" element={<PageTransition><Accueil /></PageTransition>} />
          <Route path="/connexion" element={<PageTransition><Connexion /></PageTransition>} />
          <Route path="/inscription" element={<PageTransition><Inscription /></PageTransition>} />
          <Route path="/confirmer-email/:token" element={<PageTransition><ConfirmerEmail /></PageTransition>} />
          <Route path="/reset-password/:token" element={<PageTransition><ResetPassword /></PageTransition>} />
          <Route path="/mot-de-passe-oublie" element={<PageTransition><ResetPassword mode="request" /></PageTransition>} />

          <Route path="/app" element={<Protected><Layout /></Protected>}>
            <Route index element={<PageTransition><Dashboard /></PageTransition>} />
            <Route path="caisse" element={<PageTransition><Caisse /></PageTransition>} />
            <Route path="ventes" element={<PageTransition><HistoriqueVentes /></PageTransition>} />
            <Route path="stock" element={<PageTransition><Stock /></PageTransition>} />
            <Route path="stock/inventaire" element={<PageTransition><Inventaire /></PageTransition>} />
            <Route path="stock/bons" element={<PageTransition><Bons /></PageTransition>} />
            <Route path="stock/fournisseurs" element={<PageTransition><Fournisseurs /></PageTransition>} />
            <Route path="stock/commandes" element={<PageTransition><Commandes /></PageTransition>} />
            <Route path="stock/rapports" element={<PageTransition><RapportsStock /></PageTransition>} />
            <Route path="clients" element={<PageTransition><Clients /></PageTransition>} />
            <Route path="rapports" element={<PageTransition><Rapports /></PageTransition>} />
            <Route path="parametres" element={<PageTransition><Parametres /></PageTransition>} />
            <Route path="abonnement" element={<PageTransition><Abonnement /></PageTransition>} />
            <Route path="admin" element={<Protected roles={['admin']}><PageTransition><AdminPanel /></PageTransition></Protected>} />
          </Route>
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </Suspense>
      </AnimatePresence>
    </>
  );
};

export default function App() {
  const { init } = useAuthStore();
  useEffect(() => { init(); }, [init]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
