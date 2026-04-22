import { create } from 'zustand';
import * as svc from '@/services/fabricTypeService';
import type { FabricTypeRow } from '@/services/fabricTypeService';

interface State {
  types: FabricTypeRow[];
  loaded: boolean;
  fetchTypes: () => Promise<void>;
}

export const useFabricTypeStore = create<State>((set) => ({
  types: [],
  loaded: false,
  fetchTypes: async () => {
    try {
      const rows = await svc.getFabricTypes();
      set({ types: rows, loaded: true });
    } catch (e) {
      console.error('[FabricTypeStore] fetch failed:', e);
      set({ loaded: true });
    }
  },
}));
