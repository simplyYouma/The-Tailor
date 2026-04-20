import { useState, useMemo, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  parseISO
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Package,
  History,
  CheckCircle2,
  XCircle,
  X,
  Wallet,
  ChevronRightCircle,
  Search
} from 'lucide-react';
import { useOrderStore } from '@/store/orderStore';
import { useUIStore } from '@/store/uiStore';
import { STATUS_COLORS, getItemColor, CURRENCY } from '@/types/constants';
import type { OrderStatus } from '@/types';
import { cn } from '@/lib/utils';

export function AgendaView() {
  const orders = useOrderStore((s) => s.orders);
  const fetchOrders = useOrderStore((s) => s.fetchOrders);
  const openModal = useUIStore((s) => s.openModal);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showHistory, setShowHistory] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Calendar logic
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // Group days by weeks for Gantt logic
  const weeks = useMemo(() => {
    const w = [];
    for (let i = 0; i < days.length; i += 7) {
      w.push(days.slice(i, i + 7));
    }
    return w;
  }, [days]);

  // Filter orders for the current month view (deliveries)
  const filteredOrders = useMemo(() => {
    // FALLBACK: If no orders exist, provide a mock one for demonstration
    if (orders.length === 0) {
      const today = new Date();
      return [{
        id: 'demo-1',
        tracking_id: 'DEMO-TAILOR',
        client_id: 'mock',
        model_id: 'mock',
        status: 'Couture',
        created_at: format(subMonths(today, 0), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
        delivery_date: format(addMonths(today, 0), "yyyy-MM-15'T'HH:mm:ss.SSS'Z'"),
      }] as any[];
    }
    
    const filtered = orders.filter(o => {
      if (!o.delivery_date) return false;
      const passHistory = showHistory || (o.status !== 'Livré' && o.status !== 'Annulé');
      if (!passHistory) return false;

      if (!searchTerm.trim()) return true;
      
      const s = searchTerm.toLowerCase();
      
      return (
        o.client_name?.toLowerCase().includes(s) ||
        o.tracking_id.toLowerCase().includes(s) ||
        o.model_name?.toLowerCase().includes(s) ||
        o.model_category?.toLowerCase().includes(s)
      );
    });

    return filtered;
  }, [orders, showHistory, searchTerm]);

  const getOrdersForDay = (day: Date) => {
    return filteredOrders.filter(o => {
      if (!o.delivery_date) return false;
      try {
        return isSameDay(parseISO(o.delivery_date), day);
      } catch { return false; }
    });
  };

  // NEW: Check if there are matches in other months
  const hasResultsInOtherMonths = useMemo(() => {
    if (!searchTerm.trim() || filteredOrders.length === 0) return false;
    
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    
    // Check if any filtered order is NOT in current month
    return filteredOrders.some(o => {
      const d = parseISO(o.delivery_date);
      return d < start || d > end;
    });
  }, [filteredOrders, currentMonth, searchTerm]);

  // NEW: Check if current view is empty
  const isCurrentViewEmpty = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return !filteredOrders.some(o => {
      const d = parseISO(o.delivery_date || '');
      return d >= start && d <= end;
    });
  }, [filteredOrders, currentMonth]);

  return (
    <>
      <div className="max-w-[1600px] mx-auto h-full flex flex-col space-y-6 animate-in fade-in duration-700">
      {/* ─── Header (Style Livre de Caisse - Affiné) ─── */}
      <div className="px-6 py-5 border-b border-[#E7E5E4] bg-[#FAF9F6] rounded-[2.5rem] shadow-sm mb-2 transition-all">
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
          {/* Title & Icon */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="w-12 h-12 bg-[#1C1917] rounded-xl flex items-center justify-center shadow-lg transform -rotate-3 transition-transform duration-500">
              <CalendarIcon className="w-5 h-5 text-[#B68D40]" />
            </div>
            <div>
              <h2 className="text-2xl font-serif italic text-[#1C1917] tracking-tight">Agenda</h2>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#D6D3D1]">Planning Elite</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
            {/* Search Bar (Flexible) */}
            <div className="relative group/search flex-1 xl:w-[220px] max-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[#D6D3D1] group-focus-within/search:text-[#B68D40] transition-colors" />
              <input 
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-[#E7E5E4] rounded-xl text-[10px] font-bold outline-none focus:border-[#B68D40]/50 focus:ring-4 focus:ring-[#B68D40]/5 transition-all placeholder:text-[#D6D3D1] placeholder:font-medium"
              />
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-[#E7E5E4] shadow-sm shrink-0">
              <button 
                onClick={prevMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#FAF9F6] transition-all text-[#A8A29E] hover:text-[#1C1917]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="px-3 text-center min-w-[120px]">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1C1917]">
                  {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                </h3>
              </div>

              <button 
                onClick={nextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#FAF9F6] transition-all text-[#A8A29E] hover:text-[#1C1917]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 border shadow-sm",
                  showHistory 
                    ? "bg-[#1C1917] text-white border-transparent" 
                    : "bg-white border-[#E7E5E4] text-[#A8A29E] hover:bg-[#FAF9F6]"
                )}
              >
                <History className="w-3.5 h-3.5" />
                {showHistory ? "Historique On" : "Historique Off"}
              </button>

              <button 
                onClick={goToToday}
                className="px-5 py-2.5 bg-[#B68D40] text-white rounded-xl text-[8px] font-black uppercase tracking-[0.2em] shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95"
              >
                Aujourd'hui
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 bg-white rounded-[2.5rem] border border-[#E7E5E4] shadow-sm overflow-hidden flex flex-col relative group/grid">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-[#E7E5E4] bg-[#FAF9F6]/50">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
            <div key={d} className="py-4 text-center">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E]">{d}</span>
            </div>
          ))}
        </div>

        {/* Weeks Rows */}
        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="relative flex-1 min-h-[160px] border-b border-[#E7E5E4] last:border-0 group/week">
              {/* Day Cells Grid */}
              <div className="absolute inset-0 grid grid-cols-7 h-full">
                {week.map((day) => {
                  const dayOrders = getOrdersForDay(day);
                  const isTodayDay = isSameDay(day, new Date());

                  return (
                    <div 
                      key={day.toISOString()}
                      className={cn(
                        "p-4 border-r border-[#E7E5E4] transition-colors flex flex-col gap-2 h-full last:border-r-0",
                        !isSameDay(startOfMonth(day), startOfMonth(currentMonth)) && "bg-[#FAF9F6]/20 opacity-30 cursor-default",
                        isSameDay(startOfMonth(day), startOfMonth(currentMonth)) && "hover:bg-[#FAF9F6]/50"
                      )}
                    >
                      <span className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold transition-all mb-auto",
                        isTodayDay ? "bg-[#1C1917] text-white shadow-lg" : "text-[#78716C]"
                      )}>
                        {format(day, 'd')}
                      </span>
                      
                      {/* Delivery Card */}
                      <div className="space-y-1.5 z-10">
                        {dayOrders.slice(0, 3).map((order) => {
                          const thumbnail = order.reference_images?.[0] || order.model_images?.[0];
                          const isDelivered = order.status === 'Livré';
                          const isCancelled = order.status === 'Annulé';
                          const isHistorical = isDelivered || isCancelled;

                          return (
                            <button
                              key={order.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                openModal('order_detail', order);
                              }}
                              className={cn(
                                "w-full text-left p-2.5 rounded-xl bg-white border border-[#E7E5E4] shadow-sm hover:border-[#B68D40]/30 hover:shadow-xl transition-all group/item overflow-hidden relative",
                                isDelivered && "opacity-50",
                                isCancelled && "opacity-30 grayscale"
                              )}
                            >
                               <div className="flex items-center gap-2">
                                  {thumbnail ? (
                                    <img src={thumbnail} className={cn("w-8 h-10 object-cover object-top rounded-md flex-shrink-0", isHistorical && "opacity-60")} alt="" />
                                  ) : (
                                    <div className="w-8 h-10 bg-[#FAF9F6] rounded-md flex items-center justify-center text-[#B68D40]/20 flex-shrink-0">
                                      <Package className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                     <div className="flex items-center justify-between gap-1">
                                       <p className={cn(
                                         "text-[10px] font-bold text-[#1C1917] truncate leading-tight",
                                         isCancelled && "line-through text-red-800/60"
                                       )}>
                                         {order.client_name || (order.id === 'demo-1' ? 'Client Démo' : 'Client...')}
                                       </p>
                                       {isDelivered && <CheckCircle2 className="w-2.5 h-2.5 text-green-600 shrink-0" />}
                                       {isCancelled && <XCircle className="w-2.5 h-2.5 text-red-400 shrink-0" />}
                                     </div>
                                     <p className="text-[8px] text-[#A8A29E] uppercase tracking-widest truncate">
                                       {order.model_category || (order.id === 'demo-1' ? 'Luxe ✨' : 'Sur Mesure')}
                                     </p>
                                  </div>
                               </div>
                            </button>
                          );
                        })}

                        {dayOrders.length > 3 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDay(day);
                            }}
                            className="w-full py-1.5 px-3 rounded-lg bg-[#FAF9F6] border border-[#E7E5E4] text-[9px] font-black uppercase tracking-widest text-[#B68D40] hover:bg-[#B68D40] hover:text-white transition-all animate-in fade-in slide-in-from-bottom-1"
                          >
                            + {dayOrders.length - 3} dossiers
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Multi-day Timeline Bars Overlay */}
              <div className="absolute inset-x-0 top-14 bottom-4 pointer-events-none px-4 flex flex-col gap-1 justify-center">
                 {filteredOrders.filter(o => {
                    if (!o.created_at || !o.delivery_date) return false;
                    try {
                      const start = parseISO(o.created_at);
                      const end = parseISO(o.delivery_date);
                      const weekStart = week[0];
                      const weekEnd = week[6];
                      return (start <= weekEnd && end >= weekStart);
                    } catch { return false; }
                 }).slice(0, 4).map((order) => {
                    const startRaw = order.created_at || order.order_date;
                    const endRaw = order.delivery_date;
                    if (!startRaw || !endRaw) return null;

                    const start = parseISO(startRaw);
                    const end = parseISO(endRaw);
                    const weekStart = week[0];
                    const weekEnd = week[6];
                    
                    const actualStart = start > weekStart ? start : weekStart;
                    const actualEnd = end < weekEnd ? end : weekEnd;
                    
                    const startDayIdx = week.findIndex(d => isSameDay(d, actualStart));
                    const endDayIdx = week.findIndex(d => isSameDay(d, actualEnd));
                    
                    if (startDayIdx === -1 || endDayIdx === -1) return null;

                    const left = (startDayIdx * (100 / 7)) + 1;
                    const width = ((endDayIdx - startDayIdx + 1) * (100 / 7)) - 2;

                     // Calcul du dégradé (Urgence : Transparent -> Solide)
                     const totalDuration = Math.max(1, end.getTime() - start.getTime());
                     const startAlpha = Math.min(1, Math.max(0, (actualStart.getTime() - start.getTime()) / totalDuration));
                     const endAlpha = Math.min(1, Math.max(0, (actualEnd.getTime() - start.getTime()) / totalDuration));
                     
                     const itemColor = getItemColor(order.id);
                     const statusColor = STATUS_COLORS[order.status as OrderStatus] || '#B68D40';

                     // Helper for Hex Alpha (0-1 -> 00-FF)
                     const toHex = (n: number) => {
                       const hex = Math.floor(Math.max(0.1, n) * 255).toString(16);
                       return hex.length === 1 ? '0' + hex : hex;
                     };

                     const isDelivered = order.status === 'Livré';
                     const isCancelled = order.status === 'Annulé';
                     const isHistorical = isDelivered || isCancelled;

                     return (
                       <div 
                         key={order.id}
                         className={cn(
                           "rounded-full relative group/bar overflow-hidden shadow-sm border border-white/5 transition-all",
                           isHistorical ? "h-[1px] opacity-30" : "h-1.5"
                         )}
                         style={{ 
                           marginLeft: `${left}%`, 
                           width: `${width}%`,
                           background: isCancelled 
                             ? 'linear-gradient(to right, #FCA5A520, #EF444440)'
                             : `linear-gradient(to right, ${itemColor}${toHex(startAlpha)}, ${itemColor}${toHex(endAlpha)})`
                         }}
                       >
                          {/* Status hint (barre subtile à gauche) */}
                          <div 
                            className={cn(
                              "absolute inset-y-0 left-0 w-1 opacity-50 shrink-0",
                              isHistorical && "hidden"
                            )}
                            style={{ backgroundColor: statusColor }}
                          />
                       </div>
                     );
                 })}
              </div>
            </div>
          ))}

          {/* Empty State Fallback */}
          {isCurrentViewEmpty && orders.length > 0 && (
            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
               <div className="bg-white/80 backdrop-blur-sm p-12 rounded-[3rem] border border-[#E7E5E4] shadow-2xl text-center animate-in zoom-in duration-500 max-w-[400px]">
                  {searchTerm.trim() ? (
                    <>
                      {!hasResultsInOtherMonths ? (
                        <>
                          <Search className="w-16 h-16 text-[#B68D40]/20 mx-auto mb-6" />
                          <h3 className="text-2xl font-serif italic text-[#1C1917] mb-2">Aucun dossier trouvé</h3>
                          <p className="text-[10px] uppercase font-black tracking-widest text-[#A8A29E]">Pour "{searchTerm}"</p>
                        </>
                      ) : (
                        <>
                          <History className="w-16 h-16 text-[#B68D40]/20 mx-auto mb-6" />
                          <h3 className="text-2xl font-serif italic text-[#1C1917] mb-2">Pas de match ce mois-ci</h3>
                          <p className="text-[10px] uppercase font-black tracking-widest text-[#A8A29E]">Dossiers trouvés dans d'autres mois</p>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="w-16 h-16 text-[#B68D40]/20 mx-auto mb-6" />
                      <h3 className="text-2xl font-serif italic text-[#1C1917] mb-2">Calme plat ce mois-ci</h3>
                      <p className="text-[10px] uppercase font-black tracking-widest text-[#A8A29E]">Aucune livraison prévue</p>
                    </>
                  )}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* --- NEW: Day Drawer (Fiche du Jour) --- */}
    {selectedDay && (
      <>
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] animate-in fade-in duration-300" 
          onClick={() => setSelectedDay(null)} 
        />
        <div className="fixed inset-y-4 right-4 w-[400px] bg-[#FAF9F6] rounded-[3rem] border border-[#E7E5E4] shadow-2xl z-[101] flex flex-col animate-in slide-in-from-right-full duration-500 overflow-hidden">
          {/* Drawer Header */}
          <div className="p-8 pb-4">
             <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#B68D40]">Programme de Livraison</p>
                <button 
                  onClick={() => setSelectedDay(null)}
                  className="p-2 hover:bg-black/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-[#A8A29E]" />
                </button>
             </div>
             <h3 className="text-3xl font-serif italic text-[#1C1917] tracking-tight">
               {selectedDay && format(selectedDay, 'EEEE d MMMM', { locale: fr })}
             </h3>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
            {/* Financial Summary */}
            <div className="bg-white rounded-3xl p-6 border border-[#E7E5E4] shadow-sm mb-6 flex items-center justify-between">
                <div>
                   <p className="text-[9px] font-black uppercase tracking-widest text-[#D6D3D1] mb-1">Total à Encaisser</p>
                    <p className="text-2xl font-serif italic text-[#1C1917]">
                      {(getOrdersForDay(selectedDay).reduce((acc, curr) => acc + ((curr.total_price || 0) - (curr.advance_paid || 0)), 0)).toLocaleString()} {CURRENCY}
                    </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#B68D40]/10 flex items-center justify-center text-[#B68D40]">
                   <Wallet className="w-6 h-6" />
                </div>
            </div>

            {selectedDay && getOrdersForDay(selectedDay).map((order) => {
                const isDelivered = order.status === 'Livré';
                const isCancelled = order.status === 'Annulé';
                const balance = order.total_price - (order.advance_paid || 0);
                const thumbnail = order.reference_images?.[0] || order.model_images?.[0];

                return (
                  <div 
                    key={order.id} 
                    className={cn(
                      "group bg-white rounded-[2rem] p-5 border border-[#E7E5E4] hover:shadow-xl hover:border-[#B68D40]/30 transition-all flex items-center gap-4 cursor-pointer",
                      isDelivered && "opacity-60",
                      isCancelled && "opacity-30 grayscale"
                    )}
                    onClick={() => openModal('order_detail', order)}
                  >
                    <div className="relative">
                      {thumbnail ? (
                        <img src={thumbnail} className="w-14 h-16 object-cover object-top rounded-2xl" alt="" />
                      ) : (
                        <div className="w-14 h-16 bg-[#FAF9F6] rounded-2xl flex items-center justify-center text-[#B68D40]/20">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                      {isDelivered && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-serif italic text-[#1C1917] mb-0.5">{order.client_name}</p>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D6D3D1] mb-2">{order.model_category}</p>
                      <div className="flex items-center gap-3">
                         <span className={cn(
                           "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                           balance > 0 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                         )}>
                            {balance > 0 ? `Reste: ${(balance || 0).toLocaleString()} ${CURRENCY}` : 'Soldé'}
                         </span>
                      </div>
                    </div>
                    <ChevronRightCircle className="w-5 h-5 text-[#E7E5E4] group-hover:text-[#B68D40] transition-colors" />
                  </div>
                );
            })}
          </div>

          <div className="p-8 border-t border-[#E7E5E4] bg-white/50 backdrop-blur-sm">
             <button 
               onClick={() => setSelectedDay(null)}
               className="w-full py-4 bg-[#1C1917] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-black transition-all"
             >
               Sortir de la Fiche
             </button>
          </div>
        </div>
      </>
    )}
    </>
  );
}
