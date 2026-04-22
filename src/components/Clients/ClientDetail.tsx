/**
 * 🧵 ClientDetail — Fiche détaillée d'un client
 */
import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Phone, MapPin, ShoppingBag, Plus, Clock, Edit3, Trash2, Scissors } from 'lucide-react';
import { useClientStore } from '@/store/clientStore';
import { useCatalogStore } from '@/store/catalogStore';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { CURRENCY } from '@/types/constants';
import * as clientService from '@/services/clientService';
import type { Order, MeasurementEntry } from '@/types';
import * as orderService from '@/services/orderService';
import * as measurementService from '@/services/measurementService';
import * as fabricService from '@/services/fabricService';
import type { FabricSale } from '@/services/fabricService';
import { cn } from '@/lib/utils';

export function ClientDetail() {
  const client = useClientStore((s) => s.currentClient);
  const navigate = useUIStore((s) => s.navigate);
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const [orders, setOrders] = useState<Order[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementEntry[]>([]);
  const [fabricSales, setFabricSales] = useState<(FabricSale & { fabric_name?: string; fabric_type?: string; fabric_image?: string | null })[]>([]);

  const models = useCatalogStore((s) => s.models);
  const fetchModels = useCatalogStore((s) => s.fetchModels);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    if (client) {
      orderService.getOrdersByClient(client.id).then(setOrders).catch(console.error);
      measurementService.getClientMeasurements(client.id).then(setMeasurements).catch(console.error);
      fabricService.getSalesByClient(client.id).then(setFabricSales).catch(console.error);
    }
  }, [client]);

  const getOrderModelImage = (order: Order) => {
    if (order.reference_images && order.reference_images.length > 0) {
      return order.reference_images[0];
    }
    if (order.model_id) {
      const m = models.find(m => m.id === order.model_id);
      return m?.image_paths?.[0] || null;
    }
    return null;
  };

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[#A8A29E]">Client introuvable</p>
      </div>
    );
  }

  const openConfirm = useUIStore((s) => s.openConfirm);

  const handleDelete = async () => {
    const ok = await openConfirm(
      'Supprimer ce client ?',
      'Toutes ses commandes et mensurations seront définitivement supprimées.'
    );
    if (ok) {
      await clientService.deleteClient(client.id);
      await useClientStore.getState().fetchClients();
      navigate('clients');
    }
  };

  const handleEdit = () => {
    useUIStore.getState().openModal('client_form', client);
  };

  const totalSpent = orders.reduce((sum, o) => sum + o.advance_paid, 0) + fabricSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const activeCount = orders.filter((o) => o.status !== 'Livré' && o.status !== 'Annulé').length;

  const historyOrders = useMemo(() => {
    return orders
      .filter((o) => o.status === 'Livré' || o.status === 'Annulé')
      .slice(0, 5);
  }, [orders]);

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
      {/* Back */}
      <button
        onClick={() => navigate('clients')}
        className="flex items-center gap-3 text-[#78716C] hover:text-[#1C1917] transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-widest">Retour aux Clients</span>
      </button>

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center gap-8 border-b border-[#E7E5E4] pb-10">
        {/* Avatar */}
        <div className="w-28 h-28 rounded-full bg-[#FAF9F6] border-2 border-[#E7E5E4] flex items-center justify-center overflow-hidden shadow-lg">
          {client.portrait_path ? (
            <img src={client.portrait_path} alt={client.name} className="w-full h-full object-cover rounded-full" />
          ) : (
            <span className="text-4xl font-serif italic text-[#B68D40]">
              {client.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="text-center md:text-left flex-1">
          <h2 className="text-3xl font-serif italic text-[#1C1917] tracking-tight mb-2">{client.name}</h2>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-[#78716C]">
            <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {client.phone}</span>
            {client.address && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {client.address}</span>}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate('new_order')}
            className="h-10 px-6 bg-[#1C1917] text-white rounded-xl flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-[0.2em] shadow-md hover:bg-black transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouvelle Commande
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="flex-1 h-10 bg-[#FAF9F6] border border-[#E7E5E4] text-[#1C1917] rounded-xl flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-[#F5F5F4] transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Modifier
            </button>
            {isAdmin && (
              <button
                onClick={handleDelete}
                className="flex-1 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-red-100 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 text-center">
          <p className="text-2xl font-serif italic text-[#1C1917]">{orders.length}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E] mt-1">Commandes</p>
        </div>
        <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 text-center">
          <p className="text-2xl font-serif italic text-[#B68D40]">{activeCount}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E] mt-1">En cours</p>
        </div>
        <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 text-center">
          <p className="text-2xl font-serif italic text-[#1C1917]">{isAdmin ? (totalSpent || 0).toLocaleString() : '••••••'}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E] mt-1">{CURRENCY} payés</p>
        </div>
      </div>

      {/* Bottom Section: History & Mirror */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-bold mb-4">Historique des commandes</h3>
          {historyOrders.length === 0 && fabricSales.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-8 h-8 text-[#E7E5E4] mx-auto mb-3" />
              <p className="text-[10px] font-black uppercase tracking-widest text-[#D6D3D1]">Aucun historique</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fabricSales.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-5 bg-white border border-[#E7E5E4] rounded-2xl hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#E7E5E4] bg-[#FAF9F6] flex-shrink-0">
                      {s.fabric_image ? (
                        <img src={s.fabric_image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Scissors className="w-6 h-6 text-[#E7E5E4]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1C1917]">{s.fabric_name || 'Tissu'} <span className="text-[10px] text-[#A8A29E] font-medium">— {s.meters}m</span></p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#B68D40]/10 text-[#B68D40]">
                          Vente Tissu
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-[#A8A29E]">
                          <Clock className="w-3 h-3" />
                          {new Date(s.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{isAdmin ? `${(s.total || 0).toLocaleString()} ${CURRENCY}` : '••••'}</p>
                    {isAdmin && (
                      <p className="text-[10px] text-[#78716C]">{s.method}</p>
                    )}
                  </div>
                </div>
              ))}
              {historyOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-5 bg-white border border-[#E7E5E4] rounded-2xl hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      {/* Main Square: Model Image */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#E7E5E4] bg-[#FAF9F6]">
                        {getOrderModelImage(order) ? (
                          <img src={getOrderModelImage(order)!} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 text-[#E7E5E4]" />
                          </div>
                        )}
                      </div>

                      {/* Pinned Swatch: Fabric (Stock or Photo) */}
                      {(order.fabric_photo_path || order.fabric_image) && (
                        <div className="absolute -top-2 -right-2 w-10 h-10 rounded-md overflow-hidden border-2 border-white shadow-lg rotate-[6deg] bg-white z-10">
                          <img src={(order.fabric_photo_path || order.fabric_image)!} alt="" className="w-full h-full object-cover" />
                          <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-red-600 rounded-full shadow-sm border border-red-700 z-20" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1C1917]">{order.description || 'Commande'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                          order.status === 'Livré' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          {order.status}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-[#A8A29E]">
                          <Clock className="w-3 h-3" />
                          {new Date(order.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{isAdmin ? `${(order.total_price || 0).toLocaleString()} ${CURRENCY}` : '••••'}</p>
                    {isAdmin && (
                      <p className="text-[10px] text-green-600">
                        Acompte: {(order.advance_paid || 0).toLocaleString()} {CURRENCY}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-bold mb-4">Profil Mensurations</h3>
          {measurements.length === 0 ? (
            <div className="text-center py-12 bg-white border border-[#E7E5E4] rounded-2xl h-64 flex flex-col items-center justify-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#D6D3D1]">Aucune mesure enregistrée</p>
              <button
                onClick={handleEdit}
                className="mt-4 text-xs font-bold text-[#B68D40] hover:text-[#9A7535]"
              >
                Ajouter des mensurations
              </button>
            </div>
          ) : (
            <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6">
               <div className="flex justify-between items-center mb-6">
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A8A29E]">Dernières mesures</p>
                 <button
                   onClick={handleEdit}
                   className="text-[10px] font-black uppercase tracking-widest text-[#B68D40] hover:text-[#9A7535]"
                 >
                   Modifier
                 </button>
               </div>
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
                  {measurements.map((m) => (
                    <div key={m.type_id} className="relative group p-4 rounded-2xl hover:bg-[#FAF9F6] transition-colors border border-transparent hover:border-[#E7E5E4]">
                       <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#A8A29E] mb-1">{m.label}</span>
                       <div className="flex items-baseline gap-1">
                         <span className="text-2xl font-mono font-bold text-[#1C1917]">{m.value}</span>
                         <span className="text-[10px] font-black uppercase text-[#B68D40]/60">cm</span>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
