import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

/**
 * Detect if running inside Tauri or plain browser.
 */
export function isTauri(): boolean {
  return !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__;
}

// ─── In-Memory Mock DB for browser dev ─────────────────────────────
// Allows the UI to render without crashing outside Tauri.

interface MockRow { [key: string]: unknown; }

function createMockDb() {
  const STORAGE_KEY = 'yumi_tailor_mock_db';
  const saved = localStorage.getItem(STORAGE_KEY);

  let tables: Record<string, MockRow[]> = saved ? JSON.parse(saved) : {
    clients: [],
    catalog_models: [],
    orders: [],
    order_measurements: [],
    client_measurements: [],
    payments_history: [],
    order_notes: [],
    sync_queue: [],
    fabrics: [],
    fabric_sales: [],
    audit_logs: [],
    settings: [
      { key: 'atelier_name', value: 'The Tailor' },
      { key: 'atelier_slogan', value: 'L’élégance sur mesure' },
      { key: 'atelier_phone', value: '+223 00 00 00 00' },
      { key: 'atelier_address', value: 'Bamako, Mali' },
      { key: 'atelier_logo', value: null },
      { key: 'maintenance_mode', value: '0' },
      { key: 'role_permissions', value: JSON.stringify({
          admin: ['dashboard', 'clients', 'kanban', 'fabrics', 'catalog', 'agenda', 'finance', 'settings'],
          manager: ['dashboard', 'clients', 'kanban', 'fabrics', 'catalog', 'agenda'],
          employee: ['kanban', 'agenda']
      })},
    ],
    users: [
      { id: 'admin', username: 'admin', full_name: 'Admin Atelier', role: 'admin', pin_hash: '0000', is_blocked: 0, created_at: new Date().toISOString() },
      { id: 'team', username: 'equipe', full_name: 'Équipe Production', role: 'employee', pin_hash: '1234', is_blocked: 0, created_at: new Date().toISOString() },
    ],
    fabric_types: [
      { id: 1, name: 'Bazin Riche', sequence: 1 },
      { id: 2, name: 'Wax', sequence: 2 },
      { id: 3, name: 'Brode', sequence: 3 },
      { id: 4, name: 'Brocart', sequence: 4 },
      { id: 5, name: 'Lépi', sequence: 5 },
      { id: 6, name: 'Soie', sequence: 6 },
      { id: 7, name: 'Lin', sequence: 7 },
      { id: 8, name: 'Laine', sequence: 8 },
      { id: 9, name: 'Coton', sequence: 9 },
      { id: 10, name: 'Dentelle', sequence: 10 },
      { id: 11, name: 'Autre', sequence: 11 },
    ],
    model_categories: [
      { id: 1, name: 'Boubou', sequence: 1 },
      { id: 2, name: 'Bazin', sequence: 2 },
      { id: 3, name: 'Costume', sequence: 3 },
      { id: 4, name: 'Robe', sequence: 4 },
      { id: 5, name: 'Robe de Mariée', sequence: 5 },
      { id: 6, name: 'Ligne Homme', sequence: 6 },
      { id: 7, name: 'Abaya', sequence: 7 },
      { id: 8, name: 'Chemise', sequence: 8 },
      { id: 9, name: 'Pantalon', sequence: 9 },
      { id: 10, name: 'Jupe', sequence: 10 },
      { id: 11, name: 'Ensemble', sequence: 11 },
      { id: 12, name: 'Autre', sequence: 12 },
    ],
    measurement_types: [
      { id: 1, label: 'Encolure', key_name: 'neck', category: 'Haut', sequence: 1 },
      { id: 2, label: 'Poitrine', key_name: 'chest', category: 'Haut', sequence: 2 },
      { id: 3, label: 'Épaules', key_name: 'shoulders', category: 'Haut', sequence: 3 },
      { id: 4, label: 'Longueur Bras', key_name: 'arm_length', category: 'Haut', sequence: 4 },
      { id: 5, label: 'Tour de Taille', key_name: 'waist', category: 'Bas', sequence: 5 },
      { id: 6, label: 'Longueur Bazin / Robe', key_name: 'full_length', category: 'Bas', sequence: 6 },
      { id: 7, label: 'Tour de Bras (Biceps)', key_name: 'biceps', category: 'Haut', sequence: 7 },
      { id: 8, label: 'Bassin', key_name: 'hips', category: 'Bas', sequence: 8 },
    ],
  };
  
  // ─── Migrations for Mock Data ───
  // Ensure existing entries in localStorage get new columns
  tables.orders = (tables.orders || []).map(o => ({
    ...o,
    status_updated_at: o.status_updated_at || o.created_at || new Date().toISOString()
  }));

  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));

  let autoInc = Date.now(); // Use timestamp to avoid collisions

  /**
   * Naive SQL parser for the mock — handles basic INSERT, SELECT, UPDATE, DELETE.
   */
  function parseTableName(sql: string): string | null {
    const match = sql.match(/(?:FROM|INTO|UPDATE|DELETE FROM)\s+(\w+)/i);
    return match ? match[1] : null;
  }

  return {
    async execute(sql: string, params?: unknown[]): Promise<{ rowsAffected: number }> {
      const table = parseTableName(sql);
      const upperSql = sql.trim().toUpperCase();

      // Skip CREATE TABLE / schema DDL
      if (upperSql.startsWith('CREATE') || upperSql.startsWith('--')) {
        return { rowsAffected: 0 };
      }

      if (upperSql.startsWith('INSERT') && table && tables[table]) {
        // Build a row from params
        const colMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
        if (colMatch && params) {
          const cols = colMatch[1].split(',').map((c) => c.trim());
          const row: MockRow = { id: params[0] ?? String(++autoInc) };
          cols.forEach((col, i) => { row[col] = params[i] ?? null; });
          // Add defaults
          if (!row.created_at) row.created_at = new Date().toISOString();
          if (!row.payment_date && table === 'payments_history') row.payment_date = new Date().toISOString();
          if (table === 'orders') {
            row.status = row.status ?? 'Réception';
            row.sync_status = row.sync_status ?? 'pending';
            row.advance_paid = row.advance_paid ?? 0;
            row.status_updated_at = row.status_updated_at ?? new Date().toISOString();
          }
          tables[table].push(row);
          save();
        }
        return { rowsAffected: 1 };
      }

      if (upperSql.startsWith('UPDATE') && table && tables[table] && params) {
        // Very naive update — just find by last param (id) and update
        const idVal = params[params.length - 1];
        const idx = tables[table].findIndex((r) => r.id === idVal || r.tracking_id === idVal);

        // Specific handling for tracking update
        if (upperSql.includes('UPDATE SYNC_QUEUE')) {
            const stat = params[1];
            // Naive sync queue update
            const qIdx = tables.sync_queue.findIndex(q => q.status_to_sync === stat && q.is_synced === 0);
            if(qIdx !== -1) {
              tables.sync_queue[qIdx].is_synced = 1;
              tables.sync_queue[qIdx].attempted_at = new Date().toISOString();
               save();
               return { rowsAffected: 1 };
            }
        }

        if (idx !== -1) {
          // For advance_paid += X pattern
          if (sql.includes('advance_paid + $1') || sql.includes('advance_paid +')) {
            tables[table][idx].advance_paid = (tables[table][idx].advance_paid as number || 0) + (params[0] as number);
          }
          if (sql.includes('status =')) {
            const tableData = tables[table];
            if (tableData[idx]) {
                tableData[idx].status = params[0];
                tableData[idx].status_updated_at = new Date().toISOString();
            }
          }
          save();
        }
        return { rowsAffected: 1 };
      }

      if (upperSql.startsWith('DELETE') && table && tables[table] && params) {
        const idVal = params[0];
        tables[table] = tables[table].filter((r) => r.id !== idVal && r.order_id !== idVal);
        save();
        return { rowsAffected: 1 };
      }

      return { rowsAffected: 0 };
    },

    async select<T>(sql: string, params?: unknown[]): Promise<T> {
      const table = parseTableName(sql);
      if (!table || !tables[table]) return [] as T;

      const upperSql = sql.trim().toUpperCase();

      let rows = [...tables[table]];

      // Avoid returning global tables for queries with JOIN that we don't handle
      // EXCEPTION: Allow orders/clients/models joins for dashboard and kanban
      if (sql.toUpperCase().includes('JOIN') && 
          !sql.includes('JOIN measurement_types') && 
          !sql.includes('JOIN clients') &&
          !sql.includes('JOIN catalog_models')) {
        return [] as T;
      }

      // WHERE id = $1
      if (params && params.length > 0 && sql.includes('WHERE')) {
        if (sql.includes('id = $1') && !sql.includes('order_id')) {
          rows = rows.filter((r) => r.id === params[0]);
        } else if (sql.includes('client_id = $1')) {
          rows = rows.filter((r) => r.client_id === params[0]);
        } else if (sql.includes('order_id = $1')) {
          rows = rows.filter((r) => r.order_id === params[0]);
        } else if (sql.includes('status = $1')) {
          rows = rows.filter((r) => r.status === params[0]);
        } else if (sql.includes('category = $1')) {
          rows = rows.filter((r) => r.category === params[0]);
        } else if (sql.includes('key_name = $1')) {
          rows = rows.filter((r) => r.key_name === params[0]);
        } else if (sql.includes('LIKE')) {
          const term = String(params[0]).replace(/%/g, '').toLowerCase();
          rows = rows.filter((r) =>
            String(r.name ?? '').toLowerCase().includes(term) ||
            String(r.phone ?? '').toLowerCase().includes(term)
          );
        }
      }

      // COUNT
      if (upperSql.includes('COUNT(*)')) {
        return [{ count: rows.length }] as T;
      }

      // SUM
      if (upperSql.includes('COALESCE(SUM(AMOUNT)')) {
        const sum = rows.reduce((s, r) => s + ((r.amount as number) || 0), 0);
        return [{ total: sum }] as T;
      }
      if (upperSql.includes('SUM(ADVANCE_PAID)') || upperSql.includes('SUM(advance_paid)')) {
        const sum = rows.reduce((s, r) => s + ((r.advance_paid as number) || 0), 0);
        return [{ total: sum }] as T;
      }
      if (upperSql.includes('SUM(TOTAL_PRICE') || upperSql.includes('SUM(total_price')) {
        const sum = rows.reduce((s, r) => s + ((r.total_price as number || 0) - (r.advance_paid as number || 0)), 0);
        return [{ total: sum }] as T;
      }
      if (upperSql.includes('MAX(SEQUENCE)') || upperSql.includes('MAX(sequence)')) {
        const maxSeq = rows.reduce((m, r) => Math.max(m, (r.sequence as number) || 0), 0);
        return [{ maxSeq }] as T;
      }

      // GROUP BY status
      if (upperSql.includes('GROUP BY') && upperSql.includes('STATUS')) {
        const groups: Record<string, number> = {};
        rows.forEach((r) => {
          const s = r.status as string;
          groups[s] = (groups[s] || 0) + 1;
        });
        return Object.entries(groups).map(([status, count]) => ({ status, count })) as T;
      }

      // ORDER BY
      if (upperSql.includes('ORDER BY') && upperSql.includes('DESC')) {
        rows.reverse();
      }
      if (upperSql.includes('ORDER BY') && upperSql.includes('SEQUENCE ASC')) {
        rows.sort((a, b) => ((a.sequence as number) || 0) - ((b.sequence as number) || 0));
      }

      // LIMIT
      const limitMatch = sql.match(/LIMIT\s+(\$?\d+)/i);
      if (limitMatch) {
        const lim = limitMatch[1].startsWith('$') && params
          ? Number(params[params.length - 1])
          : Number(limitMatch[1]);
        rows = rows.slice(0, lim);
      }

      // JOIN for measurements
      if (sql.includes('JOIN measurement_types')) {
        rows = rows.map((r) => {
          const mt = tables.measurement_types.find((t) => t.id === r.type_id);
          return { ...r, label: mt?.label ?? '', key_name: mt?.key_name ?? '' };
        });
      }

      // JOIN for orders: Add client and model info
      if (table === 'orders' && (sql.includes('JOIN clients') || sql.includes('JOIN catalog_models'))) {
        rows = rows.map((r) => {
          const client = tables.clients.find((c) => c.id === r.client_id);
          const model = tables.catalog_models.find((m) => m.id === r.model_id);
          return { 
            ...r, 
            client_name: client?.name ?? r.client_name ?? 'Client Inconnu',
            model_name: model?.name ?? r.model_name ?? '',
            model_category: model?.category ?? r.model_category ?? '',
            model_images: model?.image_paths ?? r.model_images ?? []
          };
        });
      }

      // Add basic aliases if needed (for Mock compatibility)
      // If result rows are payments_history, ensure 'date' and 'month' exist if requested
      if (table === 'payments_history') {
        rows = rows.map(r => {
           const row = { ...r };
           if (!row.date && row.payment_date) row.date = (row.payment_date as string).split('T')[0];
           if (!row.month && row.payment_date) row.month = parseInt((row.payment_date as string).split('-')[1]);
           return row;
        }) as any;
      }

      // Handle AVG, SUM, COUNT with default fallback for empty results 
      if (upperSql.includes('AVG(') && rows.length === 0) return [{ avg: 0 }] as T;
      if (upperSql.includes('COUNT(') && rows.length === 0) return [{ count: 0 }] as T;
      if (upperSql.includes('SUM(') && rows.length === 0) return [{ amount: 0, total: 0 }] as T;

      return rows as T;
    },
  };
}

// ─── Real Tauri DB ─────────────────────────────────────────────────

export interface AppDatabase {
  execute(sql: string, params?: unknown[]): Promise<{ rowsAffected: number }>;
  select<T>(sql: string, params?: unknown[]): Promise<T>;
}

/**
 * 🧵 THE TAILOR : Elite Database Core (Mali Edition)
 */
export async function initDatabase(): Promise<AppDatabase> {
  if (db) return db as unknown as AppDatabase;

  // Guard: If not running in Tauri, use mock DB
  if (!isTauri()) {
    console.warn('[DB] Not inside Tauri — using in-memory mock DB for dev.');
    const mock = createMockDb();
    (db as any) = mock;
    return mock as unknown as AppDatabase;
  }

  try {
    db = await Database.load('sqlite:the_tailor_v2.db');

    await db.execute(`
      -- 👤 CLIENTS : CRM Couture
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT,
        gender TEXT DEFAULT 'Femme',
        portrait_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 🏷️ MEASUREMENT_TYPES : EAV Keys
      CREATE TABLE IF NOT EXISTS measurement_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        key_name TEXT UNIQUE NOT NULL,
        category TEXT DEFAULT 'Haut',
        sequence INTEGER DEFAULT 0
      );

      -- 👗 CATALOG
      CREATE TABLE IF NOT EXISTS catalog_models (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'Autre',
        gender TEXT DEFAULT 'Femme',
        price_ref REAL DEFAULT 0,
        image_paths TEXT,
        archived BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 🏮 FABRICS (Nouveauté V9.1)
      CREATE TABLE IF NOT EXISTS fabrics (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        price_per_meter REAL DEFAULT 0,
        stock_quantity REAL DEFAULT 0,
        image_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 🛒 FABRIC SALES (Vente au comptoir)
      CREATE TABLE IF NOT EXISTS fabric_sales (
        id TEXT PRIMARY KEY,
        fabric_id TEXT NOT NULL,
        client_id TEXT,
        customer_label TEXT,
        meters REAL NOT NULL,
        unit_price REAL NOT NULL,
        total REAL NOT NULL,
        method TEXT DEFAULT 'Cash',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (fabric_id) REFERENCES fabrics(id),
        FOREIGN KEY (client_id) REFERENCES clients(id)
      );

      -- 🧵 ORDERS
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        model_id TEXT,
        fabric_id TEXT,
        fabric_amount_used REAL DEFAULT 0,
        fabric_photo_path TEXT,
        audio_note_path TEXT,
        reference_images TEXT,
        description TEXT,
        status TEXT DEFAULT 'Réception',
        total_price REAL DEFAULT 0,
        advance_paid REAL DEFAULT 0,
        delivery_date TEXT,
        tracking_id TEXT UNIQUE,
        sync_status TEXT DEFAULT 'pending',
        status_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (model_id) REFERENCES catalog_models(id),
        FOREIGN KEY (fabric_id) REFERENCES fabrics(id)
      );

      -- 📐 ORDER_MEASUREMENTS
      CREATE TABLE IF NOT EXISTS order_measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL,
        type_id INTEGER NOT NULL,
        value REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (type_id) REFERENCES measurement_types(id)
      );

      -- 💰 PAYMENTS
      CREATE TABLE IF NOT EXISTS payments_history (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        amount REAL NOT NULL,
        method TEXT DEFAULT 'Cash',
        payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );

      -- 📝 ORDER_NOTES
      CREATE TABLE IF NOT EXISTS order_notes (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        type TEXT NOT NULL, -- 'text' or 'audio'
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );

      -- 📡 SYNC_QUEUE
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL,
        status_to_sync TEXT NOT NULL,
        attempted_at DATETIME,
        is_synced BOOLEAN DEFAULT 0
      );

      -- 👤 USERS (Sécurité & Rôles)
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        pin_hash TEXT NOT NULL,
        role TEXT CHECK(role IN ('admin', 'manager', 'employee')) DEFAULT 'employee',
        full_name TEXT,
        avatar_path TEXT,
        is_blocked BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- ⚙️ SETTINGS (Branding & Config)
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      -- 📐 CLIENT_MEASUREMENTS
      CREATE TABLE IF NOT EXISTS client_measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT NOT NULL,
        type_id INTEGER NOT NULL,
        value REAL NOT NULL,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (type_id) REFERENCES measurement_types(id)
      );

      -- 📜 AUDIT_LOGS : Traçabilité Elite
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        user_name TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // --- MIGRATIONS --- 
    const runMigration = async (sql: string) => {
      try {
        await db!.execute(sql);
      } catch (e: any) {
        const msg = e.toString();
        if (!msg.includes('already exists') && !msg.includes('duplicate column')) {
          console.error(`[DB] Migration failed: ${sql}`, e);
        }
      }
    };

    await runMigration(`ALTER TABLE clients ADD COLUMN gender TEXT DEFAULT 'Femme'`);
    await runMigration(`ALTER TABLE catalog_models ADD COLUMN gender TEXT DEFAULT 'Femme'`);
    await runMigration(`ALTER TABLE catalog_models ADD COLUMN archived BOOLEAN DEFAULT 0`);
    await runMigration(`ALTER TABLE catalog_models ADD COLUMN image_paths TEXT`);
    await runMigration(`ALTER TABLE orders ADD COLUMN audio_note_path TEXT`);
    await runMigration(`ALTER TABLE orders ADD COLUMN reference_images TEXT`);
    await runMigration(`ALTER TABLE orders ADD COLUMN fabric_id TEXT`);
    await runMigration(`ALTER TABLE orders ADD COLUMN fabric_amount_used REAL DEFAULT 0`);
    await runMigration(`ALTER TABLE orders ADD COLUMN status_updated_at DATETIME`);
    // Populate the new column for existing orders using their creation date
    await runMigration(`UPDATE orders SET status_updated_at = created_at WHERE status_updated_at IS NULL`);
    
    await runMigration(`ALTER TABLE users ADD COLUMN is_blocked BOOLEAN DEFAULT 0`);
    await runMigration(`ALTER TABLE settings ADD COLUMN maintenance_mode BOOLEAN DEFAULT 0`);
    await runMigration(`ALTER TABLE settings ADD COLUMN role_permissions TEXT`);
    await runMigration(`CREATE TABLE IF NOT EXISTS fabric_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      sequence INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Seed default fabric types if empty
    try {
      const existingFT = await db.select<any[]>('SELECT id FROM fabric_types LIMIT 1');
      if (existingFT.length === 0) {
        const defaults = ['Bazin Riche','Wax','Brode','Brocart','Lépi','Soie','Lin','Laine','Coton','Dentelle','Autre'];
        for (let i = 0; i < defaults.length; i++) {
          await db.execute(`INSERT INTO fabric_types (name, sequence) VALUES ($1, $2)`, [defaults[i], i + 1]);
        }
      }
    } catch (e) {
      console.error('[DB] Seed fabric_types failed:', e);
    }

    await runMigration(`CREATE TABLE IF NOT EXISTS model_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      sequence INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Seed default categories if empty
    try {
      const existingCats = await db.select<any[]>('SELECT id FROM model_categories LIMIT 1');
      if (existingCats.length === 0) {
        const defaults = ['Boubou','Bazin','Costume','Robe','Robe de Mariée','Ligne Homme','Abaya','Chemise','Pantalon','Jupe','Ensemble','Autre'];
        for (let i = 0; i < defaults.length; i++) {
          await db.execute(`INSERT INTO model_categories (name, sequence) VALUES ($1, $2)`, [defaults[i], i + 1]);
        }
      }
    } catch (e) {
      console.error('[DB] Seed model_categories failed:', e);
    }

    await runMigration(`CREATE TABLE IF NOT EXISTS fabric_sales (
      id TEXT PRIMARY KEY,
      fabric_id TEXT NOT NULL,
      client_id TEXT,
      customer_label TEXT,
      meters REAL NOT NULL,
      unit_price REAL NOT NULL,
      total REAL NOT NULL,
      method TEXT DEFAULT 'Cash',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // --- SPECIAL MIGRATION: USERS Table Check Constraint (v2.40) ---
    // If the old DB only allows 'admin','employee', we must recreate it to allow 'manager'
    try {
      // Test insertion (rollback happens implicitly if it fails)
      await db.execute(`INSERT INTO users (id, username, pin_hash, role, full_name) VALUES ('migration_test', 'test_mig', '0000', 'manager', 'Test')`);
      await db.execute(`DELETE FROM users WHERE id = 'migration_test'`);
    } catch (e: any) {
      if (e.toString().includes('CHECK constraint failed')) {
        console.warn("[DB] Migrating USERS table for 'manager' role...");
        await db.execute(`
          PRAGMA foreign_keys=OFF;
          CREATE TABLE users_new (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            pin_hash TEXT NOT NULL,
            role TEXT CHECK(role IN ('admin', 'manager', 'employee')) DEFAULT 'employee',
            full_name TEXT,
            avatar_path TEXT,
            is_blocked BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          INSERT INTO users_new (id, username, pin_hash, role, full_name, avatar_path, is_blocked, created_at)
          SELECT id, username, pin_hash, role, full_name, avatar_path, is_blocked, created_at FROM users;
          DROP TABLE users;
          ALTER TABLE users_new RENAME TO users;
          PRAGMA foreign_keys=ON;
        `);
      }
    }

    // SEEDING
    const existing = await db.select<any[]>('SELECT id FROM measurement_types LIMIT 1');
    if (existing.length === 0) {
      await db.execute(`
        INSERT INTO measurement_types (label, key_name, category, sequence) VALUES 
        ('Encolure', 'neck', 'Haut', 1),
        ('Poitrine', 'chest', 'Haut', 2),
        ('Épaules', 'shoulders', 'Haut', 3),
        ('Longueur Bras', 'arm_length', 'Haut', 4),
        ('Tour de Taille', 'waist', 'Bas', 5),
        ('Longueur Totale', 'full_length', 'Complet', 6),
        ('Tour de Bras (Biceps)', 'biceps', 'Haut', 7),
        ('Bassin', 'hips', 'Bas', 8),
        ('Poignet', 'wrist', 'Haut', 9),
        ('Cuisse', 'thigh', 'Bas', 10),
        ('Genou', 'knee', 'Bas', 11),
        ('Longueur Pantalon', 'trouser_length', 'Bas', 12),
        ('Largeur Bas', 'bottom_width', 'Bas', 13),
        ('Entrejambe', 'inseam', 'Bas', 14),
        ('Tour de Tête', 'head', 'Complet', 15),
        ('Hauteur Taille', 'waist_height', 'Bas', 16);
      `);
    }

    // SEEDING USERS
    const usersExist = await db.select<any[]>('SELECT id FROM users LIMIT 1');
    if (usersExist.length === 0) {
      await db.execute(`
        INSERT INTO users (id, username, pin_hash, role, full_name) VALUES 
        ('admin', 'admin', '0000', 'admin', 'Admin Atelier'),
        ('team', 'equipe', '1234', 'employee', 'Équipe Production')
      `);
    }

    // SEEDING SETTINGS
    const settingsExist = await db.select<any[]>('SELECT key FROM settings LIMIT 1');
    if (settingsExist.length === 0) {
      await db.execute(`
        INSERT INTO settings (key, value) VALUES 
        ('atelier_name', 'The Tailor'),
        ('atelier_tagline', 'Maison de Couture'),
        ('atelier_phone', '+223 00 00 00 00'),
        ('atelier_address', 'Bamako, Mali'),
        ('atelier_logo', NULL)
      `);
    }

    console.log("[DB] Success: Atelier d'Élite Schema Initialized.");
    return db;
  } catch (error) {
    console.error("[DB] Migration Error:", error);
    throw error;
  }
}

export async function getDb(): Promise<AppDatabase> {
  if (!db) return await initDatabase();
  return db as unknown as AppDatabase;
}
