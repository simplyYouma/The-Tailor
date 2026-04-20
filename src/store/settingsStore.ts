import { create } from 'zustand';
import { getSettings } from '@/services/settingsService';
import type { Settings } from '@/types';

interface SettingsState {
  atelier_name: string;
  atelier_tagline: string;
  atelier_logo: string | null;
  ticket_logo: string | null;
  ticket_primary_color: string;
  ticket_tagline: string;
  atelier_phone: string;
  atelier_address: string;
  platform_name: string;
  platform_logo: string | null;
  platform_logo_theme: 'dark' | 'light';
  platform_tagline: string;
  ticket_logo_theme: 'dark' | 'light';
  maintenance_mode: boolean;
  role_permissions: string;
  session_timeout: number;
}

interface SettingsActions {
  refreshSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState & SettingsActions>((set) => ({
  atelier_name: 'The Tailor',
  atelier_tagline: 'L’élégance sur mesure',
  atelier_logo: null,
  ticket_logo: null,
  ticket_primary_color: '#B68D40',
  ticket_tagline: '',
  atelier_phone: '',
  atelier_address: '',
  platform_name: 'The Tailor',
  platform_logo: null,
  platform_logo_theme: 'dark',
  platform_tagline: 'L’élégance sur mesure',
  ticket_logo_theme: 'dark',
  maintenance_mode: false,
  role_permissions: '',
  session_timeout: 30,

  refreshSettings: async () => {
    try {
      const settings: Settings = await getSettings();
      set({
        atelier_name: settings.atelier_name,
        atelier_tagline: settings.atelier_tagline ?? '',
        atelier_logo: settings.atelier_logo ?? null,
        ticket_logo: settings.ticket_logo ?? null,
        ticket_primary_color: settings.ticket_primary_color ?? '#B68D40',
        ticket_tagline: settings.ticket_tagline ?? '',
        atelier_phone: settings.atelier_phone ?? '',
        atelier_address: settings.atelier_address ?? '',
        platform_name: settings.platform_name ?? 'The Tailor',
        platform_logo: settings.platform_logo ?? null,
        platform_logo_theme: settings.platform_logo_theme ?? 'dark',
        platform_tagline: settings.platform_tagline ?? 'L’élégance sur mesure',
        ticket_logo_theme: settings.ticket_logo_theme ?? 'dark',
        maintenance_mode: settings.maintenance_mode,
        role_permissions: settings.role_permissions,
        session_timeout: Number(settings.session_timeout) || 30,
      });
    } catch (error) {
      console.error("[SettingsStore] Failed to refresh settings:", error);
    }
  },
}));
