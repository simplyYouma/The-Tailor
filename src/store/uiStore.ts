import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { AppView, ModalType, AppNotification } from '@/types';

/** 🔊 Petit son de notification système (Web Audio API) */
const playNotificationSound = () => {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
    } catch (e) { /* Sourdine si pas d'interaction utilisateur */ }
};

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface ConfirmDialog {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  resolve: (value: boolean | null) => void;
}

export interface UIState {
  currentView: AppView;
  previousView: AppView | null;
  sidebarCollapsed: boolean;
  modalType: ModalType;
  modalPayload: unknown;
  toasts: Toast[];
  confirmDialog: ConfirmDialog;
  notifications: AppNotification[];
  refreshCounter: number; // Trigger for live data re-fetching
}

export interface UIActions {
  navigate: (view: AppView, payload?: unknown) => void;
  goBack: () => void;
  toggleSidebar: () => void;
  openModal: (type: ModalType, payload?: unknown) => void;
  closeModal: () => void;
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  openConfirm: (title: string, message: string, confirmLabel?: string, cancelLabel?: string) => Promise<boolean | null>;
  closeConfirm: (value: boolean | null) => void;
  
  // Notifications
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'> & { id?: string }) => void;
  markNotificationRead: (id: string) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  markAllNotificationsRead: () => void;
  triggerRefresh: () => void;
}

export type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  subscribeWithSelector((set, get) => ({
    currentView: 'dashboard',
    previousView: null,
    sidebarCollapsed: false,
    modalType: null,
    modalPayload: null,
    toasts: [],
    confirmDialog: {
      isOpen: false,
      title: '',
      message: '',
      confirmLabel: '',
      cancelLabel: '',
      resolve: () => {},
    },
    notifications: [],
    refreshCounter: 0,

    navigate: (view, payload = null) => set({
      previousView: get().currentView,
      currentView: view,
      modalPayload: payload, // Allow passing payload during navigation (e.g. client ID)
    }),

    goBack: () => {
      const prev = get().previousView;
      if (prev) set({ currentView: prev, previousView: null });
    },

    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

    openModal: (type, payload = null) => set({ modalType: type, modalPayload: payload }),

    closeModal: () => set({ modalType: null, modalPayload: null }),

    openConfirm: (title: string, message: string, confirmLabel = 'CONFIRMER', cancelLabel = 'ANNULER') => {
      return new Promise<boolean | null>((resolve) => {
        set({
          confirmDialog: {
            isOpen: true,
            title,
            message,
            confirmLabel,
            cancelLabel,
            resolve,
          },
        });
      });
    },

    closeConfirm: (value: boolean | null) => {
      const { resolve } = get().confirmDialog;
      resolve(value);
      set((s) => ({
        confirmDialog: {
          ...s.confirmDialog,
          isOpen: false,
        },
      }));
    },

    addToast: (message, type = 'info') => {
      const id = Date.now().toString() + Math.random().toString();
      set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
      
      // Auto dismiss after 4s
      setTimeout(() => {
        get().removeToast(id);
      }, 4000);
      
      // Subtle sound
      playNotificationSound();
    },


    removeToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),

    addNotification: (n) => {
      const existingNotification = get().notifications.find(existing => n.id && existing.id === n.id);
      if (existingNotification) return; // Prevent duplicates if ID is provided

      const id = n.id || (Date.now().toString() + Math.random().toString());
      const timestamp = new Date().toISOString();
      const newNotification: AppNotification = { ...n, id, timestamp, read: false };
      
      set((s) => ({ 
        notifications: [newNotification, ...s.notifications].slice(0, 50) // Limit to 50
      }));

      // 🔊 Petit bruit subtil systématique
      playNotificationSound();

      // If high severity, also add a toast
      if (n.severity === 'high') {
        get().addToast(n.message, 'warning');
      }
    },

    markNotificationRead: (id) => set((s) => ({
      notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    })),
    
    removeNotification: (id) => set((s) => ({
      notifications: s.notifications.filter(n => n.id !== id)
    })),

    markAllNotificationsRead: () => set((s) => ({
      notifications: s.notifications.map(n => ({ ...n, read: true }))
    })),

    clearNotifications: () => set({ notifications: [] }),

    triggerRefresh: () => set((s) => ({ refreshCounter: s.refreshCounter + 1 })),
  }))
);
