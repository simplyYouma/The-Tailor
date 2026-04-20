/**
 * 🧵 Measurement Service — Cabinet de Mesures
 * EAV pattern as required by Yumi Hub Skill.
 */
import { getDb } from '@/lib/db';
import type { MeasurementType, MeasurementEntry } from '@/types';
import { logAction } from './auditService';

export async function getMeasurementTypes(): Promise<MeasurementType[]> {
  const db = await getDb();
  return db.select<MeasurementType[]>(
    'SELECT * FROM measurement_types ORDER BY sequence ASC'
  );
}

export async function addCustomMeasurementType(
  label: string,
  keyName: string,
  category: string
): Promise<MeasurementType> {
  const db = await getDb();

  // Determine next sequence number
  const rows = await db.select<[{ maxSeq: number }]>(
    'SELECT COALESCE(MAX(sequence), 0) as maxSeq FROM measurement_types'
  );
  const nextSeq = rows[0].maxSeq + 1;

  await db.execute(
    `INSERT INTO measurement_types (label, key_name, category, sequence) VALUES ($1, $2, $3, $4)`,
    [label, keyName, category, nextSeq]
  );

  const result = await db.select<MeasurementType[]>(
    'SELECT * FROM measurement_types WHERE key_name = $1',
    [keyName]
  );
  const newType = result[0];
  await logAction('MEASUREMENT_CREATE', 'measurement_types', newType.id?.toString(), `Nouveau type de mesure: ${label} (${category})`);
  return newType;
}

export async function saveOrderMeasurements(
  orderId: string,
  measurements: { type_id: number; value: number }[]
): Promise<void> {
  const db = await getDb();

  // Clear existing measurements for this order
  await db.execute('DELETE FROM order_measurements WHERE order_id = $1', [orderId]);

  // Insert all measurements
  for (const m of measurements) {
    if (m.value > 0) {
      await db.execute(
        `INSERT INTO order_measurements (order_id, type_id, value) VALUES ($1, $2, $3)`,
        [orderId, m.type_id, m.value]
      );
    }
  }
}

export async function saveClientMeasurements(
  clientId: string,
  measurements: { type_id: number; value: number }[]
): Promise<void> {
  const db = await getDb();

  await db.execute('DELETE FROM client_measurements WHERE client_id = $1', [clientId]);

  for (const m of measurements) {
    if (m.value > 0) {
      await db.execute(
        `INSERT INTO client_measurements (client_id, type_id, value) VALUES ($1, $2, $3)`,
        [clientId, m.type_id, m.value]
      );
    }
  }
}

export async function getClientMeasurements(clientId: string): Promise<MeasurementEntry[]> {
  const db = await getDb();
  return db.select<MeasurementEntry[]>(
    `SELECT cm.type_id, mt.label, mt.key_name, cm.value
     FROM client_measurements cm
     JOIN measurement_types mt ON cm.type_id = mt.id
     WHERE cm.client_id = $1
     ORDER BY mt.sequence ASC`,
    [clientId]
  );
}

export async function getOrderMeasurements(orderId: string): Promise<MeasurementEntry[]> {
  const db = await getDb();
  return db.select<MeasurementEntry[]>(
    `SELECT om.type_id, mt.label, mt.key_name, om.value
     FROM order_measurements om
     JOIN measurement_types mt ON om.type_id = mt.id
     WHERE om.order_id = $1
     ORDER BY mt.sequence ASC`,
    [orderId]
  );
}

export async function updateMeasurementType(type: MeasurementType): Promise<void> {
  const db = await getDb();
  await db.execute(
    'UPDATE measurement_types SET label = $1, sequence = $2 WHERE id = $3',
    [type.label, type.sequence, type.id]
  );
  await logAction('MEASUREMENT_UPDATE', 'measurement_types', type.id?.toString(), `Mise à jour mesure : ${type.label} (Séquence: ${type.sequence})`);
}

export async function deleteMeasurementType(id: number): Promise<void> {
  const db = await getDb();
  await logAction('MEASUREMENT_DELETE', 'measurement_types', id.toString(), `Suppression définitive d'un type de mesure`);
  await db.execute('DELETE FROM measurement_types WHERE id = $1', [id]);
}
