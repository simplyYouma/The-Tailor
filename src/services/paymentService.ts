/**
 * 🧵 Payment Service — Caisse & Acomptes
 */
import { generateId } from '@/lib/generateId';
import { getDb } from '@/lib/db';
import type { Payment, PaymentCreatePayload } from '@/types';

export async function addPayment(payload: PaymentCreatePayload): Promise<Payment> {
  const id = generateId();
  const db = await getDb();

  await db.execute(
    `INSERT INTO payments_history (id, order_id, amount, method) VALUES ($1, $2, $3, $4)`,
    [id, payload.order_id, payload.amount, payload.method]
  );

  // Update advance_paid on the order
  await db.execute(
    `UPDATE orders SET advance_paid = advance_paid + $1 WHERE id = $2`,
    [payload.amount, payload.order_id]
  );

  const rows = await db.select<Payment[]>('SELECT * FROM payments_history WHERE id = $1', [id]);
  return rows[0];
}

export async function getPaymentsByOrder(orderId: string): Promise<Payment[]> {
  const db = await getDb();
  return db.select<Payment[]>(
    'SELECT * FROM payments_history WHERE order_id = $1 ORDER BY payment_date DESC',
    [orderId]
  );
}

export async function getBalance(orderId: string): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ total_price: number; advance_paid: number }[]>(
    'SELECT total_price, advance_paid FROM orders WHERE id = $1',
    [orderId]
  );
  if (rows.length === 0) return 0;
  return rows[0].total_price - rows[0].advance_paid;
}

export async function getPaymentsByDateRange(from: string, to: string): Promise<Payment[]> {
  const db = await getDb();
  // Join with orders, clients AND catalog_models to show WHO paid and WHAT model it is
  const rows = await db.select<(Payment & { model_image?: string, reference_images?: string })[]>(
    `SELECT p.*, c.name as client_name, m.image_paths as model_image, o.reference_images
     FROM payments_history p
     JOIN orders o ON p.order_id = o.id
     JOIN clients c ON o.client_id = c.id
     LEFT JOIN catalog_models m ON o.model_id = m.id
     WHERE DATE(p.payment_date) >= DATE($1) AND DATE(p.payment_date) <= DATE($2)
     ORDER BY p.payment_date DESC`,
    [from, to]
  );

  const payments: Payment[] = rows.map(r => {
    let img = null;
    try {
      if (r.model_image) {
        const paths = JSON.parse(r.model_image);
        if (paths.length > 0) img = paths[0];
      }
      if (!img && r.reference_images) {
        const paths = JSON.parse(r.reference_images);
        if (paths.length > 0) img = paths[0];
      }
    } catch (e) {
      console.error('Error parsing images for payment', e);
    }

    return {
      ...r,
      model_image: img || undefined,
      source: 'order',
    };
  });

  // Merge fabric sales as journal entries
  const fabricRows = await db.select<{
    id: string; fabric_id: string; customer_label: string;
    total: number; method: string; created_at: string; image_path: string | null;
  }[]>(
    `SELECT fs.id, fs.fabric_id, fs.customer_label, fs.total, fs.method, fs.created_at, f.image_path
     FROM fabric_sales fs
     LEFT JOIN fabrics f ON fs.fabric_id = f.id
     WHERE DATE(fs.created_at) >= DATE($1) AND DATE(fs.created_at) <= DATE($2)
     ORDER BY fs.created_at DESC`,
    [from, to]
  );

  const fabricAsPayments: Payment[] = fabricRows.map(r => ({
    id: r.id,
    order_id: r.id,
    amount: r.total,
    method: r.method as any,
    payment_date: r.created_at,
    client_name: r.customer_label,
    model_image: r.image_path || undefined,
    source: 'fabric',
  }));

  return [...payments, ...fabricAsPayments].sort(
    (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  );
}

export async function getPaymentsTotalByDateRange(from: string, to: string): Promise<number> {
  const db = await getDb();
  const rows = await db.select<[{ total: number }]>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM payments_history 
     WHERE DATE(payment_date) >= DATE($1) AND DATE(payment_date) <= DATE($2)`,
    [from, to]
  );
  return rows[0].total;
}

export async function getJournalStats(from: string, to: string) {
  const db = await getDb();
  const rows = await db.select<[{ total: number, count: number, avg: number }]> (
    `SELECT
      COALESCE(SUM(amount), 0) as total,
      COUNT(id) as count,
      COALESCE(AVG(amount), 0) as avg
     FROM payments_history
     WHERE DATE(payment_date) >= DATE($1) AND DATE(payment_date) <= DATE($2)`,
    [from, to]
  );
  const fRows = await db.select<[{ total: number, count: number }]>(
    `SELECT COALESCE(SUM(total), 0) as total, COUNT(id) as count
     FROM fabric_sales
     WHERE DATE(created_at) >= DATE($1) AND DATE(created_at) <= DATE($2)`,
    [from, to]
  );
  const total = (rows[0].total || 0) + (fRows[0].total || 0);
  const count = (rows[0].count || 0) + (fRows[0].count || 0);
  const avg = count > 0 ? total / count : 0;
  return { total, count, avg };
}
