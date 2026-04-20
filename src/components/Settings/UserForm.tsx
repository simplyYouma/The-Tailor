import { useState, useEffect } from 'react';
import { X, User as UserIcon, Shield, Lock, Save, Camera } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Dropdown } from '@/components/common/Dropdown';
import * as authService from '@/services/authService';
import type { User, UserRole } from '@/types';

export function UserForm() {
  const closeModal = useUIStore((s) => s.closeModal);
  const user = useUIStore((s) => s.modalPayload) as User | null;
  const isEditing = !!user;
  const addToast = useUIStore((s) => s.addToast);
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const refreshSettings = useSettingsStore((s) => s.refreshSettings);

  const [formData, setFormData] = useState({
    full_name: '',
    role: 'employee' as 'admin' | 'manager' | 'employee',
    avatar_path: '',
    pin: '',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name,
        role: user.role,
        avatar_path: user.avatar_path || '',
        pin: '', // We don't pre-fill PIN for security, but we fetch it below if needed
      });
      // Admin can see the current PIN
      authService.getUserPin(user.id).then(p => {
         setFormData(prev => ({ ...prev, pin: p }));
      });
    }
  }, [user]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData({ ...formData, avatar_path: event.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name) return addToast('Le nom est requis', 'error');
    if (formData.pin.length < 4) return addToast('Le code PIN doit faire 4 chiffres', 'error');

    setLoading(true);
    try {
      await authService.upsertUser({
        id: user?.id,
        full_name: formData.full_name,
        role: formData.role,
        avatar_path: formData.avatar_path,
        pin: formData.pin,
      });
      addToast(isEditing ? 'Profil mis à jour' : 'Membre ajouté à l’équipe', 'success');
      
      // Mise à jour instantanée du profil connecté si c'est lui qu'on modifie
      await refreshSession();
      // On rafraîchit aussi les réglages au cas où le rôle a changé (permissions)
      await refreshSettings();
      
      useUIStore.getState().triggerRefresh();
      closeModal();
    } catch (error) {
      console.error(error);
      addToast('Erreur lors de l’enregistrement', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1C1917]/20 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 relative">
        <header className="px-8 pt-8 pb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif italic text-[#1C1917]">{isEditing ? 'Modifier le profil' : 'Ajouter un membre'}</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#B68D40]">Gestion des accès</p>
          </div>
          <button 
            onClick={closeModal}
            className="w-10 h-10 rounded-full border border-[#E7E5E4] flex items-center justify-center text-[#78716C] hover:bg-[#F5F5F4] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="px-8 pb-10 space-y-8">
          {/* Avatar Edit */}
          <div className="flex justify-center">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-[#FAF9F6] border-2 border-[#E7E5E4] flex items-center justify-center overflow-hidden transition-all group-hover:border-[#B68D40]">
                {formData.avatar_path ? (
                  <img src={formData.avatar_path} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-8 h-8 text-[#A8A29E]" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-[#1C1917] text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg border-2 border-white transition-transform hover:scale-110 active:scale-95">
                <Camera className="w-3.5 h-3.5" />
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
              </label>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#A8A29E]">Nom Complet</label>
              <input 
                value={formData.full_name}
                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full h-12 bg-[#FAF9F6] border-b-2 border-[#E7E5E4] focus:border-[#B68D40] focus:outline-none transition-colors px-0 font-serif italic text-lg"
                placeholder="Saisir le nom complet"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#A8A29E]">Rôle Atelier</label>
                <Dropdown 
                  label="Sélectionner un rôle"
                  options={[
                    { id: 'employee', label: 'Équipe Confection', icon: <UserIcon className="w-3.5 h-3.5" /> },
                    { id: 'manager', label: 'Gérant', icon: <Shield className="w-3.5 h-3.5 text-blue-500" /> },
                    { id: 'admin', label: 'Administrateur', icon: <Shield className="w-3.5 h-3.5 text-[#B68D40]" /> },
                  ]}
                  selectedId={formData.role}
                  onSelect={(opt) => setFormData({ ...formData, role: opt.id as UserRole })}
                  className="w-full"
                  triggerClassName="w-full h-11 bg-[#FAF9F6] border-[#E7E5E4] rounded-xl text-[10px] font-black uppercase tracking-widest"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#A8A29E]">Code PIN (4 chiffres)</label>
                <div className="relative">
                  <input 
                    type="password"
                    maxLength={4}
                    value={formData.pin}
                    onChange={e => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                    className="w-full h-11 bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl px-10 text-center font-bold tracking-[0.5em] focus:outline-none focus:border-[#B68D40]"
                    placeholder="0000"
                  />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B68D40] opacity-40" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#1C1917] text-white rounded-full flex items-center justify-center gap-3 font-bold text-[11px] uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : <><Save className="w-4 h-4" /> Enregistrer le profil</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
