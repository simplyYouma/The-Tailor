import { getDb } from '@/lib/db';
import type { Settings } from '@/types';
import { logAction } from './auditService';

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.select<{ key: string, value: string | null }[]>('SELECT key, value FROM settings');
  
  const settings: any = {
    atelier_name: 'The Tailor',
    atelier_tagline: '',
    atelier_phone: '',
    atelier_address: '',
    atelier_logo: null,
    ticket_logo: null,
    ticket_primary_color: '#B68D40',
    ticket_tagline: '',
    platform_name: 'The Tailor',
    platform_logo_theme: 'dark',
    platform_tagline: 'L’élégance sur mesure',
    ticket_logo_theme: 'dark',
    maintenance_mode: false,
    role_permissions: JSON.stringify({
        admin: ['dashboard', 'clients', 'kanban', 'fabrics', 'catalog', 'agenda', 'finance', 'settings'],
        manager: ['dashboard', 'clients', 'kanban', 'fabrics', 'catalog', 'agenda'],
        employee: ['kanban', 'agenda']
    }),
    session_timeout: 30
  };

  rows.forEach(row => {
    if (row.key === 'maintenance_mode') {
        settings.maintenance_mode = row.value === '1';
    } else {
        settings[row.key as keyof Settings] = row.value;
    }
  });

  return settings as Settings;
}

export async function updateSettings(settings: Partial<Settings>): Promise<void> {
  const db = await getDb();
  const oldSettings = await getSettings();
  const entries = Object.entries(settings);
  
  const labels: Record<string, string> = {
    atelier_name: 'Nom',
    atelier_tagline: 'Slogan',
    atelier_phone: 'Tél',
    atelier_address: 'Adresse',
    atelier_logo: 'Logo',
    ticket_logo: 'Logo Ticket',
    ticket_logo_theme: 'Thème Logo Ticket',
    ticket_primary_color: 'Couleur Principale',
    ticket_tagline: 'Slogan Ticket',
    platform_name: 'Nom Plateforme',
    platform_logo: 'Logo Plateforme',
    platform_logo_theme: 'Thème Logo Plateforme',
    platform_tagline: 'Slogan Plateforme',
    maintenance_mode: 'Maintenance',
    role_permissions: 'Permissions',
    session_timeout: 'Délai de Session'
  };

  const changes: string[] = [];

  for (const [key, value] of entries) {
    if (key === 'id') continue;

    // Check if changed
    const oldValue = (oldSettings as any)[key];
    if (oldValue === value) continue;

    let displayOld = String(oldValue || '—');
    let displayNew = String(value || '—');

    // Special cases for logos (avoid binary dump in logs)
    if (key.endsWith('_logo')) {
        displayOld = oldValue ? '[Image]' : '—';
        displayNew = value ? '[Image]' : '—';
    } else if (key === 'ticket_primary_color') {
        // Just display the color code
        displayOld = String(oldValue || '#B68D40');
        displayNew = String(value || '#B68D40');
    } else if (key === 'role_permissions') {
        try {
            const oldPerms = JSON.parse(String(oldValue || '{}'));
            const newPerms = JSON.parse(String(value || '{}'));
            const rolesChanged: string[] = [];

            for (const role of Object.keys({ ...oldPerms, ...newPerms })) {
                const oldModules: string[] = oldPerms[role] || [];
                const newModules: string[] = newPerms[role] || [];
                
                const added = newModules.filter(m => !oldModules.includes(m));
                const removed = oldModules.filter(m => !newModules.includes(m));

                if (added.length > 0 || removed.length > 0) {
                    const changesStr = [
                        ...added.map(m => `+${m}`),
                        ...removed.map(m => `-${m}`)
                    ].join(', ');
                    rolesChanged.push(`${role.toUpperCase()} (${changesStr})`);
                }
            }
            displayOld = 'Matrice précédente';
            displayNew = (rolesChanged.length > 0 ? rolesChanged.join(' | ') : 'Identique') as any;
        } catch (e) {
            displayOld = 'Matrix';
            displayNew = 'Matrix';
        }
    } else if (key === 'maintenance_mode') {
        displayOld = oldValue ? 'Actif' : 'Désactivé';
        displayNew = value ? 'Actif' : 'Désactivé';
    }

    changes.push(`${labels[key] || key}: ${displayOld} → ${displayNew}`);

    let finalValue = value;
    if (key === 'maintenance_mode') {
        finalValue = value ? '1' : '0';
    }
    
    await db.execute(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2',
      [key, finalValue]
    );
  }

  if (changes.length > 0) {
    await logAction('SETTINGS_UPDATE', 'settings', 'global', `Changement : ${changes.join(' | ')}`);
  }
}
