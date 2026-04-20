import { useState, useEffect } from 'react';
import { ShieldCheck, LayoutDashboard, Users, Kanban, Package, Shirt, Calendar, Wallet, Settings as SettingsIcon, Check, X } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import * as settingsService from '@/services/settingsService';
import type { UserRole, AppModule, RolePermissions } from '@/types';
import { cn } from '@/lib/utils';

const MODULES: { id: AppModule; label: string; icon: any }[] = [
  { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
  { id: 'clients', label: 'Galerie Clients', icon: Users },
  { id: 'kanban', label: 'Confection', icon: Kanban },
  { id: 'fabrics', label: 'Stock Tissus', icon: Package },
  { id: 'catalog', label: 'Modèles', icon: Shirt },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'finance', label: 'Finance', icon: Wallet },
  { id: 'settings', label: 'Paramètres', icon: SettingsIcon },
];

const ROLES: { id: UserRole; label: string }[] = [
  { id: 'admin', label: 'Administrateur' },
  { id: 'manager', label: 'Gérant' },
  { id: 'employee', label: 'Équipe Confection' },
];

export function ModuleAccessSettings() {
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    settingsService.getSettings().then(s => {
      setPermissions(JSON.parse(s.role_permissions));
      setLoading(false);
    }).catch(console.error);
  }, []);

  const togglePermission = (role: UserRole, moduleId: AppModule) => {
    if (role === 'admin') return; // Admin always has everything
    
    setPermissions(prev => {
      if (!prev) return null;
      const current = prev[role] || [];
      const updated = current.includes(moduleId)
        ? current.filter(id => id !== moduleId)
        : [...current, moduleId];
      
      return { ...prev, [role]: updated };
    });
  };

  const handleSave = async () => {
    if (!permissions) return;
    setSaving(true);
    try {
      await settingsService.updateSettings({
        role_permissions: JSON.stringify(permissions)
      });
      addToast('Permissions mises à jour', 'success');
    } catch (error) {
      addToast('Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !permissions) return <div className="h-40 flex items-center justify-center text-[#A8A29E]">Chargement...</div>;

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h3 className="text-xl font-serif italic text-[#1C1917]">Matrice des Accès</h3>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#B68D40]">Définissez les privilèges par rôle</p>
      </header>

      <div className="bg-white border border-[#E7E5E4] rounded-[3rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#E7E5E4]">
                  <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-[#A8A29E]">Module</th>
                  {ROLES.filter(r => r.id !== 'admin').map(role => (
                    <th key={role.id} className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-center text-[#1C1917]">
                      {role.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF9F6]">
                {MODULES.map((module) => (
                  <tr key={module.id} className="group hover:bg-[#FAF9F6] transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-xl bg-[#FAF9F6] border border-[#E7E5E4] flex items-center justify-center text-[#78716C] group-hover:border-[#B68D40] group-hover:text-[#1C1917] transition-all">
                          <module.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-serif italic text-[#1C1917]">{module.label}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-[#A8A29E] mt-0.5">{module.id}</p>
                        </div>
                      </div>
                    </td>
                    {ROLES.filter(r => r.id !== 'admin').map(role => {
                      const hasAccess = permissions[role.id]?.includes(module.id);
                      
                      return (
                        <td key={role.id} className="px-8 py-5 text-center">
                          <button
                            onClick={() => togglePermission(role.id, module.id)}
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center transition-all border-2",
                              hasAccess 
                                ? "bg-[#1C1917] border-[#1C1917] text-[#B68D40] shadow-md" 
                                : "bg-transparent border-[#E7E5E4] text-[#E7E5E4] hover:border-[#A8A29E] hover:text-[#A8A29E]"
                            )}
                          >
                            {hasAccess ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>

      <div className="flex justify-between items-center bg-[#FAF9F6] p-8 rounded-[3rem] border border-[#E7E5E4]">
         <div className="flex items-center gap-4 text-[#78716C]">
            <ShieldCheck className="w-6 h-6 text-[#B68D40]" />
            <p className="text-[10px] uppercase tracking-widest font-black max-w-sm leading-relaxed">
              L'Administrateur possède un accès complet et incompressible à tous les modules. Cette matrice ne permet de configurer que les restrictions pour le personnel.
            </p>
         </div>
         <button
            onClick={handleSave}
            disabled={saving}
            className="h-12 px-10 bg-[#1C1917] text-white rounded-full flex items-center gap-3 font-bold text-[11px] uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
         >
           {saving ? 'Enregistrement...' : 'Enregistrer'}
         </button>
      </div>
    </div>
  );
}
