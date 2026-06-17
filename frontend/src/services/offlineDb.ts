import Dexie, { Table } from 'dexie';
import { Produit, Client, LigneVente, Boutique, User } from '../types';

interface VenteQueue {
  local_id: string;
  boutique_id: string;
  payload: Record<string, unknown>;
  lignes_snapshot: LigneVente[];
  client_snapshot: Client | null;
  boutique_snapshot: Boutique | null;
  caissier_snapshot: User | null;
  total: number;
  total_final: number;
  statut: 'pending' | 'syncing' | 'synced' | 'conflict';
  erreur: string;
  created_at: string;
  synced_at: string | null;
}

interface SyncConflict {
  id: string;
  local_id: string;
  type: string;
  message?: string;
  payload?: Record<string, unknown>;
  lignes_snapshot?: LigneVente[];
  created_at: string;
}

interface QueueMeta {
  boutique_id?: string;
  lignes?: LigneVente[];
  client?: Client | null;
  boutique?: Boutique | null;
  caissier?: User | null;
  total?: number;
  total_final?: number;
}

interface SyncResult {
  synced: number;
  conflicts: number;
  failed: number;
}

class GestoCaisseDB extends Dexie {
  produits!: Table<Produit, string>;
  clients!: Table<Client, string>;
  ventes_queue!: Table<VenteQueue, string>;
  sync_conflicts!: Table<SyncConflict, string>;

  constructor() {
    super('gestocaisse_offline');
    this.version(1).stores({
      produits: 'id, boutique_id, code_barre, nom, updated_at',
      clients: 'id, boutique_id, nom, telephone',
      ventes_queue: 'local_id, boutique_id, statut, created_at',
      sync_conflicts: 'id, local_id, type, created_at',
    });
  }
}

export const offlineDb = new GestoCaisseDB();

const nowIso = () => new Date().toISOString();
const localId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const offlineStore = {
  async cacheCatalogue({ produits = [], clients = [] }: { produits?: Produit[]; clients?: Client[] }) {
    await offlineDb.transaction('rw', offlineDb.produits, offlineDb.clients, async () => {
      await offlineDb.produits.clear();
      await offlineDb.clients.clear();
      if (produits.length) await offlineDb.produits.bulkPut(produits);
      if (clients.length) await offlineDb.clients.bulkPut(clients);
    });
  },

  async getCatalogue(): Promise<{ produits: Produit[]; clients: Client[] }> {
    const [produits, clients] = await Promise.all([
      offlineDb.produits.orderBy('nom').toArray(),
      offlineDb.clients.orderBy('nom').toArray(),
    ]);
    return { produits, clients };
  },

  async getPendingCount(): Promise<number> {
    return offlineDb.ventes_queue.where('statut').equals('pending').count();
  },

  async getConflicts(): Promise<SyncConflict[]> {
    return offlineDb.sync_conflicts.orderBy('created_at').reverse().toArray();
  },

  async queueVente(payload: Record<string, unknown>, meta: QueueMeta = {}): Promise<VenteQueue> {
    const queued: VenteQueue = {
      local_id: localId(),
      boutique_id: meta.boutique_id || '',
      payload,
      lignes_snapshot: meta.lignes || [],
      client_snapshot: meta.client || null,
      boutique_snapshot: meta.boutique || null,
      caissier_snapshot: meta.caissier || null,
      total: meta.total || 0,
      total_final: meta.total_final || 0,
      statut: 'pending',
      erreur: '',
      created_at: nowIso(),
      synced_at: null,
    };

    await offlineDb.transaction('rw', offlineDb.ventes_queue, offlineDb.produits, async () => {
      await offlineDb.ventes_queue.add(queued);
      const lignes = (payload.lignes as Array<{ produit_id: string; quantite: number }>) || [];
      for (const ligne of lignes) {
        const produit = await offlineDb.produits.get(ligne.produit_id);
        if (produit) {
          await offlineDb.produits.update(ligne.produit_id, {
            stock_actuel: Math.max(0, Number(produit.stock_actuel || 0) - Number(ligne.quantite || 0)),
            updated_at: nowIso(),
          });
        }
      }
    });

    return queued;
  },

  async syncVentes(sendSale: (payload: Record<string, unknown>) => Promise<unknown>): Promise<SyncResult> {
    const pending = await offlineDb.ventes_queue
      .where('statut').anyOf('pending', 'syncing').sortBy('created_at');
    const result: SyncResult = { synced: 0, conflicts: 0, failed: 0 };

    for (const item of pending) {
      try {
        await offlineDb.ventes_queue.update(item.local_id, { statut: 'syncing', erreur: '' });
        await sendSale({ ...item.payload, local_id: item.local_id });
        await offlineDb.ventes_queue.update(item.local_id, { statut: 'synced', synced_at: nowIso(), erreur: '' });
        result.synced += 1;
      } catch (err: any) {
        const message = err.response?.data?.message || err.message || 'Synchronisation impossible.';
        const isConflict = /stock insuffisant|introuvable/i.test(message);
        await offlineDb.ventes_queue.update(item.local_id, {
          statut: isConflict ? 'conflict' : 'pending',
          erreur: message,
        });
        if (isConflict) {
          await offlineDb.sync_conflicts.put({
            id: `${item.local_id}-stock`,
            local_id: item.local_id,
            type: 'stock',
            message,
            payload: item.payload,
            lignes_snapshot: item.lignes_snapshot || [],
            created_at: nowIso(),
          });
          result.conflicts += 1;
        } else {
          result.failed += 1;
        }
      }
    }

    return result;
  },
};
