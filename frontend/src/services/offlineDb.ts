import Dexie, { Table } from 'dexie';
import { Produit, Client, LigneVente, Boutique, User, Vente } from '../types';

// ─── TYPES ──────────────────────────────────────────────────────────────────

/** Une vente mise en file d'attente hors ligne */
export interface VenteQueue {
  local_id: string;
  remote_id: string | null;
  boutique_id: string;
  payload: Record<string, unknown>;
  lignes_snapshot: LigneVente[];
  client_snapshot: Client | null;
  boutique_snapshot: Boutique | null;
  caissier_snapshot: User | null;
  total: number;
  total_final: number;
  statut: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
  tentative: number;
  derniere_erreur: string;
  prochaine_tentative: string | null;
  created_at: string;
  synced_at: string | null;
}

/** Une action générique (update/delete/create) sur n'importe quelle entité */
export interface ActionQueue {
  local_id: string;
  boutique_id: string;
  entity: 'produits' | 'clients' | 'categories' | 'stock';
  type: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  entity_id: string | null;
  statut: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
  tentative: number;
  derniere_erreur: string;
  created_at: string;
  synced_at: string | null;
}

/** Un conflit de synchronisation à résoudre manuellement */
export interface SyncConflict {
  id: string;
  local_id: string;
  type: 'stock' | 'introuvable' | 'permission' | 'reseau' | 'autre';
  entity: string;
  message: string;
  payload: Record<string, unknown>;
  lignes_snapshot: LigneVente[];
  resolu: boolean;
  created_at: string;
}

/** Métadonnées pour la mise en file d'attente d'une vente */
export interface QueueVenteMeta {
  boutique_id: string;
  lignes: LigneVente[];
  client?: Client | null;
  boutique?: Boutique | null;
  caissier?: User | null;
  total: number;
  total_final: number;
}

/** Résultat d'une synchronisation */
export interface SyncResult {
  ventes: { synced: number; conflicts: number; failed: number; pending: number };
  actions: { synced: number; conflicts: number; failed: number; pending: number };
  duree_ms: number;
}

export type SendVenteFn = (payload: Record<string, unknown>) => Promise<{ data?: { id?: string; success?: boolean } }>;
export type SendActionFn = (action: ActionQueue) => Promise<unknown>;

// ─── BASE INDEXEDDB ─────────────────────────────────────────────────────────

class GestoCaisseDB extends Dexie {
  produits!: Table<Produit, string>;
  clients!: Table<Client, string>;
  ventes_queue!: Table<VenteQueue, string>;
  actions_queue!: Table<ActionQueue, string>;
  sync_conflicts!: Table<SyncConflict, string>;

  constructor() {
    super('gestocaisse_offline');
    this.version(2).stores({
      produits: 'id, boutique_id, code_barre, nom, updated_at',
      clients: 'id, boutique_id, nom, telephone',
      ventes_queue: 'local_id, boutique_id, statut, created_at, prochaine_tentative',
      actions_queue: 'local_id, boutique_id, statut, entity, created_at',
      sync_conflicts: 'id, local_id, type, resolu, created_at',
    });
  }
}

export const offlineDb = new GestoCaisseDB();

// ─── HELPERS ───────────────────────────────────────────────────────────────

const nowIso = () => new Date().toISOString();
const localId = (prefix = 'local') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** Calcul du délai de retry exponentiel (1s, 2s, 4s, 8s, 16s, 32s, max 5 min) */
const computeBackoff = (tentative: number): number => {
  const base = Math.min(2 ** tentative, 300);
  const jitter = Math.random() * 0.3 * base;
  return Math.round((base + jitter) * 1000);
};

// ─── STORE : CATALOGUE ─────────────────────────────────────────────────────

export const catalogue = {
  async cache({ produits = [], clients = [] }: { produits?: Produit[]; clients?: Client[] }) {
    await offlineDb.transaction('rw', offlineDb.produits, offlineDb.clients, async () => {
      if (produits.length) {
        await offlineDb.produits.clear();
        await offlineDb.produits.bulkPut(produits);
      }
      if (clients.length) {
        await offlineDb.clients.clear();
        await offlineDb.clients.bulkPut(clients);
      }
    });
  },

  async get(): Promise<{ produits: Produit[]; clients: Client[] }> {
    const [produits, clients] = await Promise.all([
      offlineDb.produits.orderBy('nom').toArray(),
      offlineDb.clients.orderBy('nom').toArray(),
    ]);
    return { produits, clients };
  },

  async updateStock(produitId: string, delta: number) {
    const produit = await offlineDb.produits.get(produitId);
    if (!produit) return;
    const newStock = Math.max(0, Number(produit.stock_actuel || 0) - delta);
    await offlineDb.produits.update(produitId, {
      stock_actuel: newStock,
      updated_at: nowIso(),
    });
  },
};

// ─── FILE D'ATTENTE : VENTES ───────────────────────────────────────────────

export const ventesOffline = {
  /** Met une vente en file d'attente (transaction atomique locale) */
  async queue(payload: Record<string, unknown>, meta: QueueVenteMeta): Promise<VenteQueue> {
    const queued: VenteQueue = {
      local_id: localId('vente'),
      remote_id: null,
      boutique_id: meta.boutique_id,
      payload,
      lignes_snapshot: meta.lignes || [],
      client_snapshot: meta.client || null,
      boutique_snapshot: meta.boutique || null,
      caissier_snapshot: meta.caissier || null,
      total: meta.total,
      total_final: meta.total_final,
      statut: 'pending',
      tentative: 0,
      derniere_erreur: '',
      prochaine_tentative: null,
      created_at: nowIso(),
      synced_at: null,
    };

    await offlineDb.transaction('rw', offlineDb.ventes_queue, offlineDb.produits, async () => {
      await offlineDb.ventes_queue.add(queued);
      const lignes = (payload.lignes as Array<{ produit_id: string; quantite: number }>) || [];
      for (const ligne of lignes) {
        await catalogue.updateStock(ligne.produit_id, Number(ligne.quantite || 0));
      }
    });

    return queued;
  },

  async getPending(): Promise<VenteQueue[]> {
    return offlineDb.ventes_queue
      .where('statut').anyOf('pending', 'syncing', 'failed')
      .sortBy('created_at');
  },

  async getReadyToRetry(): Promise<VenteQueue[]> {
    const now = new Date();
    const items = await offlineDb.ventes_queue
      .where('statut').anyOf('pending', 'failed')
      .toArray();
    return items.filter(item => {
      if (!item.prochaine_tentative) return true;
      return new Date(item.prochaine_tentative) <= now;
    });
  },

  async getPendingCount(): Promise<number> {
    return offlineDb.ventes_queue
      .where('statut').anyOf('pending', 'syncing', 'failed')
      .count();
  },

  async markSyncing(localId: string) {
    await offlineDb.ventes_queue.update(localId, {
      statut: 'syncing',
      derniere_erreur: '',
    });
  },

  async markSynced(localId: string, remoteId: string) {
    await offlineDb.ventes_queue.update(localId, {
      statut: 'synced',
      remote_id: remoteId,
      synced_at: nowIso(),
      derniere_erreur: '',
      prochaine_tentative: null,
    });
  },

  async markConflict(localId: string, message: string, type: SyncConflict['type']) {
    await offlineDb.ventes_queue.update(localId, {
      statut: 'conflict',
      derniere_erreur: message,
    });
  },

  async markRetry(localId: string, message: string, tentative: number) {
    const next = new Date(Date.now() + computeBackoff(tentative)).toISOString();
    await offlineDb.ventes_queue.update(localId, {
      statut: 'failed',
      derniere_erreur: message,
      tentative,
      prochaine_tentative: next,
    });
  },

  async getByLocalId(localId: string): Promise<VenteQueue | undefined> {
    return offlineDb.ventes_queue.get(localId);
  },

  async clearSynced() {
    const synced = await offlineDb.ventes_queue.where('statut').equals('synced').toArray();
    if (synced.length > 0) {
      // Conserve 7 jours d'historique
      const limite = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const aSupprimer = synced
        .filter(v => v.synced_at && new Date(v.synced_at).getTime() < limite)
        .map(v => v.local_id);
      if (aSupprimer.length > 0) {
        await offlineDb.ventes_queue.bulkDelete(aSupprimer);
      }
    }
  },
};

// ─── FILE D'ATTENTE : ACTIONS ──────────────────────────────────────────────

export const actionsOffline = {
  async queue(action: Omit<ActionQueue, 'local_id' | 'statut' | 'tentative' | 'derniere_erreur' | 'created_at' | 'synced_at'>): Promise<ActionQueue> {
    const queued: ActionQueue = {
      ...action,
      local_id: localId('action'),
      statut: 'pending',
      tentative: 0,
      derniere_erreur: '',
      created_at: nowIso(),
      synced_at: null,
    };
    await offlineDb.actions_queue.add(queued);
    return queued;
  },

  async getPending(): Promise<ActionQueue[]> {
    return offlineDb.actions_queue
      .where('statut').anyOf('pending', 'failed')
      .sortBy('created_at');
  },

  async getPendingCount(): Promise<number> {
    return offlineDb.actions_queue
      .where('statut').anyOf('pending', 'syncing', 'failed')
      .count();
  },

  async markSynced(localId: string) {
    await offlineDb.actions_queue.update(localId, {
      statut: 'synced',
      synced_at: nowIso(),
    });
  },

  async markRetry(localId: string, message: string, tentative: number) {
    await offlineDb.actions_queue.update(localId, {
      statut: 'failed',
      derniere_erreur: message,
      tentative,
    });
  },
};

// ─── CONFLITS ──────────────────────────────────────────────────────────────

export const conflits = {
  async add(conflict: Omit<SyncConflict, 'id' | 'resolu' | 'created_at'>) {
    await offlineDb.sync_conflicts.put({
      ...conflict,
      id: `${conflict.local_id}-${conflict.type}-${Date.now()}`,
      resolu: false,
      created_at: nowIso(),
    });
  },

  async getAll(): Promise<SyncConflict[]> {
    return offlineDb.sync_conflicts
      .where('resolu').equals(0 as any)
      .or('resolu').equals(false as any)
      .reverse()
      .sortBy('created_at')
      .catch(async () => {
        // Fallback si la requête complexe échoue
        const all = await offlineDb.sync_conflicts.toArray();
        return all.filter(c => !c.resolu).sort((a, b) => b.created_at.localeCompare(a.created_at));
      });
  },

  async getCount(): Promise<number> {
    const all = await offlineDb.sync_conflicts.toArray();
    return all.filter(c => !c.resolu).length;
  },

  async resolve(id: string) {
    await offlineDb.sync_conflicts.update(id, { resolu: true });
  },

  async resolveAll() {
    const all = await offlineDb.sync_conflicts.toArray();
    const unresolved = all.filter(c => !c.resolu);
    await Promise.all(unresolved.map(c => this.resolve(c.id)));
  },
};

// ─── MOTEUR DE SYNCHRONISATION ─────────────────────────────────────────────

export const syncEngine = {
  /**
   * Synchronise TOUT (ventes + actions) vers l'API
   * - Idempotent : peut être appelé plusieurs fois sans dupliquer
   * - Robuste : continue même si une vente échoue
   * - Limité : max 5 tentatives par élément
   */
  async syncTout(options: {
    sendVente: SendVenteFn;
    sendAction: SendActionFn;
    maxVentes?: number;
  }): Promise<SyncResult> {
    const start = Date.now();
    const maxVentes = options.maxVentes || 50;
    const MAX_TENTATIVES = 5;

    const result: SyncResult = {
      ventes: { synced: 0, conflicts: 0, failed: 0, pending: 0 },
      actions: { synced: 0, conflicts: 0, failed: 0, pending: 0 },
      duree_ms: 0,
    };

    // ─── VENTES ───
    const ventesAEnvoyer = (await ventesOffline.getReadyToRetry()).slice(0, maxVentes);

    for (const item of ventesAEnvoyer) {
      // Idempotence : si déjà synchronisée avec un remote_id, on ne renvoie pas
      if (item.statut === 'synced' && item.remote_id) continue;
      if (item.tentative >= MAX_TENTATIVES) {
        // Trop de tentatives : marquer en conflit permanent
        await ventesOffline.markConflict(
          item.local_id,
          `Échec après ${MAX_TENTATIVES} tentatives : ${item.derniere_erreur}`,
          'autre',
        );
        await conflits.add({
          local_id: item.local_id,
          type: 'autre',
          entity: 'ventes',
          message: `Échec définitif après ${MAX_TENTATIVES} tentatives`,
          payload: item.payload,
          lignes_snapshot: item.lignes_snapshot,
        });
        result.ventes.conflicts += 1;
        continue;
      }

      await ventesOffline.markSyncing(item.local_id);

      try {
        const response = await options.sendVente({
          ...item.payload,
          local_id: item.local_id,
        });
        const remoteId = (response as any)?.data?.id || (response as any)?.data?.data?.id;
        await ventesOffline.markSynced(item.local_id, remoteId || '');
        result.ventes.synced += 1;
      } catch (err: any) {
        const message = err?.response?.data?.message || err?.message || 'Synchronisation impossible.';
        const status = err?.response?.status;

        // Conflit métier (stock, introuvable, permission) → arrêt définitif
        if (/stock insuffisant|introuvable|non trouv|permission|forbidden|402|404|403/i.test(message) || status === 402 || status === 404 || status === 403) {
          const type: SyncConflict['type'] = /stock/i.test(message) ? 'stock' : /introuvable|trouv/i.test(message) ? 'introuvable' : 'permission';
          await ventesOffline.markConflict(item.local_id, message, type);
          await conflits.add({
            local_id: item.local_id,
            type,
            entity: 'ventes',
            message,
            payload: item.payload,
            lignes_snapshot: item.lignes_snapshot,
          });
          result.ventes.conflicts += 1;
        } else {
          // Erreur transitoire → retry avec backoff
          const nouvelleTentative = item.tentative + 1;
          await ventesOffline.markRetry(item.local_id, message, nouvelleTentative);
          result.ventes.failed += 1;
        }
      }
    }

    // ─── ACTIONS ───
    const actionsAEnvoyer = (await actionsOffline.getPending()).slice(0, maxVentes);

    for (const action of actionsAEnvoyer) {
      if (action.tentative >= MAX_TENTATIVES) {
        await actionsOffline.markRetry(action.local_id, 'Trop de tentatives', MAX_TENTATIVES);
        result.actions.failed += 1;
        continue;
      }

      try {
        await options.sendAction(action);
        await actionsOffline.markSynced(action.local_id);
        result.actions.synced += 1;
      } catch (err: any) {
        const message = err?.response?.data?.message || err?.message || 'Erreur action';
        await actionsOffline.markRetry(action.local_id, message, action.tentative + 1);
        result.actions.failed += 1;
      }
    }

    // Nettoyage des ventes synchronisées > 7 jours
    await ventesOffline.clearSynced();

    result.ventes.pending = await ventesOffline.getPendingCount();
    result.actions.pending = await actionsOffline.getPendingCount();
    result.duree_ms = Date.now() - start;

    return result;
  },
};

// ─── UTILITAIRES EXPORTÉS ─────────────────────────────────────────────────

/** Convertit une vente locale en "Vente" compatible UI (avec marqueur local) */
export const venteLocaleVersUI = (item: VenteQueue): Vente & { local: true; local_id: string } => ({
  id: item.remote_id || item.local_id,
  numero: item.local_id,
  mode_paiement: (item.payload.mode_paiement as any) || 'especes',
  total: item.total,
  remise: Number(item.payload.remise || 0),
  total_final: item.total_final,
  montant_recu: item.payload.montant_recu as any,
  client_id: item.payload.client_id as string | undefined,
  client: item.client_snapshot || undefined,
  caissier_id: item.caissier_snapshot?.id,
  notes: item.payload.notes as string | undefined,
  created_at: item.created_at,
  lignes: item.lignes_snapshot,
  boutique: item.boutique_snapshot || undefined,
  local: true,
  local_id: item.local_id,
});

// ─── EXPORT PAR DÉFAUT (rétro-compatibilité) ───────────────────────────────

export const offlineStore = {
  cacheCatalogue: catalogue.cache,
  getCatalogue: catalogue.get,
  getPendingCount: async () => {
    const v = await ventesOffline.getPendingCount();
    const a = await actionsOffline.getPendingCount();
    return v + a;
  },
  getConflicts: conflits.getAll,
  queueVente: (payload: Record<string, unknown>, meta: Partial<QueueVenteMeta> = {}) => {
    return ventesOffline.queue(payload, {
      boutique_id: meta.boutique_id || '',
      lignes: meta.lignes || [],
      client: meta.client,
      boutique: meta.boutique,
      caissier: meta.caissier,
      total: meta.total || 0,
      total_final: meta.total_final || 0,
    });
  },
  syncVentes: async (sendSale: SendVenteFn) => {
    const r = await syncEngine.syncTout({
      sendVente: sendSale,
      sendAction: async () => {}, // pas d'actions dans l'ancien mode
    });
    return { synced: r.ventes.synced, conflicts: r.ventes.conflicts, failed: r.ventes.failed };
  },
};
