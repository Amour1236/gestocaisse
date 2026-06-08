import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import ThemeToggle from './components/ui/ThemeToggle';

import Accueil from './pages/Accueil';
import Layout from './components/layout/Layout';
import Connexion from './pages/auth/Connexion';
import Inscription from './pages/auth/Inscription';
import ConfirmerEmail from './pages/auth/ConfirmerEmail';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/Dashboard';
import Caisse from './pages/caisse/Caisse';
import HistoriqueVentes from './pages/ventes/HistoriqueVentes';
import Stock from './pages/stock/Stock';
import Clients from './pages/clients/Clients';
import Rapports from './pages/rapports/Rapports';
import Parametres from './pages/Parametres';
import Abonnement from './pages/Abonnement';
import AdminPanel from './pages/admin/AdminPanel';
import { Loader2 } from 'lucide-react';

const Protected = ({ children, roles }) => {
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
  return children;
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

const AppRoutes = () => {
  const location = useLocation();
  const showFloatingThemeToggle = !location.pathname.startsWith('/app');

  return (
    <>
      {showFloatingThemeToggle && <ThemeToggle floating />}
      <Toaster position="top-right" toastOptions={{
        duration: 3500,
        style: { borderRadius: '12px', fontFamily: 'Plus Jakarta Sans', fontSize: '14px', fontWeight: '600' },
        success: { iconTheme: { primary: '#059669', secondary: '#fff' } },
        error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
      }}/>
      <Routes>
        <Route path="/"                       element={<Accueil />} />
        <Route path="/connexion"              element={<Connexion />} />
        <Route path="/inscription"            element={<Inscription />} />
        <Route path="/confirmer-email/:token" element={<ConfirmerEmail />} />
        <Route path="/reset-password/:token"  element={<ResetPassword />} />
        <Route path="/mot-de-passe-oublie"    element={<ResetPassword mode="request" />} />

        <Route path="/app" element={<Protected><Layout /></Protected>}>
          <Route index                          element={<Dashboard />} />
          <Route path="caisse"                  element={<Caisse />} />
          <Route path="ventes"                  element={<HistoriqueVentes />} />
          <Route path="stock"                   element={<Stock />} />
          <Route path="clients"                 element={<Clients />} />
          <Route path="rapports"                element={<Rapports />} />
          <Route path="parametres"              element={<Parametres />} />
          <Route path="abonnement"              element={<Abonnement />} />
          <Route path="admin" element={<Protected roles={['admin']}><AdminPanel /></Protected>} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
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
