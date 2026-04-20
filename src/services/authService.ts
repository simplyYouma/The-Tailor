import { getDb } from '@/lib/db';
import type { User } from '@/types';
import { logAction } from './auditService';

/**
 * 🧵 Auth Service — Sécurité Atelier
 */

export async function getUsers(): Promise<User[]> {
  const db = await getDb();
  return db.select<User[]>('SELECT id, username, full_name, role, avatar_path, is_blocked, created_at FROM users ORDER BY role ASC');
}

export async function verifyPin(userId: string, pin: string): Promise<User | null> {
  const db = await getDb();
  const rows = await db.select<(User & { pin_hash: string })[]>(
    'SELECT * FROM users WHERE id = $1 AND pin_hash = $2',
    [userId, pin]
  );

  if (rows.length > 0) {
    const { pin_hash, ...user } = rows[0];
    await logAction('AUTH_LOGIN', 'users', user.id, `Connexion réussie: ${user.full_name}`);
    return user as User;
  }
  return null;
}

export async function upsertUser(user: Partial<User> & { pin?: string }): Promise<void> {
  const db = await getDb();
  const idValue = user.id || `u_${Date.now()}`;
  
  if (user.id) {
    // Update
    if (user.pin) {
      await db.execute(
        'UPDATE users SET full_name = $1, role = $2, avatar_path = $3, pin_hash = $4 WHERE id = $5',
        [user.full_name, user.role, user.avatar_path, user.pin, user.id]
      );
    } else {
      await db.execute(
        'UPDATE users SET full_name = $1, role = $2, avatar_path = $3 WHERE id = $4',
        [user.full_name, user.role, user.avatar_path, user.id]
      );
    }
    await logAction('USER_UPDATE', 'users', user.id, `Profil mis à jour: ${user.full_name} (${user.role})`);
  } else {
    // Insert
    await db.execute(
      'INSERT INTO users (id, username, full_name, role, avatar_path, pin_hash) VALUES ($1, $2, $3, $4, $5, $6)',
      [idValue, user.username || idValue, user.full_name, user.role, user.avatar_path, user.pin || '1234']
    );
    await logAction('USER_CREATE', 'users', idValue, `Nouveau collaborateur: ${user.full_name} (${user.role})`);
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const db = await getDb();
  await logAction('USER_DELETE', 'users', userId, `Suppression définitive du compte`);
  await db.execute('DELETE FROM users WHERE id = $1', [userId]);
}

export async function toggleUserBlockStatus(userId: string, isBlocked: boolean): Promise<void> {
  const db = await getDb();
  await db.execute('UPDATE users SET is_blocked = $1 WHERE id = $2', [isBlocked ? 1 : 0, userId]);
  await logAction(isBlocked ? 'USER_BLOCK' : 'USER_UNBLOCK', 'users', userId, `Accès ${isBlocked ? 'suspendu' : 'rétabli'}`);
}

/**
 * Pour l'admin : récupérer le PIN d'un utilisateur
 */
export async function getUserPin(userId: string): Promise<string> {
  const db = await getDb();
  const rows = await db.select<{ pin_hash: string }[]>('SELECT pin_hash FROM users WHERE id = $1', [userId]);
  return rows[0]?.pin_hash || '';
}
