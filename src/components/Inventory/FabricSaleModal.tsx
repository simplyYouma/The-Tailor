import { useEffect, useMemo, useState } from 'react';
import { X, ShoppingCart, Minus, Plus, Check, Search, UserCircle2 } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useClientStore } from '@/store/clientStore';
import * as fabricService from '@/services/fabricService';
import type { Fabric, PaymentMethod, Client } from '@/types';
import { CURRENCY, PAYMENT_METHODS } from '@/types/constants';
import { cn } from '@/lib/utils';

export function FabricSaleModal() {
  const closeModal = useUIStore((s) => s.closeModal);
  const openModal = useUIStore((s) => s.openModal);
  const addToast = useUIStore((s) => s.addToast);
  const triggerRefresh = useUIStore((s) => s.triggerRefresh);
  const fabric = useUIStore((s) => s.modalPayload) as Fabric | null;

  const clients = useClientStore((s) => s.clients);
  const fetchClients = useClientStore((s) => s.fetchClients);

  const [meters, setMeters] = useState(1);
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(clientSearch)
    );
  }, [clients, clientSearch]);

  if (!fabric) return null;

  const maxMeters = Math.max(0.5, fabric.stock_quantity);
  const total = fabric.price_per_meter * meters;
  const canSell = meters > 0 && meters <= fabric.stock_quantity;

  const handleSell = async () => {
    if (!canSell) return;
    setIsLoading(true);
    try {
      const sale = await fabricService.sellFabric({
        fabric_id: fabric.id,
        meters,
        method,
        client_id: selectedClient?.id ?? null,
        customer_label: selectedClient?.name ?? 'Client de passage',
      });
      addToast('Vente enregistrée', 'success');
      triggerRefresh();
      openModal('fabric_sale_receipt', {
        fabric,
        sale,
      });
    } catch (e: any) {
      addToast(e?.message || 'Erreur lors de la vente', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-[#1C1917]/80 backdrop-blur-sm" onClick={closeModal} />

      <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-300 my-8">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-[#E7E5E4] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#B68D40]/10 rounded-2xl flex items-center justify-center text-[#B68D40] border border-[#B68D40]/20">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-serif italic text-[#1C1917]">Vente Rapide</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A8A29E]">{fabric.name}</p>
            </div>
          </div>
          <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F5F5F4]">
            <X className="w-5 h-5 text-[#78716C]" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* Fabric summary */}
          <div className="flex items-center gap-4 p-4 bg-[#FAF9F6] rounded-2xl border border-[#E7E5E4]">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-white flex-shrink-0 border border-[#E7E5E4]">
              {fabric.image_path && <img src={fabric.image_path} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#B68D40]">{fabric.type}</p>
              <p className="text-sm font-serif italic text-[#1C1917]">{fabric.price_per_meter.toLocaleString()} {CURRENCY} / mètre</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E]">Stock</p>
              <p className="text-sm font-bold text-[#1C1917]">{fabric.stock_quantity}m</p>
            </div>
          </div>

          {/* Meters — slider + steppers */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#78716C]">Métrage vendu</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMeters(Math.max(0.5, meters - 0.5))}
                  className="w-8 h-8 rounded-full bg-[#FAF9F6] border border-[#E7E5E4] flex items-center justify-center hover:bg-white"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-serif italic text-lg w-20 text-center">{meters.toFixed(1)}m</span>
                <button
                  onClick={() => setMeters(Math.min(maxMeters, meters + 0.5))}
                  className="w-8 h-8 rounded-full bg-[#FAF9F6] border border-[#E7E5E4] flex items-center justify-center hover:bg-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <input
              type="range"
              min={0.5}
              max={maxMeters}
              step={0.5}
              value={meters}
              onChange={(e) => setMeters(Number(e.target.value))}
              className="w-full h-2 bg-[#FAF9F6] rounded-full appearance-none cursor-pointer accent-[#B68D40] border border-[#E7E5E4]"
            />
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-[#A8A29E] mt-2">
              <span>0,5m</span>
              <span>{maxMeters}m</span>
            </div>
          </div>

          {/* Client picker */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[#78716C] mb-2 block">Client</label>
            <button
              type="button"
              onClick={() => setShowClientPicker((v) => !v)}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-[#E7E5E4] bg-[#FAF9F6] hover:bg-white transition-all text-left"
            >
              <div className="w-10 h-10 rounded-full bg-white border border-[#E7E5E4] flex items-center justify-center overflow-hidden">
                {selectedClient?.portrait_path ? (
                  <img src={selectedClient.portrait_path} alt="" className="w-full h-full object-cover" />
                ) : selectedClient ? (
                  <span className="text-sm font-serif italic text-[#B68D40]">{selectedClient.name.charAt(0)}</span>
                ) : (
                  <UserCircle2 className="w-5 h-5 text-[#A8A29E]" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[#1C1917]">
                  {selectedClient ? selectedClient.name : 'Client de passage'}
                </p>
                <p className="text-[10px] text-[#A8A29E]">
                  {selectedClient ? selectedClient.phone : 'Aucun client sélectionné — cliquez pour choisir'}
                </p>
              </div>
              {selectedClient && (
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedClient(null); }}
                  className="w-7 h-7 rounded-full hover:bg-[#F5F5F4] flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-[#78716C]" />
                </button>
              )}
            </button>

            {showClientPicker && (
              <div className="mt-3 border border-[#E7E5E4] rounded-2xl bg-white overflow-hidden animate-in slide-in-from-top-2 duration-200">
                <div className="relative border-b border-[#E7E5E4]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A8A29E]" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Chercher par nom ou téléphone…"
                    className="w-full pl-11 pr-4 py-3 text-sm focus:outline-none bg-white placeholder:text-[#A8A29E]"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <p className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-[#A8A29E]">
                      Aucun client
                    </p>
                  ) : (
                    filteredClients.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedClient(c); setShowClientPicker(false); setClientSearch(''); }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-[#FAF9F6] transition-colors text-left border-b border-[#E7E5E4]/60 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#FAF9F6] border border-[#E7E5E4] flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {c.portrait_path ? (
                            <img src={c.portrait_path} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-serif italic text-[#B68D40]">{c.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1C1917]">{c.name}</p>
                          <p className="text-[10px] text-[#A8A29E]">{c.phone}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Payment method */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[#78716C] mb-2 block">Paiement</label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={cn(
                    'px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all',
                    method === m ? 'bg-[#1C1917] text-white' : 'bg-white border border-[#E7E5E4] text-[#78716C] hover:bg-[#FAF9F6]'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-[#1C1917] text-white rounded-2xl p-5 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Total à encaisser</span>
            <span className="text-2xl font-serif italic">
              {total.toLocaleString()} <span className="text-xs opacity-60">{CURRENCY}</span>
            </span>
          </div>

          <button
            onClick={handleSell}
            disabled={!canSell || isLoading}
            className="w-full h-14 bg-[#B68D40] text-white rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest hover:bg-[#9A7535] disabled:opacity-30 transition-all active:scale-[0.98]"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" /> Confirmer la Vente
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
