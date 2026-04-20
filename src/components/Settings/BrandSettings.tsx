import { useState, useEffect, useRef } from 'react';
import { Camera, Phone, MapPin, Tag, Globe } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import * as settingsService from '@/services/settingsService';
import type { Settings } from '@/types';

export function BrandSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const keySequenceRef = useRef<string>('');
  const addToast = useUIStore((s) => s.addToast);
  const refreshSettings = useSettingsStore((s) => s.refreshSettings);

  // --- Secret Shortcut (Ctrl + Y U M I) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        const char = e.key.toUpperCase();
        if ("YUMI".includes(char)) {
          keySequenceRef.current = (keySequenceRef.current + char).slice(-4);
          if (keySequenceRef.current === "YUMI") {
            setIsAdmin(true);
            addToast("Mode Propriétaire Débloqué", "success");
            keySequenceRef.current = "";
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    settingsService.getSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    }).catch(console.error);
  }, []);

  const handleChange = (key: keyof Settings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const handleUpload = (key: keyof Settings, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (!settings) return;
      setSettings({ ...settings, [key]: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleResetTicket = () => {
    if (!settings) return;
    setSettings({ 
      ...settings, 
      ticket_logo: null, 
      ticket_primary_color: '#B68D40', 
      ticket_tagline: '',
      atelier_logo: null,
      atelier_name: 'The Tailor',
      atelier_tagline: 'Maison de couture'
    });
    addToast('Réinitialisation des paramètres atelier', 'info');
  };

  const handleResetPlatform = () => {
    if (!settings) return;
    setSettings({ 
      ...settings, 
      platform_name: 'The Tailor',
      platform_logo: null,
      platform_tagline: 'L’élégance sur mesure'
    });
    addToast('Marquage plateforme réinitialisé', 'info');
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await settingsService.updateSettings(settings);
      await refreshSettings();
      addToast('Paramètres enregistrés avec succès', 'success');
    } catch (error) {
      console.error(error);
      addToast('Erreur lors de l’enregistrement', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return <div className="h-40 flex items-center justify-center text-[#A8A29E]">Chargement...</div>;

  return (
    <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* --- SECTION SECRÈTE : PLATEFORME (Visible uniquement via Ctrl+YUMI) --- */}
      {isAdmin && (
        <div className="bg-[#1C1917] text-white border border-white/10 rounded-[2.5rem] p-8 space-y-8 animate-in zoom-in-95 duration-500 shadow-2xl">
          <header className="flex items-center justify-between border-b border-white/10 pb-4">
             <div>
                <h3 className="text-xl font-serif italic text-[#B68D40]">Marquage Plateforme</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#A8A29E]">Contrôle Propriétaire Uniquement</p>
             </div>
             <button 
                onClick={handleResetPlatform}
                className="text-[9px] font-black uppercase text-[#A8A29E] hover:text-white transition-colors"
             >
                Réinitialiser
             </button>
          </header>

          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="relative group">
              <div className={`w-24 h-24 rounded-full border border-white/20 flex items-center justify-center overflow-hidden transition-colors ${
                settings.platform_logo_theme === 'light' ? 'bg-white' : 'bg-white/5'
              }`}>
                {settings.platform_logo ? (
                  <img src={settings.platform_logo} alt="App Logo" className="w-full h-full object-cover" />
                ) : (
                  <Camera className={`w-6 h-6 ${settings.platform_logo_theme === 'light' ? 'text-[#1C1917]/20' : 'text-white/20'}`} />
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-[#B68D40] text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform">
                <Camera className="w-3.5 h-3.5" />
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload('platform_logo', e)} />
              </label>
            </div>
            <div className="flex-1 space-y-4 w-full">
               <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E]">Nom du Logiciel (Sidebar/Splash)</label>
                  <input 
                    value={settings.platform_name || ''} 
                    onChange={e => handleChange('platform_name', e.target.value)}
                    className="w-full h-10 bg-transparent border-b border-white/20 focus:border-[#B68D40] focus:outline-none transition-colors font-serif italic text-lg"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E]">Slogan de l'Application</label>
                  <input 
                    value={settings.platform_tagline || ''} 
                    onChange={e => handleChange('platform_tagline', e.target.value)}
                    className="w-full h-10 bg-transparent border-b border-white/20 focus:border-[#B68D40] focus:outline-none transition-colors text-xs font-bold uppercase tracking-wider"
                  />
               </div>
               <div className="space-y-3 pt-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E]">Style du Logo :</label>
                  <div className="flex gap-2">
                    {['dark', 'light'].map((t) => (
                      <button
                        key={t}
                        onClick={() => handleChange('platform_logo_theme', t)}
                        className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${
                          settings.platform_logo_theme === t 
                            ? 'bg-[#B68D40] text-white' 
                            : 'bg-white/5 text-[#A8A29E] border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {t === 'dark' ? 'Sombre' : 'Clair'}
                      </button>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SECTION PUBLIQUE : PERSONNALISATION DU REÇU (Accessible à l'Atelier) --- */}
      <div className="bg-white border border-[#E7E5E4] rounded-[2.5rem] p-8 space-y-10 shadow-sm relative overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Globe className="w-32 h-32" />
        </div>

        <header className="relative z-10 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-serif italic text-[#1C1917]">Personnalisation du Reçu</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#B68D40]">Identité de votre atelier sur les tickets</p>
          </div>
          <button 
            onClick={handleResetTicket}
            className="text-[9px] font-black uppercase text-[#A8A29E] hover:text-red-500 transition-colors"
          >
            Réinitialiser
          </button>
        </header>

        <div className="grid grid-cols-1 gap-12 relative z-10">
          {/* Logo Section */}
          <div className="flex flex-col sm:flex-row items-center gap-8 bg-[#FAF9F6] p-6 rounded-[2rem] border border-[#E7E5E4]/50">
            <div className="relative group">
              <div className={`w-28 h-28 rounded-full border-2 border-[#E7E5E4] flex items-center justify-center overflow-hidden shadow-sm transition-all group-hover:border-[#B68D40] ${
                settings.ticket_logo_theme === 'light' ? 'bg-[#1C1917]' : 'bg-white'
              }`}>
                {settings.ticket_logo || settings.atelier_logo ? (
                  <img src={settings.ticket_logo || settings.atelier_logo || ''} alt="Ticket Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <Camera className={`w-6 h-6 ${settings.ticket_logo_theme === 'light' ? 'text-white/20' : 'text-[#A8A29E]'}`} />
                )}
              </div>
              <label className="absolute bottom-1 right-1 w-9 h-9 bg-[#1C1917] text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 active:scale-95 border-2 border-white transition-all">
                <Camera className="w-3.5 h-3.5" />
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload('ticket_logo', e)} />
              </label>
            </div>
            <div className="flex-1 text-center sm:text-left space-y-4">
              <div>
                <h4 className="text-sm font-bold text-[#1C1917] mb-1">Logo du Ticket</h4>
                <p className="text-[10px] text-[#78716C] leading-relaxed max-w-[240px]">
                  Charger un logo (PNG sans fond de préférence). Ce logo apparaîtra en entête et en filigrane sur vos reçus.
                </p>
              </div>

              <div className="space-y-3">
                 <label className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E]">Mon logo est :</label>
                 <div className="flex gap-2 justify-center sm:justify-start">
                    {['dark', 'light'].map((t) => (
                      <button
                        key={t}
                        onClick={() => handleChange('ticket_logo_theme', t)}
                        className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${
                          settings.ticket_logo_theme === t 
                            ? 'bg-[#1C1917] text-white' 
                            : 'bg-[#FAF9F6] text-[#A8A29E] border border-[#E7E5E4] hover:bg-white'
                        }`}
                      >
                        {t === 'dark' ? 'Sombre' : 'Clair'}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="bg-[#B68D40]/5 border border-[#B68D40]/20 rounded-2xl p-4">
                <p className="text-[9px] text-[#8B6E36] leading-relaxed italic">
                  <strong>Conseil d'élégance :</strong> Pour un rendu optimal sur vos tickets, nous vous suggérons d'utiliser une version <strong>noire sans arrière-plan</strong> de votre logo.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Nom & Slogan Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
               <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E] flex items-center gap-2">
                    <Tag className="w-3 h-3 text-[#B68D40]" /> Nom de l'Atelier
                  </label>
                  <input 
                    value={settings.atelier_name || ''} 
                    onChange={e => handleChange('atelier_name', e.target.value)}
                    className="w-full h-10 bg-transparent border-b border-[#E7E5E4] focus:border-[#B68D40] focus:outline-none transition-colors font-serif italic text-lg text-[#1C1917]"
                    placeholder="Ex: Maison de Couture Elite"
                  />
               </div>
               <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E] flex items-center gap-2">
                    <Tag className="w-3 h-3 text-[#B68D40]" /> Slogan du Ticket
                  </label>
                  <input 
                    value={settings.ticket_tagline || ''} 
                    onChange={e => handleChange('ticket_tagline', e.target.value)}
                    className="w-full h-10 bg-transparent border-b border-[#E7E5E4] focus:border-[#B68D40] focus:outline-none transition-colors text-xs font-bold uppercase tracking-[0.2em]"
                    placeholder="Ex: L'ÉLÉGANCE DU MALI"
                  />
               </div>
            </div>

            {/* Contact Info Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#A8A29E] flex items-center gap-2">
                  <Phone className="w-3 h-3 text-[#B68D40]" /> Téléphone de l'Atelier
                </label>
                <input 
                  value={settings.atelier_phone || ''} 
                  onChange={e => handleChange('atelier_phone', e.target.value)}
                  className="w-full h-10 border-b border-[#E7E5E4] focus:border-[#B68D40] focus:outline-none transition-colors text-sm font-medium"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#A8A29E] flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-[#B68D40]" /> Adresse de l'Atelier
                </label>
                <input 
                  value={settings.atelier_address || ''} 
                  onChange={e => handleChange('atelier_address', e.target.value)}
                  className="w-full h-10 border-b border-[#E7E5E4] focus:border-[#B68D40] focus:outline-none transition-colors text-sm font-medium"
                />
              </div>
            </div>

            {/* Primary Color Section */}
            <div className="pt-4 space-y-4">
               <label className="text-[10px] font-black uppercase tracking-widest text-[#A8A29E] flex items-center gap-2">
                 <Tag className="w-3 h-3 text-[#B68D40]" /> Couleur d'Accentuation du Reçu
               </label>
               <div className="flex items-center gap-6 bg-[#FAF9F6] p-4 rounded-2xl border border-[#E7E5E4]/30">
                  <div className="relative w-14 h-14 rounded-xl shadow-sm border border-[#E7E5E4] overflow-hidden" style={{ backgroundColor: settings.ticket_primary_color || '#B68D40' }}>
                    <input 
                      type="color"
                      value={settings.ticket_primary_color || '#B68D40'}
                      onChange={e => handleChange('ticket_primary_color', e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                     <p className="text-sm font-mono font-bold text-[#1C1917] tracking-wider">{settings.ticket_primary_color || '#B68D40'}</p>
                     <p className="text-[8px] font-medium text-[#A8A29E] uppercase tracking-widest mt-1">Cliquez sur le carré pour changer de teinte</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-14 px-12 bg-[#1C1917] text-white rounded-full flex items-center gap-4 font-bold text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
        >
          {saving ? 'Synchronisation...' : <>Enregistrer les Modifications</>}
        </button>
      </div>

      <style>{`
        .animate-spin-slow {
           animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
