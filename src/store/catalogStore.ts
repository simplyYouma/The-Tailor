/**
 * 🧵 Catalog Store — Vitrine State
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { CatalogModel } from '@/types';
import * as catalogService from '@/services/catalogService';

export interface CatalogState {
  models: CatalogModel[];
  selectedModel: CatalogModel | null;
  categoryFilter: string;
  genderFilter: string;
  isLoading: boolean;
}

export interface CatalogActions {
  fetchModels: (category?: string, gender?: string) => Promise<void>;
  selectModel: (id: string) => Promise<void>;
  clearSelection: () => void;
  setCategoryFilter: (category: string) => void;
  setGenderFilter: (gender: string) => void;
}

export type CatalogStore = CatalogState & CatalogActions;

export const useCatalogStore = create<CatalogStore>()(
  subscribeWithSelector((set) => ({
    models: [],
    selectedModel: null,
    categoryFilter: 'Tous',
    genderFilter: 'Tous',
    isLoading: false,

    fetchModels: async (category, gender) => {
      set({ isLoading: true });
      try {
        const models = await catalogService.getModels(category, gender);
        set({ models, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    },

    selectModel: async (id) => {
      const model = await catalogService.getModelById(id);
      set({ selectedModel: model });
    },

    clearSelection: () => set({ selectedModel: null }),

    setCategoryFilter: (category) => set({ categoryFilter: category }),
    setGenderFilter: (gender) => set({ genderFilter: gender }),
  }))
);
