import { QRCodeCanvas } from 'qrcode.react';
import { getTrackingUrl } from '@/services/syncService';
import { QrCode, X, Download, Share2 } from 'lucide-react';

interface QRGeneratorProps {
  trackingId: string;
  clientName?: string;
  onClose?: () => void;
}

export function QRGenerator({ trackingId, clientName, onClose }: QRGeneratorProps) {
  const url = getTrackingUrl(trackingId);

  return (
    <div className="bg-white w-full max-w-[400px] mx-4 rounded-[3.5rem] p-10 flex flex-col items-center animate-in zoom-in-95 duration-500 relative shadow-2xl border-t-8 border-[#B68D40]">
      {onClose && (
        <button 
          onClick={onClose} 
          className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center rounded-full bg-[#FAF9F6] border border-[#E7E5E4] text-[#78716C] hover:bg-[#1C1917] hover:text-white transition-all shadow-sm"
        >
          <X className="w-6 h-6" />
        </button>
      )}
      
      <div className="flex flex-col items-center text-center w-full">
         <div className="w-20 h-20 bg-[#B68D40] rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl shadow-[#B68D40]/30 transform -rotate-6">
            <QrCode className="w-10 h-10 text-white" />
         </div>
         
         <h2 className="text-3xl font-serif italic text-[#1C1917] mb-2 font-black">Pro Ticket Elite</h2>
         <p className="text-[11px] text-[#A8A29E] font-black uppercase tracking-[0.4em] mb-10">Maison de Couture</p>
         
         <div className="bg-white p-8 rounded-[3rem] border-2 border-[#E7E5E4] shadow-xl mb-10 transform hover:scale-105 transition-transform duration-500 group">
            <QRCodeCanvas 
               value={url} 
               size={220}
               level="H"
               includeMargin={false}
            />
            <div className="mt-6 flex items-center justify-center gap-3 text-[#B68D40]">
               <div className="w-2 h-2 rounded-full bg-[#B68D40] animate-ping" />
               <span className="text-[10px] font-bold uppercase tracking-widest">Lien de suivi actif</span>
            </div>
         </div>
         
         <div className="bg-[#FAF9F6] border border-[#E7E5E4] p-5 rounded-3xl w-full mb-10 text-left">
            <div className="flex justify-between items-start mb-3">
               <div>
                  <p className="text-[9px] font-black text-[#A8A29E] uppercase tracking-widest mb-1">Dossier de suivi</p>
                  <p className="text-base font-bold text-[#1C1917] tracking-tight">{clientName || 'Client'}</p>
               </div>
               <div className="text-right">
                  <p className="text-[9px] font-black text-[#A8A29E] uppercase tracking-widest mb-1">Code</p>
                  <p className="text-sm font-mono font-bold text-[#B68D40]">#{trackingId?.substring(0,8).toUpperCase()}</p>
               </div>
            </div>
            <div className="h-px bg-[#E7E5E4]/60 w-full mb-3" />
            <p className="text-[10px] text-[#78716C] leading-relaxed italic">
               Scannez ce code pour consulter l'avancement de votre tenue en temps réel sur votre mobile.
            </p>
         </div>

         <div className="flex gap-4 w-full">
            <button 
              onClick={() => window.print()}
              className="flex-1 h-14 bg-[#1C1917] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all shadow-lg active:scale-95"
            >
               <Download className="w-4 h-4" /> Capturer / Imprimer
            </button>
            <button className="w-14 h-14 bg-[#FAF9F6] border border-[#E7E5E4] text-[#78716C] rounded-2xl flex items-center justify-center hover:bg-[#1C1917] hover:text-white transition-all shadow-sm">
               <Share2 className="w-5 h-5" />
            </button>
         </div>
      </div>
    </div>
  );
}
