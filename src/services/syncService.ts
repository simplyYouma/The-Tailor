/**
 * 🧵 Sync Service — Magic Link / Yumi Hub Relay
 * Gère la synchronisation des statuts de commande vers le Hub
 * pour que le client puisse suivre via QR Code.
 */
import { getDb } from '@/lib/db';
import type { SyncQueueItem } from '@/types';

const HUB_API = import.meta.env.VITE_YUMI_HUB_URL || 'http://localhost:4000/api';
const PROJECT_ID = import.meta.env.VITE_YUMI_PROJECT_ID || '';

/**
 * Push un changement de statut vers le Yumi Hub.
 * Le Hub met à jour la page de tracking publique.
 */
export async function pushStatusToHub(trackingId: string, status: string): Promise<boolean> {
  try {
    const res = await fetch(`${HUB_API}/tracking/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tracking_id: trackingId,
        status,
        project_id: PROJECT_ID,
      }),
      cache: 'no-store',
    });

    if (res.ok) {
      // Marquer comme synced dans la DB locale
      const db = await getDb();
      await db.execute(
        `UPDATE sync_queue SET is_synced = 1, attempted_at = CURRENT_TIMESTAMP 
         WHERE order_id = (SELECT id FROM orders WHERE tracking_id = $1) AND status_to_sync = $2 AND is_synced = 0`,
        [trackingId, status]
      );
      return true;
    }

    return false;
  } catch {
    console.warn('[Sync] Hub unreachable. Status queued for later.');
    return false;
  }
}

/**
 * Traite la file d'attente de synchronisation.
 * Appelée périodiquement ou quand la connexion revient.
 */
export async function processSyncQueue(): Promise<number> {
  const db = await getDb();
  const pending = await db.select<SyncQueueItem[]>(
    `SELECT sq.*, o.tracking_id 
     FROM sync_queue sq 
     JOIN orders o ON sq.order_id = o.id 
     WHERE sq.is_synced = 0 
     ORDER BY sq.id ASC 
     LIMIT 10`
  );

  let synced = 0;

  for (const item of pending) {
    const trackingId = (item as SyncQueueItem & { tracking_id: string }).tracking_id;
    const success = await pushStatusToHub(trackingId, item.status_to_sync);
    if (success) synced++;
    else break; // Si un échoue, pas la peine de continuer (réseau down)
  }

  return synced;
}

/**
 * Retourne l'URL de tracking pour un QR Code.
 */
export function getTrackingUrl(trackingId: string): string {
  const hubBase = HUB_API.replace('/api/verify', '').replace('/api', '');
  return `${hubBase}/track/${trackingId}`;
}

/**
 * Démarre le worker de sync périodique.
 */
export function startSyncWorker(): () => void {
  const interval = setInterval(async () => {
    if (navigator.onLine) {
      await processSyncQueue();
    }
  }, 60_000); // Toutes les 60 secondes

  // Sync immédiate quand la connexion revient
  const onlineHandler = () => { processSyncQueue(); };
  window.addEventListener('online', onlineHandler);

  return () => {
    clearInterval(interval);
    window.removeEventListener('online', onlineHandler);
  };
}
