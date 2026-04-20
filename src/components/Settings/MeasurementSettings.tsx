import { useState, useEffect } from 'react';
import { Ruler, Save, Plus, Trash2, ArrowUp, ArrowDown, X, Tag } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import * as measurementService from '@/services/measurementService';
import type { MeasurementType } from '@/types';

export function MeasurementSettings() {
  const [types, setTypes] = useState<MeasurementType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState('Haut');

  const addToast = useUIStore((s) => s.addToast);
  const openConfirm = useUIStore((s) => s.openConfirm);

  const fetchTypes = async () => {
    try {
      const data = await measurementService.getMeasurementTypes();
      setTypes(data.sort((a, b) => (a.sequence || 0) - (b.sequence || 0)));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleUpdateLabel = (id: number, label: string) => {
    setTypes(prev => prev.map(t => t.id === id ? { ...t, label } : t));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newTypes = [...types];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newTypes.length) return;

    [newTypes[index], newTypes[targetIndex]] = [newTypes[targetIndex], newTypes[index]];
    
    // Update sequences
    const updated = newTypes.map((t, i) => ({ ...t, sequence: i + 1 }));
    setTypes(updated);
  };

  const handleDelete = async (id: number, label: string) => {
    const ok = await openConfirm(
        `Supprimer la mesure "${label}" ?`,
        'Cette action supprimera définitivement ce type de mesure de l\'atelier.'
    );
    if (ok) {
        await measurementService.deleteMeasurementType(id);
        addToast('Mesure supprimée', 'success');
        fetchTypes();
    }
  };

  const handleAddNew = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newLabel) return;
      try {
          const keyName = newLabel.toLowerCase().replace(/\s+/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          await measurementService.addCustomMeasurementType(newLabel, keyName, newCategory);
          addToast('Nouvelle mesure ajoutée', 'success');
          setIsAdding(false);
          setNewLabel('');
          fetchTypes();
      } catch (error) {
          addToast('Erreur : cette mesure existe peut-être déjà', 'error');
      }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Sauvegarde de l'ordre et des labels
      await Promise.all(types.map(t => measurementService.updateMeasurementType(t)));
      addToast('Configuration des mesures enregistrée', 'success');
    } catch (error) {
      console.error(error);
      addToast('Erreur lors de l’enregistrement', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-40 flex items-center justify-center text-[#A8A29E]">Chargement...</div>;

  return (
    <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-serif italic text-[#1C1917]">Configuration Métier</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#B68D40]">Personnalisez vos prises de mesures</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="h-11 px-6 bg-[#1C1917] text-white rounded-full flex items-center gap-2.5 font-bold text-[10px] uppercase tracking-widest shadow-lg hover:bg-black transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Ajouter une mesure
        </button>
      </header>

      <div className="bg-white border border-[#E7E5E4] rounded-[2.5rem] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#FAF9F6] border-b border-[#E7E5E4]">
              <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-[#A8A29E]">Séquence</th>
              <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-[#A8A29E]">Label (Affiché)</th>
              <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-[#A8A29E]">Catégorie</th>
              <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-[#A8A29E] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#FAF9F6]">
            {types.map((type, index) => (
              <tr key={type.id} className="group hover:bg-[#FAF9F6] transition-colors">
                <td className="px-8 py-4">
                  <span className="text-[10px] font-black text-[#A8A29E] bg-[#F5F5F4] w-6 h-6 rounded-md flex items-center justify-center">
                    {index + 1}
                  </span>
                </td>
                <td className="px-8 py-4">
                  <input 
                    value={type.label}
                    onChange={e => handleUpdateLabel(type.id!, e.target.value)}
                    className="bg-transparent border-b border-transparent focus:border-[#B68D40] focus:outline-none transition-colors font-serif italic text-base text-[#1C1917] w-full"
                  />
                </td>
                <td className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-[#78716C]">
                  {type.category}
                </td>
                <td className="px-8 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 hover:bg-white rounded-lg text-[#A8A29E] hover:text-[#1C1917] disabled:opacity-20"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleMove(index, 'down')}
                      disabled={index === types.length - 1}
                      className="p-1.5 hover:bg-white rounded-lg text-[#A8A29E] hover:text-[#1C1917] disabled:opacity-20"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-4 bg-[#E7E5E4] mx-1" />
                    <button 
                      onClick={() => handleDelete(type.id!, type.label)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-[#A8A29E] hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center bg-[#FAF9F6] p-8 rounded-[2.5rem] border border-[#E7E5E4]">
         <div className="flex items-center gap-4 text-[#78716C]">
            <Ruler className="w-5 h-5 opacity-40" />
            <p className="text-[10px] uppercase tracking-widest font-black max-w-xs leading-relaxed">
              L'ordre définit l'affichage dans le formulaire de prise de mesures.
            </p>
         </div>
         <button
            onClick={handleSave}
            disabled={saving}
            className="h-12 px-10 bg-[#1C1917] text-white rounded-full flex items-center gap-3 font-bold text-[11px] uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
         >
           {saving ? 'Enregistrement...' : <><Save className="w-4 h-4" /> Sauvegarder les changements</>}
         </button>
      </div>

      {/* Add Transition Modal */}
      {isAdding && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#1C1917]/20 backdrop-blur-md animate-in fade-in duration-300">
             <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl p-8 animate-in zoom-in-95 duration-500">
                <div className="flex items-center justify-between mb-8">
                   <h4 className="text-xl font-serif italic">Nouvelle mesure</h4>
                   <button onClick={() => setIsAdding(false)} className="text-[#A8A29E] hover:text-black"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleAddNew} className="space-y-6">
                   <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E]">Intitulé</label>
                       <div className="relative">
                          <Tag className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B68D40] opacity-40" />
                          <input 
                            autoFocus
                            value={newLabel}
                            onChange={e => setNewLabel(e.target.value)}
                            placeholder="Ex: Tour de poignet"
                            className="w-full h-10 border-b border-[#E7E5E4] focus:border-[#B68D40] focus:outline-none pl-6 text-sm" 
                          />
                       </div>
                   </div>
                   <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E]">Catégorie</label>
                       <select 
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        className="w-full h-10 bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl px-4 text-[10px] font-black uppercase tracking-widest"
                       >
                           <option value="Haut">Haut (Vestes, Chemises)</option>
                           <option value="Bas">Bas (Pantalons, Jupes)</option>
                           <option value="Complet">Complet (Robes, Boubous)</option>
                           <option value="Autre">Autre / Accessoires</option>
                       </select>
                   </div>
                   <button type="submit" className="w-full h-12 bg-[#1C1917] text-white rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">
                       Ajouter à l'Atelier
                   </button>
                </form>
             </div>
          </div>
      )}
    </div>
  );
}
