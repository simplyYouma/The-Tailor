import { useEffect, useState, useRef } from 'react';
import { X, User, Shirt, MapPin, Phone, Banknote, Clock, Edit3, CheckCircle2, ChevronLeft, ChevronRight, Trash2, Send, AlertCircle, Paperclip, Activity, Plus, Ticket } from 'lucide-react';
import { OrderTicket } from './OrderTicket';
// import * as syncService from '@/services/syncService'; // Used in QRGenerator
import { cn } from '@/lib/utils';
import { useOrderStore } from '@/store/orderStore';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { AudioRecorder } from '@/components/common/AudioRecorder';
import type { Order, Client, CatalogModel, MeasurementEntry, OrderNote, OrderStatus } from '@/types';
import * as clientService from '@/services/clientService';
import * as catalogService from '@/services/catalogService';
import * as measurementService from '@/services/measurementService';
import * as orderService from '@/services/orderService';
import * as noteService from '@/services/noteService';
import * as fabricService from '@/services/fabricService';
import { CURRENCY, ORDER_STATUSES, STATUS_COLORS, PAYMENT_METHODS } from '@/types/constants';

/**
 * 🧵 StickyNote Design Helper
 * Génère des styles réalistes (rotation, couleur) persistants basés sur l'ID de la note.
 */
const getStickyStyle = (id: string) => {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rotations = [-2.5, -1.8, -1.2, 0.5, 1.3, 2.1, 2.8];
  const colors = [
    { bg: '#fefaed', border: '#f3e5b1', pin: '#ef4444' }, // Jaune Post-it
    { bg: '#fdf2f8', border: '#fbcfe8', pin: '#3b82f6' }, // Rose Pastel
    { bg: '#f0fdf4', border: '#dcfce7', pin: '#f59e0b' }, // Vert Menthe
    { bg: '#eff6ff', border: '#dbeafe', pin: '#10b981' }, // Bleu Pastel
  ];
  
  return {
    rotate: rotations[hash % rotations.length],
    color: colors[hash % colors.length]
  };
};

export function OrderDetail() {
  const closeModal = useUIStore((s) => s.closeModal);
  const openModal = useUIStore((s) => s.openModal);
  const addToast = useUIStore((s) => s.addToast);
  const initialOrder = useUIStore((s) => s.modalPayload) as Order | null;
  const refreshOrders = useOrderStore(s => s.fetchOrders);
  const moveOrder = useOrderStore(s => s.moveOrder);
  const isAdmin = useAuthStore((s) => s.isAdmin());
  
  const [order, setOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'Général' | 'Mensurations' | 'Consignes'>('Général');
  
  const [client, setClient] = useState<Client | null>(null);
  const [model, setModel] = useState<CatalogModel | null>(null);
  const [measurements, setMeasurements] = useState<MeasurementEntry[]>([]);
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [fabric, setFabric] = useState<any>(null);
  
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [newDate, setNewDate] = useState('');
  
  const [modelImageIndex, setModelImageIndex] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
  const [newNoteText, setNewNoteText] = useState('');
  const [stagedImage, setStagedImage] = useState<string | null>(null);
  const [stagedAudio, setStagedAudio] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const noteImageInputRef = useRef<HTMLInputElement>(null);

  const [isChangingModel, setIsChangingModel] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [payMethod, setPayMethod] = useState<string>('Cash');
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);

  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [showTicket, setShowTicket] = useState(false);

  useEffect(() => {
    if (initialOrder && (!order || order.id !== initialOrder.id)) {
      setOrder(initialOrder);
      setNewDate(initialOrder.delivery_date || '');
    }
  }, [initialOrder]);

  const fetchFullOrderDetails = async () => {
    if (!order) return;
    clientService.getClientById(order.client_id).then(setClient);
    if (order.model_id) {
      catalogService.getModelById(order.model_id).then(setModel);
    } else {
      setModel(null);
    }
    
    const oms = await measurementService.getOrderMeasurements(order!.id);
    if (oms.length > 0) {
      setMeasurements(oms);
    } else {
      const cms = await measurementService.getClientMeasurements(order.client_id);
      setMeasurements(cms);
    }
    
    noteService.getNotesByOrder(order!.id).then(setNotes);
    if (order.fabric_id) {
      fabricService.getFabricById(order.fabric_id).then(setFabric);
    } else {
      setFabric(null);
    }

    orderService.getPaymentsByOrder(order!.id).then(setPaymentHistory);
  };

  useEffect(() => {
    fetchFullOrderDetails();
  }, [order]);

  const modelImages = order?.reference_images && order.reference_images.length > 0 
    ? order.reference_images 
    : (model?.image_paths || []);

  useEffect(() => {
    if (!order || isPaused || modelImages.length <= 1) return;
    const interval = setInterval(() => {
      setModelImageIndex((prev) => (prev + 1) % modelImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isPaused, modelImages.length, order?.id]);

  if (!order) return null;

  const handleUpdateDate = async () => {
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();
      await db.execute(`UPDATE orders SET delivery_date = $1 WHERE id = $2`, [newDate, order.id]);
      
      addToast('Date de livraison mise à jour', 'success');
      setIsEditingDate(false);
      setOrder(prev => prev ? {...prev, delivery_date: newDate} : null);
      refreshOrders();
      useUIStore.getState().triggerRefresh();
    } catch (e) {
        console.error(e);
      addToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleModelImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    
    const readBase64 = (file: File): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    };

    const base64Images = await Promise.all(files.map(readBase64));
    
    await orderService.updateOrderModel(order.id, null, base64Images);
    addToast('Images du modèle mises à jour', 'success');
    
    const freshOrder = await orderService.getOrderById(order.id);
    if(freshOrder) {
      setOrder(freshOrder);
      refreshOrders();
      useUIStore.getState().triggerRefresh();
    }
    setIsChangingModel(false);
  };

  const handleSelectCatalogModel = async (m: CatalogModel) => {
    if (!order) return;
    try {
      await orderService.updateOrderModel(order.id, m.id, m.image_paths || []);
      addToast('Modèle mis à jour depuis le catalogue', 'success');
      
      const freshOrder = await orderService.getOrderById(order.id);
      if(freshOrder) {
        setOrder(freshOrder);
        refreshOrders();
        useUIStore.getState().triggerRefresh();
      }
      setIsChangingModel(false);
    } catch (e) {
      addToast('Erreur lors du changement de modèle', 'error');
    }
  };

  // --- Notes actions ---
  const handleAddNote = async () => {
    if (!newNoteText.trim() && !stagedImage && !stagedAudio) return;

    try {
      const parts = [];
      if (newNoteText.trim()) parts.push('text');
      if (stagedImage) parts.push('image');
      if (stagedAudio) parts.push('audio');

      if (parts.length === 1) {
        if (stagedImage) {
          const nImg = await noteService.addNote(order.id, 'image', stagedImage);
          setNotes(prev => [...prev, nImg]);
        } else if (stagedAudio) {
          const nAud = await noteService.addNote(order.id, 'audio', stagedAudio);
          setNotes(prev => [...prev, nAud]);
        } else if (newNoteText.trim()) {
          const nTxt = await noteService.addNote(order.id, 'text', newNoteText.trim());
          setNotes(prev => [...prev, nTxt]);
        }
      } else if (parts.length > 1) {
        const mixedContent = JSON.stringify({
          text: newNoteText.trim() || undefined,
          image: stagedImage || undefined,
          audio: stagedAudio || undefined
        });
        const nMix = await noteService.addNote(order.id, 'mixed', mixedContent);
        setNotes(prev => [...prev, nMix]);
      }
      
      setStagedImage(null);
      setStagedAudio(null);
      setNewNoteText('');
    } catch(e) {
      addToast('Erreur lors de l\'ajout', 'error');
    }
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setStagedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteNote = async (noteId: string) => {
    await noteService.deleteNote(noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const handleAddPaymentAction = async () => {
    if (!order || !paymentAmount) return;
    try {
      await orderService.addPayment(order.id, parseFloat(paymentAmount), payMethod);
      addToast('Paiement ajouté avec succès', 'success');
      setIsAddingPayment(false);
      setPaymentAmount('');
      const fresh = await orderService.getOrderById(order.id);
      if (fresh) setOrder(fresh);
      orderService.getPaymentsByOrder(order.id).then(setPaymentHistory);
      refreshOrders();
      useUIStore.getState().triggerRefresh();
    } catch(e) {
      addToast('Erreur lors du paiement', 'error');
    }
  };

  const handleDeletePayment = async (payId: string, amount: number) => {
    if (!order) return;
    try {
      await orderService.deletePayment(order.id, payId, amount);
      addToast('Versement supprimé', 'success');
      const fresh = await orderService.getOrderById(order.id);
      if (fresh) setOrder(fresh);
      setPaymentHistory(prev => prev.filter(p => p.id !== payId));
      refreshOrders();
      useUIStore.getState().triggerRefresh();
    } catch(e) {
      addToast('Erreur suppression', 'error');
    }
  };

  const handleUpdatePrice = async () => {
    if (!order || !newPrice) return;
    try {
      await orderService.updateOrderTotalPrice(order.id, parseFloat(newPrice));
      addToast('Prix total mis à jour', 'success');
      setIsEditingPrice(false);
      const fresh = await orderService.getOrderById(order.id);
      if (fresh) setOrder(fresh);
      refreshOrders();
      useUIStore.getState().triggerRefresh();
    } catch(e) {
      addToast('Erreur mise à jour prix', 'error');
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    try {
      await moveOrder(order.id, 'Annulé');
      useUIStore.getState().triggerRefresh();
      closeModal();
    } catch(e) {
      addToast('Erreur lors de l\'annulation', 'error');
    }
  };

  const handleUpdateStatus = async (s: OrderStatus) => {
    if (!order) return;
    try {
      await moveOrder(order.id, s);
      const fresh = await orderService.getOrderById(order.id);
      if (fresh) setOrder(fresh);
      addToast(`Statut mis à jour : ${s}`, 'success');
      useUIStore.getState().triggerRefresh();
    } catch(e) { addToast('Erreur statut', 'error'); }
  };

  // Timeline Logic
  const start = new Date(order.created_at).getTime();
  const end = order.delivery_date ? new Date(order.delivery_date).getTime() : 0;
  const now = Date.now();
  const total = end - start;
  const elapsed = now - start;
  const progress = total > 0 ? Math.min(Math.max((elapsed / total) * 100, 0), 100) : 0;
  const daysRemaining = end > 0 ? Math.ceil((end - now) / (1000 * 60 * 60 * 24)) : null;

  return (
    <>
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[600] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-300 cursor-zoom-out" 
          onClick={() => setFullscreenImage(null)}
        >
          <button 
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[110]"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={fullscreenImage} 
            alt="Vue agrandie" 
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-2xl shadow-2xl cursor-default animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}


      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={cn(
        "bg-white w-full max-w-2xl mx-4 rounded-[2.5rem] shadow-2xl overflow-hidden h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-500 relative",
        order.status === 'Annulé' && "ring-4 ring-red-500/30",
        order.status === 'Livré' && "ring-4 ring-green-500/30"
      )}>
        {/* Status Watermarks/Overlays */}
        {order.status === 'Annulé' && (
          <div className="absolute inset-0 z-[200] pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 border-8 border-red-500/20 px-8 py-4 rounded-3xl">
              <span className="text-8xl font-black text-red-500/10 uppercase tracking-[0.5em]">Annulé</span>
            </div>
          </div>
        )}
        {order.status === 'Livré' && (
          <div className="absolute inset-0 z-[200] pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 border-8 border-green-500/10 px-8 py-4 rounded-3xl">
              <span className="text-8xl font-black text-green-500/5 uppercase tracking-[0.5em]">Livré</span>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="relative p-8 pb-0 flex-shrink-0 z-10 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div>
                <h3 className="text-2xl font-serif italic text-[#1C1917]">Commande {order.tracking_id?.substring(0,8).toUpperCase()}</h3>
                <div className="flex items-center gap-2 mt-1">
                   <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: STATUS_COLORS[order.status] }} />
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E]">{order.status}</p>
                </div>
              </div>
              
              {/* --- ENHANCED: Fabric Swatch --- */}
              {(order.fabric_photo_path || fabric) && (
                <div 
                  onClick={() => setFullscreenImage(order.fabric_photo_path || fabric?.image_path)}
                  className="flex items-center gap-3 bg-[#FAF8F6] border border-[#E7E5E4] p-1.5 pr-4 rounded-2xl group cursor-zoom-in hover:shadow-lg transition-all"
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                    <img src={order.fabric_photo_path || fabric?.image_path} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left">
                    <p className="text-[7px] font-black uppercase tracking-widest text-[#B68D40] mb-0.5">
                      {order.fabric_id ? 'Atelier' : 'Client'}
                    </p>
                    <p className="text-[10px] font-bold text-[#1C1917] truncate max-w-[80px]">
                      {fabric?.name || 'Tissu Témoin'}
                    </p>
                    {order.fabric_amount_used > 0 && (
                      <p className="text-[8px] font-black text-[#A8A29E]">{order.fabric_amount_used}m utilisé</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isAdmin && order.status !== 'Annulé' && order.status !== 'Livré' && (
                !isConfirmingCancel ? (
                  <button 
                    onClick={() => setIsConfirmingCancel(true)}
                    className="h-10 px-4 text-red-500 hover:bg-red-50 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all border border-red-100/50 hover:border-red-200"
                  >
                    Annuler
                  </button>
                ) : (
                  <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-300 bg-red-50/30 p-1 rounded-2xl border border-red-100/50">
                    <button 
                      onClick={handleCancelOrder}
                      className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-xl transition-all hover:bg-red-600 shadow-sm"
                      title="Confirmer l'annulation"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setIsConfirmingCancel(false)}
                      className="w-8 h-8 flex items-center justify-center bg-white border border-[#E7E5E4] text-[#78716C] rounded-xl hover:bg-red-100 hover:text-red-600 transition-all"
                      title="Garder la commande"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )
              )}
              <div className="w-px h-6 bg-[#E7E5E4] mx-1" />
              
              {/* Ticket Elite Button */}
              <button 
                onClick={() => setShowTicket(true)}
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[#F0F9FF] border border-[#BAE6FD] text-[#0284C7] hover:bg-[#1C1917] hover:text-white transition-all shadow-sm group"
                title="Générer Ticket Elite"
              >
                <Ticket className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>

              <button 
                onClick={closeModal} 
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[#FAF9F6] border border-[#E7E5E4] text-[#78716C] hover:bg-[#1C1917] hover:text-white hover:border-[#1C1917] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs Nav */}
          <div className="flex gap-8 border-b border-[#E7E5E4]">
            {(['Général', 'Mensurations', 'Consignes'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "pb-4 text-[11px] font-black uppercase tracking-widest transition-all relative",
                  activeTab === tab ? "text-[#B68D40]" : "text-[#D6D3D1] hover:text-[#A8A29E]"
                )}
              >
                {tab}
                {activeTab === tab && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#B68D40]" />}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className={cn(
          "flex-1 overflow-y-auto p-8 pt-6 relative custom-scrollbar",
          order.status === 'Annulé' && "grayscale opacity-80"
        )}>
          
          {activeTab === 'Général' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-500 pb-12">
              
              {/* --- NEW: Client Identity Header --- */}
              {client && (
                <div className="bg-[#FAF9F6] border border-[#E7E5E4] rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-white border-2 border-[#E7E5E4] flex-shrink-0 shadow-sm">
                      {client.portrait_path ? (
                        <img src={client.portrait_path} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#B68D40] font-serif italic text-xl">
                          {client.name[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A8A29E] mb-1 flex items-center gap-2">
                        <User className="w-3 h-3" /> Identité Client
                      </h4>
                      <p className="text-lg font-bold text-[#1C1917] tracking-tight">{client.name}</p>
                      <p className="text-xs text-[#78716C] font-mono">{client.phone}</p>
                    </div>
                  </div>
                  <div className="h-px sm:h-10 w-full sm:w-px bg-[#E7E5E4] mx-2" />
                  <div className="flex flex-col items-start sm:items-end">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#D6D3D1]">Numéro de Commande</span>
                    <span className="text-sm font-mono font-bold text-[#1C1917]">#{order.tracking_id?.substring(0,8).toUpperCase()}</span>
                  </div>
                </div>
              )}

              {/* Deadline Timeline Widget */}
              {order.delivery_date && (
                <div className="bg-white border border-[#E7E5E4] rounded-3xl p-6 relative overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <Clock className={cn("w-4 h-4", daysRemaining !== null && daysRemaining < 3 ? "text-red-500 animate-pulse" : "text-[#B68D40]")} />
                       <span className="text-[10px] font-black uppercase tracking-widest text-[#78716C]">Échéance Livraison</span>
                    </div>
                    <span className="text-sm font-bold text-[#1C1917]">
                      {daysRemaining !== null ? (
                        daysRemaining > 0 ? `${daysRemaining} jours restants` : daysRemaining === 0 ? "Aujourd'hui !" : "En retard"
                      ) : "Non définie"}
                    </span>
                  </div>
                  
                  <div className="h-2 bg-[#FAF9F6] border border-[#E7E5E4] rounded-full relative overflow-hidden mb-3">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        "bg-gradient-to-r from-[#10B981] via-[#F59E0B] to-[#EF4444]"
                      )}
                      style={{ 
                        width: `${progress}%`,
                        filter: progress > 80 ? 'hue-rotate(-10deg)' : 'none'
                      }}
                    />
                  </div>

                  <div className="flex justify-between items-center mt-4">
                     <p className="text-[10px] text-[#A8A29E] font-medium flex items-center gap-1">
                        Démarré le {new Date(order.created_at).toLocaleDateString()}
                     </p>
                     
                     <div className="flex items-center gap-3">
                        {isEditingDate ? (
                          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                            <input 
                              type="date"
                              value={newDate}
                              onChange={(e) => setNewDate(e.target.value)}
                              className="bg-white border border-[#E7E5E4] rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-[#B68D40]/20"
                            />
                            <button onClick={handleUpdateDate} className="p-1.5 bg-[#1C1917] text-white rounded-lg hover:bg-black transition-colors">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setIsEditingDate(false)} className="p-1.5 bg-[#F5F5F4] text-[#78716C] rounded-lg hover:bg-[#E7E5E4] transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold italic font-serif text-[#1C1917]">
                               {new Date(order.delivery_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </p>
                            <button onClick={() => setIsEditingDate(true)} className="p-1.5 hover:bg-[#FAF9F6] rounded-lg transition-colors text-[#A8A29E] hover:text-[#B68D40]">
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                     </div>
                  </div>
                </div>
              )}

              {/* --- NEW: Production Track (Stepper) --- */}
              <div className="bg-white border border-[#E7E5E4] rounded-3xl p-6 shadow-sm overflow-x-auto custom-scrollbar">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-[#D6D3D1] mb-6 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" /> Étape de Conception
                 </h4>
                 <div className="flex items-center justify-between min-w-[500px] relative px-2">
                    {/* Background Line */}
                    <div className="absolute top-4 left-4 right-4 h-0.5 bg-[#FAF9F6] border-b border-[#E7E5E4] z-0" />
                    
                    {ORDER_STATUSES.filter(s => s !== 'Annulé').map((s, idx) => {
                       const isPast = ORDER_STATUSES.indexOf(order.status) >= idx;
                       const isCurrent = order.status === s;
                       return (
                          <button 
                            key={s} 
                            onClick={() => handleUpdateStatus(s)}
                            className="relative z-10 flex flex-col items-center group disabled:cursor-default"
                            disabled={order.status === 'Annulé'}
                          >
                             <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                                isCurrent ? "bg-[#1C1917] border-[#1C1917] text-white scale-110 shadow-lg shadow-black/10" : 
                                isPast ? "bg-white border-[#B68D40] text-[#B68D40]" : 
                                "bg-white border-[#E7E5E4] text-[#D6D3D1]"
                             )}>
                                {isPast && !isCurrent ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                             </div>
                             <span className={cn(
                                "text-[8px] font-black uppercase tracking-tighter mt-3 transition-colors",
                                isCurrent ? "text-[#1C1917]" : isPast ? "text-[#A8A29E]" : "text-[#D6D3D1]"
                             )}>
                                {s}
                             </span>
                          </button>
                       );
                    })}
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-12">
                {/* Modele */}
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[#D6D3D1] flex items-center gap-2">
                        <Shirt className="w-3.5 h-3.5" /> Vision de la tenue
                      </h4>
                      {(order.status === 'Réception' || order.status === 'Coupe') && (
                         <div className="relative">
                            {!isChangingModel ? (
                              <button 
                                onClick={() => setIsChangingModel(true)}
                                className="text-[9px] font-black uppercase tracking-widest text-[#B68D40] hover:text-white hover:bg-[#1C1917] bg-[#FAF9F6] px-3 py-1.5 rounded-full transition-all border border-transparent hover:border-[#1C1917]"
                              >
                                Changer de Modèle
                              </button>
                            ) : (
                              <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                                 <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-[9px] font-black uppercase bg-white border border-[#E7E5E4] px-3 py-1.5 rounded-full hover:bg-[#FAF9F6] transition-colors flex items-center gap-2"
                                 >
                                    <Paperclip className="w-3 h-3" /> Charger Photos
                                 </button>
                                 <button 
                                    onClick={() => openModal('catalog_picker', { onSelect: handleSelectCatalogModel })}
                                    className="text-[9px] font-black uppercase bg-white border-[#E7E5E4] text-[#78716C] hover:bg-[#1C1917] hover:text-white px-3 py-1.5 rounded-full transition-colors flex items-center gap-2"
                                 >
                                    <Shirt className="w-3 h-3" /> Catalogue
                                 </button>
                                 <button onClick={() => setIsChangingModel(false)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-full">
                                    <X className="w-3.5 h-3.5" />
                                 </button>
                              </div>
                            )}
                         </div>
                      )}
                      <input 
                        type="file" multiple accept="image/*" className="hidden" 
                        ref={fileInputRef} onChange={handleModelImageUpload} 
                      />
                    </div>
                    
                    <div className="relative group">
                       {/* Model Image Carousel (Enlarged & Left-Aligned) */}
                       {modelImages.length > 0 ? (
                         <div 
                           className="w-full max-w-[340px] aspect-[3/4] rounded-[2.5rem] overflow-hidden border border-[#E7E5E4] flex-shrink-0 relative group shadow-2xl bg-white transition-all duration-500 hover:shadow-black/10"
                           onMouseEnter={() => setIsPaused(true)}
                           onMouseLeave={() => setIsPaused(false)}
                         >
                           <div className="absolute top-3 left-3 bg-black/50 text-white text-[9px] uppercase font-black px-2 py-1 rounded-lg backdrop-blur-md z-10">Modèle</div>
                           
                           {modelImages.length > 1 && (
                             <div className="absolute top-3 right-3 bg-black/50 text-white text-[9px] font-black px-2 py-1 rounded-lg backdrop-blur-md z-10">
                               {modelImageIndex + 1}/{modelImages.length}
                             </div>
                           )}

                           <img 
                             src={modelImages[modelImageIndex]} 
                             alt="Modèle" 
                             className="w-full h-full object-cover transition-transform duration-700 cursor-zoom-in group-hover:scale-110" 
                             onClick={() => setFullscreenImage(modelImages[modelImageIndex])}
                           />
                           
                           <div className="absolute inset-0 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity px-3 pointer-events-none">
                             {modelImages.length > 1 && (
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setModelImageIndex(prev => (prev - 1 + modelImages.length) % modelImages.length); }}
                                 className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center text-black shadow-lg hover:scale-110 transition-transform pointer-events-auto"
                               >
                                 <ChevronLeft className="w-5 h-5" />
                               </button>
                             )}
                             {modelImages.length > 1 && (
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setModelImageIndex(prev => (prev + 1) % modelImages.length); }}
                                 className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center text-black shadow-lg hover:scale-110 transition-transform pointer-events-auto"
                               >
                                 <ChevronRight className="w-5 h-5" />
                               </button>
                             )}
                           </div>

                           {/* Auto-play indicator */}
                           {modelImages.length > 1 && !isPaused && (
                              <div className="absolute bottom-0 left-0 h-1 bg-[#B68D40]/40 animate-progress-bar" style={{ width: '100%', transformOrigin: 'left' }} />
                           )}
                         </div>
                       ) : (
                         <div className="w-48 h-64 rounded-3xl flex items-center justify-center bg-[#FAF9F6] border-2 border-dashed border-[#E7E5E4] flex-shrink-0 text-[#D6D3D1] mx-auto">
                           < Shirt className="w-10 h-10 opacity-20" />
                         </div>
                       )}
                    </div>
                  </div>
                </div>

                {/* Finance */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#D6D3D1] mb-4 flex items-center gap-2">
                      <Banknote className="w-3.5 h-3.5" /> État des Paiements
                    </h4>
                    <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 space-y-4 shadow-sm relative overflow-hidden">
                       {order.total_price - order.advance_paid === 0 && (
                          <div className="absolute top-0 right-0 bg-[#10B981] text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl">
                             Virement Réglé
                          </div>
                       )}
                       
                       {/* Prix Total Section */}
                       <div className="flex justify-between items-center text-sm py-1">
                         <span className="text-[#78716C] font-medium flex items-center gap-2">
                           Prix Total
                         </span>
                         {isEditingPrice ? (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-1">
                               <input 
                                 type="number"
                                 autoFocus
                                 value={newPrice}
                                 onChange={(e) => setNewPrice(e.target.value)}
                                 className="w-24 bg-white border border-[#E7E5E4] rounded-lg px-2 py-1 text-xs font-bold text-right outline-none focus:ring-2 focus:ring-[#B68D40]/20"
                               />
                               <button onClick={handleUpdatePrice} className="text-green-600 hover:bg-green-50 p-1 rounded-lg">
                                 <CheckCircle2 className="w-4 h-4" />
                               </button>
                               <button onClick={() => setIsEditingPrice(false)} className="text-red-500 hover:bg-red-50 p-1 rounded-lg">
                                 <X className="w-4 h-4" />
                               </button>
                            </div>
                         ) : (
                           <div className="flex items-center gap-2 group/price cursor-pointer" onClick={() => { setNewPrice(String(order.total_price)); setIsEditingPrice(true); }}>
                             <span className="font-bold text-[#1C1917]">{(order.total_price || 0).toLocaleString()} {CURRENCY}</span>
                             <Edit3 className="w-3 h-3 text-[#D6D3D1] opacity-0 group-hover/price:opacity-100 transition-opacity" />
                           </div>
                         )}
                       </div>

                       {/* Avance Paid Section */}
                       <div className="flex justify-between items-center text-sm py-1 border-b border-[#FAF9F6] pb-3 mb-2">
                         <span className="text-[#78716C] font-medium">Avance Réglée</span>
                         <span className="text-[#10B981] font-black">{(order.advance_paid || 0).toLocaleString()} {CURRENCY}</span>
                       </div>

                       {/* Mini Historique des Versements */}
                       {paymentHistory.length > 0 && (
                          <div className="space-y-2 mt-2">
                             <p className="text-[8px] font-black uppercase text-[#D6D3D1] tracking-widest mb-1">Historique Versements</p>
                             {paymentHistory.map(p => (
                                <div key={p.id} className="group/pay flex items-center justify-between bg-[#FAF9F6]/50 px-3 py-2 rounded-xl border border-transparent hover:border-[#E7E5E4] transition-all">
                                   <div className="flex flex-col">
                                      <span className="text-[10px] font-bold text-[#1C1917]">{(p.amount || 0).toLocaleString()} {CURRENCY}</span>
                                      <span className="text-[8px] text-[#A8A29E]">{p.method} • {new Date(p.payment_date).toLocaleDateString()}</span>
                                   </div>
                                   <button 
                                      onClick={() => handleDeletePayment(p.id, p.amount)}
                                      className="p-1.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover/pay:opacity-100 transition-all scale-90"
                                      title="Supprimer ce versement"
                                   >
                                      <Trash2 className="w-3 h-3" />
                                   </button>
                                </div>
                             ))}
                          </div>
                       )}

                       <div className="h-px bg-[#FAF9F6] my-2" />
                       
                       {/* Solde View (Header Style) */}
                       <div className="bg-[#1C1917]/5 -mx-6 px-6 py-8 mt-2 flex flex-col items-center text-center gap-1">
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E] mb-1">
                           { (order.total_price - order.advance_paid) < 0 ? 'Surplus Client' : 'Reste à payer' }
                         </span>
                         <span className={cn(
                           "text-2xl font-bold transition-colors tabular-nums",
                           (order.total_price - order.advance_paid) > 0 ? "text-[#EF4444]" : 
                           (order.total_price - order.advance_paid) < 0 ? "text-orange-500" : "text-[#10B981]"
                         )}>
                           {Math.abs((order.total_price || 0) - (order.advance_paid || 0)).toLocaleString()} {CURRENCY}
                         </span>
                       </div>

                       {/* Add Payment Form */}
                       {isAdmin && order.status !== 'Annulé' && order.total_price - order.advance_paid > 0 && (
                          <div className="pt-4 mt-2 border-t border-[#FAF9F6]">
                             {!isAddingPayment ? (
                                <button 
                                  onClick={() => setIsAddingPayment(true)}
                                  className="w-full h-10 rounded-xl border border-[#E7E5E4] flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#78716C] hover:bg-[#1C1917] hover:text-white transition-all shadow-sm group"
                                >
                                   <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" /> Ajouter un Paiement
                                </button>
                             ) : (
                                <div className="space-y-3 animate-in slide-in-from-top-2 duration-300 bg-[#FAF9F6] p-3 rounded-xl border border-[#E7E5E4]">
                                   <div className="flex gap-2">
                                      <input 
                                         type="number" 
                                         placeholder="Montant" 
                                         className="flex-1 min-w-0 bg-white border border-[#E7E5E4] rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#B68D40]/20 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                         value={paymentAmount}
                                         onKeyDown={(e) => ['e', 'E', '+', '-', '.', ','].includes(e.key) && e.preventDefault()}
                                         onChange={(e) => setPaymentAmount(e.target.value.replace(/[^0-9]/g, ''))}
                                      />
                                      <select 
                                         className="bg-white border border-[#E7E5E4] rounded-lg px-2 py-2 text-[10px] font-bold outline-none"
                                         value={payMethod}
                                         onChange={(e) => setPayMethod(e.target.value)}
                                      >
                                         {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                      </select>
                                   </div>
                                   <div className="flex gap-2">
                                      <button 
                                         onClick={handleAddPaymentAction}
                                         className="flex-1 bg-[#1C1917] text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black transition-colors"
                                      >
                                         Valider
                                      </button>
                                      <button 
                                         onClick={() => { setIsAddingPayment(false); setPaymentAmount(''); }}
                                         className="px-4 py-2 bg-white border border-[#E7E5E4] rounded-lg text-[9px] font-black uppercase text-[#78716C]"
                                      >
                                         Annuler
                                      </button>
                                   </div>
                                </div>
                             )}
                          </div>
                       )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Mensurations' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-500 pb-12">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                     <div className="w-16 h-16 rounded-3xl overflow-hidden bg-[#FAF9F6] border border-[#E7E5E4]">
                        {client?.portrait_path ? <img src={client.portrait_path} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl text-[#B68D40] font-serif italic">{client?.name[0]}</div>}
                     </div>
                     <div>
                        <h4 className="text-xl font-serif italic text-[#1C1917]">{client?.name}</h4>
                        <div className="flex gap-4 mt-1">
                           <p className="text-[10px] text-[#A8A29E] font-black uppercase tracking-widest flex items-center gap-1"><Phone className="w-3 h-3" /> {client?.phone}</p>
                        </div>
                     </div>
                  </div>
                  <button 
                    onClick={() => {
                       closeModal();
                       setTimeout(() => openModal('measurement_form', order.id), 300);
                    }}
                    className="px-4 py-2 bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#78716C] hover:bg-[#1C1917] hover:text-white transition-all shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> 
                    <span className="hidden sm:inline">Éditer Mensurations</span>
                  </button>
               </div>

               <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
                  {measurements.length === 0 ? (
                    <div className="col-span-full py-10 text-center bg-[#FAF9F6] rounded-3xl border border-dashed border-[#E7E5E4]">
                       <AlertCircle className="w-6 h-6 text-[#D6D3D1] mx-auto mb-2" />
                       <p className="text-xs text-[#A8A29E] font-black uppercase tracking-widest">Aucune mesure enregistrée</p>
                    </div>
                  ) : measurements.map((m) => (
                    <div key={m.type_id} className="relative group p-4 rounded-2xl hover:bg-[#FAF9F6] transition-colors border border-transparent hover:border-[#E7E5E4]">
                       <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#D6D3D1] mb-1">{m.label}</span>
                       <div className="flex items-baseline gap-1">
                         <span className="text-xl font-mono font-bold text-[#1C1917]">{m.value}</span>
                         <span className="text-[10px] font-black uppercase text-[#B68D40]/60">cm</span>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'Consignes' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-500 pt-6 pb-40">
               {/* Grid de Post-its */}
                <div className="columns-1 sm:columns-2 gap-8 space-y-12 pt-8">
                  {notes.map(n => {
                    const style = getStickyStyle(n.id);
                    let displayNotes: Array<{type: string, content: string}> = [];
                    if (n.type === 'mixed') {
                       try {
                         const parsed = JSON.parse(n.content);
                         if (parsed.image) displayNotes.push({type: 'image', content: parsed.image});
                         if (parsed.audio) displayNotes.push({type: 'audio', content: parsed.audio});
                         if (parsed.text) displayNotes.push({type: 'text', content: parsed.text});
                       } catch(e) {}
                    } else {
                       displayNotes.push({type: n.type, content: n.content});
                    }

                    return (
                      <div 
                        key={n.id} 
                        className="relative break-inside-avoid shadow-lg hover:shadow-xl transition-all duration-300 rounded-sm p-4 pb-8 group"
                        style={{ 
                          backgroundColor: style.color.bg,
                          borderLeft: `1px solid ${style.color.border}`,
                          borderBottom: `1px solid ${style.color.border}`,
                          transform: `rotate(${style.rotate}deg)`,
                        }}
                      >
                         {/* Pin 3D head Wrapper */}
                         <div className="flex justify-center -mt-6 mb-2 relative z-10">
                            <div 
                               className="w-4 h-4 rounded-full shadow-md border-b-2 border-black/20 relative"
                               style={{ backgroundColor: style.color.pin }}
                            >
                               <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-white/40 rounded-full blur-[0.5px]" />
                            </div>
                         </div>

                         {/* Action bouton (suppression globale de la note) */}
                         <button 
                            onClick={() => handleDeleteNote(n.id)} 
                            className="absolute bottom-2 right-2 text-red-400 hover:text-red-600 p-1 bg-white/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                           <Trash2 className="w-3.5 h-3.5" />
                         </button>

                         {/* Content Rendering Loop */}
                         <div className="space-y-3 mt-1">
                           {displayNotes.map((item, i) => (
                             <div key={i}>
                               {item.type === 'text' && (
                                  <p className="text-[#1C1917] font-serif text-sm leading-relaxed whitespace-pre-wrap italic">
                                     {item.content}
                                  </p>
                               )}
                               
                               {item.type === 'audio' && (
                                  <div className="-mx-2">
                                     <AudioRecorder readOnly variant="compact" value={item.content} onChange={() => {}} className="!bg-transparent !p-1 !border-none" />
                                  </div>
                               )}

                               {item.type === 'image' && (
                                  <div className="flex justify-center my-2">
                                     <div className="w-20 h-20 rounded-lg overflow-hidden border border-black/10 shadow-sm transition-transform hover:scale-105 active:scale-95">
                                        <img 
                                           src={item.content} 
                                           alt="Note visuelle" 
                                           className="w-full h-full object-cover cursor-zoom-in" 
                                           onClick={() => setFullscreenImage(item.content)}
                                         />
                                     </div>
                                  </div>
                               )}
                             </div>
                           ))}
                         </div>

                         <div className="text-right mt-4 opacity-40">
                            <span className="text-[8px] font-black uppercase tracking-widest text-[#1C1917]">
                               {new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                         </div>
                      </div>
                    );
                  })}
               </div>

               {notes.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-[#D6D3D1] space-y-4 py-20">
                     <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#E7E5E4] flex items-center justify-center">
                        <MapPin className="w-8 h-8 opacity-20" />
                     </div>
                     <p className="text-[10px] font-black uppercase tracking-[0.2em]">Mur de consignes vide</p>
                  </div>
               )}
            </div>
          )}

        </div>

        {/* --- MODERN CHAT INPUT --- */}
        {activeTab === 'Consignes' && (
           <div className="absolute bottom-6 left-8 right-8 z-30">
              {/* Media Preview (Sticky on top of input) */}
              <div className="mb-3 flex flex-wrap gap-3 animate-in slide-in-from-bottom-2 duration-300">
                 {stagedImage && (
                    <div className="relative group">
                       <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#B68D40] shadow-lg bg-white">
                          <img src={stagedImage} className="w-full h-full object-cover" />
                       </div>
                       <button 
                          onClick={() => setStagedImage(null)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                       >
                          <X className="w-3.5 h-3.5" />
                       </button>
                    </div>
                 )}

                 {stagedAudio && (
                    <div className="bg-white rounded-full shadow-lg border border-[#E7E5E4] p-1 flex items-center pr-2">
                       <AudioRecorder variant="compact" value={stagedAudio} onChange={setStagedAudio} />
                    </div>
                 )}
              </div>

              {/* Main Input Bar */}
              <div className="bg-white border border-[#E7E5E4] rounded-[2rem] p-2 flex items-center shadow-[0_15px_40px_-10px_rgba(0,0,0,0.12)]">
                 <input 
                    type="text"
                    className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none placeholder:text-[#D6D3D1] font-medium"
                    placeholder="Type your message..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                 />

                 <div className="flex items-center space-x-1 shrink-0 pr-2 text-[#78716C]">
                    {!stagedAudio && (
                       <AudioRecorder 
                          variant="compact" 
                          value={null} 
                          onChange={(v) => v && setStagedAudio(v)}
                          className="hover:bg-transparent !p-0.5"
                       />
                    )}

                    <button 
                       onClick={() => noteImageInputRef.current?.click()}
                       className="w-10 h-10 flex items-center justify-center hover:text-[#B68D40] rounded-full transition-all"
                    >
                       <Paperclip className="w-5 h-5" />
                    </button>
                    <input 
                       type="file" 
                       accept="image/*" 
                       className="hidden" 
                       ref={noteImageInputRef} 
                       onChange={handleFileAttach}
                    />
                 </div>

                 {/* Dynamic Action Button */}
                 <button 
                    onClick={handleAddNote} 
                    className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-md group shrink-0",
                      (newNoteText.trim() || stagedImage || stagedAudio) 
                        ? "bg-[#1C1917] hover:bg-[#B68D40] text-white cursor-pointer" 
                        : "bg-[#E7E5E4] text-[#D6D3D1] cursor-not-allowed"
                    )}
                    disabled={!newNoteText.trim() && !stagedImage && !stagedAudio}
                 >
                    <Send className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                 </button>
              </div>
           </div>
        )}


        {/* --- TICKET VIEW OVERLAY (INTEGRATED) --- */}
        {showTicket && order && (
           <OrderTicket 
             order={order} 
             client={client || undefined} 
             modelImage={modelImages[modelImageIndex]}
             fabricImage={order.fabric_photo_path || fabric?.image_path}
             onClose={() => setShowTicket(false)} 
           />
        )}
      </div>
      </div>
    </>
  );
}
