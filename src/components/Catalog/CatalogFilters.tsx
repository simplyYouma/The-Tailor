import { useState, useRef, useEffect } from 'react';
import { Filter, Check, ChevronRight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MODEL_CATEGORIES, MODEL_GENDERS } from '@/types/constants';
import { useModelCategoryStore } from '@/store/modelCategoryStore';

interface CatalogFiltersProps {
  categoryFilter: string;
  genderFilter: string;
  onCategoryChange: (category: string) => void;
  onGenderChange: (gender: string) => void;
  onClear: () => void;
  activeCount: number;
  align?: 'left' | 'right';
}

export function CatalogFilters({
  categoryFilter,
  genderFilter,
  onCategoryChange,
  onGenderChange,
  onClear,
  activeCount,
  align = 'right'
}: CatalogFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'gender' | 'category'>('gender');
  const popoverRef = useRef<HTMLDivElement>(null);
  const dynamicCats = useModelCategoryStore((s) => s.categories);
  const categoryOptions = dynamicCats.length > 0 ? dynamicCats.map(c => c.name) : MODEL_CATEGORIES;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all border",
          isOpen || activeCount > 0
            ? "bg-[#1C1917] text-white border-[#1C1917] shadow-xl shadow-black/10"
            : "bg-white text-[#78716C] border-[#E7E5E4] hover:border-[#1C1917]/30"
        )}
      >
        <Filter className={cn("w-3.5 h-3.5", activeCount > 0 && "text-[#B68D40]")} />
        <span>Filtres</span>
        {activeCount > 0 && (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#B68D40] text-white text-[9px] font-black -mr-1">
            {activeCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className={cn(
          "absolute top-full mt-3 w-[480px] bg-white rounded-[2rem] border border-[#E7E5E4] shadow-2xl z-[200] overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-300",
          align === 'left' ? "left-0 origin-top-left" : "right-0 origin-top-right"
        )}>
          <div className="flex h-[320px]">
            {/* Sidebar Sections */}
            <div className="w-[160px] bg-[#FAF9F6] border-r border-[#E7E5E4] p-4 flex flex-col gap-2">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#D6D3D1] px-3 mb-2">Sections</p>
              
              <button
                onClick={() => setActiveTab('gender')}
                className={cn(
                  "flex items-center justify-between px-3 py-3 rounded-xl transition-all group",
                  activeTab === 'gender' ? "bg-white shadow-sm text-[#1C1917]" : "text-[#A8A29E] hover:text-[#78716C]"
                )}
              >
                <div className="flex items-center gap-2">
                   <div className={cn("w-1.5 h-1.5 rounded-full", genderFilter !== 'Tous' ? "bg-[#B68D40]" : "bg-transparent")} />
                   <span className="text-[10px] font-bold uppercase tracking-wider">Genre</span>
                </div>
                <ChevronRight className={cn("w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity", activeTab === 'gender' && "opacity-100")} />
              </button>

              <button
                onClick={() => setActiveTab('category')}
                className={cn(
                  "flex items-center justify-between px-3 py-3 rounded-xl transition-all group",
                  activeTab === 'category' ? "bg-white shadow-sm text-[#1C1917]" : "text-[#A8A29E] hover:text-[#78716C]"
                )}
              >
                <div className="flex items-center gap-2">
                   <div className={cn("w-1.5 h-1.5 rounded-full", categoryFilter !== 'Tous' ? "bg-[#B68D40]" : "bg-transparent")} />
                   <span className="text-[10px] font-bold uppercase tracking-wider">Catégorie</span>
                </div>
                <ChevronRight className={cn("w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity", activeTab === 'category' && "opacity-100")} />
              </button>

              {activeCount > 0 && (
                <button
                  onClick={() => { onClear(); setIsOpen(false); }}
                  className="mt-auto flex items-center gap-2 px-3 py-3 text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-500 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Réinitialiser
                </button>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              {activeTab === 'gender' ? (
                <div className="space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#D6D3D1] mb-4">Filtrer par Genre</p>
                  <div className="grid grid-cols-1 gap-2">
                    {['Tous', ...MODEL_GENDERS].map(g => (
                      <button
                        key={g}
                        onClick={() => onGenderChange(g)}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left",
                          genderFilter === g 
                            ? "bg-[#B68D40]/5 border-[#B68D40]/30 text-[#1C1917]" 
                            : "bg-white border-transparent text-[#78716C] hover:bg-[#FAF9F6]"
                        )}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-widest">{g}</span>
                        {genderFilter === g && <Check className="w-3.5 h-3.5 text-[#B68D40]" />}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#D6D3D1] mb-4">Filtrer par Catégorie</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['Tous', ...categoryOptions].map(c => (
                      <button
                        key={c}
                        onClick={() => onCategoryChange(c)}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left",
                          categoryFilter === c 
                            ? "bg-[#1C1917]/5 border-[#1C1917]/20 text-[#1C1917]" 
                            : "bg-white border-transparent text-[#78716C] hover:bg-[#FAF9F6]"
                        )}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{c}</span>
                        {categoryFilter === c && <Check className="w-3 h-3 text-[#1C1917]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-[#FAF9F6] border-t border-[#E7E5E4] px-6 py-4 flex items-center justify-between">
            <p className="text-[9px] font-medium text-[#A8A29E]">
              {activeCount} filtre{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}
            </p>
            <button
              onClick={() => setIsOpen(false)}
              className="px-6 py-2 bg-[#1C1917] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all"
            >
              Appliquer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
