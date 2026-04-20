import { getDb } from '../lib/db';
import type { Fabric, FabricCreatePayload } from '../types';
import { generateId } from '../lib/generateId';
import { logAction, buildDiff } from './auditService';

export async function getFabrics(): Promise<Fabric[]> {
  const db = await getDb();
  return await db.select<Fabric[]>('SELECT * FROM fabrics ORDER BY created_at DESC');
}

export async function getFabricById(id: string): Promise<Fabric | null> {
  const db = await getDb();
  const rows = await db.select<Fabric[]>('SELECT * FROM fabrics WHERE id = $1', [id]);
  return rows.length > 0 ? rows[0] : null;
}

export async function createFabric(payload: FabricCreatePayload): Promise<Fabric> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO fabrics (id, name, type, price_per_meter, stock_quantity, image_path, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, payload.name, payload.type, payload.price_per_meter, payload.stock_quantity, payload.image_path, now]
  );

  await logAction('FABRIC_CREATE', 'fabrics', id, `Nouveau tissu ajouté: ${payload.name} (${payload.type})`);

  return {
    id,
    ...payload,
    image_path: payload.image_path ?? null,
    created_at: now
  };
}

export async function updateFabricStock(id: string, amount: number): Promise<void> {
  const db = await getDb();
  const f = await getFabricById(id);
  const name = f ? f.name : 'Inconnu';

  await db.execute(
    'UPDATE fabrics SET stock_quantity = stock_quantity + $1 WHERE id = $2',
    [amount, id]
  );
  
  await logAction('STOCK_ADJUST', 'fabrics', id, `Ajustement de stock [${name}] (ID: #${id.slice(0, 8)}) : ${amount > 0 ? '+' : ''}${amount}m`);
}

export async function updateFabric(id: string, payload: FabricCreatePayload): Promise<void> {
  const db = await getDb();
  const old = await getFabricById(id);
  
  await db.execute(
    `UPDATE fabrics 
     SET name = $1, type = $2, price_per_meter = $3, stock_quantity = $4, image_path = $5
     WHERE id = $6`,
    [payload.name, payload.type, payload.price_per_meter, payload.stock_quantity, payload.image_path, id]
  );

  const diff = old ? buildDiff(old, payload, ['name', 'type', 'price_per_meter', 'stock_quantity']) : `Infos: ${payload.name}`;
  await logAction('FABRIC_UPDATE', 'fabrics', id, `Modification de: ${payload.name}${diff ? ` (${diff})` : ''}`);
}

export async function deleteFabric(id: string): Promise<void> {
  const db = await getDb();
  const f = await getFabricById(id);
  const identity = f ? `${f.name} (${f.type})` : id;
  
  await logAction('FABRIC_DELETE', 'fabrics', id, `Suppression définitive du tissu: ${identity}`);
  await db.execute('DELETE FROM fabrics WHERE id = $1', [id]);
}
