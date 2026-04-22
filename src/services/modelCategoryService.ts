import { getDb } from '@/lib/db';
import { logAction } from './auditService';

export interface ModelCategoryRow {
  id: number;
  name: string;
  sequence: number;
  created_at?: string;
}

export async function getModelCategories(): Promise<ModelCategoryRow[]> {
  const db = await getDb();
  return db.select<ModelCategoryRow[]>('SELECT * FROM model_categories ORDER BY sequence ASC');
}

export async function addModelCategory(name: string): Promise<void> {
  const db = await getDb();
  const rows = await db.select<[{ maxSeq: number }]>(
    'SELECT COALESCE(MAX(sequence), 0) as maxSeq FROM model_categories'
  );
  const nextSeq = (rows[0]?.maxSeq || 0) + 1;
  await db.execute(
    'INSERT INTO model_categories (name, sequence) VALUES ($1, $2)',
    [name.trim(), nextSeq]
  );
  await logAction('CATEGORY_CREATE', 'model_categories', null, `Nouvelle catégorie: ${name}`);
}

export async function updateModelCategory(id: number, newName: string, oldName: string): Promise<void> {
  const db = await getDb();
  await db.execute('UPDATE model_categories SET name = $1 WHERE id = $2', [newName.trim(), id]);
  // Cascade rename on existing models so they remain selected
  await db.execute('UPDATE catalog_models SET category = $1 WHERE category = $2', [newName.trim(), oldName]);
  await logAction('CATEGORY_UPDATE', 'model_categories', id.toString(), `Renommage: ${oldName} → ${newName}`);
}

export async function deleteModelCategory(id: number, name: string): Promise<void> {
  const db = await getDb();
  const usage = await db.select<[{ count: number }]>(
    'SELECT COUNT(*) as count FROM catalog_models WHERE category = $1',
    [name]
  );
  if ((usage[0]?.count || 0) > 0) {
    throw new Error(`Catégorie utilisée par ${usage[0].count} modèle(s). Réassignez-les avant de supprimer.`);
  }
  await db.execute('DELETE FROM model_categories WHERE id = $1', [id]);
  await logAction('CATEGORY_DELETE', 'model_categories', id.toString(), `Suppression catégorie: ${name}`);
}

export async function reorderModelCategories(ordered: ModelCategoryRow[]): Promise<void> {
  const db = await getDb();
  for (let i = 0; i < ordered.length; i++) {
    await db.execute('UPDATE model_categories SET sequence = $1 WHERE id = $2', [i + 1, ordered[i].id]);
  }
}
