import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, RolePermissions, AppModule } from '@/types';
import { verifyPin, getUsers } from '@/services/authService';
import * as settingsService from '@/services/settingsService';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  permissions: RolePermissions | null;
}

interface AuthActions {
  login: (userId: string, pin: string) => Promise<'success' | 'invalid' | 'blocked' | 'maintenance'>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  isAdmin: () => boolean;
  hasAccess: (module: AppModule) => boolean;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      permissions: null,

      login: async (userId, pin) => {
        const settings = await settingsService.getSettings();
        const user = await verifyPin(userId, pin);
        
        if (user) {
          if (user.is_blocked) {
            return 'blocked';
          }
          
          // Maintenance Mode Check
          if (settings.maintenance_mode && user.role !== 'admin') {
              return 'maintenance';
          }

          const perms = JSON.parse(settings.role_permissions) as RolePermissions;
          set({ 
            currentUser: user, 
            isAuthenticated: true,
            permissions: perms
          });
          return 'success';
        }
        return 'invalid';
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false });
      },

      refreshSession: async () => {
        const { currentUser } = get();
        if (!currentUser) return;

        const users = await getUsers();
        const updatedUser = users.find(u => u.id === currentUser.id);
        
        if (updatedUser) {
          set({ currentUser: updatedUser });
        }
      },

      isAdmin: () => {
        return get().currentUser?.role === 'admin';
      },

      hasAccess: (module) => {
        const { currentUser, permissions } = get();
        if (!currentUser) return false;
        
        // Admin has priority and is never restricted
        if (currentUser.role === 'admin') return true;
        
        // Other roles need loaded permissions
        if (!permissions) return false;
        
        const rolePerms = permissions[currentUser.role as keyof RolePermissions];
        return rolePerms?.includes(module) || false;
      },
    }),
    {
      name: 'the-tailor-auth',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
