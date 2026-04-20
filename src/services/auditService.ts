import { getDb } from '@/lib/db';
import { useAuthStore } from '@/store/authStore';
import type { AuditLog } from '@/types';

/**
 * 📜 THE TAILOR — Audit Service
 * Centralizes all professional activity tracking.
 */

export async function logAction(
  action: string, 
  entityType?: string, 
  entityId?: string, 
  details?: any
) {
  try {
    const db = await getDb();
    const currentUser = useAuthStore.getState().currentUser;

    const log: Partial<AuditLog> = {
      id: crypto.randomUUID(),
      user_id: currentUser?.id || 'system',
      user_name: currentUser?.full_name || 'Système',
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      details: typeof details === 'string' ? details : JSON.stringify(details),
    };

    await db.execute(
      `INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [log.id, log.user_id, log.user_name, log.action, log.entity_type, log.entity_id, log.details]
    );
  } catch (error) {
    console.error("[Audit] Failed to log action:", error);
  }
}

/**
 * 🛠️ Build Diff: Creates a clear string of changes (Old -> New).
 */
export function buildDiff(oldData: any, newData: any, fields: string[]): string {
  const changes: string[] = [];
  for (const field of fields) {
    const oldVal = oldData[field];
    const newVal = newData[field];

    // Deep comparison for objects/arrays
    const isDifferent = typeof oldVal === 'object' && oldVal !== null
      ? JSON.stringify(oldVal) !== JSON.stringify(newVal)
      : oldVal !== newVal;

    if (newVal !== undefined && isDifferent) {
      const displayOld = typeof oldVal === 'object' ? JSON.stringify(oldVal) : (oldVal ?? 'Vide');
      const displayNew = typeof newVal === 'object' ? JSON.stringify(newVal) : newVal;
      changes.push(`${field.toUpperCase()}: "${displayOld}" → "${displayNew}"`);
    }
  }
  return changes.join(', ');
}

export async function getLogs(limit: number = 100, offset: number = 0): Promise<AuditLog[]> {
  try {
    const db = await getDb();
    return await db.select<AuditLog[]>(
      `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
  } catch (error) {
    console.error("[Audit] Failed to fetch logs:", error);
    return [];
  }
}

/**
 * 🧹 Auto-Pruning: Deletes logs older than 30 days.
 */
export async function pruneOldLogs(): Promise<number> {
  try {
    const db = await getDb();
    // SQLite: date('now', '-30 days')
    const result = await db.execute(
      `DELETE FROM audit_logs WHERE created_at < datetime('now', '-30 days')`
    );
    if (result.rowsAffected > 0) {
        console.log(`[Audit] Pruned ${result.rowsAffected} old logs.`);
        await logAction('SYSTEM_PRUNE', 'audit_logs', undefined, { pruned_count: result.rowsAffected });
    }
    return result.rowsAffected;
  } catch (error) {
    console.error("[Audit] Pruning failed:", error);
    return 0;
  }
}

/**
 * 💣 Nuclear Option: Deletes EVERYTHING.
 */
export async function clearLogs(): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(`DELETE FROM audit_logs`);
    await logAction('SYSTEM_RESET_LOGS', 'audit_logs', undefined, "Purge totale manuelle du journal d'audit.");
  } catch (error) {
    console.error("[Audit] Clear failed:", error);
  }
}
