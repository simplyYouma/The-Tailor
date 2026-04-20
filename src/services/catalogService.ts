/**
 * 🧵 Catalog Service — Vitrine de l'Artisan
 */
import { generateId } from '@/lib/generateId';
import { getDb } from '@/lib/db';
import type { CatalogModel, CatalogModelCreatePayload } from '@/types';

import { logAction, buildDiff } from './auditService';

function mapModel(row: any): CatalogModel {
  let paths: string[] = [];
  try {
    if (Array.isArray(row.image_paths)) {
      paths = row.image_paths;
    } else if (typeof row.image_paths === 'string') {
      paths = JSON.parse(row.image_paths);
    } else if (typeof row.image_path === 'string') { // fallback for old data before migration
      paths = [row.image_path];
    }
  } catch(e) { /* ignore */ }
  
  return {
    ...row,
    image_paths: paths
  };
}

export async function addModel(payload: CatalogModelCreatePayload): Promise<CatalogModel> {
  const id = generateId();
  const db = await getDb();
  
  const pathsStr = payload.image_paths ? JSON.stringify(payload.image_paths) : '[]';

  await db.execute(
    `INSERT INTO catalog_models (id, name, description, category, gender, price_ref, image_paths) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, payload.name, payload.description ?? '', payload.category, payload.gender, payload.price_ref, pathsStr]
  );

  await logAction('MODEL_CREATE', 'catalog_models', id, `Nouveau modèle ajouté: ${payload.name}`);

  const rows = await db.select<any[]>('SELECT * FROM catalog_models WHERE id = $1', [id]);
  return mapModel(rows[0]);
}

export async function getModels(category?: string, gender?: string): Promise<CatalogModel[]> {
  const db = await getDb();
  let query = 'SELECT * FROM catalog_models WHERE archived = 0';
  const params: any[] = [];
  let paramIdx = 1;

  if (category && category !== 'Tous') {
    query += ` AND category = $${paramIdx++}`;
    params.push(category);
  }
  
  if (gender && gender !== 'Tous') {
    query += ` AND gender = $${paramIdx++}`;
    params.push(gender);
  }

  query += ' ORDER BY created_at DESC';
  
  const rows = await db.select<any[]>(query, params);
  return rows.map(mapModel);
}

export async function getModelById(id: string): Promise<CatalogModel | null> {
  const db = await getDb();
  const rows = await db.select<any[]>('SELECT * FROM catalog_models WHERE id = $1', [id]);
  return rows[0] ? mapModel(rows[0]) : null;
}

export async function updateModel(id: string, payload: Partial<CatalogModelCreatePayload>): Promise<void> {
  const db = await getDb();
  const old = await getModelById(id);
  const updates: string[] = [];
  const params: any[] = [];
  let i = 1;

  if (payload.name) { updates.push(`name = $${i++}`); params.push(payload.name); }
  if (payload.description !== undefined) { updates.push(`description = $${i++}`); params.push(payload.description); }
  if (payload.category) { updates.push(`category = $${i++}`); params.push(payload.category); }
  if (payload.gender) { updates.push(`gender = $${i++}`); params.push(payload.gender); }
  if (payload.price_ref !== undefined) { updates.push(`price_ref = $${i++}`); params.push(payload.price_ref); }
  if (payload.image_paths) { updates.push(`image_paths = $${i++}`); params.push(JSON.stringify(payload.image_paths)); }

  if (updates.length === 0) return;

  params.push(id);
  await db.execute(
    `UPDATE catalog_models SET ${updates.join(', ')} WHERE id = $${i}`,
    params
  );

  const diff = old ? buildDiff(old, payload, ['name', 'category', 'gender', 'price_ref', 'description']) : '';
  await logAction('MODEL_UPDATE', 'catalog_models', id, `Modification modèle: ${old?.name || payload.name}${diff ? ` (${diff})` : ''}`);
}

export async function archiveModel(id: string): Promise<void> {
  const db = await getDb();
  const m = await getModelById(id);
  await logAction('MODEL_ARCHIVE', 'catalog_models', id, `Archivage du modèle: ${m?.name || id}`);
  await db.execute('UPDATE catalog_models SET archived = 1 WHERE id = $1', [id]);
}

export async function deleteModel(id: string): Promise<void> {
  const db = await getDb();
  const m = await getModelById(id);
  await logAction('MODEL_DELETE', 'catalog_models', id, `Suppression définitive du modèle: ${m?.name || id}`);
  await db.execute('DELETE FROM catalog_models WHERE id = $1', [id]);
}

export async function getModelCount(): Promise<number> {
  const db = await getDb();
  const rows = await db.select<[{ count: number }]>('SELECT COUNT(*) as count FROM catalog_models');
  return rows[0].count;
}
