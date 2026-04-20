/**
 * 🧵 Client Store — CRM State
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Client } from '@/types';
import * as clientService from '@/services/clientService';

export interface ClientState {
  clients: Client[];
  currentClient: Client | null;
  searchQuery: string;
  isLoading: boolean;
}

export interface ClientActions {
  fetchClients: (search?: string) => Promise<void>;
  selectClient: (id: string) => Promise<void>;
  clearSelection: () => void;
  setSearchQuery: (query: string) => void;
}

export type ClientStore = ClientState & ClientActions;

export const useClientStore = create<ClientStore>()(
  subscribeWithSelector((set) => ({
    clients: [],
    currentClient: null,
    searchQuery: '',
    isLoading: false,

    fetchClients: async (search) => {
      set({ isLoading: true });
      try {
        const clients = await clientService.getClients(search);
        set({ clients, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    },

    selectClient: async (id) => {
      const client = await clientService.getClientById(id);
      set({ currentClient: client });
    },

    clearSelection: () => set({ currentClient: null }),

    setSearchQuery: (query) => set({ searchQuery: query }),
  }))
);
