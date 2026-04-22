import { create } from 'zustand';
import * as svc from '@/services/modelCategoryService';
import type { ModelCategoryRow } from '@/services/modelCategoryService';

interface State {
  categories: ModelCategoryRow[];
  loaded: boolean;
  fetchCategories: () => Promise<void>;
}

export const useModelCategoryStore = create<State>((set) => ({
  categories: [],
  loaded: false,
  fetchCategories: async () => {
    try {
      const rows = await svc.getModelCategories();
      set({ categories: rows, loaded: true });
    } catch (e) {
      console.error('[ModelCategoryStore] fetch failed:', e);
      set({ loaded: true });
    }
  },
}));
