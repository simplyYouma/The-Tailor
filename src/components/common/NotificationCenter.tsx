import React from 'react';
import { Bell, Package, Clock, Info, Check, Trash2 } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const notifications = useUIStore((s) => s.notifications);
  const markRead = useUIStore((s) => s.markNotificationRead);
  const removeNotification = useUIStore((s) => s.removeNotification);
  const markAllRead = useUIStore((s) => s.markAllNotificationsRead);
  const clearAll = useUIStore((s) => s.clearNotifications);
  const navigate = useUIStore((s) => s.navigate);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for closing */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className="absolute right-0 top-full mt-4 w-96 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-[#E7E5E4] overflow-hidden z-[999]"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#F5F5F4] flex items-center justify-between bg-[#FAF9F6]">
          <div>
            <h3 className="text-lg font-serif italic text-[#1C1917]">Notifications</h3>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#B68D40]">Votre activité</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={markAllRead}
              className="p-2 hover:bg-white rounded-full transition-colors text-[#78716C] hover:text-[#1C1917]"
              title="Tout marquer comme lu"
            >
              <Check className="w-4 h-4" />
            </button>
            <button 
              onClick={clearAll}
              className="p-2 hover:bg-white rounded-full transition-colors text-[#78716C] hover:text-red-500"
              title="Tout effacer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar overflow-x-hidden">
          <AnimatePresence initial={false}>
            {notifications.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 flex flex-col items-center justify-center text-center opacity-40"
              >
                <Bell className="w-8 h-8 mb-3 stroke-[1]" />
                <p className="text-[10px] font-black uppercase tracking-widest">Aucune notification</p>
              </motion.div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="relative group overflow-hidden border-b border-[#F5F5F4]">
                  {/* Background Action (Delete) - Soft with Red Icon */}
                  <div className="absolute inset-0 bg-[#FAF9F6] flex items-center justify-end px-8 text-red-500 pointer-events-none">
                    <div className="flex flex-col items-center gap-1 opacity-80">
                      <Trash2 className="w-4 h-4" />
                      <span className="text-[7px] font-black uppercase tracking-widest">Supprimer</span>
                    </div>
                  </div>

                  {/* Foreground Draggable Item */}
                  <motion.button
                    type="button"
                    drag="x"
                    dragConstraints={{ left: -100, right: 0 }}
                    dragElastic={0.05}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -80) {
                        removeNotification(n.id);
                      }
                    }}
                    whileTap={{ cursor: 'grabbing' }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      markRead(n.id);
                      if (n.link) {
                        navigate(n.link.view, n.link.payload);
                        onClose();
                      }
                    }}
                    className={cn(
                      "w-full text-left px-6 py-5 hover:bg-[#FAF9F6] transition-colors flex gap-4 relative z-10 touch-pan-y outline-none",
                      !n.read ? "bg-[#FFFBF5]" : "bg-white"
                    )}
                    exit={{ x: '-100%', opacity: 0, transition: { duration: 0.2 } }}
                  >
                    
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm overflow-hidden",
                      n.type === 'stock' ? "bg-red-50 text-red-500" :
                      n.type === 'order' ? "bg-[#B68D40]/10 text-[#B68D40]" :
                      "bg-blue-50 text-blue-500"
                    )}>
                      {n.image_path ? (
                        <img 
                          src={n.image_path.startsWith('data:') ? n.image_path : `https://asset.localhost/${n.image_path}`} 
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <>
                          {n.type === 'stock' && <Package className="w-4 h-4" />}
                          {n.type === 'order' && <Clock className="w-4 h-4" />}
                          {n.type === 'info' && <Info className="w-4 h-4" />}
                        </>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pointer-events-none">
                      <div className="flex justify-between items-start mb-0.5">
                        <p className={cn(
                          "text-xs font-bold uppercase tracking-tight",
                          !n.read ? "text-[#1C1917]" : "text-[#78716C]"
                        )}>{n.title}</p>
                        <span className="text-[9px] text-[#A8A29E] font-medium">
                          {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true, locale: fr })}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#44403C] leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                  </motion.button>
                </div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-4 bg-[#FAF9F6] text-center border-t border-[#F5F5F4]">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#A8A29E]">Fin de liste</span>
          </div>
        )}
      </motion.div>
    </>
  );
};
