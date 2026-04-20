import { useState, useEffect, useRef } from 'react';
import { Shirt, Plus, Eye, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { CatalogFilters } from './CatalogFilters';
import { useCatalogStore } from '@/store/catalogStore';
import { useUIStore } from '@/store/uiStore';
import * as catalogService from '@/services/catalogService';
import { CURRENCY, PAGINATION } from '@/types/constants';
import { cn } from '@/lib/utils';
import type { CatalogModel } from '@/types';

export function CatalogGrid() {
  const models = useCatalogStore((s) => s.models);
  const isLoading = useCatalogStore((s) => s.isLoading);
  const categoryFilter = useCatalogStore((s) => s.categoryFilter);
  const genderFilter = useCatalogStore((s) => s.genderFilter);
  const fetchModels = useCatalogStore((s) => s.fetchModels);
  const setCategoryFilter = useCatalogStore((s) => s.setCategoryFilter);
  const setGenderFilter = useCatalogStore((s) => s.setGenderFilter);
  const openModal = useUIStore((s) => s.openModal);
  const addToast = useUIStore((s) => s.addToast);
  const openConfirm = useUIStore((s) => s.openConfirm);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const refreshCounter = useUIStore((s) => s.refreshCounter);

  useEffect(() => {
    fetchModels(
      categoryFilter !== 'Tous' ? categoryFilter : undefined,
      genderFilter !== 'Tous' ? genderFilter : undefined
    );
    setCurrentPage(1); // Reset on filter change
  }, [fetchModels, categoryFilter, genderFilter, refreshCounter]);

  const handleArchive = async (id: string, name: string) => {
    const ok = await openConfirm(
      'Supprimer du catalogue ?',
      `Êtes-vous sûr de vouloir retirer "${name}" de votre vitrine ? Cela n'affectera pas les commandes existantes utilisant ce modèle.`
    );
    if (ok) {
      await catalogService.archiveModel(id);
      addToast('Modèle supprimé avec succès', 'success');
      fetchModels(
        categoryFilter !== 'Tous' ? categoryFilter : undefined,
        genderFilter !== 'Tous' ? genderFilter : undefined
      );
    }
  };



  const activeFilterCount = (genderFilter !== 'Tous' ? 1 : 0) + (categoryFilter !== 'Tous' ? 1 : 0);

  const filteredModels = models.filter(m => {
    if (!searchQuery.trim()) return true;
    const lowSearch = searchQuery.toLowerCase().trim();
    return (
      m.name.toLowerCase().includes(lowSearch) ||
      m.category.toLowerCase().includes(lowSearch) ||
      (m.description || '').toLowerCase().includes(lowSearch)
    );
  });

  const totalPages = Math.ceil(filteredModels.length / PAGINATION.CATALOG);
  const paginatedModels = filteredModels.slice(
    (currentPage - 1) * PAGINATION.CATALOG,
    currentPage * PAGINATION.CATALOG
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      {/* Premium Header */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-[#E7E5E4] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h2 className="text-4xl font-serif italic text-[#1C1917] tracking-tight mb-2">Boutique</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#B68D40]">Votre Vitrine Artisanale • {models.length} modèles</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
           {/* Search Input inline or sidebar? Let's keep it here for now as requested */}
           <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
              <input 
                 type="text" 
                 placeholder="Modèle, tissu..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl py-3 pl-12 pr-4 text-xs focus:outline-none focus:ring-4 focus:ring-[#B68D40]/5 transition-all outline-none"
              />
           </div>

           <CatalogFilters 
              categoryFilter={categoryFilter}
              genderFilter={genderFilter}
              onCategoryChange={setCategoryFilter}
              onGenderChange={setGenderFilter}
              onClear={() => { setCategoryFilter('Tous'); setGenderFilter('Tous'); }}
              activeCount={activeFilterCount}
           />

           <div className="w-px h-8 bg-[#E7E5E4] hidden md:block mx-2" />

           <button
             onClick={() => openModal('model_form')}
             className="h-12 px-8 bg-[#1C1917] text-white rounded-full flex items-center gap-3 font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-black transition-all active:scale-95 whitespace-nowrap"
           >
             <Plus className="w-4 h-4" />
             Nouveau Modèle
           </button>
        </div>
      </div>

      {/* Grid Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#B68D40] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : models.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-[#F5F5F4] rounded-full flex items-center justify-center mb-6">
            <Shirt className="w-8 h-8 text-[#B68D40]/40" />
          </div>
          <h3 className="text-xl font-serif italic mb-2">Votre catalogue est vide</h3>
          <p className="text-xs text-[#A8A29E] uppercase tracking-widest">Ajoutez vos créations pour impressionner vos clients.</p>
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-300">
           <div className="w-20 h-20 bg-[#FAF9F6] rounded-full flex items-center justify-center mb-6">
              <Search className="w-8 h-8 text-[#D6D3D1]" />
           </div>
           <h3 className="text-xl font-serif italic mb-2">Aucun résultat</h3>
           <p className="text-xs text-[#A8A29E] uppercase tracking-widest">
              Aucun modèle ne correspond à "{searchQuery}"
           </p>
           <button 
              onClick={() => setSearchQuery('')}
              className="mt-6 px-6 py-2 border border-[#E7E5E4] rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-[#FAF9F6] transition-all"
           >
              Effacer la recherche
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedModels.map((model) => (
            <ModelCard 
              key={model.id} 
              model={model} 
              onDetails={() => openModal('model_detail', model)}
              onEdit={() => openModal('model_form', model)}
              onDelete={() => handleArchive(model.id, model.name)}
            />
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-[#E7E5E4] rounded-[2.5rem] p-4 shadow-sm animate-in slide-in-from-bottom-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#A8A29E] px-6">
            Page <span className="text-[#1C1917]">{currentPage}</span> sur {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => { setCurrentPage((p: number) => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-[#E7E5E4] hover:bg-[#FAF9F6] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
               {Array.from({ length: totalPages }).map((_, i) => (
                 <button
                   key={i}
                   onClick={() => { setCurrentPage(i + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                   className={cn(
                     "w-10 h-10 rounded-full text-xs font-bold transition-all",
                     currentPage === i + 1 ? "bg-[#1C1917] text-white shadow-lg" : "hover:bg-[#FAF9F6] text-[#78716C]"
                   )}
                 >
                   {i + 1}
                 </button>
               ))}
            </div>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => { setCurrentPage((p: number) => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-[#E7E5E4] hover:bg-[#FAF9F6] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 🎨 ModelCard — Carte de modèle avec diaporama au survol
 */
function ModelCard({ model, onDetails, onEdit, onDelete }: { 
  model: CatalogModel; onDetails: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<number | null>(null);

  const images = model.image_paths?.length > 0 ? model.image_paths : [];

  useEffect(() => {
    if (isHovered && images.length > 1) {
      timerRef.current = window.setInterval(() => {
        setCurrentIndex((prev: number) => (prev + 1) % images.length);
      }, 1500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCurrentIndex(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isHovered, images.length]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onDetails}
      className="bg-white border border-[#E7E5E4] rounded-[2rem] overflow-hidden group hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/5 transition-all duration-500 cursor-pointer"
    >
      {/* Image / Slideshow */}
      <div className="aspect-[3/4] bg-[#FAF9F6] relative overflow-hidden">
        {images.length > 0 ? (
          <div className="w-full h-full relative">
            {images.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt={model.name}
                className={cn(
                  "absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-700",
                  idx === currentIndex ? "opacity-100 scale-100" : "opacity-0 scale-100"
                )}
              />
            ))}
            
            {/* Indicators */}
            {images.length > 1 && isHovered && (
               <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
                 {images.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "h-1 rounded-full transition-all duration-500",
                        idx === currentIndex ? "w-6 bg-white" : "w-1.5 bg-white/40"
                      )} 
                    />
                 ))}
               </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Shirt className="w-16 h-16 text-[#E7E5E4]" />
          </div>
        )}
        
        {/* Overlay Actions */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-6 gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onDetails(); }}
            className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#FAF9F6] transition-all shadow-xl active:scale-95"
          >
            <Eye className="w-3.5 h-3.5" />
            Détails
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="flex items-center justify-center w-10 h-10 bg-white rounded-full text-[#1C1917] hover:bg-white hover:text-[#B68D40] transition-all shadow-xl active:scale-95"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="flex items-center justify-center w-10 h-10 bg-white rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-xl active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Category badge */}
        <div className="absolute top-6 left-6 px-4 py-1.5 bg-white text-[#1C1917] backdrop-blur-md rounded-xl shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">{model.category}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-8">
        <h4 className="text-lg font-serif italic text-[#1C1917] mb-1 truncate">{model.name}</h4>
        <p className="text-sm text-[#B68D40] font-serif italic">
          {(model.price_ref || 0).toLocaleString()} {CURRENCY}
        </p>
      </div>
    </div>
  );
}
