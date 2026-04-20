/**
 * 🧵 ModelForm — Ajout d'un modèle au catalogue
 */
import React, { useState } from 'react';
import { X, Save, Shirt } from 'lucide-react';
import { FileUploader } from '@/components/common/FileUploader';
import { useUIStore } from '@/store/uiStore';
import { useCatalogStore } from '@/store/catalogStore';
import { cn } from '@/lib/utils';
import { MODEL_CATEGORIES, MODEL_GENDERS } from '@/types/constants';
import type { ModelCategory, Gender, CatalogModel } from '@/types';
import * as catalogService from '@/services/catalogService';

export function ModelForm() {
  const closeModal = useUIStore((s) => s.closeModal);
  const modalPayload = useUIStore((s) => s.modalPayload) as CatalogModel | null;
  const isEdit = !!modalPayload;

  const fetchModels = useCatalogStore((s) => s.fetchModels);

  const [name, setName] = useState(modalPayload?.name ?? '');
  const [description, setDescription] = useState(modalPayload?.description ?? '');
  const [category, setCategory] = useState<ModelCategory>(modalPayload?.category ?? 'Boubou');
  const [gender, setGender] = useState<Gender>(modalPayload?.gender ?? 'Femme');
  const [price, setPrice] = useState(modalPayload?.price_ref?.toString() ?? '');
  const [images, setImages] = useState<string[]>(modalPayload?.image_paths ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Le nom du modèle est obligatoire.'); return; }
    if (!price || Number(price) <= 0) { setError('Le prix indicatif doit être positif.'); return; }

    setIsSubmitting(true);
    try {
      const data = {
        name: name.trim(),
        description: description.trim(),
        category,
        gender,
        price_ref: Number(price),
        image_paths: images,
      };

      if (isEdit) {
        await catalogService.updateModel(modalPayload.id, data);
      } else {
        await catalogService.addModel(data);
      }
      
      await fetchModels();
      useUIStore.getState().triggerRefresh();
      closeModal();
    } catch {
      setError(isEdit ? 'Erreur lors de la modification du modèle.' : 'Erreur lors de l\'ajout du modèle.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = isEdit ? 'Modifier le Modèle' : 'Nouveau Modèle';
  const buttonText = isEdit ? 'Enregistrer les Modifications' : 'Ajouter au Catalogue';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg mx-4 rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center justify-between p-8 pb-0">
          <div>
            <h3 className="text-2xl font-serif italic text-[#1C1917]">{title}</h3>
            <p className="text-xs text-[#A8A29E] uppercase tracking-widest mt-1">Votre Vitrine</p>
          </div>
          <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F5F5F4] transition-colors">
            <X className="w-5 h-5 text-[#78716C]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Photos */}
          <div>
             <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E] mb-2">Galerie Photos</label>
             <FileUploader
               value={images}
               onChange={setImages}
               maxFiles={5}
             />
          </div>

          {/* Nom */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E] mb-2">Nom du modèle *</label>
            <div className="relative">
              <Shirt className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D6D3D1]" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Grand Boubou Tabaski 2026"
                className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-[#B68D40]/5 focus:border-[#B68D40]/30 transition-all"
              />
            </div>
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E] mb-2">Catégorie</label>
            <div className="grid grid-cols-3 gap-2">
              {MODEL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] transition-all text-center",
                    category === cat ? "bg-[#1C1917]/5 text-[#1C1917]" : "text-[#A8A29E] hover:text-[#78716C] bg-[#FAF9F6]/50"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Genre */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E] mb-2">
              Genre *
            </label>
            <div className="flex gap-3">
              {MODEL_GENDERS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={cn(
                    "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all",
                    gender === g ? "bg-[#B68D40]/10 text-[#1C1917] shadow-inner shadow-[#B68D40]/5" : "text-[#A8A29E] hover:text-[#78716C] bg-[#FAF9F6]/50"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Prix */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E] mb-2">Prix indicatif (FCFA) *</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="25000"
              className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl py-3.5 px-4 text-sm focus:outline-none focus:ring-4 focus:ring-[#B68D40]/5 focus:border-[#B68D40]/30 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E] mb-2">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Boubou classique avec broderie main..."
              className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl py-3.5 px-4 text-sm focus:outline-none focus:ring-4 focus:ring-[#B68D40]/5 focus:border-[#B68D40]/30 transition-all resize-none"
            />
          </div>

          {/* Error */}
          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 bg-[#1C1917] text-white rounded-2xl flex items-center justify-center gap-3 font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                {buttonText}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
