/**
 * 🧵 Order Store — Production & Kanban State
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Order, OrderStatus } from '@/types';
import * as orderService from '@/services/orderService';
import * as fabricService from '@/services/fabricService';
import { useUIStore } from './uiStore';
import { CURRENCY } from '@/types/constants';

export interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  statusFilter: OrderStatus | null;
  isLoading: boolean;
}

export interface OrderActions {
  fetchOrders: (status?: OrderStatus) => Promise<void>;
  selectOrder: (id: string) => Promise<void>;
  clearSelection: () => void;
  moveOrder: (id: string, newStatus: OrderStatus) => Promise<void>;
  setStatusFilter: (status: OrderStatus | null) => void;
}

export type OrderStore = OrderState & OrderActions;

export const useOrderStore = create<OrderStore>()(
  subscribeWithSelector((set, get) => ({
    orders: [],
    currentOrder: null,
    statusFilter: null,
    isLoading: false,

    fetchOrders: async (status) => {
      set({ isLoading: true });
      try {
        const orders = await orderService.getOrders(status ?? undefined);
        set({ orders, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    },

    selectOrder: async (id) => {
      const order = await orderService.getOrderById(id);
      set({ currentOrder: order });
    },

    clearSelection: () => set({ currentOrder: null }),

    moveOrder: async (id, newStatus) => {
      const order = get().orders.find(o => o.id === id) || await orderService.getOrderById(id);
      if (!order) return;

      const ui = useUIStore.getState();

      // 🚚 Smart Delivery : Solder le compte avant de marquer comme livré
      if (newStatus === 'Livré' && order.status !== 'Livré') {
        const balance = Number(order.total_price) - Number(order.advance_paid);
        if (balance > 0) {
          const confirmPay = await ui.openConfirm(
            "Finalisation du Paiement",
            `Il reste ${(balance || 0).toLocaleString()} ${CURRENCY} à régler. En confirmant, le système enregistrera un versement de ce solde et marquera la commande comme livrée. Valider ?`,
            "OUI, SOLDE RÉGLÉ",
            "LIVRER À CRÉDIT"
          );
          
          if (confirmPay === null) return; // ❌ ABORT entire status change
          
          if (confirmPay === true) {
            await orderService.addPayment(order.id, balance, 'Cash');
          }
        }
      }

      // 🧵 Smart Cancellation : Retour de tissu & gestion acompte
      if (newStatus === 'Annulé' && order.status !== 'Annulé') {
        // Tissu
        if (order.fabric_id && Number(order.fabric_amount_used) > 0) {
          const confirmFab = await ui.openConfirm(
            "Gestion du Stock Tissu",
            `Souhaitez-vous RÉINTÉGRER les ${order.fabric_amount_used}m de tissu au stock ? (À confirmer UNIQUEMENT si le tissu n'a pas encore été coupé).`,
            "OUI, METTRE EN STOCK",
            "NON, TISSU PERDU"
          );

          if (confirmFab === null) return; // ❌ ABORT cancellation
          
          if (confirmFab === true) {
             await fabricService.updateFabricStock(order.fabric_id, Number(order.fabric_amount_used));
             ui.addToast('Tissu remis en stock avec succès', 'success');
          }
        }
        // Acompte
        if (Number(order.advance_paid) > 0) {
           const confirmRefund = await ui.openConfirm(
             "Remboursement de l'Acompte",
             `Le client a déjà versé ${(order.advance_paid || 0).toLocaleString()} ${CURRENCY}. Voulez-vous enregistrer un REMBOURSEMENT AUTOMATIQUE dans votre livre de caisse pour cette annulation ?`,
             "OUI, REMBOURSER",
             "NON, GARDER ACOMPTE"
           );

           if (confirmRefund === null) return; // ❌ ABORT cancellation
           
           if (confirmRefund === true) {
             await orderService.addPayment(order.id, -Number(order.advance_paid), 'Cash');
             ui.addToast('Remboursement enregistré en caisse', 'info');
           }
        }
      }

      await orderService.updateOrderStatus(id, newStatus);
      
      // Refresh the list to reflect the change
      const filter = get().statusFilter;
      const orders = await orderService.getOrders(filter ?? undefined);
      set({ orders });
    },

    setStatusFilter: (status) => set({ statusFilter: status }),
  }))
);
