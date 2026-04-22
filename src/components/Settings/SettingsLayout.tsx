import { useState } from 'react';
import { Tag, Users, Ruler, Database, ChevronRight, ShieldCheck, History, Layers, Package } from 'lucide-react';
import { BrandSettings } from './BrandSettings';
import { TeamSettings } from './TeamSettings';
import { MeasurementSettings } from './MeasurementSettings';
import { CategorySettings } from './CategorySettings';
import { FabricTypeSettings } from './FabricTypeSettings';
import { SystemSettings } from './SystemSettings';
import { ModuleAccessSettings } from './ModuleAccessSettings';
import { AuditLogView } from './AuditLog';
import { SecurityLicenseView } from './SecurityLicense';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import { useEffect } from 'react';

type SettingsTab = 'brand' | 'team' | 'permissions' | 'measurements' | 'categories' | 'fabric_types' | 'system' | 'audit' | 'license';

export function SettingsLayout() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('brand');
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  // 🪄 Automatisme : Fermer la sidebar *une seule fois* à l'ouverture de la licence
  useEffect(() => {
    if (activeTab === 'license') {
      const isCollapsed = useUIStore.getState().sidebarCollapsed;
      if (!isCollapsed) {
        toggleSidebar();
      }
    }
  }, [activeTab, toggleSidebar]);

  const tabs = [
    { id: 'brand' as const, label: 'Identité Atelier', icon: <Tag className="w-4 h-4" /> },
    { id: 'team' as const, label: 'Gestion Équipe', icon: <Users className="w-4 h-4" /> },
    { id: 'permissions' as const, label: 'Accès Modules', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'audit' as const, label: 'Journal d\'Audit', icon: <History className="w-4 h-4" /> },
    { id: 'measurements' as const, label: 'Réglages Mesures', icon: <Ruler className="w-4 h-4" /> },
    { id: 'categories' as const, label: 'Catégories Modèles', icon: <Layers className="w-4 h-4" /> },
    { id: 'fabric_types' as const, label: 'Types de Tissus', icon: <Package className="w-4 h-4" /> },
    { id: 'system' as const, label: 'Système & Maintenance', icon: <Database className="w-4 h-4" /> },
    { id: 'license' as const, label: 'Garanties & Licence', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-10 animate-in fade-in duration-500 pb-20">
      {/* Sidebar Navigation */}
      <aside className="lg:w-64 space-y-6 flex-shrink-0">
        <header className="px-4">
           <h2 className="text-3xl font-serif italic text-[#1C1917] mb-1">Paramètres</h2>
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#B68D40]">Configuration d'Élite</p>
        </header>

        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full h-12 px-4 rounded-2xl flex items-center justify-between group transition-all duration-300",
                activeTab === tab.id 
                  ? "bg-[#1C1917] text-white shadow-xl shadow-black/10" 
                  : "text-[#78716C] hover:bg-white hover:text-[#1C1917] hover:shadow-sm"
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  "transition-colors",
                  activeTab === tab.id ? "text-[#B68D40]" : "text-[#78716C] group-hover:text-[#1C1917]"
                )}>
                  {tab.icon}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                  {tab.label}
                </span>
              </div>
              <ChevronRight className={cn(
                "w-3 h-3 transition-transform",
                activeTab === tab.id ? "translate-x-0 opacity-40" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-40"
              )} />
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-[#FAF9F6] p-8 md:p-12 rounded-[3.5rem] border border-[#E7E5E4] shadow-inner">
        {activeTab === 'brand' && <BrandSettings />}
        {activeTab === 'team' && <TeamSettings />}
        {activeTab === 'permissions' && <ModuleAccessSettings />}
        {activeTab === 'audit' && <AuditLogView />}
        {activeTab === 'measurements' && <MeasurementSettings />}
        {activeTab === 'categories' && <CategorySettings />}
        {activeTab === 'fabric_types' && <FabricTypeSettings />}
        {activeTab === 'system' && <SystemSettings />}
        {activeTab === 'license' && <SecurityLicenseView />}
      </main>
    </div>
  );
}
