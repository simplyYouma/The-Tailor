import { useState, useEffect } from 'react';
import { Database, ShieldAlert, AlertTriangle, Hammer, Power, Clock } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import * as settingsService from '@/services/settingsService';

export function SystemSettings() {
  const { isAdmin } = useAuthStore();
  const { session_timeout, refreshSettings } = useSettingsStore();
  const [maintenance, setMaintenance] = useState(false);
  const [timeoutValue, setTimeoutValue] = useState(session_timeout || 30);
  const addToast = useUIStore((s) => s.addToast);
  const openConfirm = useUIStore((s) => s.openConfirm);

  useEffect(() => {
    settingsService.getSettings().then(s => {
      setMaintenance(s.maintenance_mode);
      setTimeoutValue(Number(s.session_timeout) || 30);
    }).catch(console.error);
  }, []);

  const handleSaveTimeout = async (value: number) => {
    setTimeoutValue(value);
    try {
      await settingsService.updateSettings({ session_timeout: value });
      await refreshSettings();
    } catch (error) {
      console.error(error);
      addToast('Erreur lors de la sauvegarde du délai', 'error');
    }
  };

  const handleReset = async () => {
    const ok = await openConfirm(
        'Réinitialiser toutes les données ?',
        'Cette action supprimera tous vos clients, commandes, modèles et membres d’équipe. Vous devrez recommencer à zéro.'
    );
    if (ok) {
      addToast('Base de données réinitialisée (Simulation)', 'success');
    }
  };

  const handleToggleMaintenance = async () => {
    const action = maintenance ? 'Désactiver' : 'Activer';
    const ok = await openConfirm(
        `${action} le mode maintenance ?`,
        maintenance 
            ? "L'atelier sera de nouveau accessible pour toute l'équipe."
            : "Seuls les Administrateurs pourront se connecter. Les employés verront un message d'indisponibilité."
    );

    if (ok) {
        try {
            await settingsService.updateSettings({ maintenance_mode: !maintenance });
            await refreshSettings();
            setMaintenance(!maintenance);
            addToast(`Mode maintenance ${!maintenance ? 'activé' : 'désactivé'}`, 'success');
        } catch (error) {
            addToast('Erreur technique', 'error');
        }
    }
  };

  return (
    <div className="max-w-2xl space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h3 className="text-xl font-serif italic text-[#1C1917]">Maintenance & Système</h3>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#B68D40]">Réglages critiques de l'Atelier</p>
      </header>

      {/* Security: Session Timeout */}
      <div className="bg-[#1C1917] rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-32 h-32 bg-[#B68D40]/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
         
         <div className="flex items-center gap-3 mb-8">
           <Clock className="w-5 h-5 text-[#B68D40]" />
           <h4 className="text-xs font-black uppercase tracking-widest text-[#B68D40]">Sécurité de Session</h4>
         </div>

         <div className="space-y-6">
            <div>
              <div className="flex justify-between items-end mb-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Délai d'inactivité avant verrouillage</label>
                <span className="text-2xl font-serif italic text-white underline decoration-[#B68D40] underline-offset-4">{timeoutValue} min</span>
              </div>
              <input 
                type="range"
                min="1"
                max="120"
                step="1"
                value={timeoutValue}
                onChange={(e) => handleSaveTimeout(Number(e.target.value))}
                disabled={!isAdmin()}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#B68D40] disabled:opacity-20"
              />
              <div className="flex justify-between text-[8px] font-black uppercase text-white/20 mt-2">
                <span>1 min</span>
                <span>2 heures</span>
              </div>
            </div>
            
            <p className="text-[9px] text-white/40 leading-relaxed uppercase font-black tracking-widest">
              Une alerte visuelle automatique préviendra l'utilisateur 30 secondes avant la déconnexion.
            </p>
         </div>
      </div>

      {/* Maintenance Mode */}
      <div className="bg-white border border-[#E7E5E4] rounded-[3rem] p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl flex items-center justify-center text-[#B68D40]">
                  <Hammer className="w-6 h-6" />
              </div>
              <div className="flex-1">
                  <h4 className="text-sm font-bold text-[#1C1917]">Mode Maintenance</h4>
                  <p className="text-[10px] text-[#A8A29E]">Suspendre l'accès pour l'entretien</p>
              </div>
              <button 
                onClick={handleToggleMaintenance}
                className={`flex items-center gap-3 px-6 h-10 rounded-full border-2 transition-all font-bold text-[10px] uppercase tracking-widest ${
                    maintenance 
                    ? 'border-red-500 bg-red-50 text-red-600' 
                    : 'border-[#E7E5E4] text-[#78716C] hover:border-[#1C1917] hover:text-[#1C1917]'
                }`}
              >
                  <Power className="w-3 h-3" />
                  {maintenance ? 'Désactiver' : 'Activer'}
              </button>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex gap-4 text-orange-800">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] leading-relaxed font-medium">
                  {maintenance 
                   ? "L'atelier est actuellement verrouillé. Seuls les administrateurs peuvent opérer." 
                   : "L'activation déconnecte les autres rôles pour sécuriser les opérations sensibles."}
              </p>
          </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 border border-red-100 rounded-[3rem] p-8 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-red-900">Base de Données</h4>
            <p className="text-[10px] text-red-400">Action irréversible</p>
          </div>
        </div>
        
        <p className="text-[10px] text-red-800 leading-relaxed opacity-60">
          Suppression définitive de l'intégralité des données de l'Atelier.
        </p>

        <button
          onClick={handleReset}
          className="h-10 px-6 bg-red-600 text-white rounded-full flex items-center gap-3 font-bold text-[10px] uppercase tracking-widest shadow-lg hover:bg-red-700 transition-all active:scale-95"
        >
          <AlertTriangle className="w-3 h-3" />
          Réinstaller l'Atelier
        </button>
      </div>
    </div>
  );
}
