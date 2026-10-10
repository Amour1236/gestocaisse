import { useEffect, useRef, useState, useCallback } from 'react';
import { syncEngine, ventesOffline, actionsOffline, conflits } from '../services/offlineDb';
import { ventesAPI } from '../services/api';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface Compteurs {
  pending: number;
  conflicts: number;
  ventes: number;
  actions: number;
}

interface UseOnlineStatusOptions {
  /** Intervalle de ping API en ms (défaut: 30s) */
  intervalPing?: number;
  /** Activer la sync auto au retour de connexion (défaut: true) */
  autoSync?: boolean;
}

/**
 * Hook global de surveillance online/offline + synchronisation.
 *
 * Surveille :
 * - L'état online/offline du navigateur
 * - L'état online/offline de l'API (ping périodique)
 * - Déclenche la synchronisation automatique au retour du réseau
 * - Expose les compteurs et actions à l'UI
 */
export const useOnlineStatus = ({
  intervalPing = 30_000,
  autoSync = true,
}: UseOnlineStatusOptions = {}) => {
  const [navigatorOnline, setNavigatorOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [apiOnline, setApiOnline] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [compteurs, setCompteurs] = useState<Compteurs>({
    pending: 0,
    conflicts: 0,
    ventes: 0,
    actions: 0,
  });
  const [derniereSync, setDerniereSync] = useState<string | null>(null);
  const [derniereErreur, setDerniereErreur] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncEnCours = useRef<boolean>(false);

  /** Met à jour les compteurs depuis IndexedDB */
  const refreshCounters = useCallback(async () => {
    try {
      const [ventes, actions, conflicts] = await Promise.all([
        ventesOffline.getPendingCount(),
        actionsOffline.getPendingCount(),
        conflits.getCount(),
      ]);
      setCompteurs({
        pending: ventes + actions,
        conflicts: conflicts,
        ventes,
        actions,
      });
    } catch {
      // silencieux
    }
  }, []);

  /** Ping l'API pour vérifier qu'elle répond */
  const pingApi = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setApiOnline(false);
      return;
    }
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(`${API_BASE}/health`, { signal: ctrl.signal });
      clearTimeout(t);
      setApiOnline(res.ok);
    } catch {
      setApiOnline(false);
    }
  }, []);

  /** Lance une synchronisation complète */
  const syncMaintenant = useCallback(async () => {
    if (syncEnCours.current) return { skipped: true };
    if (!navigatorOnline || !apiOnline) {
      return { skipped: true, raison: 'hors_ligne' };
    }

    syncEnCours.current = true;
    setSyncing(true);
    setDerniereErreur(null);

    try {
      const resultat = await syncEngine.syncTout({
        sendVente: async (payload) => {
          const res = await ventesAPI.creer(payload as any);
          return res as any;
        },
        sendAction: async (action) => {
          // Route l'action vers le bon endpoint
          const method = action.type === 'delete' ? 'DELETE' : action.type === 'update' ? 'PATCH' : 'POST';
          const url = action.entity_id && action.type !== 'create'
            ? `${API_BASE}/${action.entity}/${action.entity_id}`
            : `${API_BASE}/${action.entity}`;
          const token = localStorage.getItem('gc_token') || '';
          await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(action.payload),
          });
        },
      });

      setDerniereSync(new Date().toISOString());
      await refreshCounters();

      // Notifications
      const total = resultat.ventes.synced + resultat.actions.synced;
      if (total > 0) {
        toast.success(
          `Synchronisation OK — ${resultat.ventes.synced} vente(s), ${resultat.actions.synced} action(s) en ${(resultat.duree_ms / 1000).toFixed(1)}s`,
          { duration: 4000 },
        );
      }
      if (resultat.ventes.conflicts > 0) {
        toast.error(`${resultat.ventes.conflicts} conflit(s) de stock à résoudre`, { duration: 6000 });
      }
      if (resultat.ventes.failed > 0 && resultat.ventes.synced === 0) {
        toast.error(`Échec de ${resultat.ventes.failed} vente(s) — nouvelle tentative automatique`);
      }

      return resultat;
    } catch (e: any) {
      setDerniereErreur(e?.message || 'Erreur inconnue');
      toast.error('Échec de synchronisation.');
      return { error: e?.message };
    } finally {
      setSyncing(false);
      syncEnCours.current = false;
    }
  }, [navigatorOnline, apiOnline, refreshCounters]);

  // ─── EFFETS ────────────────────────────────────────────────────────────

  // Surveillance online/offline + ping périodique
  useEffect(() => {
    const handleOnline = () => {
      setNavigatorOnline(true);
      pingApi();
    };
    const handleOffline = () => {
      setNavigatorOnline(false);
      setApiOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    pingApi();
    refreshCounters();
    intervalRef.current = setInterval(() => {
      pingApi();
      refreshCounters();
    }, intervalPing);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pingApi, refreshCounters, intervalPing]);

  // Sync automatique au retour du réseau
  useEffect(() => {
    if (autoSync && navigatorOnline && apiOnline && !syncing) {
      // Petit délai pour éviter de spammer l'API
      const timer = setTimeout(() => {
        syncMaintenant();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [navigatorOnline, apiOnline, autoSync, syncing, syncMaintenant]);

  // Refresh périodique des compteurs quand on est online
  useEffect(() => {
    if (!navigatorOnline || !apiOnline) return;
    const t = setInterval(refreshCounters, 5000);
    return () => clearInterval(t);
  }, [navigatorOnline, apiOnline, refreshCounters]);

  const enLigne = navigatorOnline && apiOnline;

  return {
    navigatorOnline,
    apiOnline,
    enLigne,
    syncing,
    compteurs,
    derniereSync,
    derniereErreur,
    syncMaintenant,
    refreshCounters,
  };
};
