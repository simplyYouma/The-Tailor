/**
 * 🧵 Order Service — Confection & Suivi
 * Core business logic: order lifecycle, status transitions, tracking.
 */
import { generateId } from '@/lib/generateId';
import { getDb } from '@/lib/db';
import type { Order, OrderCreatePayload, OrderStatus } from '@/types';
import { pushStatusToHub } from '@/services/syncService';
import * as noteService from '@/services/noteService';
import { logAction } from './auditService';

function mapOrder(row: any): Order {
  let images: string[] = [];
  try {
    if (row.reference_images) {
      if (Array.isArray(row.reference_images)) {
        images = row.reference_images;
      } else if (typeof row.reference_images === 'string') {
        images = JSON.parse(row.reference_images);
      }
    }
  } catch (e) {
    images = [];
  }

  let modelImages: string[] = [];
  try {
    if (row.model_images) {
      if (Array.isArray(row.model_images)) {
        modelImages = row.model_images;
      } else if (typeof row.model_images === 'string') {
        modelImages = JSON.parse(row.model_images);
      }
    }
  } catch (e) {
    modelImages = [];
  }
  
  return {
    ...row,
    reference_images: images,
    model_images: modelImages
  };
}

export async function createOrder(payload: OrderCreatePayload, payMethod: string = 'Cash'): Promise<Order> {
  const id = generateId();
  const trackingId = generateId();
  const db = await getDb();

  const refImgStr = payload.reference_images ? JSON.stringify(payload.reference_images) : '[]';

  await db.execute(
    `INSERT INTO orders (id, client_id, model_id, fabric_id, fabric_amount_used, fabric_photo_path, audio_note_path, reference_images, description, status, total_price, advance_paid, delivery_date, tracking_id, sync_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      id,
      payload.client_id,
      payload.model_id ?? null,
      payload.fabric_id ?? null,
      payload.fabric_amount_used ?? 0,
      payload.fabric_photo_path ?? null,
      payload.audio_note_path ?? null,
      refImgStr,
      payload.description ?? '',
      'Réception',
      payload.total_price,
      payload.advance_paid ?? 0,
      payload.delivery_date ?? null,
      trackingId,
      'pending'
    ]
  );

  // Enregistrer le premier acompte s'il y en a un
  if (payload.advance_paid && payload.advance_paid > 0) {
    const payId = generateId();
    await db.execute(
      `INSERT INTO payments_history (id, order_id, amount, method) VALUES ($1, $2, $3, $4)`,
      [payId, id, payload.advance_paid, payMethod]
    );
  }

  // Ajouter à la file de sync Hub
  await db.execute(
    `INSERT INTO sync_queue (order_id, status_to_sync) VALUES ($1, 'Réception')`,
    [id]
  );

  // 4. Synchroniser la description et le vocal sur le mur de notes (Post-its)
  if (payload.description?.trim() || payload.audio_note_path) {
    const hasText = payload.description?.trim();
    const hasAudio = payload.audio_note_path;

    if (hasText && hasAudio) {
      await noteService.addNote(id, 'mixed', JSON.stringify({ 
        text: payload.description?.trim(), 
        audio: payload.audio_note_path 
      }));
    } else if (hasText) {
      await noteService.addNote(id, 'text', payload.description!.trim());
    } else if (hasAudio) {
      await noteService.addNote(id, 'audio', payload.audio_note_path!);
    }
  }

  await logAction('ORDER_CREATE', 'orders', id, `Nouvelle commande créée (Réf: ${trackingId})`);

  const rows = await db.select<any[]>('SELECT * FROM orders WHERE id = $1', [id]);
  return mapOrder(rows[0]);
}

export async function updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<void> {
  const db = await getDb();
  
  // 1. Fetch info BEFORE update to have the correct "old" state and human-readable info
  const rows = await db.select<any[]>(
    `SELECT o.status, o.tracking_id, c.name as client_name 
     FROM orders o 
     JOIN clients c ON o.client_id = c.id 
     WHERE o.id = $1`, 
    [orderId]
  );
  const oldData = rows[0];

  await db.execute(
    `UPDATE orders SET 
      status = $1, 
      status_updated_at = CURRENT_TIMESTAMP,
      sync_status = 'pending' 
     WHERE id = $2`,
    [newStatus, orderId]
  );

  // 2. Sync and log
  await db.execute(
    `INSERT INTO sync_queue (order_id, status_to_sync) VALUES ($1, $2)`,
    [orderId, newStatus]
  );

  if (navigator.onLine && oldData) {
    pushStatusToHub(oldData.tracking_id, newStatus).catch(() => {});
  }

  if (oldData) {
    const ref = oldData.tracking_id;
    const client = oldData.client_name;
    const transition = `${oldData.status} → ${newStatus}`;
    await logAction(
      'ORDER_STATUS_UPDATE', 
      'orders', 
      orderId, 
      `Statut commande [Ref: ${ref}] ${client} : ${transition}`
    );
  }
}

export async function updateOrderModel(orderId: string, modelId: string | null, referenceImages: string[]): Promise<void> {
  const db = await getDb();
  let imgStr = '[]';
  try {
    imgStr = JSON.stringify(referenceImages);
  } catch(e) {}

  await db.execute(
    `UPDATE orders SET model_id = $1, reference_images = $2 WHERE id = $3`,
    [modelId, imgStr, orderId]
  );
}

export async function getOrders(statusFilter?: OrderStatus): Promise<Order[]> {
  const db = await getDb();

  const query = `
    SELECT 
      o.*, 
      c.name as client_name, 
      m.name as model_name, 
      m.category as model_category,
      m.image_paths as model_images
    FROM orders o
    LEFT JOIN clients c ON o.client_id = c.id
    LEFT JOIN catalog_models m ON o.model_id = m.id
    ${statusFilter ? 'WHERE o.status = $1' : ''}
    ORDER BY o.created_at DESC
  `;

  if (statusFilter) {
    const rows = await db.select<any[]>(query, [statusFilter]);
    return rows.map(mapOrder);
  }

  const rows = await db.select<any[]>(query);
  return rows.map(mapOrder);
}

export async function getOrderById(id: string): Promise<Order | null> {
  const db = await getDb();
  const rows = await db.select<any[]>(
    `SELECT o.*, c.name as client_name 
     FROM orders o 
     JOIN clients c ON o.client_id = c.id 
     WHERE o.id = $1`, 
    [id]
  );
  return rows[0] ? mapOrder(rows[0]) : null;
}

export async function getOrdersByClient(clientId: string): Promise<Order[]> {
  const db = await getDb();
  const rows = await db.select<any[]>(
    `SELECT o.*, f.image_path as fabric_image 
     FROM orders o
     LEFT JOIN fabrics f ON o.fabric_id = f.id
     WHERE o.client_id = $1 
     ORDER BY o.created_at DESC`,
    [clientId]
  );
  return rows.map(mapOrder);
}

export async function getActiveOrderCount(): Promise<number> {
  const db = await getDb();
  const rows = await db.select<[{ count: number }]>(
    `SELECT COUNT(*) as count FROM orders WHERE status != 'Livré'`
  );
  return rows[0].count;
}

export async function getOrdersByStatus(): Promise<Record<OrderStatus, number>> {
  const db = await getDb();
  const rows = await db.select<{ status: OrderStatus; count: number }[]>(
    `SELECT status, COUNT(*) as count FROM orders GROUP BY status`
  );

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.status] = row.count;
  }
  return result as Record<OrderStatus, number>;
}
export async function updateOrderDeliveryDate(orderId: string, newDate: string | null): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE orders SET delivery_date = $1, sync_status = 'pending' WHERE id = $2`,
    [newDate, orderId]
  );
}

export async function addPayment(orderId: string, amount: number, method: string): Promise<void> {
  const db = await getDb();
  const payId = generateId();

  // 1. Enregistrer le paiement dans l'historique
  await db.execute(
    `INSERT INTO payments_history (id, order_id, amount, method) VALUES ($1, $2, $3, $4)`,
    [payId, orderId, amount, method]
  );

  // 2. Mettre à jour l'avance totale sur la commande
  await db.execute(
    `UPDATE orders SET advance_paid = advance_paid + $1, sync_status = 'pending' WHERE id = $2`,
    [amount, orderId]
  );

  const order = await getOrderById(orderId);
  const shortRef = order?.tracking_id ? order.tracking_id.substring(0, 4).toUpperCase() : orderId.substring(0, 4).toUpperCase();
  const clientInfo = order?.client_name ? ` de ${order.client_name}` : '';
  
  await logAction('PAYMENT_ADD', 'orders', orderId, `Paiement ${amount} CFA (${method}) sur ${shortRef}${clientInfo}`);
}

export async function deletePayment(orderId: string, paymentId: string, amount: number): Promise<void> {
  const db = await getDb();
  
  // 1. Supprimer de l'historique
  await db.execute('DELETE FROM payments_history WHERE id = $1', [paymentId]);

  // 2. Décompter de l'avance réglée sur la commande
  await db.execute(
    `UPDATE orders SET advance_paid = advance_paid - $1, sync_status = 'pending' WHERE id = $2`,
    [amount, orderId]
  );
}

export async function getPaymentsByOrder(orderId: string): Promise<any[]> {
  const db = await getDb();
  return await db.select<any[]>(
    'SELECT * FROM payments_history WHERE order_id = $1 ORDER BY payment_date DESC',
    [orderId]
  );
}

export async function updateOrderTotalPrice(orderId: string, newTotal: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE orders SET total_price = $1, sync_status = 'pending' WHERE id = $2`,
    [newTotal, orderId]
  );
}

export async function cancelOrder(orderId: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE orders SET status = 'Annulé', sync_status = 'pending' WHERE id = $1`,
    [orderId]
  );
}

export async function deleteOrder(id: string): Promise<void> {
  const db = await getDb();
  
  // 1. Fetch info before deletion
  const rows = await db.select<any[]>(
    `SELECT o.tracking_id, c.name as client_name 
     FROM orders o 
     JOIN clients c ON o.client_id = c.id 
     WHERE o.id = $1`, 
    [id]
  );
  const info = rows[0];
  const ref = info ? `[Ref: ${info.tracking_id}] ${info.client_name}` : id;
  
  await logAction('ORDER_DELETE', 'orders', id, `Suppression commande ${ref}`);
  await db.execute('DELETE FROM orders WHERE id = $1', [id]);
}

/**
 * 🛠️ Migration : Transfert les anciennes notes/desc vers le mur de Post-its.
 * Une seule exécution suffit.
 */
export async function migrateLegacyNotes(): Promise<number> {
  const db = await getDb();
  const legacyOrders = await db.select<any[]>(
    `SELECT id, description, audio_note_path FROM orders 
     WHERE (description IS NOT NULL AND description != '') 
        OR (audio_note_path IS NOT NULL AND audio_note_path != '')`
  );

  let migratedCount = 0;

  for (const order of legacyOrders) {
    const existingNotes = await noteService.getNotesByOrder(order.id);
    if (existingNotes.length > 0) continue; // Déjà migré ou a des notes

    const hasText = order.description?.trim();
    const hasAudio = order.audio_note_path;

    if (hasText && hasAudio) {
      await noteService.addNote(order.id, 'mixed', JSON.stringify({ text: hasText, audio: hasAudio }));
      migratedCount++;
    } else if (hasText) {
      await noteService.addNote(order.id, 'text', hasText);
      migratedCount++;
    } else if (hasAudio) {
      await noteService.addNote(order.id, 'audio', hasAudio);
      migratedCount++;
    }
  }

  return migratedCount;
}
