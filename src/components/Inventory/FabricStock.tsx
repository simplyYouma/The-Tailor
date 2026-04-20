import React, { useEffect, useState } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  TrendingDown, 
  Layers, 
  Coins, 
  Edit,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Dropdown } from '@/components/common/Dropdown';
import { useUIStore } from '@/store/uiStore';
import * as fabricService from '@/services/fabricService';
import type { Fabric } from '@/types';
import { cn } from '@/lib/utils';
import { CURRENCY, FABRIC_TYPES, FABRIC_STOCK_LIMITS, PAGINATION } from '@/types/constants';
import { Trash2 } from 'lucide-react';

export function FabricStock() {
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('Tous');
  const [filterStock, setFilterStock] = useState<'all' | 'low' | 'out'>('all');
  const [minMeters, setMinMeters] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  
  const openModal = useUIStore((s) => s.openModal);
  const openConfirm = useUIStore((s) => s.openConfirm);
  const addToast = useUIStore((s) => s.addToast);
  const refreshCounter = useUIStore((s) => s.refreshCounter);

  const fetchFabrics = async () => {
    setIsLoading(true);
    try {
      const data = await fabricService.getFabrics();
      setFabrics(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFabrics();
  }, [refreshCounter]);

  const filteredFabrics = fabrics.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         f.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'Tous' || f.type === filterType;
    const matchesStock = filterStock === 'all' ? true :
                        filterStock === 'low' ? f.stock_quantity <= FABRIC_STOCK_LIMITS.LOW :
                        f.stock_quantity <= 0;
    const matchesMeters = f.stock_quantity >= minMeters;
    
    return matchesSearch && matchesType && matchesStock && matchesMeters;
  });

  const totalPages = Math.ceil(filteredFabrics.length / PAGINATION.FABRICS);
  const paginatedFabrics = filteredFabrics.slice(
    (currentPage - 1) * PAGINATION.FABRICS,
    currentPage * PAGINATION.FABRICS
  );

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await openConfirm(
      'Supprimer le tissu',
      `Attention, vous allez supprimer "${name}" définitivement du stock. Continuer ?`
    );
    if (!confirmed) return;

    try {
      await fabricService.deleteFabric(id);
      addToast('Tissu supprimé du stock', 'success');
      fetchFabrics();
    } catch (e) {
      addToast('Erreur lors de la suppression', 'error');
    }
  };

  const lowStockThreshold = FABRIC_STOCK_LIMITS.LOW;

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
      {/* Header View */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-[#E7E5E4]">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#1C1917] rounded-full flex items-center justify-center shadow-lg shadow-black/10">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#B68D40]">Gestion de Stock</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-serif italic text-[#1C1917] tracking-tighter leading-none">
            Catalogue des Tissus
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E] group-focus-within:text-[#B68D40] transition-colors" />
            <input
              type="text"
              placeholder="Rechercher un tissu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 bg-white border border-[#E7E5E4] rounded-full py-3 pl-12 pr-6 text-xs focus:outline-none focus:ring-4 focus:ring-[#B68D40]/5 focus:border-[#B68D40]/30 transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => openModal('fabric_form')}
            className="h-12 px-6 bg-[#1C1917] text-white rounded-full flex items-center gap-2.5 font-bold text-[10px] uppercase tracking-[0.15em] shadow-xl hover:bg-black transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Ajouter au Stock
          </button>
        </div>
      </div>

      {/* Modern Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white border border-[#E7E5E4] rounded-3xl p-4 shadow-sm animate-in slide-in-from-top-4 duration-500">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip 
            label="Tous les tissus" 
            active={filterType === 'Tous'} 
            onClick={() => { setFilterType('Tous'); setCurrentPage(1); }} 
          />
          {FABRIC_TYPES.slice(0, 5).map(type => (
            <FilterChip 
              key={type}
              label={type} 
              active={filterType === type} 
              onClick={() => { setFilterType(type); setCurrentPage(1); }} 
            />
          ))}
          {FABRIC_TYPES.length > 5 && (
            <Dropdown 
              label="Plus..."
              options={FABRIC_TYPES.slice(5).map(t => ({ id: t, label: t }))}
              selectedId={FABRIC_TYPES.indexOf(filterType) >= 5 ? filterType : undefined}
              onSelect={(opt) => { setFilterType(opt.id); setCurrentPage(1); }}
              className="ml-1"
            />
          )}
        </div>

        {/* Meters Filter Slider */}
        <div className="flex-1 max-w-[200px] px-6 hidden lg:block border-x border-[#E7E5E4]/50">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-[#A8A29E]">Métrage Min</span>
                <span className="text-[10px] font-serif italic text-[#B68D40]">{minMeters}m</span>
            </div>
            <input 
                type="range"
                min="0"
                max={Math.max(...fabrics.map(f => f.stock_quantity), 10)}
                step="0.5"
                value={minMeters}
                onChange={(e) => { setMinMeters(Number(e.target.value)); setCurrentPage(1); }}
                className="w-full h-1.5 bg-[#FAF9F6] rounded-full appearance-none cursor-pointer accent-[#B68D40] outline-none border border-[#E7E5E4]/30"
            />
        </div>

        <div className="flex items-center gap-2">
           <button 
             onClick={() => { setFilterStock('all'); setCurrentPage(1); }}
             className={cn(
               "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
               filterStock === 'all' ? "bg-white text-[#1C1917] border border-[#E7E5E4]" : "text-[#A8A29E] hover:text-[#B68D40]"
             )}
           >
             Tout
           </button>
           <button 
             onClick={() => { setFilterStock('low'); setCurrentPage(1); }}
             className={cn(
               "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
               filterStock === 'low' ? "bg-red-50 text-red-600 border border-red-100" : "text-[#A8A29E] hover:text-red-500"
             )}
           >
             <AlertTriangle className="w-3 h-3" /> Bas
           </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StockStatCard 
          label="Total Variétés" 
          value={fabrics.length.toString()} 
          icon={<Layers className="w-4 h-4" />} 
          color="bg-[#FAF9F6]"
        />
        <StockStatCard 
          label="Stock Critique" 
          value={fabrics.filter(f => f.stock_quantity <= lowStockThreshold).length.toString()} 
          icon={<AlertTriangle className="w-4 h-4" />} 
          color="bg-red-50"
          textColor="text-red-600"
        />
        <StockStatCard 
          label="Valeur Stock" 
          value={`${(fabrics.reduce((acc, f) => acc + (f.price_per_meter * f.stock_quantity), 0)).toLocaleString()} ${CURRENCY}`} 
          icon={<Coins className="w-4 h-4" />} 
          color="bg-[#FAF9F6]"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#B68D40]/30 border-t-[#B68D40] rounded-full animate-spin" />
        </div>
      ) : filteredFabrics.length === 0 ? (
        <div className="h-96 flex flex-col items-center justify-center text-center bg-white border-2 border-dashed border-[#E7E5E4] rounded-[3rem]">
          <Package className="w-12 h-12 text-[#E7E5E4] mb-4" />
          <p className="text-[#A8A29E] font-serif italic">Aucun tissu trouvé dans le stock</p>
          <button 
            onClick={() => openModal('fabric_form')}
            className="mt-6 text-[10px] font-black uppercase tracking-widest text-[#B68D40] hover:underline"
          >
            Ajouter votre premier tissu
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
          {paginatedFabrics.map((fabric) => (
            <FabricCard 
              key={fabric.id} 
              fabric={fabric} 
              onEdit={() => openModal('fabric_form', fabric)}
              onDelete={() => handleDelete(fabric.id, fabric.name)}
              lowStockThreshold={lowStockThreshold}
            />
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-[#E7E5E4] rounded-[2rem] p-4 mb-20 shadow-sm animate-in slide-in-from-bottom-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#A8A29E] px-4">
            Page <span className="text-[#1C1917]">{currentPage}</span> sur {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-[#E7E5E4] hover:bg-[#FAF9F6] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
               {Array.from({ length: totalPages }).map((_, i) => (
                 <button
                   key={i}
                   onClick={() => setCurrentPage(i + 1)}
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
              onClick={() => setCurrentPage(p => p + 1)}
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

function StockStatCard({ label, value, icon, color, textColor = "text-[#1C1917]" }: { label: string; value: string; icon: React.ReactNode; color: string; textColor?: string }) {
  return (
    <div className={cn("p-8 rounded-[2.5rem] border border-[#E7E5E4] shadow-sm flex items-center gap-6", color)}>
      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-[#E7E5E4] shadow-sm text-[#B68D40]">
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#A8A29E] mb-1">{label}</p>
        <p className={cn("text-xl font-serif italic tracking-tight", textColor)}>{value}</p>
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "h-8 px-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300",
        active 
          ? "bg-[#1C1917] text-white shadow-lg shadow-black/10 scale-105" 
          : "bg-[#FAF9F6] text-[#78716C] border border-[#E7E5E4] hover:border-[#B68D40]/30 hover:bg-white"
      )}
    >
      {label}
    </button>
  );
}

function FabricCard({ fabric, onEdit, onDelete, lowStockThreshold }: { fabric: Fabric; onEdit: () => void; onDelete: () => void; lowStockThreshold: number }) {
  const isLowStock = fabric.stock_quantity <= lowStockThreshold;

  return (
    <div className="group bg-white border border-[#E7E5E4] rounded-[2.5rem] overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 relative">
      {/* Image / Placeholder */}
      <div className="aspect-[4/5] bg-[#FAF9F6] relative overflow-hidden">
        {fabric.image_path ? (
          <img src={fabric.image_path} alt={fabric.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#E7E5E4]">
            <Package className="w-12 h-12 opacity-20" />
            <span className="text-[8px] font-black uppercase tracking-widest mt-4 opacity-50">Pas d'image</span>
          </div>
        )}
        
        {/* Chips */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
          <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-white shadow-sm pointer-events-auto">
            <span className="text-[8px] font-black uppercase tracking-widest text-[#B68D40]">{fabric.type}</span>
          </div>
          <div className="flex gap-2 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
               onClick={(e) => { e.stopPropagation(); onEdit(); }}
               className="w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center border border-white shadow-sm hover:bg-white transition-colors"
            >
              <Edit className="w-3.5 h-3.5 text-[#1C1917]" />
            </button>
            <button 
               onClick={(e) => { e.stopPropagation(); onDelete(); }}
               className="w-8 h-8 bg-red-500/90 backdrop-blur-md rounded-full flex items-center justify-center border border-red-400/30 shadow-sm hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        {/* Price Tag */}
        <div className="absolute bottom-4 left-4">
          <div className="bg-[#1C1917] text-white px-4 py-2 rounded-2xl shadow-xl">
             <p className="text-[7px] font-black uppercase tracking-widest opacity-50 mb-0.5">Prix / mètre</p>
             <p className="text-sm font-serif italic">{(fabric.price_per_meter || 0).toLocaleString()} <span className="text-[8px] not-italic opacity-70 ml-0.5">{CURRENCY}</span></p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-base font-serif italic text-[#1C1917] mb-4 truncate">{fabric.name}</h3>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-[#A8A29E] mb-1">En Stock</p>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-lg font-serif italic",
                isLowStock ? "text-red-500" : "text-[#1C1917]"
              )}>{fabric.stock_quantity}</span>
              <span className="text-[10px] text-[#A8A29E] font-medium">mètres</span>
            </div>
          </div>
          
          {isLowStock && (
            <div className="flex items-center gap-1 text-red-500 animate-pulse">
               <TrendingDown className="w-3 h-3" />
               <span className="text-[7px] font-black uppercase tracking-widest">Bas</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-1.5 bg-[#FAF9F6] rounded-full overflow-hidden border border-[#E7E5E4]/50">
          <div 
             className={cn(
               "h-full transition-all duration-1000 ease-out",
               isLowStock ? "bg-red-500" : "bg-[#B68D40]"
             )}
             style={{ width: `${Math.min((fabric.stock_quantity / 20) * 100, 100)}%` }} // Base 20m as "full" for visual
          />
        </div>
      </div>
    </div>
  );
}
