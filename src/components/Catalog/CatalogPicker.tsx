import { useState, useEffect } from 'react';
import { Shirt, Search, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { CatalogFilters } from './CatalogFilters';
import { useUIStore } from '@/store/uiStore';
import * as catalogService from '@/services/catalogService';
import { CURRENCY } from '@/types/constants';
import type { CatalogModel } from '@/types';

interface CatalogPickerProps {
  payload: {
    onSelect: (model: CatalogModel) => void;
  };
}

const ITEMS_PER_PAGE = 6;

export function CatalogPicker({ payload }: CatalogPickerProps) {
  const closeModal = useUIStore((s) => s.closeModal);
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [genderFilter, setGenderFilter] = useState('Tous');
  const [categoryFilter, setCategoryFilter] = useState('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setIsLoading(true);
    catalogService.getModels(
      categoryFilter !== 'Tous' ? categoryFilter : undefined,
      genderFilter !== 'Tous' ? genderFilter : undefined
    )
      .then(res => {
        setModels(res);
        setIsLoading(false);
        setCurrentPage(1);
      })
      .catch(() => setIsLoading(false));
  }, [categoryFilter, genderFilter]);

  const filteredModels = models.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredModels.length / ITEMS_PER_PAGE);
  const paginatedModels = filteredModels.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-4">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden h-[85vh] flex flex-col animate-in zoom-in-95 duration-500">
        
        {/* Header */}
        <div className="p-8 border-b border-[#E7E5E4] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-serif italic text-[#1C1917]">Sélectionner un Modèle</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#B68D40] mt-1">Votre Vitrine Artisanale</p>
          </div>
          <button onClick={closeModal} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-[#F5F5F4] transition-colors self-start md:self-center">
            <X className="w-6 h-6 text-[#78716C]" />
          </button>
        </div>

        {/* Header Filters & Search */}
        <div className="px-8 py-6 bg-[#FAF9F6] border-b border-[#E7E5E4] flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E] group-focus-within:text-[#B68D40] transition-colors" />
            <input 
              type="text"
              placeholder="Rechercher par nom ou catégorie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E7E5E4] rounded-2xl py-3.5 pl-12 pr-6 text-sm focus:ring-4 focus:ring-[#B68D40]/5 focus:border-[#B68D40]/30 transition-all outline-none"
            />
          </div>

          <CatalogFilters 
            categoryFilter={categoryFilter}
            genderFilter={genderFilter}
            onCategoryChange={setCategoryFilter}
            onGenderChange={setGenderFilter}
            onClear={() => { setCategoryFilter('Tous'); setGenderFilter('Tous'); }}
            activeCount={(genderFilter !== 'Tous' ? 1 : 0) + (categoryFilter !== 'Tous' ? 1 : 0)}
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-10 h-10 border-2 border-[#B68D40] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : paginatedModels.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
              <Shirt className="w-16 h-16 mb-4" />
              <p className="font-serif italic text-lg">Aucun modèle trouvé</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedModels.map(model => (
                <div 
                  key={model.id}
                  onClick={() => {
                    payload.onSelect(model);
                    closeModal();
                  }}
                  className="group relative bg-[#FAF9F6] border border-[#E7E5E4] rounded-3xl overflow-hidden cursor-pointer hover:-translate-y-2 hover:shadow-xl transition-all duration-500"
                >
                  <div className="aspect-[3/4] relative overflow-hidden">
                    <img 
                      src={model.image_paths[0]} 
                      className="w-full h-full object-cover object-top transition-transform duration-700" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#1C1917] shadow-xl scale-75 group-hover:scale-100 transition-transform duration-500">
                        <Check className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#B68D40] mb-1">{model.category}</p>
                    <h4 className="text-lg font-serif italic text-[#1C1917] truncate">{model.name}</h4>
                    <p className="text-xs text-[#78716C] mt-1">{(model.price_ref || 0).toLocaleString()} {CURRENCY}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer / Pagination */}
        {totalPages > 1 && (
          <div className="p-8 border-t border-[#E7E5E4] bg-[#FAF9F6] flex items-center justify-between">
            <p className="text-[10px] font-black uppercase text-[#A8A29E] tracking-widest">
              Page {currentPage} sur {totalPages}
            </p>
            <div className="flex gap-4">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-[#E7E5E4] disabled:opacity-30 hover:bg-[#FAF9F6] transition-colors shadow-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-[#E7E5E4] disabled:opacity-30 hover:bg-[#FAF9F6] transition-colors shadow-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
