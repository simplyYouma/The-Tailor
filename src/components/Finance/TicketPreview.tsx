/**
 * 🧵 TicketPreview — Prévisualisation du ticket de caisse
 */
import { Scissors } from 'lucide-react';
import { QRGenerator } from '@/components/Tracking/QRGenerator';
import { CURRENCY } from '@/types/constants';
import type { Order, Payment } from '@/types';

interface TicketPreviewProps {
  order: Order;
  clientName: string;
  payments: Payment[];
}

export function TicketPreview({ order, clientName, payments }: TicketPreviewProps) {
  const balance = order.total_price - order.advance_paid;
  const now = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="max-w-[320px] mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-[#E7E5E4]">
      {/* Header */}
      <div className="bg-[#1C1917] text-white p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Scissors className="w-4 h-4 text-[#B68D40]" />
          <span className="font-serif italic text-lg">The Tailor</span>
        </div>
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#B68D40]">
          Maison de Couture
        </p>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        {/* Date */}
        <p className="text-[10px] text-center text-[#A8A29E]">{now}</p>

        {/* Divider */}
        <div className="border-t border-dashed border-[#E7E5E4]" />

        {/* Client */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E] mb-1">Client</p>
          <p className="text-sm font-bold text-[#1C1917]">{clientName}</p>
        </div>

        {/* Article */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E] mb-1">Article</p>
          <p className="text-sm text-[#1C1917]">{order.description || 'Confection sur mesure'}</p>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-[#E7E5E4]" />

        {/* Montants */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-xs text-[#78716C]">Total</span>
            <span className="text-sm font-bold">{(order.total_price || 0).toLocaleString()} {CURRENCY}</span>
          </div>

          {payments.map((p, i) => (
            <div key={i} className="flex justify-between text-xs text-[#78716C]">
              <span>Acompte ({p.method})</span>
              <span>-{(p.amount || 0).toLocaleString()} {CURRENCY}</span>
            </div>
          ))}

          <div className="border-t border-[#E7E5E4] pt-2 flex justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-[#1C1917]">Reste</span>
            <span className="text-sm font-bold text-[#B68D40]">
              {(balance || 0).toLocaleString()} {CURRENCY}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-[#E7E5E4]" />

        {/* QR Code */}
        <div className="flex flex-col items-center pt-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E] mb-3">
            Suivez votre commande
          </p>
          <QRGenerator trackingId={order.tracking_id} />
        </div>

        {/* Footer */}
        <p className="text-[8px] text-center text-[#D6D3D1] pt-2">
          Merci pour votre confiance. À bientôt !
        </p>
      </div>
    </div>
  );
}
