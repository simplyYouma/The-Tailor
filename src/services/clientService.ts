/**
 * 🧵 Client Service — CRM Couture
 * Conformément au AI Vibe Coding Standard §3.1 : Domain logic isolated from UI.
 */
import { generateId } from '@/lib/generateId';
import { getDb } from '@/lib/db';
import type { Client, ClientCreatePayload } from '@/types';
import { logAction, buildDiff } from './auditService';

export async function createClient(payload: ClientCreatePayload): Promise<Client> {
  const id = generateId();
  const db = await getDb();

  await db.execute(
    `INSERT INTO clients (id, name, phone, address, gender, portrait_path) VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, payload.name, payload.phone, payload.address ?? '', payload.gender, payload.portrait_path ?? null]
  );

  await logAction('CLIENT_CREATE', 'clients', id, `Nouveau dossier client: ${payload.name}`);

  const rows = await db.select<Client[]>('SELECT * FROM clients WHERE id = $1', [id]);
  return rows[0];
}

export async function getClients(search?: string): Promise<Client[]> {
  const db = await getDb();

  if (search && search.trim().length > 0) {
    const term = `%${search.trim()}%`;
    return db.select<Client[]>(
      `SELECT * FROM clients WHERE name LIKE $1 OR phone LIKE $1 ORDER BY created_at DESC`,
      [term]
    );
  }

  return db.select<Client[]>('SELECT * FROM clients ORDER BY created_at DESC');
}

export async function getClientById(id: string): Promise<Client | null> {
  const db = await getDb();
  const rows = await db.select<Client[]>('SELECT * FROM clients WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function updateClient(id: string, payload: Partial<ClientCreatePayload>): Promise<void> {
  const db = await getDb();
  const old = await getClientById(id);
  
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (payload.name !== undefined) { fields.push(`name = $${idx++}`); values.push(payload.name); }
  if (payload.phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(payload.phone); }
  if (payload.address !== undefined) { fields.push(`address = $${idx++}`); values.push(payload.address); }
  if (payload.gender !== undefined) { fields.push(`gender = $${idx++}`); values.push(payload.gender); }
  if (payload.portrait_path !== undefined) { fields.push(`portrait_path = $${idx++}`); values.push(payload.portrait_path); }

  if (fields.length === 0) return;

  values.push(id);
  await db.execute(`UPDATE clients SET ${fields.join(', ')} WHERE id = $${idx}`, values);
  
  const diff = old ? buildDiff(old, payload, ['name', 'phone', 'address', 'gender']) : '';
  await logAction('CLIENT_UPDATE', 'clients', id, `Modification dossier: ${old?.name || payload.name}${diff ? ` (${diff})` : ''}`);
}

export async function deleteClient(id: string): Promise<void> {
  const db = await getDb();
  const c = await getClientById(id);
  const identity = c ? `${c.name} (${c.phone})` : id;
  
  await logAction('CLIENT_DELETE', 'clients', id, `Suppression dossier client: ${identity}`);
  await db.execute('DELETE FROM clients WHERE id = $1', [id]);
}

export async function getClientCount(): Promise<number> {
  const db = await getDb();
  const rows = await db.select<[{ count: number }]>('SELECT COUNT(*) as count FROM clients');
  return rows[0].count;
}
