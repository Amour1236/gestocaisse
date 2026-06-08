import Dexie from 'dexie';

export const offlineDb = new Dexie('gestocaisse_offline');

offlineDb.version(1).stores({
  produits: 'id, boutique_id, code_barre, nom, updated_at',
  clients: 'id, boutique_id, nom, telephone',
  ventes_queue: 'local_id, boutique_id, statut, created_at',
  sync_conflicts: 'id, local_id, type, created_at',
});

const nowIso = () => new Date().toISOString();
const localId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const offlineStore = {
  async cacheCatalogue({ produits = [], clients = [] }) {
    await offlineDb.transaction('rw', offlineDb.produits, offlineDb.clients, async () => {
      await offlineDb.produits.clear();
      await offlineDb.clients.clear();
      if (produits.length) await offlineDb.produits.bulkPut(produits);
      if (clients.length) await offlineDb.clients.bulkPut(clients);
    });
  },

  async getCatalogue() {
    const [produits, clients] = await Promise.all([
      offlineDb.produits.orderBy('nom').toArray(),
      offlineDb.clients.orderBy('nom').toArray(),
    ]);
    return { produits, clients };
  },

  async getPendingCount() {
    return offlineDb.ventes_queue.where('statut').equals('pending').count();
  },

  async getConflicts() {
    return offlineDb.sync_conflicts.orderBy('created_at').reverse().toArray();
  },

  async queueVente(payload, meta = {}) {
    const queued = {
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
      for (const ligne of payload.lignes || []) {
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

  async syncVentes(sendSale) {
    const pending = await offlineDb.ventes_queue.where('statut').anyOf('pending', 'syncing').sortBy('created_at');
    const result = { synced: 0, conflicts: 0, failed: 0 };

    for (const item of pending) {
      try {
        await offlineDb.ventes_queue.update(item.local_id, { statut: 'syncing', erreur: '' });
        await sendSale({ ...item.payload, local_id: item.local_id });
        await offlineDb.ventes_queue.update(item.local_id, { statut: 'synced', synced_at: nowIso(), erreur: '' });
        result.synced += 1;
      } catch (err) {
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
