/**
 * 🧵 MeasurementForm — Saisie des mesures pour une commande
 */
import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import * as measurementService from '@/services/measurementService';
import * as orderService from '@/services/orderService';
import type { MeasurementType } from '@/types';

export function MeasurementForm({ orderId }: { orderId: string }) {
  const closeModal = useUIStore((s) => s.closeModal);
  const [types, setTypes] = useState<MeasurementType[]>([]);
  const [values, setValues] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [allTypes, existing, order] = await Promise.all([
        measurementService.getMeasurementTypes(),
        measurementService.getOrderMeasurements(orderId),
        orderService.getOrderById(orderId)
      ]);
      setTypes(allTypes);

      const map: Record<number, number> = {};
      
      if (existing.length === 0 && order) {
        // Si la commande n'a pas encore de mesures, on pré-remplit avec les mensurations de base du client.
        const clientBase = await measurementService.getClientMeasurements(order.client_id);
        for (const m of clientBase) {
          map[m.type_id] = m.value;
        }
      } else {
        // Sinon, on garde les mesures déjà saisies pour cette commande.
        for (const m of existing) {
          map[m.type_id] = m.value;
        }
      }
      
      setValues(map);
    };
    load();
  }, [orderId]);

  const updateValue = (typeId: number, val: string) => {
    const num = Number(val);
    if (isNaN(num) || num < 0) return;
    setValues((prev) => ({ ...prev, [typeId]: num }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const measurements = Object.entries(values)
        .filter(([, v]) => v > 0)
        .map(([id, v]) => ({ type_id: Number(id), value: v }));

      await measurementService.saveOrderMeasurements(orderId, measurements);
      closeModal();
    } catch (e) {
      console.error('[MeasurementForm]', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group by category
  const grouped: Record<string, MeasurementType[]> = {};
  for (const t of types) {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 p-4">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center justify-between p-8 pb-4 flex-shrink-0 bg-white">
          <div>
            <h3 className="text-2xl font-serif italic text-[#1C1917]">Mesures du Client</h3>
            <p className="text-xs text-[#A8A29E] uppercase tracking-widest mt-1">Toutes en cm</p>
          </div>
          <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#FAF9F6] transition-colors">
            <X className="w-5 h-5 text-[#78716C]" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-8 pt-2 space-y-8 custom-scrollbar">
          <div className="bg-[#FAF9F6] border border-dashed border-[#E7E5E4] rounded-2xl p-4 mb-4">
             <p className="text-[10px] text-[#A8A29E] font-black uppercase tracking-widest text-center">
               Tous les champs sont optionnels. Laissez vide si non applicable.
             </p>
          </div>

          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[#B68D40]" />
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1C1917]">{category}</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {items.map((t) => (
                  <div key={t.id} className="group flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#78716C] px-1">{t.label}</label>
                    <div className="relative group-focus-within:scale-[1.02] transition-transform">
                      <input
                        type="number"
                        value={values[t.id] || ''}
                        onChange={(e) => updateValue(t.id, e.target.value)}
                        placeholder="—"
                        className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl py-3 px-3 pr-10 text-sm focus:outline-none focus:ring-4 focus:ring-[#B68D40]/5 focus:border-[#B68D40]/30 transition-all text-right font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#D6D3D1]">cm</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="p-8 pt-0 flex-shrink-0">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-14 bg-[#1C1917] text-white rounded-2xl flex items-center justify-center gap-3 font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><Save className="w-4 h-4" /> Enregistrer les Mesures</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
