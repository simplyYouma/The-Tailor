/**
 * 🧵 ClientForm — Création / Édition d'un client
 */
import React, { useState, useEffect } from 'react';
import { X, Save, User, Activity } from 'lucide-react';
import { PhotoCapture } from '@/components/common/PhotoCapture';
import { useUIStore } from '@/store/uiStore';
import { useClientStore } from '@/store/clientStore';
import * as clientService from '@/services/clientService';
import * as measurementService from '@/services/measurementService';
import type { Gender, MeasurementType, Client } from '@/types';

export function ClientForm() {
  const closeModal = useUIStore((s) => s.closeModal);
  const modalPayload = useUIStore((s) => s.modalPayload) as Client | null;
  const isEdit = !!modalPayload;

  const fetchClients = useClientStore((s) => s.fetchClients);

  const [name, setName] = useState(modalPayload?.name ?? '');
  const [phone, setPhone] = useState(modalPayload?.phone ?? '');
  const [address, setAddress] = useState(modalPayload?.address ?? '');
  const [gender, setGender] = useState<Gender>(modalPayload?.gender ?? 'Femme');
  const [portrait, setPortrait] = useState<string | null>(modalPayload?.portrait_path ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Mensurations Base
  const [measurementTypes, setMeasurementTypes] = useState<MeasurementType[]>([]);
  const [measurements, setMeasurements] = useState<Record<number, string>>({});
  const [showMeasurements, setShowMeasurements] = useState(isEdit);

  useEffect(() => {
    measurementService.getMeasurementTypes().then(setMeasurementTypes).catch(console.error);
    if (isEdit) {
      // Pré-remplir les mensurations
      measurementService.getClientMeasurements(modalPayload.id).then((existing) => {
        if (existing.length > 0) {
          setShowMeasurements(true);
          const map: Record<number, string> = {};
          existing.forEach((m) => { map[m.type_id] = m.value.toString(); });
          setMeasurements(map);
        }
      });
    }
  }, [isEdit, modalPayload]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Le nom est obligatoire.'); return; }
    if (!phone.trim()) { setError('Le numéro de téléphone est obligatoire.'); return; }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        gender,
        portrait_path: portrait,
      };

      let clientId = modalPayload?.id;

      if (isEdit && clientId) {
        await clientService.updateClient(clientId, payload);
      } else {
        const newClient = await clientService.createClient(payload);
        clientId = newClient.id;
      }

      if (showMeasurements && Object.keys(measurements).length > 0 && clientId) {
        const items = Object.entries(measurements)
          .map(([typeId, val]) => ({ type_id: Number(typeId), value: Number(val) }))
          .filter(m => m.value > 0);
        await measurementService.saveClientMeasurements(clientId, items);
      }

      await fetchClients();
      if (clientId) {
        await useClientStore.getState().selectClient(clientId);
      }
      useUIStore.getState().triggerRefresh();
      closeModal();
    } catch {
      setError(isEdit ? 'Erreur lors de la modification du client.' : 'Erreur lors de la création du client.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = isEdit ? 'Modifier le Client' : 'Nouveau Client';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center justify-between p-8 pb-4 bg-white z-10">
          <div>
            <h3 className="text-2xl font-serif italic text-[#1C1917]">{title}</h3>
            <p className="text-xs text-[#A8A29E] uppercase tracking-widest mt-1">Fiche CRM</p>
          </div>
          <button
            onClick={closeModal}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F5F5F4] transition-colors"
          >
            <X className="w-5 h-5 text-[#78716C]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 pt-2 space-y-6 custom-scrollbar">
          {/* Photo */}
          <div className="flex justify-center">
            <PhotoCapture
              value={portrait}
              onChange={setPortrait}
              placeholder="Photo du client"
              className="w-28 h-28"
              rounded
            />
          </div>

          {/* Nom */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E] mb-2">
              Nom complet *
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D6D3D1]" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mamadou Traoré"
                className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-[#B68D40]/5 focus:border-[#B68D40]/30 transition-all"
              />
            </div>
          </div>

          {/* Téléphone */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E] mb-2">
              Téléphone *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+223 70 00 00 00"
              className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl py-3.5 px-4 text-sm focus:outline-none focus:ring-4 focus:ring-[#B68D40]/5 focus:border-[#B68D40]/30 transition-all"
            />
          </div>

          {/* Adresse */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E] mb-2">
              Adresse (optionnel)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Bamako, Hamdallaye ACI 2000"
              className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl py-3.5 px-4 text-sm focus:outline-none focus:ring-4 focus:ring-[#B68D40]/5 focus:border-[#B68D40]/30 transition-all"
            />
          </div>

          {/* Genre */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E] mb-2">
              Genre *
            </label>
            <div className="flex gap-2 p-1 bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl">
              {(['Homme', 'Femme'] as Gender[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                    gender === g ? 'bg-white shadow-sm text-[#1C1917]' : 'text-[#A8A29E] hover:text-[#78716C]'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Mensurations Optionnelles */}
          <div className="pt-2 border-t border-[#E7E5E4]">
            <button
              type="button"
              onClick={() => setShowMeasurements(!showMeasurements)}
              className="flex items-center gap-2 text-sm font-bold text-[#B68D40] hover:text-[#9A7535] transition-colors"
            >
              <Activity className="w-4 h-4" />
              {showMeasurements ? 'Masquer' : 'Ajouter'} les mensurations de base
            </button>

            {showMeasurements && (
              <div className="mt-4 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {measurementTypes.map((type) => (
                  <div key={type.id}>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-[#A8A29E] mb-1">
                      {type.label}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0"
                        value={measurements[type.id] || ''}
                        onChange={(e) => setMeasurements(p => ({ ...p, [type.id]: e.target.value }))}
                        className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#B68D40]/30 transition-all font-serif italic text-right pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#A8A29E]">cm</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</p>
          )}

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
                Enregistrer le Client
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
