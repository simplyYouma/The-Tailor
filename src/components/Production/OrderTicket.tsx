import { useRef, useState } from 'react';
import { Download, Share2, Printer, X, Ticket, User, Tag, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { useUIStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { Order, Client } from '@/types';
import { CURRENCY } from '@/types/constants';

interface OrderTicketProps {
  order: Order;
  client?: Client;
  modelImage?: string;
  fabricImage?: string;
  onClose: () => void;
}

export function OrderTicket({ order, client, modelImage, fabricImage, onClose }: OrderTicketProps) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const addToast = useUIStore((s) => s.addToast);
  const [isDownloading, setIsDownloading] = useState(false);
  const { 
    atelier_name, 
    atelier_logo, 
    ticket_logo, 
    ticket_primary_color, 
    ticket_tagline, 
    atelier_phone, 
    atelier_address,
    platform_name,
     ticket_logo_theme
   } = useSettingsStore();
 
  const balance = (order.total_price || 0) - (order.advance_paid || 0);
   const primaryColor = ticket_primary_color || '#B68D40';
   const displayLogo = ticket_logo || atelier_logo;
  const displayTagline = ticket_tagline || "ARTISANAT D'EXCELLENCE";

  const handleDownloadPDF = async () => {
    if (!ticketRef.current || isDownloading) return;
    setIsDownloading(true);
    
    try {
      const scale = 2;
      const dataUrl = await toPng(ticketRef.current, { 
        quality: 1, 
        backgroundColor: '#FDFBF7',
        pixelRatio: scale,
      });

      const imgProps = new Image();
      imgProps.src = dataUrl;
      
      await new Promise((resolve) => {
        imgProps.onload = resolve;
      });

      // Calculate MM dimensions
      const pdfWidth = 115; // Standard width in mm
      const pdfHeight = (imgProps.height / imgProps.width) * pdfWidth;

      const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Ticket_TheTailor_${order.tracking_id?.substring(0, 8)}.pdf`);
      addToast('Ticket PDF généré avec succès !', 'success');
    } catch (err) {
      console.error('Erreur PDF:', err);
      addToast('Erreur lors du téléchargement du PDF.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = async () => {
    if (!ticketRef.current) return;
    
    try {
      addToast('Préparation de l\'impression...', 'info');
      
      const dataUrl = await toPng(ticketRef.current, { 
        quality: 1, 
        backgroundColor: '#FDFBF7',
        pixelRatio: 2 
      });

      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      document.body.appendChild(printIframe);

      const doc = printIframe.contentWindow?.document;
      if (doc) {
        doc.write(`
          <html>
            <head>
              <title>Impression Ticket - The Tailor</title>
              <style>
                @page { margin: 0; }
                body { margin: 0; display: flex; justify-content: center; align-items: flex-start; background: #FDFBF7; }
                img { width: 100%; max-width: 115mm; height: auto; }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" />
              <script>
                window.onload = () => {
                  window.print();
                  setTimeout(() => {
                    window.frameElement.remove();
                  }, 500);
                };
              </script>
            </body>
          </html>
        `);
        doc.close();
      }
    } catch (err) {
      console.error('Erreur Impression:', err);
      addToast('Erreur lors de la préparation de l\'impression.', 'error');
    }
  };

  const handleShare = async () => {
    if (!ticketRef.current) return;
    
    try {
      addToast('Préparation du reçu...', 'info');
      
      // 1. Générer l'image du ticket
      const dataUrl = await toPng(ticketRef.current, { 
        quality: 1, 
        backgroundColor: '#FDFBF7',
        pixelRatio: 2,
      });

      // 2. Préparer le message texte
      const shareText = `🧵 *${(atelier_name || platform_name || 'THE TAILOR').toUpperCase()} - Votre Reçu*\n` +
        `Commande #${order.tracking_id?.substring(0, 8).toUpperCase()}\n` +
        `Total: ${(order.total_price || 0).toLocaleString()} ${CURRENCY}\n` +
        `Reste: ${(balance || 0).toLocaleString()} ${CURRENCY}`;

      // 3. Convertir l'image en Fichier pour le partage
      const blob = await (await fetch(dataUrl)).blob();
      const fileName = `Recu_TheTailor_${order.tracking_id?.substring(0, 8)}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // 4. Tentative de partage natif (Image + Texte)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Reçu The Tailor',
          text: shareText
        });
        addToast('Reçu envoyé !', 'success');
      } else {
        // 5. Fallback : Si le partage de fichier n'est pas supporté (ex: Desktop sans app compatible)
        // On propose le partage texte WhatsApp + téléchargement auto de l'image
        const cleanPhone = client?.phone?.replace(/\D/g, '') || '';
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(shareText)}`;
        
        window.open(whatsappUrl, '_blank');
        
        // On télécharge aussi le PDF/Image pour que l'utilisateur puisse le glisser-déposer
        handleDownloadPDF();
        addToast('Partage de fichier non supporté. Message envoyé + Reçu téléchargé.', 'warning');
      }
    } catch (err) {
      console.error('Erreur Partage:', err);
      addToast('Erreur lors de la génération du reçu.', 'error');
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex flex-col bg-[#F5F5F4] animate-in slide-in-from-right duration-500 overflow-y-auto">
      {/* --- PREMIUM CONTROL BAR --- */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-[#E7E5E4] flex-shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1C1917] rounded-lg flex items-center justify-center text-white">
             <Ticket className="w-4 h-4" style={{ color: primaryColor }} />
          </div>
          <h3 className="text-xs font-serif italic text-[#1C1917] font-black uppercase tracking-tight">Reçu de Caisse</h3>
        </div>
        
        <div className="flex items-center gap-2">
           <button 
             onClick={handleDownloadPDF}
             disabled={isDownloading}
             className="h-8 px-4 text-white rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
             style={{ backgroundColor: primaryColor }}
           >
              {isDownloading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Download className="w-3 h-3" />
              )}
              {isDownloading ? 'Génération...' : 'Télécharger'}
           </button>
           <button 
             onClick={onClose}
             className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#FAF9F6] border border-[#E7E5E4] text-[#78716C] hover:bg-[#1C1917] hover:text-white transition-all shadow-sm"
           >
              <X className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* --- COMPACT TICKET AREA --- */}
      <div className="flex-1 p-6 md:p-10 flex justify-center items-start">
         <div 
           ref={ticketRef}
           className="w-full max-w-[440px] bg-[#FDFBF7] pt-12 px-8 pb-8 md:pt-16 md:px-12 md:pb-12 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] relative overflow-hidden"
           style={{ border: `1px solid ${primaryColor}40` }}
         >
            {/* WATERMARK (Atelier Logo) */}
            {displayLogo && (
               <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0 overflow-hidden">
                  <img src={displayLogo} alt="Watermark" className="w-[120%] h-[120%] object-contain -rotate-12 scale-125 filter grayscale contrast-200 mix-blend-multiply" />
               </div>
            )}

            {/* Header Branding */}
            <div className="text-center mt-2 mb-6 relative z-10 flex flex-col items-center justify-center">
              {displayLogo ? (
                <div className={ticket_logo_theme === 'light' ? "bg-[#1C1917] p-4 rounded-2xl mb-2" : "mb-2"}>
                  <img 
                    src={displayLogo} 
                    alt="Atelier Logo" 
                    className="w-56 h-auto max-h-36 object-contain" 
                  />
                </div>
              ) : (
                <h1 className="text-[32px] font-serif italic text-[#1C1917] leading-none font-black mb-1">
                   {atelier_name || platform_name || 'The Tailor'}
                </h1>
              )}
              <p className="text-[7px] font-black uppercase tracking-[0.6em] leading-none" style={{ color: primaryColor }}>{displayTagline}</p>
            </div>

            {/* HORIZONTAL INFO ROW (CLIENT & DATES) */}
            <div className="grid grid-cols-2 gap-8 mb-8 border-y border-[#E7E5E4]/50 py-6">
               <div className="flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 opacity-40 mb-1">
                       <User className="w-2 h-2" />
                       <span className="text-[7px] font-black uppercase tracking-widest text-[#1C1917]">Nom du Client</span>
                    </div>
                    <h2 className="text-xl font-serif italic text-[#1C1917] font-black leading-tight truncate">
                      {client?.name || 'Client'}
                    </h2>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-[#E7E5E4]/30 space-y-0.5">
                    <p className="text-[6px] font-black uppercase tracking-[0.3em] text-[#B68D40] mb-1">L'Atelier</p>
                    <p className="text-[9px] font-black uppercase tracking-tighter text-[#1C1917] opacity-80">{atelier_phone || '---'}</p>
                    {atelier_address && (
                      <p className="text-[7px] font-medium uppercase tracking-tight text-[#1C1917] opacity-40">{atelier_address}</p>
                    )}
                  </div>
               </div>

               <div className="space-y-3 pl-6 border-l border-[#E7E5E4]/30">
                  <div>
                    <p className="text-[6px] font-black text-[#A8A29E] uppercase tracking-widest mb-0.5">REÇU LE</p>
                    <p className="text-[9px] font-bold text-[#1C1917]">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  {order.delivery_date && (
                    <div>
                      <p className="text-[6px] font-black uppercase tracking-widest mb-0.5" style={{ color: primaryColor }}>LIVRAISON</p>
                      <p className="text-[9px] font-bold text-[#1C1917]">{new Date(order.delivery_date).toLocaleDateString()}</p>
                    </div>
                  )}
               </div>
            </div>

            {/* ARTISANAT PREVIEW (PORTRAIT LOOKBOOK) */}
            {(modelImage || fabricImage) && (
              <div className="flex gap-6 mb-8">
                 {modelImage && (
                   <div className="flex-1 group">
                      <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-[#FAF9F6] border border-[#E7E5E4]/40 shadow-sm transition-shadow hover:shadow-md">
                         <img src={modelImage} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[7px] text-center font-serif italic font-bold py-2 tracking-widest text-[#1C1917] opacity-60">Le Modèle</p>
                   </div>
                 )}
                 {fabricImage && (
                   <div className="flex-1 group">
                      <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-[#FAF9F6] border border-[#E7E5E4]/40 shadow-sm transition-shadow hover:shadow-md">
                         <img src={fabricImage} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[7px] text-center font-serif italic font-bold py-2 tracking-widest text-[#1C1917] opacity-60">Le Textile</p>
                   </div>
                 )}
              </div>
            )}

            {/* ORDER SUMMARY (FLAT/COMPACT) */}
            <div className="bg-white/40 border-2 border-dashed border-[#E7E5E4]/50 rounded-[2rem] p-6 mb-8">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-1.5 opacity-40 mb-1">
                      <Tag className="w-2 h-2" style={{ color: primaryColor }} />
                      <span className="text-[7px] font-black uppercase tracking-widest">Désignation</span>
                    </div>
                    <p className="text-xs font-bold text-[#1C1917] italic">{order.description || 'Tenue Sur Mesure'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[7px] font-black text-[#A8A29E] uppercase tracking-widest mb-1 block">RÉFÉRENCE</span>
                    <p className="text-[10px] font-mono font-black border-b border-dashed" style={{ color: primaryColor, borderColor: primaryColor }}>#{order.tracking_id?.substring(0,8).toUpperCase()}</p>
                  </div>
               </div>

               <div className="flex justify-between items-center py-3 border-t border-[#E7E5E4]/30">
                  <span className="text-[10px] text-[#A8A29E] font-black uppercase tracking-widest">Total Prestation</span>
                  <span className="text-sm font-black text-[#1C1917] tracking-tight">{(order.total_price || 0).toLocaleString()} {CURRENCY}</span>
               </div>
               <div className="flex justify-between items-center pb-1">
                  <span className="text-[9px] text-[#A8A29E] font-medium italic">Acompte Versé</span>
                  <span className="text-[10px] font-bold text-[#78716C] italic">- {(order.advance_paid || 0).toLocaleString()} {CURRENCY}</span>
               </div>
            </div>

            {/* COMPACT BALANCE CARD (WIDER) */}
            <div className="bg-[#1C1917] p-5 rounded-[2rem] flex items-center justify-between px-8 shadow-xl shadow-black/10 z-10 relative">
               <div className="text-left">
                  <p className="text-[7px] font-black uppercase tracking-widest mb-0.5" style={{ color: primaryColor }}>Reste à Régler</p>
                  <span className="text-[8px] text-white/40 font-black uppercase tracking-widest">
                    {balance <= 0 ? "PAIEMENT COMPLET" : "À LIVRAISON"}
                  </span>
               </div>
               <div className="text-right">
                  <h3 className="text-2xl font-serif italic text-white font-black">
                    {(balance || 0).toLocaleString()} <span className="text-xs not-italic font-black ml-1" style={{ color: primaryColor }}>{CURRENCY}</span>
                  </h3>
               </div>
            </div>

             {/* Signature & Note */}
             <div className="mt-8 text-center relative z-10">
                <p className="text-[7px] font-serif italic text-[#1C1917] opacity-60">Merci pour votre précieuse confiance.</p>
                <div className="mt-4 flex items-center justify-center gap-2 text-[6px] font-black text-[#A8A29E] tracking-[0.5em] uppercase">
                   <div className="h-px w-6 bg-[#E7E5E4]" />
                   <span>{atelier_name || 'THE TAILOR'}</span>
                   <div className="h-px w-6 bg-[#E7E5E4]" />
                </div>
             </div>
         </div>
      </div>
      
      {/* TOOLBAR FOOTER */}
      <div className="p-4 bg-white border-t border-[#E7E5E4] flex justify-center gap-3">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#FAF9F6] border border-[#E7E5E4] text-[#78716C] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#1C1917] hover:text-white transition-all shadow-sm active:scale-95"
          >
             <Printer className="w-3.5 h-3.5" /> Imprimer
          </button>
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#FAF9F6] border border-[#E7E5E4] text-[#78716C] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#1C1917] hover:text-white transition-all shadow-sm active:scale-95"
          >
             <Share2 className="w-3.5 h-3.5" /> Partager
          </button>
      </div>
    </div>
  );
}
