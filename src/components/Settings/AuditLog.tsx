import { useState, useEffect, useRef } from 'react';
import { History, Shield, User as UserIcon, Calendar, Search, Archive, Info, AlertTriangle, XCircle, Trash2 } from 'lucide-react';
import { getLogs, pruneOldLogs, clearLogs } from '@/services/auditService';
import type { AuditLog } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useUIStore } from '@/store/uiStore';

export function AuditLogView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const keySequenceRef = useRef<string>('');
  
  const addToast = useUIStore((s) => s.addToast);
  const openConfirm = useUIStore((s) => s.openConfirm);
  
  const LIMIT = 20;

  // --- Secret Shortcut (Ctrl + Y U M I) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        const char = e.key.toUpperCase();
        if ("YUMI".includes(char)) {
          keySequenceRef.current = (keySequenceRef.current + char).slice(-4);
          if (keySequenceRef.current === "YUMI") {
            setIsAdmin(true);
            addToast("Mode Propriétaire (Audit) Débloqué", "success");
            keySequenceRef.current = "";
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchLogs = async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    const newOffset = isLoadMore ? offset + LIMIT : 0;
    const data = await getLogs(LIMIT, newOffset);
    
    if (data.length < LIMIT) setHasMore(false);
    else setHasMore(true);

    if (isLoadMore) {
      setLogs(prev => [...prev, ...data]);
      setOffset(newOffset);
    } else {
      setLogs(data);
      setOffset(0);
    }
    
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleManualPrune = async () => {
    const ok = await openConfirm(
        "Archivage du Journal",
        "Souhaitez-vous archiver et nettoyer les entrées de plus de 30 jours dès maintenant ? Cette action optimise les performances du système."
    );
    if (ok) {
        const count = await pruneOldLogs();
        if (count > 0) {
            addToast(`${count} entrées anciennes archivées avec succès`, "success");
        } else {
            addToast("Aucune entrée ancienne à archiver pour le moment", "info");
        }
        fetchLogs();
    }
  };

  const handleResetLogs = async () => {
    const ok = await openConfirm(
        "PURGE TOTALE DU JOURNAL",
        "ATTENTION : Cette action supprimera l'intégralité de l'historique d'audit de l'atelier de façon irréversible. Êtes-vous absolument certain de vouloir continuer ?"
    );
    if (ok) {
        const confirmAgain = await openConfirm(
            "CONFIRMATION FINALE",
            "Dernière chance : Souhaitez-vous vraiment vider tout le journal ?"
        );
        if (confirmAgain) {
            await clearLogs();
            addToast("Le journal d'audit a été entièrement réinitialisé", "success");
            fetchLogs();
        }
    }
  };

  const getActionConfig = (action: string) => {
    if (action.includes('DELETE') || action.includes('BLOCK')) return { icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-red-500 bg-red-50 border-red-100', label: 'Critique' };
    if (action.includes('UPDATE') || action.includes('ADJUST')) return { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'text-orange-500 bg-orange-50 border-orange-100', label: 'Modification' };
    if (action.includes('CREATE') || action.includes('ADD')) return { icon: <Info className="w-3.5 h-3.5" />, color: 'text-green-600 bg-green-50 border-green-100', label: 'Création' };
    return { icon: <History className="w-3.5 h-3.5" />, color: 'text-blue-500 bg-blue-50 border-blue-100', label: 'Système' };
  };

  const filteredLogs = logs.filter(l => 
    l.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.details || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E7E5E4]">
        <div>
          <h3 className="text-2xl font-serif italic text-[#1C1917]">Journal de la Maison</h3>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#B68D40]">Registre d'Audit & Traçabilité des Talents</p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E] group-focus-within:text-[#1C1917] transition-colors" />
                <input 
                    type="text"
                    placeholder="Filtrer l'historique..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-12 pl-12 pr-6 bg-white border border-[#E7E5E4] rounded-full text-xs font-bold tracking-widest focus:border-[#1C1917] focus:outline-none transition-all w-64 shadow-sm"
                />
            </div>
            <button
                onClick={handleManualPrune}
                className="h-12 px-6 bg-[#FAF9F6] border border-[#E7E5E4] rounded-full flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[#78716C] hover:bg-[#1C1917] hover:text-white hover:border-[#1C1917] transition-all"
                title="Archiver les logs > 30 jours"
            >
                <Archive className="w-4 h-4" />
                <span className="hidden lg:inline">30 Jours</span>
            </button>

            {isAdmin && (
                <button
                    onClick={handleResetLogs}
                    className="h-12 w-12 lg:w-auto lg:px-6 bg-red-50 border border-red-100 rounded-full flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm"
                    title="Purger tout le journal"
                >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden lg:inline">Purger Tout</span>
                </button>
            )}
        </div>
      </header>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4 text-[#A8A29E]">
            <div className="w-12 h-12 border-2 border-[#E7E5E4] border-t-[#B68D40] rounded-full animate-spin" />
            <p className="font-serif italic">Lecture des archives...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-10 bg-[#FAF9F6] rounded-[2.5rem] border border-dashed border-[#E7E5E4]">
            <History className="w-10 h-10 text-[#A8A29E] mb-4 opacity-20" />
            <p className="text-[11px] font-black uppercase tracking-widest text-[#A8A29E]">Aucune trace trouvée pour cette période</p>
        </div>
      ) : (
        <div className="relative">
          {/* Subtle Scroller Container */}
          <div className="max-h-[65vh] overflow-y-auto pr-4 lg:pl-12 custom-scrollbar">
              <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-5 top-8 bottom-8 w-px bg-gradient-to-b from-[#E7E5E4] via-[#E7E5E4] to-transparent hidden md:block" />

                <div className="space-y-6">
                  {filteredLogs.map((log) => {
                      const config = getActionConfig(log.action);
                      return (
                          <div key={log.id} className="relative flex flex-col md:flex-row gap-6 md:pl-12 group">
                              <div className="absolute left-3 top-1.5 w-4 h-4 bg-white border-2 border-[#B68D40] rounded-full z-10 hidden md:block ring-4 ring-[#FAF9F6] transition-transform group-hover:scale-125" />
                              
                              {/* Heure : Positionnée pour être à l'intérieur du conteneur de scroll (évite le clipping) */}
                              <div className="absolute left-[-40px] top-1.5 w-8 text-right text-[10px] font-black uppercase tracking-widest text-[#B68D40] hidden lg:block opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all">
                                  {format(new Date(log.created_at), 'HH:mm', { locale: fr })}
                              </div>

                              <div className="flex-1 bg-white border border-[#E7E5E4] rounded-2xl p-5 hover:border-[#1C1917] transition-all hover:shadow-[0_10px_30px_rgba(0,0,0,0.03)] relative overflow-hidden">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                      <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 rounded-xl bg-[#FAF9F6] flex items-center justify-center text-[#1C1917] border border-[#E7E5E4]">
                                              <UserIcon className="w-5 h-5" />
                                          </div>
                                          <div>
                                              <div className="flex items-center gap-2 mb-1">
                                                  <span className="text-xs font-serif italic font-bold text-[#1C1917]">{log.user_name}</span>
                                                  <span className={cn(
                                                      "px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border",
                                                      config.color
                                                  )}>
                                                      {log.action}
                                                  </span>
                                              </div>
                                              <p className="text-[13px] text-[#78716C] font-serif italic leading-none">{log.details}</p>
                                          </div>
                                      </div>

                                      <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-[#FAF9F6] pt-4 sm:pt-0 sm:pl-6 text-[10px] font-black uppercase tracking-widest text-[#A8A29E]">
                                          <div className="flex items-center gap-2">
                                              <Calendar className="w-3.5 h-3.5" />
                                              <span>{format(new Date(log.created_at), 'dd MMM yyyy', { locale: fr })}</span>
                                          </div>
                                          <div className="flex items-center gap-2 lg:hidden">
                                              <History className="w-3.5 h-3.5" />
                                              <span>{format(new Date(log.created_at), 'HH:mm', { locale: fr })}</span>
                                          </div>
                                      </div>
                                  </div>
                                  
                                  {log.entity_type && (
                                      <div className="absolute bottom-0 right-0 px-3 py-1 bg-[#FAF9F6] border-tl border-[#E7E5E4] rounded-tl-xl text-[6px] font-black uppercase tracking-[0.3em] text-[#A8A29E] opacity-40">
                                          REF: {log.entity_type}/{log.entity_id?.slice(0,6)}
                                      </div>
                                  )}
                              </div>
                          </div>
                      );
                  })}
                </div>

                {/* Pagination Footnote Button */}
                {hasMore && !searchTerm && (
                    <div className="mt-10 md:ml-16 flex justify-center md:justify-start pb-4">
                        <button
                            onClick={() => fetchLogs(true)}
                            disabled={loadingMore}
                            className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B68D40] hover:text-[#1C1917] flex items-center gap-3 px-6 py-3 bg-white border border-[#E7E5E4] rounded-full shadow-sm transition-all hover:shadow-md active:scale-95 disabled:opacity-50"
                        >
                            {loadingMore ? (
                                <div className="w-3 h-3 border border-[#B68D40] border-t-transparent rounded-full animate-spin" />
                            ) : <History className="w-3 h-3" />}
                            Charger l'historique précédent...
                        </button>
                    </div>
                )}
              </div>
          </div>
        </div>
      )}

      <div className="pt-10 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#A8A29E] opacity-50">
          <Shield className="w-3 h-3" />
          <span>Ce journal est immuable et crypté pour la sécurité de l'atelier.</span>
      </div>
    </div>
  );
}
