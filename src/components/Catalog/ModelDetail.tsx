/**
 * 🧵 ModelDetail — Fiche de présentation premium d'un modèle
 */
import { useState } from 'react';
import { X, Pencil, Shirt, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { CURRENCY } from '@/types/constants';
import { cn } from '@/lib/utils';
import type { CatalogModel } from '@/types';

export function ModelDetail() {
  const closeModal = useUIStore((s) => s.closeModal);
  const openModal = useUIStore((s) => s.openModal);
  const model = useUIStore((s) => s.modalPayload) as CatalogModel | null;

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!model) return null;

  const images = model.image_paths?.length > 0 ? model.image_paths : [];

  const handleEdit = () => {
    openModal('model_form', model);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-500 p-4 sm:p-6 text-[#1C1917]">
      <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-full max-h-[90vh] animate-in zoom-in-95 duration-500">
        
        {/* Left: Image Viewer */}
        <div className="md:w-3/5 bg-[#FAF9F6] relative group overflow-hidden">
          {images.length > 0 ? (
            <>
              <img
                src={images[activeImageIndex]}
                alt={model.name}
                className="w-full h-full object-cover object-top transition-transform duration-1000"
              />
              
              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                    className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white active:scale-90"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                    className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white active:scale-90"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Thumbnails Overlay */}
              <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 px-6 overflow-x-auto custom-scrollbar no-scrollbar py-2">
                {images.map((src, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={cn(
                      "w-16 h-20 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 shadow-lg",
                      idx === activeImageIndex ? "border-[#B68D40] scale-110" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={src} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#E7E5E4]">
              <Shirt className="w-32 h-32 mb-4" />
              <p className="font-serif italic text-lg text-[#A8A29E]">Aucune image disponible</p>
            </div>
          )}

          {/* Category Badge */}
          <div className="absolute top-8 left-8 px-5 py-2 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl">
             <span className="text-[10px] font-black uppercase tracking-[0.3em]">{model.category}</span>
          </div>
        </div>

        {/* Right: Info Section */}
        <div className="md:w-2/5 flex flex-col p-8 sm:p-12 bg-white relative">
          <button
            onClick={closeModal}
            className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#FAF9F6] transition-colors"
          >
            <X className="w-5 h-5 text-[#78716C]" />
          </button>

          <div className="flex-1 space-y-8 flex flex-col justify-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#B68D40] mb-4">Collection Atelier</p>
              <h2 className="text-4xl sm:text-5xl font-serif italic tracking-tight leading-tight mb-2">
                {model.name}
              </h2>
              <div className="h-0.5 w-12 bg-[#B68D40] rounded-full mb-6" />
              <p className="text-3xl font-serif text-[#1C1917]">
                {(model.price_ref || 0).toLocaleString()} <span className="text-sm font-sans font-bold uppercase tracking-widest align-top ml-1">{CURRENCY}</span>
              </p>
            </div>

            <div className="space-y-4">
               <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A8A29E]">Description</h4>
               <p className="text-[#78716C] leading-relaxed italic font-serif">
                 {model.description || "Ce modèle exclusif incarne l'élégance de notre atelier, conçu avec des étoffes de premier choix pour une silhouette parfaite."}
               </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#E7E5E4]">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E] mb-1">Genre</p>
                <p className="font-bold">{model.gender}</p>
              </div>
              <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#E7E5E4]">
                 <p className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E] mb-1">Catégorie</p>
                 <p className="font-bold">{model.category}</p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-8 border-t border-[#E7E5E4] flex gap-4">
            <button
               onClick={handleEdit}
               className="flex-1 h-14 bg-[#1C1917] text-white rounded-2xl flex items-center justify-center gap-3 font-bold text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all active:scale-95"
            >
              <Pencil className="w-4 h-4" />
              Modifier le Modèle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
