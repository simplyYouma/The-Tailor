import { useState, useEffect } from 'react';
import { UserPlus, Edit2, Trash2, Shield, User as UserIcon, Lock, Unlock, Crown, Briefcase, Users as UsersIcon, ChevronRight } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import * as authService from '@/services/authService';
import type { User, UserRole } from '@/types';
import { cn } from '@/lib/utils';

export function TeamSettings() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const openConfirm = useUIStore((s) => s.openConfirm);
  const openModal = useUIStore((s) => s.openModal);
  const addToast = useUIStore((s) => s.addToast);

  const fetchUsers = async () => {
    try {
      const data = await authService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const refreshCounter = useUIStore((s) => s.refreshCounter);

  useEffect(() => {
    fetchUsers();
  }, [refreshCounter]);

  const handleDelete = async (user: User) => {
    if (user.role === 'admin') {
        return addToast("Un Administrateur ne peut pas être supprimé.", "error");
    }

    const ok = await openConfirm(
        `Retirer ${user.full_name} ?`,
        `Le collaborateur n'aura plus accès à la plateforme The Tailor.`
    );
    if (ok) {
      await authService.deleteUser(user.id);
      addToast('Collaborateur retiré', 'success');
      fetchUsers();
    }
  };

  const handleEdit = (user: User) => {
    openModal('user_form', user);
  };

  const handleToggleBlock = async (user: User) => {
    if (user.role === 'admin') {
        return addToast("Impossible de suspendre un Administrateur.", "error");
    }

    const action = user.is_blocked ? 'réactiver' : 'suspendre';
    const ok = await openConfirm(
        `${action.charAt(0).toUpperCase() + action.slice(1)} le compte ?`,
        `L'accès de ${user.full_name} sera immédiatement ${user.is_blocked ? 'rétabli' : 'coupé'}.`
    );

    if (ok) {
        await authService.toggleUserBlockStatus(user.id, !user.is_blocked);
        addToast(`Accès ${user.is_blocked ? 'rétabli' : 'suspendu'}`, 'success');
        fetchUsers();
    }
  };

  const getRoleConfig = (role: UserRole) => {
    switch (role) {
        case 'admin':
            return {
                label: 'Administrateur',
                icon: <Crown className="w-3.5 h-3.5" />,
                theme: 'bg-[#1C1917] text-[#B68D40] border-[#B68D40]/30',
                avatarBorder: 'border-[#B68D40]'
            };
        case 'manager':
            return {
                label: 'Gérant',
                icon: <Briefcase className="w-3.5 h-3.5" />,
                theme: 'bg-slate-100 text-slate-700 border-slate-200',
                avatarBorder: 'border-slate-300'
            };
        default:
            return {
                label: 'Équipe',
                icon: <UsersIcon className="w-3.5 h-3.5" />,
                theme: 'bg-[#FAF9F6] text-[#78716C] border-[#E7E5E4]',
                avatarBorder: 'border-[#E7E5E4]'
            };
    }
  };

  if (loading) return <div className="h-64 flex items-center justify-center text-[#A8A29E] font-serif italic">Préparation de la Maison de Couture...</div>;

  return (
    <div className="max-w-4xl space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[#E7E5E4]">
        <div>
          <h3 className="text-3xl font-serif italic text-[#1C1917] mb-2">L'Atelier</h3>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#B68D40]">Hiérarchie des Talents</p>
        </div>
        <button
          onClick={() => openModal('user_form', null)}
          className="h-14 px-10 bg-[#1C1917] text-white rounded-full flex items-center gap-4 font-bold text-[11px] uppercase tracking-widest shadow-2xl hover:bg-black transition-all active:scale-95 group"
        >
          <UserPlus className="w-4 h-4 transition-transform group-hover:scale-110" />
          Nouveau Membre
        </button>
      </header>

      <div className="space-y-4">
        {users.map((user) => {
          const config = getRoleConfig(user.role);
          const isAdmin = user.role === 'admin';

          return (
            <div key={user.id} className={cn(
              "group relative bg-white border border-[#E7E5E4] rounded-[2rem] p-5 transition-all duration-500 hover:shadow-[0_15px_40px_rgba(0,0,0,0.04)] hover:border-[#1C1917]",
              user.is_blocked && "opacity-60 grayscale-[0.4]"
            )}>
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                {/* Avatar Section */}
                <div className="relative flex-shrink-0">
                  <div className={cn(
                    "w-20 h-20 rounded-full border-2 p-1 transition-transform duration-500 group-hover:rotate-3",
                    config.avatarBorder
                  )}>
                    <div className="w-full h-full rounded-full bg-[#FAF9F6] overflow-hidden flex items-center justify-center">
                      {user.avatar_path ? (
                        <img src={user.avatar_path} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-6 h-6 text-[#A8A29E]" />
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="absolute -top-1 -right-1 w-7 h-7 bg-[#1C1917] border-2 border-white text-[#B68D40] rounded-full flex items-center justify-center shadow-lg">
                      <Crown className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {!!user.is_blocked && (
                    <div className="absolute inset-0 bg-[#1C1917]/40 backdrop-blur-sm flex items-center justify-center rounded-full">
                        <Lock className="w-6 h-6 text-[#B68D40] drop-shadow-lg" />
                    </div>
                  )}
                </div>

                {/* Info Section */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="text-2xl font-serif italic text-[#1C1917] leading-none">{user.full_name}</h4>
                    <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-[0.2em]",
                        config.theme
                    )}>
                        {config.icon}
                        {config.label}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-widest text-[#A8A29E]">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3 h-3 text-[#B68D40]" />
                        <span>Code PIN Configuré</span>
                      </div>
                      {!!user.is_blocked && (
                        <div className="flex items-center gap-1.5 text-red-500 animate-pulse">
                            <Lock className="w-3 h-3" />
                            <span>Accès Suspendu</span>
                        </div>
                      )}
                  </div>
                </div>

                {/* Actions Section */}
                  <div className="flex items-center gap-2 md:pl-6 md:border-l border-[#FAF9F6]">
                    <button
                        onClick={() => handleEdit(user)}
                        className="h-11 px-6 bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl flex items-center gap-2.5 text-[9px] font-black uppercase tracking-widest text-[#78716C] hover:bg-[#1C1917] hover:text-white hover:border-[#1C1917] transition-all"
                    >
                        <Edit2 className="w-3.5 h-3.5" /> Éditer
                    </button>
                    
                    {!isAdmin && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleToggleBlock(user)}
                                className={cn(
                                    "w-11 h-11 rounded-xl flex items-center justify-center transition-all border-2",
                                    !!user.is_blocked 
                                        ? "bg-green-50 border-green-100 text-green-500 hover:bg-green-500 hover:text-white" 
                                        : "bg-orange-50 border-orange-100 text-orange-400 hover:bg-orange-400 hover:text-white"
                                )}
                                title={!!user.is_blocked ? 'Rétablir' : 'Suspendre'}
                            >
                                {!!user.is_blocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            </button>

                      <button
                        onClick={() => handleDelete(user)}
                        className="w-11 h-11 bg-white border-2 border-[#FAF9F6] text-[#A8A29E] rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Interaction Decorator */}
              <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E7E5E4] opacity-0 group-hover:opacity-20 transition-all group-hover:translate-x-2 hidden md:block" />
            </div>
          );
        })}
      </div>

      {/* Safety Section */}
      <footer className="bg-[#1C1917] rounded-[2.5rem] p-10 relative overflow-hidden group shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-16 h-16 bg-[#B68D40] rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6 group-hover:rotate-0 transition-transform duration-500">
                <Shield className="w-8 h-8 text-[#1C1917]" />
            </div>
            <div className="text-center md:text-left space-y-2">
                <h5 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#B68D40]">Sécurité de la Maison</h5>
                <p className="text-white/60 font-serif italic text-sm leading-relaxed max-w-xl">
                    Seuls les administrateurs peuvent modifier la hiérarchie et suspendre des comptes. 
                    Le code PIN est la seule clé d'accès pour chaque collaborateur.
                </p>
            </div>
        </div>
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#B68D40]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      </footer>
    </div>
  );
}
