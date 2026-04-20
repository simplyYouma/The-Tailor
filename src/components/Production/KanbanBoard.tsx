/**
 * KanbanBoard — Suivi de Confection Atelier
 * Drag & Drop natif HTML5 + effet "Points de couture" entre colonnes.
 */
import { useEffect, useState, useRef } from 'react';
import { 
  Shirt, 
  Clock, 
  ChevronRight, 
  ChevronLeft,
  Package, 
  ZoomIn, 
  ZoomOut, 
  Trash2,
  Search
} from 'lucide-react';
import { useOrderStore } from '@/store/orderStore';
import { useCatalogStore } from '@/store/catalogStore';
import { useClientStore } from '@/store/clientStore';
import { useUIStore } from '@/store/uiStore';
import { ORDER_STATUSES, STATUS_COLORS, CURRENCY } from '@/types/constants';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getFabrics } from '@/services/fabricService';
import * as orderService from '@/services/orderService';
import type { Order, OrderStatus, Fabric } from '@/types';
import { cn } from '@/lib/utils';

export function KanbanBoard() {
  const orders     = useOrderStore((s) => s.orders);
  const isLoading  = useOrderStore((s) => s.isLoading);
  const fetchOrders = useOrderStore((s) => s.fetchOrders);
  const moveOrder  = useOrderStore((s) => s.moveOrder);
  const openModal   = useUIStore((s) => s.openModal);
  const openConfirm = useUIStore((s) => s.openConfirm);
  const addToast    = useUIStore((s) => s.addToast);
  
  // Zoom State (1: w-80, 2: w-64, 3: w-48)
  const [zoom, setZoom] = useState<number>(() => {
     const saved = localStorage.getItem('yumi_kanban_zoom');
     return saved ? parseInt(saved) : 1;
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    localStorage.setItem('yumi_kanban_zoom', zoom.toString());
  }, [zoom]);

  const models       = useCatalogStore((s) => s.models);
  const fetchModels  = useCatalogStore((s) => s.fetchModels);
  const clients      = useClientStore((s) => s.clients);
  const fetchClients = useClientStore((s) => s.fetchClients);

  // Drag state
  const [draggingId, setDraggingId]   = useState<string | null>(null);
  const [overColumn, setOverColumn]   = useState<OrderStatus | null>(null);
  const draggingOrder = useRef<Order | null>(null);

  const [fabrics, setFabrics] = useState<Fabric[]>([]);

  const refreshCounter = useUIStore((s) => s.refreshCounter);

  useEffect(() => {
    fetchOrders();
    fetchModels();
    fetchClients();
    getFabrics().then(setFabrics).catch(console.error);
  }, [fetchOrders, fetchModels, fetchClients, refreshCounter]);

  const getModelThumbnail = (order: Order) => {
    if (order.reference_images && order.reference_images.length > 0) return order.reference_images[0];
    if (order.model_id) {
      const catModel = models.find(m => m.id === order.model_id);
      if (catModel?.image_paths?.length) return catModel.image_paths[0];
    }
    return null;
  };

  const getFabricSample = (order: Order) => {
    if (order.fabric_photo_path) return order.fabric_photo_path;
    if (order.fabric_id) {
      return fabrics.find(f => f.id === order.fabric_id)?.image_path || null;
    }
    return null;
  };

  // FIFO : Oldest first in the entire workshop for folder numbering
  const sortedGlobalOrders = [...orders].sort((a, b) => a.created_at.localeCompare(b.created_at));

  const columns = ORDER_STATUSES.map((status) => {
    const ordersInStatus = orders.filter((o) => {
      if (o.status !== status) return false;
      if (!searchTerm.trim()) return true;
      
      const s = searchTerm.toLowerCase();
      const clientName = clients.find(c => c.id === o.client_id)?.name || '';
      return (
        clientName.toLowerCase().includes(s) ||
        o.tracking_id.toLowerCase().includes(s)
      );
    });

    return {
      status,
      color: STATUS_COLORS[status as keyof typeof STATUS_COLORS],
      orders: ordersInStatus.sort((a, b) => a.created_at.localeCompare(b.created_at)), // FIFO in each column
    };
  });

  const handleDelete = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await openConfirm(
      'Supprimer définitivement ?',
      'Cette action est irréversible. Toutes les données liées à cette commande seront effacées.'
    );
    if (ok) {
       await orderService.deleteOrder(orderId);
       fetchOrders();
       addToast('Commande supprimée.', 'info');
    }
  };

  const handleMoveNext = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = ORDER_STATUSES.indexOf(order.status);
    // Don't go to 'Annulé' via quick buttons to avoid accidental deletion
    if (idx < ORDER_STATUSES.length - 2) { 
      await moveOrder(order.id, ORDER_STATUSES[idx + 1]);
    }
  };

  const handleMoveBack = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = ORDER_STATUSES.indexOf(order.status);
    if (idx > 0) {
      await moveOrder(order.id, ORDER_STATUSES[idx - 1]);
    }
  };

  const isOverdue = (order: Order) =>
    !!order.delivery_date &&
    new Date(order.delivery_date) < new Date() &&
    order.status !== 'Livré';

  const getDaysRemaining = (order: Order): number | null => {
    if (!order.delivery_date) return null;
    return Math.ceil((new Date(order.delivery_date).getTime() - Date.now()) / 86_400_000);
  };

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Client';

  /* ─── Drag & Drop Handlers ─── */
  const onDragStart = (e: React.DragEvent, order: Order) => {
    e.stopPropagation();
    setDraggingId(order.id);
    draggingOrder.current = order;
    e.dataTransfer.setData('text/plain', order.id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Feedback tactile
    if (window.navigator?.vibrate) window.navigator.vibrate(5);
  };

  const onDragEnd = () => {
    setDraggingId(null);
    setOverColumn(null);
    draggingOrder.current = null;
  };

  const onDragOver = (e: React.DragEvent, status: OrderStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overColumn !== status) {
      setOverColumn(status);
    }
  };

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = async (e: React.DragEvent, targetStatus: OrderStatus) => {
    e.preventDefault();
    const order = draggingOrder.current;
    if (order && order.status !== targetStatus) {
      // 🚀 The logic is now centralized in orderStore.moveOrder 
      // It handles the confirmations (ConfirmModal) automatically.
      await moveOrder(order.id, targetStatus);
    }
    setDraggingId(null);
    setOverColumn(null);
    draggingOrder.current = null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-[#B68D40] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      {/* Header (Finer & Searchized) */}
      <div className="flex-shrink-0 pb-6 border-b border-[#E7E5E4] mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-[#1C1917] rounded-2xl flex items-center justify-center shadow-lg transform -rotate-2">
             <Shirt className="w-6 h-6 text-[#B68D40]" />
          </div>
          <div>
            <h2 className="text-3xl font-serif italic text-[#1C1917] tracking-tight mb-1">
              Atelier de Confection
            </h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A8A29E]">
              {orders.length} commande{orders.length !== 1 ? 's' : ''} en cours
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4">
           {/* Kanban Search (Style Couture) */}
           <div className="relative group/search min-w-[260px] flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D6D3D1] group-focus-within/search:text-[#B68D40] transition-colors" />
              <input 
                type="text"
                placeholder="Chercher un client ou dossier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-5 py-3 bg-white border border-[#E7E5E4] rounded-2xl text-[11px] font-bold outline-none focus:border-[#B68D40]/50 focus:ring-4 focus:ring-[#B68D40]/5 transition-all placeholder:text-[#D6D3D1] placeholder:font-medium"
              />
           </div>

           <div className="flex items-center gap-2 bg-[#FAF9F6] border border-[#E7E5E4] p-1.5 rounded-2xl shadow-sm">
              <button 
                onClick={() => setZoom(prev => Math.min(3, prev + 1))}
                disabled={zoom === 3}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#E7E5E4] text-[#1C1917] hover:bg-[#FAF9F6] transition-all disabled:opacity-30"
              >
                  <ZoomIn className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setZoom(prev => Math.max(1, prev - 1))}
                disabled={zoom === 1}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#E7E5E4] text-[#1C1917] hover:bg-[#FAF9F6] transition-all disabled:opacity-30"
              >
                  <ZoomOut className="w-4 h-4" />
              </button>
           </div>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex min-w-max pb-4 h-full">
          {columns.map((col, colIdx) => (
            <div key={col.status} className="flex">
              {/* ─── Column ─── */}
              <div
                className={cn(
                  'flex-shrink-0 flex flex-col transition-all duration-300',
                  zoom === 1 && 'w-80',
                  zoom === 2 && 'w-64',
                  zoom === 3 && 'w-48',
                  overColumn === col.status && 'scale-[1.01]'
                )}
                onDragOver={(e) => onDragOver(e, col.status as OrderStatus)}
                onDragEnter={onDragEnter}
                onDrop={(e) => onDrop(e, col.status as OrderStatus)}
              >
                {/* Column Header — Soft & Subtle */}
                <div
                  className={cn(
                    'flex flex-col gap-1 mb-6 px-2 py-2 transition-all duration-300',
                    overColumn === col.status ? 'translate-x-1' : ''
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-1.5 h-1.5 rounded-full shadow-sm"
                      style={{ backgroundColor: col.color }}
                    />
                    <h3 className="text-lg font-serif italic text-[#1C1917] tracking-tight">
                      {col.status}
                    </h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-[#E7E5E4] to-transparent ml-2 opacity-50" />
                  </div>
                  
                  <div className="flex items-center gap-2 pl-4">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#A8A29E]">
                      {col.orders.length} dossier{col.orders.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Drop zone highlight strip */}
                {overColumn === col.status && (
                  <div
                    className="w-full h-1 rounded-full mb-3 transition-all animate-pulse"
                    style={{ backgroundColor: col.color + '60' }}
                  />
                )}

                {/* Cards */}
                <div className="flex-1 space-y-3 min-h-[8rem]">
                   {col.orders.map((order) => {
                     const isArchived = order.status === 'Livré' || order.status === 'Annulé';
                     const folderNum = sortedGlobalOrders.findIndex(o => o.id === order.id) + 1;
                     const timeAgo = formatDistanceToNow(parseISO(order.created_at), { addSuffix: true, locale: fr });

                     if (isArchived) {
                       const isCancelled = order.status === 'Annulé';
                       const isDelivered = order.status === 'Livré';
                       
                       return (
                         <div 
                           key={order.id}
                           draggable
                           onDragStart={(e) => onDragStart(e, order)}
                           onDragEnd={onDragEnd}
                           onClick={() => openModal('order_detail', order)}
                           className={cn(
                             "group relative flex items-center justify-between p-3 border rounded-xl hover:shadow-lg transition-all cursor-grab active:cursor-grabbing overflow-hidden",
                             draggingId === order.id ? "opacity-30 scale-95" : "opacity-100",
                             isCancelled 
                               ? "bg-red-50/50 border-red-100 hover:bg-red-50 hover:border-red-200" 
                               : isDelivered
                               ? "bg-green-50/50 border-green-100 hover:bg-green-50 hover:border-green-200"
                               : "bg-[#FAF8F5]/50 border-[#E7E5E4] hover:bg-white hover:border-white"
                           )}
                         >
                            <div className="flex items-center gap-3 min-w-0">
                               <div className={cn(
                                 "text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm border transition-colors",
                                 isCancelled 
                                   ? "text-red-500 bg-white border-red-200" 
                                   : isDelivered
                                   ? "text-green-600 bg-white border-green-200"
                                   : "text-[#B68D40] bg-white border-[#E7E5E4]"
                               )}>
                                 #{folderNum.toString().padStart(3, '0')}
                               </div>
                               <div className="min-w-0">
                                  <p className={cn(
                                    "text-[11px] font-bold truncate",
                                    isCancelled ? "text-red-900 line-through opacity-60" : 
                                    isDelivered ? "text-green-900 opacity-80" : "text-[#1C1917]"
                                  )}>{getClientName(order.client_id)}</p>
                                  <p className="text-[8px] text-[#A8A29E] uppercase tracking-widest">{format(parseISO(order.created_at), 'dd/MM/yy')}</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                               {isDelivered && (
                                  <button 
                                     onClick={(e) => handleMoveBack(order, e)}
                                     title="Ré-ouvrir (Prêt)"
                                     className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  >
                                     <ChevronLeft className="w-3.5 h-3.5" />
                                  </button>
                               )}
                               <button 
                                  onClick={(e) => handleDelete(order.id, e)}
                                  title="Supprimer définitivement"
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                               >
                                  <Trash2 className="w-3.5 h-3.5" />
                               </button>
                            </div>
                         </div>
                       );
                     }

                     return (
                      <div
                        key={order.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, order)}
                        onDragEnd={onDragEnd}
                        onClick={() => openModal('order_detail', order)}
                        className={cn(
                          'bg-white border rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 cursor-grab active:cursor-grabbing select-none group relative overflow-hidden',
                          !draggingId && 'hover:-translate-y-1', // Désactivé si on drag pour éviter les sauts
                          isOverdue(order) ? 'border-red-200 bg-red-50/30' : 'border-[#E7E5E4]',
                          draggingId === order.id && 'opacity-40 scale-95 rotate-1 shadow-none border-[#B68D40]'
                        )}
                      >
                        {/* Dossier Header Info */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                           <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black text-[#B68D40] px-1.5 py-0.5 bg-[#B68D40]/5 border border-[#B68D40]/20 rounded shadow-sm">
                                #{folderNum.toString().padStart(3, '0')}
                              </span>
                              <span className="text-[9px] font-bold text-[#78716C] bg-[#FAF9F6] px-1.5 py-0.5 rounded-full border border-[#E7E5E4]">
                                {timeAgo}
                              </span>
                           </div>
                           <button 
                             onClick={(e) => handleDelete(order.id, e)}
                             className="opacity-0 group-hover:opacity-100 p-1 text-red-300 hover:text-red-500 transition-opacity"
                           >
                              <Trash2 className="w-3.5 h-3.5" />
                           </button>
                        </div>

                        {/* Model + Pinned Swatch */}
                        <div className={cn(
                          "relative mb-4",
                          zoom === 3 && "hidden" // Small zoom hides large preview
                        )}>
                          <div className={cn(
                            "w-full rounded-2xl overflow-hidden border border-[#E7E5E4] bg-[#FAF9F6] shadow-inner group-hover:scale-[1.01] transition-transform duration-500",
                            zoom === 1 ? "h-32" : "h-20"
                          )}>
                            {getModelThumbnail(order) ? (
                              <img
                                src={getModelThumbnail(order)!}
                                alt="Modèle"
                                draggable={false}
                                className="w-full h-full object-cover object-top pointer-events-none"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-1 opacity-30">
                                <Shirt className="w-6 h-6 text-[#D6D3D1]" />
                                <span className={cn(
                                   "font-black uppercase tracking-widest text-[#A8A29E]",
                                   zoom === 1 ? "text-[9px]" : "text-[7px]"
                                )}>
                                  Sans modèle
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Pinned Fabric Swatch (Client or Inventory) */}
                          {getFabricSample(order) && (
                            <div className={cn(
                              "absolute -top-1 -right-1 rounded-lg overflow-hidden border-2 border-white shadow-xl rotate-[6deg] group-hover:rotate-0 transition-all duration-300 z-10 bg-white",
                              zoom === 1 ? "w-14 h-14" : "w-10 h-10"
                            )}>
                              <img
                                src={getFabricSample(order)!}
                                alt="Tissu"
                                draggable={false}
                                className="w-full h-full object-cover pointer-events-none"
                              />
                              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-red-600 rounded-full shadow-sm border border-red-700 z-20" />
                            </div>
                          )}
                        </div>

                        {/* Client + Date */}
                        <div className="flex items-start justify-between mb-1 gap-2">
                          <p className={cn(
                            "font-black text-[#1C1917] truncate",
                            zoom === 3 ? "text-[12px]" : "text-sm"
                          )}>
                            {getClientName(order.client_id)}
                          </p>
                        </div>

                        {/* Description - Hidden in Small Zoom */}
                        {zoom !== 3 && (
                          <p className="text-[10px] text-[#78716C] italic font-serif truncate mb-3">
                            {order.description || 'Sans description'}
                          </p>
                        )}

                        {/* Price + Deadline */}
                        <div className={cn(
                          "flex items-center justify-between mb-3 border-t border-[#E7E5E4]/60 pt-3",
                          zoom === 3 && "border-none pt-0 mt-2"
                        )}>
                          <span className={cn(
                            "font-black text-[#B68D40]",
                            zoom === 1 ? "text-[11px]" : "text-[9px]"
                          )}>
                            {(order.total_price || 0).toLocaleString()} {CURRENCY}
                          </span>
                          {order.delivery_date && (() => {
                            const days = getDaysRemaining(order);
                            if (days === null) return null;
                            return (
                              <div className={cn(
                                'flex items-center gap-1 font-black uppercase tracking-widest px-2 py-1 rounded-full',
                                zoom === 1 ? "text-[9px]" : "text-[7px]",
                                days < 0  ? 'bg-red-50 text-red-600' :
                                days <= 3 ? 'bg-orange-50 text-orange-600' :
                                            'bg-green-50 text-green-600'
                              )}>
                                <Clock className={cn(zoom === 1 ? "w-3 h-3" : "w-2 h-2")} />
                                {days < 0 ? 'Retard' : days === 0 ? 'Jour J' : `J-${days}`}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Move Buttons - Elite Subtlety (Circle Icons) */}
                        {order.status !== 'Livré' && order.status !== 'Annulé' && zoom !== 3 && (
                          <div className="mt-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-1 group-hover:translate-y-0 border-t border-[#E7E5E4]/40 pt-3">
                            {ORDER_STATUSES.indexOf(order.status) > 0 ? (
                              <button
                                onClick={(e) => handleMoveBack(order, e)}
                                title="Reculer d'une étape"
                                className="w-8 h-8 flex items-center justify-center bg-white border border-[#E7E5E4] rounded-full text-[#78716C] hover:bg-[#FAF9F6] shadow-sm transition-all active:scale-90"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                            ) : <div className="w-8" />}
                            
                            <span className="text-[7px] font-black uppercase tracking-[0.3em] text-[#A8A29E] opacity-50">
                               Déplacer
                            </span>
                            
                            {ORDER_STATUSES.indexOf(order.status) < ORDER_STATUSES.length - 2 ? (
                              <button
                                onClick={(e) => handleMoveNext(order, e)}
                                title="Étape suivante"
                                className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm border transition-all active:scale-95 hover:scale-105"
                                style={{ 
                                  borderColor: col.color + '40', 
                                  color: col.color,
                                  boxShadow: `0 4px 12px ${col.color}15`
                                }}
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            ) : <div className="w-8" />}
                          </div>
                        )}
                      </div>
                     );
                   })}

                  {col.orders.length === 0 && (
                    <div
                      className={cn(
                        'py-10 text-center rounded-2xl border-2 border-dashed transition-colors',
                        overColumn === col.status
                          ? 'border-[#B68D40]/40 bg-[#B68D40]/5'
                          : 'border-[#E7E5E4]'
                      )}
                    >
                      <Package className="w-6 h-6 text-[#E7E5E4] mx-auto mb-2" />
                      <p className="text-[9px] text-[#D6D3D1] font-black uppercase tracking-widest">
                        {overColumn === col.status ? 'Déposer ici' : 'Vide'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Stitch Separator (Dotted) ─── */}
              {colIdx < columns.length - 1 && (
                <div className="px-3 flex flex-col items-center flex-shrink-0 h-full opacity-30">
                  <div className="w-[1px] h-full border-l border-dotted border-[#A8A29E]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
