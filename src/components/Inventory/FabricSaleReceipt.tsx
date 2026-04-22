import { useRef, useState } from 'react';
import { X, Printer, Share2, Loader2, ImageDown } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useUIStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useClientStore } from '@/store/clientStore';
import { CURRENCY } from '@/types/constants';
import type { Fabric } from '@/types';
import type { FabricSale } from '@/services/fabricService';

interface SalePayload {
  fabric: Fabric;
  sale: FabricSale;
}

export function FabricSaleReceipt() {
  const closeModal = useUIStore((s) => s.closeModal);
  const addToast = useUIStore((s) => s.addToast);
  const payload = useUIStore((s) => s.modalPayload) as SalePayload | null;
  const clients = useClientStore((s) => s.clients);
  const {
    atelier_name,
    atelier_logo,
    ticket_logo,
    ticket_primary_color,
    ticket_tagline,
    atelier_phone,
    atelier_address,
    platform_name,
    ticket_logo_theme,
  } = useSettingsStore();

  const ticketRef = useRef<HTMLDivElement>(null);
  const [isBusy, setIsBusy] = useState(false);

  if (!payload) return null;
  const { fabric, sale } = payload;
  const { meters, method, customer_label: customer, total, created_at: date } = sale;

  const client = sale.client_id ? clients.find((c) => c.id === sale.client_id) : undefined;
  const primaryColor = ticket_primary_color || '#B68D40';
  const displayLogo = ticket_logo || atelier_logo;
  const displayTagline = ticket_tagline || "ARTISANAT D'EXCELLENCE";
  const fileStub = `Vente_Tissu_${sale.id.slice(0, 8)}`;

  const formatted = new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const generatePng = async () => {
    if (!ticketRef.current) throw new Error('Ticket non prêt');
    return toPng(ticketRef.current, { quality: 1, backgroundColor: '#FDFBF7', pixelRatio: 2 });
  };

  const handleSavePng = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const dataUrl = await generatePng();
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${fileStub}.png`;
      link.click();
      addToast('Image PNG enregistrée', 'success');
    } catch (e) {
      console.error(e);
      addToast("Erreur lors de l'enregistrement", 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handlePrint = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const dataUrl = await generatePng();
      const iframe = document.createElement('iframe');
      Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.write(`<html><head><title>Reçu Tissu</title><style>@page{margin:0}body{margin:0;display:flex;justify-content:center;background:#FDFBF7}img{width:100%;max-width:115mm;height:auto}</style></head><body><img src="${dataUrl}"/><script>window.onload=()=>{window.print();setTimeout(()=>window.frameElement.remove(),500);};</script></body></html>`);
        doc.close();
      }
    } catch (e) {
      console.error(e);
      addToast("Erreur lors de l'impression", 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleWhatsApp = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const dataUrl = await generatePng();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${fileStub}.png`, { type: 'image/png' });

      const shareText =
        `🧵 *${(atelier_name || platform_name || 'THE TAILOR').toUpperCase()} - Reçu de Vente*\n` +
        `Tissu: ${fabric.name}\n` +
        `Métrage: ${meters}m\n` +
        `Total: ${total.toLocaleString()} ${CURRENCY}`;

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Reçu Tissu', text: shareText });
        addToast('Reçu partagé', 'success');
      } else {
        const cleanPhone = client?.phone?.replace(/\D/g, '') || '';
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
        // Also download image so user can attach it
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${fileStub}.png`;
        link.click();
        addToast('WhatsApp ouvert — image téléchargée à joindre', 'info');
      }
    } catch (e) {
      console.error(e);
      addToast('Erreur lors du partage', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-[#1C1917]/80 backdrop-blur-sm" onClick={closeModal} />

      <div className="relative w-full max-w-sm animate-in zoom-in-95 duration-300 my-auto">
        {/* Floating action bar */}
        <div className="sticky top-0 z-10 flex justify-end gap-2 mb-4 print:hidden flex-wrap">
          <button
            onClick={handlePrint}
            disabled={isBusy}
            className="h-10 px-4 bg-white/90 border border-white rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1C1917] hover:bg-white transition-all active:scale-95 disabled:opacity-50"
          >
            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />} Imprimer
          </button>
          <button
            onClick={handleSavePng}
            disabled={isBusy}
            className="h-10 px-4 bg-white/90 border border-white rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1C1917] hover:bg-white transition-all active:scale-95 disabled:opacity-50"
          >
            <ImageDown className="w-3.5 h-3.5" /> PNG
          </button>
          <button
            onClick={handleWhatsApp}
            disabled={isBusy}
            className="h-10 px-4 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white hover:brightness-110 transition-all active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: '#25D366' }}
          >
            <Share2 className="w-3.5 h-3.5" /> WhatsApp
          </button>
          <button
            onClick={closeModal}
            className="w-10 h-10 bg-white/90 border border-white rounded-full flex items-center justify-center hover:bg-white transition-all active:scale-95"
          >
            <X className="w-4 h-4 text-[#78716C]" />
          </button>
        </div>

        <div
          ref={ticketRef}
          className="bg-[#FDFBF7] pt-6 px-5 pb-5 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] relative overflow-hidden rounded-2xl"
          style={{ border: `1px solid ${primaryColor}40` }}
        >
          {displayLogo && (
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0 overflow-hidden">
              <img src={displayLogo} alt="" className="w-[120%] h-[120%] object-contain -rotate-12 scale-125 filter grayscale contrast-200 mix-blend-multiply" />
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-4 relative z-10 flex flex-col items-center">
            {displayLogo ? (
              <div className={ticket_logo_theme === 'light' ? 'bg-[#1C1917] p-2 rounded-xl mb-2' : 'mb-2'}>
                <img src={displayLogo} alt="Logo" className="w-32 h-auto max-h-20 object-contain" />
              </div>
            ) : (
              <h1 className="text-xl font-serif italic text-[#1C1917] leading-none font-black mb-1">
                {atelier_name || platform_name || 'The Tailor'}
              </h1>
            )}
            <p className="text-[7px] font-black uppercase tracking-[0.6em] leading-none" style={{ color: primaryColor }}>
              {displayTagline}
            </p>
          </div>

          {/* Client & Date */}
          <div className="grid grid-cols-2 gap-4 mb-4 border-y border-[#E7E5E4]/50 py-4">
            <div className="flex flex-col justify-between">
              <div>
                <p className="text-[7px] font-black uppercase tracking-widest text-[#1C1917] opacity-40 mb-1">Client</p>
                <h2 className="text-sm font-serif italic text-[#1C1917] font-black leading-tight truncate">{customer}</h2>
              </div>
              <div className="mt-3 pt-2 border-t border-[#E7E5E4]/30 space-y-0.5">
                <p className="text-[6px] font-black uppercase tracking-[0.3em] mb-1" style={{ color: primaryColor }}>L'Atelier</p>
                <p className="text-[9px] font-black uppercase tracking-tighter text-[#1C1917] opacity-80">{atelier_phone || '---'}</p>
                {atelier_address && (
                  <p className="text-[7px] font-medium uppercase tracking-tight text-[#1C1917] opacity-40">{atelier_address}</p>
                )}
              </div>
            </div>
            <div className="space-y-2 pl-4 border-l border-[#E7E5E4]/30">
              <div>
                <p className="text-[6px] font-black text-[#A8A29E] uppercase tracking-widest mb-0.5">Émis le</p>
                <p className="text-[9px] font-bold text-[#1C1917]">{formatted}</p>
              </div>
              <div>
                <p className="text-[6px] font-black uppercase tracking-widest mb-0.5" style={{ color: primaryColor }}>Reçu N°</p>
                <p className="text-[9px] font-mono font-bold text-[#1C1917]">#{sale.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
          </div>

          {/* Fabric Image */}
          {fabric.image_path && (
            <div className="mb-4">
              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#FAF9F6] border border-[#E7E5E4]/40 shadow-sm max-w-[160px] mx-auto">
                <img src={fabric.image_path} alt={fabric.name} className="w-full h-full object-cover" />
              </div>
              <p className="text-[7px] text-center font-serif italic font-bold pt-1.5 tracking-widest text-[#1C1917] opacity-60">Le Textile</p>
            </div>
          )}

          {/* Summary */}
          <div className="bg-white/40 border-2 border-dashed border-[#E7E5E4]/50 rounded-2xl p-4 mb-4 relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 pr-4">
                <span className="text-[7px] font-black uppercase tracking-widest opacity-40">Désignation</span>
                <p className="text-xs font-bold text-[#1C1917] italic">{fabric.name}</p>
                <p className="text-[9px] text-[#A8A29E] mt-0.5">{fabric.type}</p>
              </div>
              <div className="text-right">
                <span className="text-[7px] font-black text-[#A8A29E] uppercase tracking-widest mb-1 block">Paiement</span>
                <p className="text-[10px] font-black" style={{ color: primaryColor }}>{method}</p>
              </div>
            </div>

            <div className="space-y-2 border-t border-[#E7E5E4]/30 pt-3">
              <div className="flex justify-between text-[10px] text-[#78716C]">
                <span>Métrage</span>
                <span className="font-bold text-[#1C1917]">{meters} m</span>
              </div>
              <div className="flex justify-between text-[10px] text-[#78716C]">
                <span>Prix / mètre</span>
                <span className="font-bold text-[#1C1917]">{fabric.price_per_meter.toLocaleString()} {CURRENCY}</span>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="bg-[#1C1917] p-4 rounded-2xl flex items-center justify-between px-5 shadow-xl relative z-10">
            <div>
              <p className="text-[7px] font-black uppercase tracking-widest mb-0.5" style={{ color: primaryColor }}>Total Encaissé</p>
              <span className="text-[8px] text-white/40 font-black uppercase tracking-widest">Vente Comptant</span>
            </div>
            <h3 className="text-2xl font-serif italic text-white font-black">
              {total.toLocaleString()} <span className="text-xs not-italic font-black ml-1" style={{ color: primaryColor }}>{CURRENCY}</span>
            </h3>
          </div>

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
    </div>
  );
}
