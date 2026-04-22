import { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, ArrowUp, ArrowDown, X, Save, Pencil, Check } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useFabricTypeStore } from '@/store/fabricTypeStore';
import * as svc from '@/services/fabricTypeService';
import type { FabricTypeRow } from '@/services/fabricTypeService';

export function FabricTypeSettings() {
  const [rows, setRows] = useState<FabricTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const addToast = useUIStore((s) => s.addToast);
  const openConfirm = useUIStore((s) => s.openConfirm);
  const refreshStore = useFabricTypeStore((s) => s.fetchTypes);

  const load = async () => {
    try {
      const data = await svc.getFabricTypes();
      setRows(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const move = (idx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[idx], next[target]] = [next[target], next[idx]];
    setRows(next.map((r, i) => ({ ...r, sequence: i + 1 })));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await svc.addFabricType(newName);
      addToast('Type de tissu ajouté', 'success');
      setNewName('');
      setIsAdding(false);
      await load();
      await refreshStore();
    } catch {
      addToast('Erreur : ce type existe déjà', 'error');
    }
  };

  const handleSaveRename = async (row: FabricTypeRow) => {
    const clean = editingName.trim();
    if (!clean || clean === row.name) { setEditingId(null); return; }
    try {
      await svc.updateFabricType(row.id, clean, row.name);
      addToast('Type renommé', 'success');
      setEditingId(null);
      await load();
      await refreshStore();
    } catch {
      addToast('Erreur lors du renommage', 'error');
    }
  };

  const handleDelete = async (row: FabricTypeRow) => {
    const ok = await openConfirm(
      `Supprimer le type "${row.name}" ?`,
      'Si ce type est utilisé par des tissus, la suppression sera bloquée.'
    );
    if (!ok) return;
    try {
      await svc.deleteFabricType(row.id, row.name);
      addToast('Type supprimé', 'success');
      await load();
      await refreshStore();
    } catch (e: any) {
      addToast(e?.message || 'Suppression impossible', 'error');
    }
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      await svc.reorderFabricTypes(rows);
      addToast('Ordre enregistré', 'success');
      await refreshStore();
    } catch {
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
          <h3 className="text-xl font-serif italic text-[#1C1917]">Types de Tissus</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#B68D40]">Personnalisez votre registre de matières</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="h-11 px-6 bg-[#1C1917] text-white rounded-full flex items-center gap-2.5 font-bold text-[10px] uppercase tracking-widest shadow-lg hover:bg-black transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Ajouter un type
        </button>
      </header>

      <div className="bg-white border border-[#E7E5E4] rounded-[2.5rem] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#FAF9F6] border-b border-[#E7E5E4]">
              <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-[#A8A29E]">Séquence</th>
              <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-[#A8A29E]">Nom</th>
              <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-[#A8A29E] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#FAF9F6]">
            {rows.map((row, index) => (
              <tr key={row.id} className="group hover:bg-[#FAF9F6] transition-colors">
                <td className="px-8 py-4">
                  <span className="text-[10px] font-black text-[#A8A29E] bg-[#F5F5F4] w-6 h-6 rounded-md flex items-center justify-center">
                    {index + 1}
                  </span>
                </td>
                <td className="px-8 py-4">
                  {editingId === row.id ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(row);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={() => handleSaveRename(row)}
                      className="bg-transparent border-b border-[#B68D40] focus:outline-none font-serif italic text-base text-[#1C1917] w-full"
                    />
                  ) : (
                    <span className="font-serif italic text-base text-[#1C1917]">{row.name}</span>
                  )}
                </td>
                <td className="px-8 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => move(index, 'up')} disabled={index === 0} className="p-1.5 hover:bg-white rounded-lg text-[#A8A29E] hover:text-[#1C1917] disabled:opacity-20">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => move(index, 'down')} disabled={index === rows.length - 1} className="p-1.5 hover:bg-white rounded-lg text-[#A8A29E] hover:text-[#1C1917] disabled:opacity-20">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-4 bg-[#E7E5E4] mx-1" />
                    {editingId === row.id ? (
                      <button onClick={() => handleSaveRename(row)} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => { setEditingId(row.id); setEditingName(row.name); }}
                        className="p-1.5 hover:bg-white rounded-lg text-[#A8A29E] hover:text-[#1C1917]"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(row)} className="p-1.5 hover:bg-red-50 rounded-lg text-[#A8A29E] hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={3} className="px-8 py-12 text-center text-[#A8A29E] text-xs">Aucun type de tissu. Ajoutez-en un.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center bg-[#FAF9F6] p-8 rounded-[2.5rem] border border-[#E7E5E4]">
        <div className="flex items-center gap-4 text-[#78716C]">
          <Layers className="w-5 h-5 opacity-40" />
          <p className="text-[10px] uppercase tracking-widest font-black max-w-xs leading-relaxed">
            L'ordre définit l'affichage dans le stock et les filtres.
          </p>
        </div>
        <button
          onClick={handleSaveOrder}
          disabled={saving}
          className="h-12 px-10 bg-[#1C1917] text-white rounded-full flex items-center gap-3 font-bold text-[11px] uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : <><Save className="w-4 h-4" /> Enregistrer l'ordre</>}
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#1C1917]/20 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl p-8 animate-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-xl font-serif italic">Nouveau type de tissu</h4>
              <button onClick={() => setIsAdding(false)} className="text-[#A8A29E] hover:text-black"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E]">Nom</label>
                <div className="relative">
                  <Layers className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B68D40] opacity-40" />
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Velours"
                    className="w-full h-10 border-b border-[#E7E5E4] focus:border-[#B68D40] focus:outline-none pl-6 text-sm"
                  />
                </div>
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
