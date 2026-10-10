import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

/**
 * Bannière globale de statut de synchronisation
 * À placer dans le Layout principal
 */
export const SyncBanner = () => {
  const { enLigne, navigatorOnline, apiOnline, syncing, compteurs, derniereSync, syncMaintenant } = useOnlineStatus();

  // Rien à afficher si tout va bien et aucun élément en attente
  if (enLigne && compteurs.pending === 0 && compteurs.conflicts === 0 && !syncing) {
    return null;
  }

  // ─── HORS LIGNE ───
  if (!enLigne) {
    return (
      <div
        data-testid="sync-banner-offline"
        className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700 px-4 py-2 text-sm font-semibold flex items-center gap-3 text-amber-900 dark:text-amber-100"
      >
        <WifiOff size={18} className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="block truncate">
            Mode hors ligne actif
            {compteurs.ventes > 0 && (
              <span className="ml-2">
                — {compteurs.ventes} vente{compteurs.ventes > 1 ? 's' : ''} en attente
              </span>
            )}
          </span>
          <span className="block text-xs font-normal text-amber-700 dark:text-amber-200">
            {!navigatorOnline ? 'Pas de réseau détecté' : 'API injoignable — vérifiez votre connexion'}
          </span>
        </div>
        {compteurs.conflicts > 0 && (
          <div className="hidden sm:flex items-center gap-1 text-red-700 dark:text-red-300">
            <AlertCircle size={14} />
            <span className="text-xs">{compteurs.conflicts} conflit{compteurs.conflicts > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    );
  }

  // ─── CONFLITS ───
  if (compteurs.conflicts > 0) {
    return (
      <div
        data-testid="sync-banner-conflict"
        className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-700 px-4 py-2 text-sm font-semibold flex items-center gap-3 text-red-900 dark:text-red-100"
      >
        <AlertCircle size={18} className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="block truncate">
            {compteurs.conflicts} conflit{compteurs.conflicts > 1 ? 's' : ''} de synchronisation à résoudre
          </span>
          <span className="block text-xs font-normal text-red-700 dark:text-red-200">
            Ouvrez Paramètres → Synchronisation pour gérer
          </span>
        </div>
        <button
          onClick={syncMaintenant}
          disabled={syncing}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
          Réessayer
        </button>
      </div>
    );
  }

  // ─── EN LIGNE AVEC PENDING ───
  if (compteurs.pending > 0 || syncing) {
    return (
      <div
        data-testid="sync-banner-syncing"
        className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700 px-4 py-2 text-sm font-semibold flex items-center gap-3 text-blue-900 dark:text-blue-100"
      >
        {syncing ? (
          <RefreshCw size={18} className="flex-shrink-0 animate-spin" />
        ) : (
          <Clock size={18} className="flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <span className="block truncate">
            {syncing
              ? 'Synchronisation en cours...'
              : `${compteurs.pending} élément${compteurs.pending > 1 ? 's' : ''} en attente`}
          </span>
          {derniereSync && !syncing && (
            <span className="block text-xs font-normal text-blue-700 dark:text-blue-200">
              Dernière sync : {new Date(derniereSync).toLocaleTimeString('fr-FR')}
            </span>
          )}
        </div>
        {!syncing && (
          <button
            onClick={syncMaintenant}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
          >
            <RefreshCw size={12} />
            Synchroniser
          </button>
        )}
      </div>
    );
  }

  // ─── EN LIGNE, RIEN À FAIRE (cas rare après sync réussie) ───
  return (
    <div
      data-testid="sync-banner-ok"
      className="bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-700 px-4 py-1.5 text-xs font-semibold flex items-center gap-2 text-emerald-800 dark:text-emerald-200"
    >
      <CheckCircle2 size={14} className="flex-shrink-0" />
      <Wifi size={14} className="flex-shrink-0" />
      <span>Synchronisé</span>
      {derniereSync && (
        <span className="text-emerald-600 dark:text-emerald-300 font-normal">
          — dernière sync : {new Date(derniereSync).toLocaleTimeString('fr-FR')}
        </span>
      )}
    </div>
  );
};

export default SyncBanner;
