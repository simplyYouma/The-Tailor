/**
 * 📝 Note Service — Gestion des Post-its et Vocaux
 */
import { generateId } from '@/lib/generateId';
import { getDb } from '@/lib/db';
import type { OrderNote } from '@/types';

export async function addNote(orderId: string, type: 'text' | 'audio' | 'image' | 'mixed', content: string): Promise<OrderNote> {
  const db = await getDb();
  const id = generateId();

  await db.execute(
    `INSERT INTO order_notes (id, order_id, type, content) VALUES ($1, $2, $3, $4)`,
    [id, orderId, type, content]
  );

  const rows = await db.select<any[]>('SELECT * FROM order_notes WHERE id = $1', [id]);
  return rows[0];
}

export async function getNotesByOrder(orderId: string): Promise<OrderNote[]> {
  const db = await getDb();
  const rows = await db.select<any[]>(
    'SELECT * FROM order_notes WHERE order_id = $1 ORDER BY created_at ASC',
    [orderId]
  );
  return rows;
}

export async function deleteNote(noteId: string): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM order_notes WHERE id = $1`, [noteId]);
}
