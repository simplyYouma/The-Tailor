import React, { useState, useEffect } from 'react';
import { 
  X, 
  Package, 
  Check, 
  Layers, 
  Coins, 
  Upload
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { Dropdown } from '@/components/common/Dropdown';
import * as fabricService from '@/services/fabricService';
import type { Fabric, FabricCreatePayload } from '@/types';
import { FABRIC_TYPES } from '@/types/constants';
import { useFabricTypeStore } from '@/store/fabricTypeStore';

export function FabricForm() {
  const closeModal = useUIStore((s) => s.closeModal);
  const addToast = useUIStore((s) => s.addToast);
  const triggerRefresh = useUIStore((s) => s.triggerRefresh);
  const modalPayload = useUIStore((s) => s.modalPayload) as Fabric | null;
  
  const [formData, setFormData] = useState<FabricCreatePayload>({
    name: '',
    type: 'Bazin Riche',
    price_per_meter: 5000,
    stock_quantity: 10,
    image_path: null
  });

  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dynamicTypes = useFabricTypeStore((s) => s.types);
  const fabricTypeOptions: string[] = dynamicTypes.length > 0 ? dynamicTypes.map(t => t.name) : FABRIC_TYPES;

  useEffect(() => {
    if (modalPayload) {
      setFormData({
        name: modalPayload.name,
        type: modalPayload.type,
        price_per_meter: modalPayload.price_per_meter,
        stock_quantity: modalPayload.stock_quantity,
        image_path: modalPayload.image_path
      });
    }
  }, [modalPayload]);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData({ ...formData, image_path: event.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      addToast('Le nom du tissu est requis', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      if (modalPayload) {
        await fabricService.updateFabric(modalPayload.id, formData);
      } else {
        await fabricService.createFabric(formData);
      }
      addToast(modalPayload ? 'Informations mises à jour' : 'Nouveau tissu ajouté', 'success');
      triggerRefresh();
      closeModal();
    } catch (error) {
      addToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-[#1C1917]/80 backdrop-blur-sm transition-opacity" onClick={closeModal} />
      
      <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-[#E7E5E4] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#FAF9F6] rounded-2xl flex items-center justify-center text-[#B68D40] border border-[#E7E5E4]">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-serif italic text-[#1C1917]">
                {modalPayload ? 'Modifier le Tissu' : 'Ajouter un Tissu'}
              </h3>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A8A29E]">Entrée en Stock</p>
            </div>
          </div>
          <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F5F5F4] transition-colors">
            <X className="w-5 h-5 text-[#78716C]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-visible">
          {/* Image Selection */}
          <div className="flex flex-col items-center">
            <div className="w-32 h-40 bg-[#FAF9F6] rounded-[2rem] border-2 border-dashed border-[#E7E5E4] overflow-hidden group relative flex flex-col items-center justify-center transition-all hover:border-[#B68D40]/30 cursor-pointer shadow-sm">
              {formData.image_path ? (
                <img src={formData.image_path} alt="Fabric" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-[#A8A29E]">
                   <Package className="w-8 h-8 opacity-20 mb-2" />
                   <span className="text-[7px] font-black uppercase tracking-widest text-[#B68D40]/60">Photo</span>
                </div>
              )}
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              <div 
                onClick={handleImageClick}
                className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                 <Upload className="w-5 h-5 text-white" />
                 <span className="text-[8px] font-black uppercase text-white tracking-widest">Charger Image</span>
              </div>
            </div>
            <p className="mt-4 text-[9px] font-black uppercase tracking-widest text-[#A8A29E]">Identifiant Visuel</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#78716C] ml-1">Nom du Tissu / Motif</label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Ex: Bazin Riche Getzner - Bleu Nuit"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl py-4 px-5 text-sm focus:outline-none focus:ring-4 focus:ring-[#B68D40]/5 focus:border-[#B68D40]/30 transition-all placeholder:text-[#A8A29E]"
                  required
                />
              </div>
            </div>

            {/* Type Selector */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#78716C] ml-1">Type de Matière</label>
              <Dropdown 
                label="Type de tissu"
                options={fabricTypeOptions.map(t => ({ id: t, label: t }))}
                selectedId={formData.type}
                onSelect={(opt) => setFormData({ ...formData, type: opt.id })}
                className="w-full"
                triggerClassName="w-full h-12 bg-[#FAF9F6] border-[#E7E5E4] rounded-2xl px-5 text-sm text-[#1C1917]"
              />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#78716C] ml-1">Prix au Mètre (CFA)</label>
              <div className="relative">
                <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
                <input
                  type="number"
                  value={formData.price_per_meter}
                  onChange={(e) => setFormData({ ...formData, price_per_meter: Number(e.target.value) })}
                  className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl py-4 pl-12 pr-5 text-sm font-serif italic focus:outline-none focus:ring-4 focus:ring-[#B68D40]/5 focus:border-[#B68D40]/30 transition-all"
                  min="0"
                />
              </div>
            </div>

            {/* Initial Stock */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#78716C] ml-1">Stock Initial (Mètres)</label>
              <div className="relative">
                <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
                <input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
                  className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl py-4 pl-12 pr-5 text-sm font-serif italic focus:outline-none focus:ring-4 focus:ring-[#B68D40]/5 focus:border-[#B68D40]/30 transition-all"
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[#E7E5E4] flex gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-14 bg-[#1C1917] text-white rounded-2xl flex items-center justify-center gap-3 font-bold text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? 'Enregistrement...' : <><Check className="w-4 h-4 text-[#B68D40]" /> Enregistrer le Tissu</>}
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="px-8 h-14 border border-[#E7E5E4] text-[#78716C] rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-[#F5F5F4] transition-all"
            >
              Annuler
            </button>
          </div>
        </form>

        {/* Deleted overlays for Camera/File - Streamlined to direct input */}
      </div>
    </div>
  );
}
