import { getDb } from '@/lib/db';
import { logAction } from './auditService';

export interface FabricTypeRow {
  id: number;
  name: string;
  sequence: number;
  created_at?: string;
}

export async function getFabricTypes(): Promise<FabricTypeRow[]> {
  const db = await getDb();
  return db.select<FabricTypeRow[]>('SELECT * FROM fabric_types ORDER BY sequence ASC');
}

export async function addFabricType(name: string): Promise<void> {
  const db = await getDb();
  const rows = await db.select<[{ maxSeq: number }]>(
    'SELECT COALESCE(MAX(sequence), 0) as maxSeq FROM fabric_types'
  );
  const nextSeq = (rows[0]?.maxSeq || 0) + 1;
  await db.execute(
    'INSERT INTO fabric_types (name, sequence) VALUES ($1, $2)',
    [name.trim(), nextSeq]
  );
  await logAction('FABRIC_TYPE_CREATE', 'fabric_types', null, `Nouveau type de tissu: ${name}`);
}

export async function updateFabricType(id: number, newName: string, oldName: string): Promise<void> {
  const db = await getDb();
  await db.execute('UPDATE fabric_types SET name = $1 WHERE id = $2', [newName.trim(), id]);
  // Cascade rename on existing fabrics
  await db.execute('UPDATE fabrics SET type = $1 WHERE type = $2', [newName.trim(), oldName]);
  await logAction('FABRIC_TYPE_UPDATE', 'fabric_types', id.toString(), `Renommage: ${oldName} → ${newName}`);
}

export async function deleteFabricType(id: number, name: string): Promise<void> {
  const db = await getDb();
  const usage = await db.select<[{ count: number }]>(
    'SELECT COUNT(*) as count FROM fabrics WHERE type = $1',
    [name]
  );
  if ((usage[0]?.count || 0) > 0) {
    throw new Error(`Type utilisé par ${usage[0].count} tissu(s). Réassignez-les avant de supprimer.`);
  }
  await db.execute('DELETE FROM fabric_types WHERE id = $1', [id]);
  await logAction('FABRIC_TYPE_DELETE', 'fabric_types', id.toString(), `Suppression type de tissu: ${name}`);
}

export async function reorderFabricTypes(ordered: FabricTypeRow[]): Promise<void> {
  const db = await getDb();
  for (let i = 0; i < ordered.length; i++) {
    await db.execute('UPDATE fabric_types SET sequence = $1 WHERE id = $2', [i + 1, ordered[i].id]);
  }
}
