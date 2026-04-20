import { AlertTriangle, X } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

export function ConfirmModal() {
  const { isOpen, title, message, confirmLabel, cancelLabel } = useUIStore((s) => s.confirmDialog);
  const closeConfirm = useUIStore((s) => s.closeConfirm);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md mx-4 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 relative">
        
        {/* Close button (X) */}
        <button 
          onClick={() => closeConfirm(null)}
          className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl text-[#78716C] hover:bg-[#1C1917] hover:text-white transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 🧵 Stitched Header Detail */}
        <div className="h-3 w-full bg-[#FAF9F6] border-t border-[#E7E5E4] flex items-center justify-center relative overflow-hidden">
           <div className="absolute top-1/2 left-0 w-full h-[1px] border-t-2 border-dashed border-[#B68D40] opacity-40" />
        </div>
        
        <div className="p-8 pb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF9F6] flex items-center justify-center flex-shrink-0">
               <AlertTriangle className="w-6 h-6 text-[#A8A29E]" />
            </div>
            <div>
              <h3 className="text-xl font-serif italic text-[#1C1917] leading-tight">{title}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#A8A29E] mt-1">Confirmation requise</p>
            </div>
          </div>

          <p className="text-sm text-[#78716C] leading-relaxed mb-8 whitespace-pre-line">
            {message}
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => closeConfirm(false)}
              className="flex-1 h-12 rounded-xl text-[9px] font-black uppercase tracking-widest text-[#78716C] hover:bg-[#F5F5F4] transition-all border border-transparent hover:border-[#E7E5E4]"
            >
              {cancelLabel || 'Annuler'}
            </button>
            <button
              onClick={() => closeConfirm(true)}
              className="flex-1 h-12 rounded-xl bg-[#1C1917] text-white text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
            >
              {confirmLabel || 'Confirmer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
