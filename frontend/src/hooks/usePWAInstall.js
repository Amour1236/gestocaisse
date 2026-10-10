import { useEffect, useState, useCallback } from 'react';

/**
 * Hook pour gérer l'installation de la PWA sur Android/iOS
 * Utilise l'API InstallPrompt native du navigateur
 */
export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Vérifier si déjà installé
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isFullScreen = window.matchMedia('(display-mode: fullscreen)').matches;
      const isIOSStandalone = window.navigator && window.navigator.standalone === true;
      setIsInstalled(isStandalone || isFullScreen || isIOSStandalone);
    };

    checkInstalled();

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Afficher la bannière après 5 secondes (ne pas déranger immédiatement)
      const timer = setTimeout(() => {
        // Vérifier si l'utilisateur n'a pas déjà refusé
        const dismissed = localStorage.getItem('gc_install_dismissed');
        if (!dismissed) setShowBanner(true);
      }, 5000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Capter l'installation réussie
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installer = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  const dismisser = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem('gc_install_dismissed', new Date().toISOString());
  }, []);

  return {
    isInstalled,
    showBanner,
    installer,
    dismisser,
    canInstall: !!deferredPrompt,
  };
};

/**
 * Composant bannière d'installation PWA
 * Affiche une通知 invitant à installer l'app sur Android/iOS
 */
export function PWAInstallBanner() {
  const { showBanner, installer, dismisser, canInstall, isInstalled } = usePWAInstall();

  if (!showBanner || isInstalled) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'linear-gradient(135deg, #059669, #0284c7)',
        color: 'white',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '13px',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ flex: 1 }}>
        <strong>📱 Installer GestoCaisse</strong>
        <p style={{ margin: '2px 0 0', opacity: 0.9, fontSize: '12px' }}>
          Accédez rapidement depuis votre écran d'accueil — fonctionne hors ligne !
        </p>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        {canInstall && (
          <button
            onClick={installer}
            style={{
              background: 'white',
              color: '#059669',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontWeight: '700',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Installer
          </button>
        )}
        <button
          onClick={dismisser}
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
