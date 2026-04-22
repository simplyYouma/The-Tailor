/**
 * 🧵 NewOrderCheckout — Création de commande complète
 * Flow : Client → Modèle → Tissu → Description → Montant → Acompte
 */
import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Camera, 
  Users, 
  Shirt, 
  Wallet, 
  UserPlus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Package,
  Upload,
  Search
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  parseISO,
  differenceInDays,
  startOfDay,
  isBefore
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { useUIStore } from '@/store/uiStore';
import { useClientStore } from '@/store/clientStore';
import { useOrderStore } from '@/store/orderStore';
import { useCatalogStore } from '@/store/catalogStore';
import { AudioRecorder } from '@/components/common/AudioRecorder';
import { FileUploader } from '@/components/common/FileUploader';
import { cn } from '@/lib/utils';
import { CURRENCY, PAYMENT_METHODS, MODEL_CATEGORIES, MODEL_GENDERS, getItemColor, FABRIC_TYPES } from '@/types/constants';
import { useModelCategoryStore } from '@/store/modelCategoryStore';
import { useFabricTypeStore } from '@/store/fabricTypeStore';
import type { PaymentMethod, CatalogModel, Gender, Fabric } from '@/types';
import * as orderService from '@/services/orderService';
import * as catalogService from '@/services/catalogService';
import * as fabricService from '@/services/fabricService';
import React from 'react';

const STEPS = ['Client', 'Modèle', 'Tissu', 'Détails', 'Paiement'] as const;

export function NewOrderCheckout() {
  const navigate = useUIStore((s) => s.navigate);
  const openModal = useUIStore((s) => s.openModal);
  const modalType = useUIStore((s) => s.modalType);
  const clients = useClientStore((s) => s.clients);
  const fetchClients = useClientStore((s) => s.fetchClients);

  const [step, setStep] = useState(0);
  const [clientId, setClientId] = useState('');
  const [selectedModel, setSelectedModel] = useState<CatalogModel | null>(null);
  
  // Custom Model Options (Inspiration)
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [customModelName, setCustomModelName] = useState('');
  const [customModelGender, setCustomModelGender] = useState<Gender>('Femme');
  const dynamicCats = useModelCategoryStore((s) => s.categories);
  const categoryOptions = dynamicCats.length > 0 ? dynamicCats.map(c => c.name) : MODEL_CATEGORIES;
  const dynamicFT = useFabricTypeStore((s) => s.types);
  const fabricTypeList: string[] = dynamicFT.length > 0 ? dynamicFT.map(t => t.name) : FABRIC_TYPES;
  const [customModelCategory, setCustomModelCategory] = useState(categoryOptions[0]);
  const [saveToCatalog, setSaveToCatalog] = useState(false);

  const [fabricPhoto, setFabricPhoto] = useState<string | null>(null);
  const [audioNote, setAudioNote] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [advance, setAdvance] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Cash');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  // Fabric specific state
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [fabricSource, setFabricSource] = useState<'client' | 'stock'>('client');
  const [selectedFabric, setSelectedFabric] = useState<Fabric | null>(null);
  const [fabricAmount, setFabricAmount] = useState(3); // Default 3 meters
  const [fabricPrice, setFabricPrice] = useState(0);
  const [fabricPickerSearch, setFabricPickerSearch] = useState('');
  const [fabricPickerType, setFabricPickerType] = useState('Tous');

  const filteredInventoryFabrics = useMemo(() => {
    return fabrics.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(fabricPickerSearch.toLowerCase());
      const matchesType = fabricPickerType === 'Tous' || f.type === fabricPickerType;
      return matchesSearch && matchesType;
    });
  }, [fabrics, fabricPickerSearch, fabricPickerType]);

  const fabricFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFabricImageClick = () => {
    fabricFileInputRef.current?.click();
  };

  const handleFabricFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setFabricPhoto(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Agenda logic inside Checkout
  const orders = useOrderStore((s) => s.orders);
  const fetchOrders = useOrderStore((s) => s.fetchOrders);
  const fetchModels = useCatalogStore((s) => s.fetchModels);
  const [agendaMonth, setAgendaMonth] = useState(new Date());

  useEffect(() => {
    fetchClients();
    fetchOrders();
    fetchModels();
    
    // Fetch fabrics for stock selection
    fabricService.getFabrics().then(setFabrics).catch(console.error);
  }, [fetchClients, fetchOrders, fetchModels]);

  // Calendar grouping for Intelligent Guard
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(agendaMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(agendaMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [agendaMonth]);

  const weeks = useMemo(() => {
    const w = [];
    for (let i = 0; i < days.length; i += 7) {
      w.push(days.slice(i, i + 7));
    }
    return w;
  }, [days]);

  // 🖱️ Automatisme : Remonter en haut de page à chaque changement d'étape
  const topRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  const monthlyOrders = useMemo(() => {
    return orders.filter(o => o.delivery_date && o.status !== 'Livré' && o.status !== 'Annulé');
  }, [orders]);

  const getDateLoad = (day: Date) => {
    return monthlyOrders.filter(o => {
      try {
        return isSameDay(parseISO(o.delivery_date!), day);
      } catch { return false; }
    });
  };

  // Auto-scroll to Expert Advice
  const expertPanelRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (deliveryDate && expertPanelRef.current) {
      setTimeout(() => {
        expertPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [deliveryDate]);

  // Re-fetch clients when modal closes (after adding a new client)
  useEffect(() => {
    if (modalType === null) {
      fetchClients();
    }
  }, [modalType, fetchClients]);

  // Autofill price if model is selected
  useEffect(() => {
    let modelPrice = 0;
    if (selectedModel && !isCustomModel) {
      modelPrice = selectedModel.price_ref;
    }

    let calculatedFabricPrice = 0;
    if (fabricSource === 'stock' && selectedFabric) {
      calculatedFabricPrice = selectedFabric.price_per_meter * fabricAmount;
    }

    setFabricPrice(calculatedFabricPrice);
    
    // Only auto-update if the user hasn't manually tinkered or if we just selected a model
    const total = modelPrice + calculatedFabricPrice;
    if (total > 0) {
      setTotalPrice(total.toString());
    }
  }, [selectedModel, isCustomModel, fabricSource, selectedFabric, fabricAmount]);

  // Handle selected fabric invalidation on amount change
  useEffect(() => {
    if (fabricSource === 'stock' && selectedFabric && selectedFabric.stock_quantity < fabricAmount) {
      setSelectedFabric(null);
    }
  }, [fabricAmount, selectedFabric, fabricSource]);

  const filteredClients = clientSearch.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch))
    : clients;

  const handleSelectModelFromCatalog = (model: CatalogModel) => {
    setSelectedModel(model);
    setIsCustomModel(false);
  };

  const canNext = (): boolean => {
    if (step === 0) return clientId !== '';
    if (step === 1) return true; // Model is optional
    if (step === 2) {
      if (fabricSource === 'client') return true;
      return selectedFabric !== null && selectedFabric.stock_quantity >= fabricAmount;
    }
    if (step === 3) return true; // Description is optional
    if (step === 4) return Number(totalPrice) > 0;
    return false;
  };

  const handleSubmit = async () => {
    if (!totalPrice || Number(totalPrice) <= 0) {
      setError('Le prix total est obligatoire.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      let finalModelId = selectedModel?.id || null;

      if (isCustomModel && referenceImages.length > 0 && saveToCatalog && customModelName.trim()) {
         const newCatModel = await catalogService.addModel({
            name: customModelName.trim(),
            description: 'Modèle apporté par un client',
            category: customModelCategory,
            gender: customModelGender,
            price_ref: Number(totalPrice) || 0,
            image_paths: referenceImages
         });
         finalModelId = newCatModel.id;
      }

      await orderService.createOrder({
        client_id: clientId,
        model_id: finalModelId,
        fabric_id: fabricSource === 'stock' ? selectedFabric?.id : null,
        fabric_amount_used: fabricSource === 'stock' ? fabricAmount : 0,
        fabric_photo_path: fabricPhoto,
        audio_note_path: audioNote,
        reference_images: referenceImages,
        description: description.trim(),
        total_price: Number(totalPrice),
        advance_paid: Number(advance) || 0,
        delivery_date: deliveryDate || null,
      }, payMethod);

      // Si tissu du stock, on déduit
      if (fabricSource === 'stock' && selectedFabric) {
        await fabricService.updateFabricStock(selectedFabric.id, fabricAmount);
      }
      
      navigate('kanban');
    } catch {
      setError('Erreur lors de la création de la commande.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div ref={topRef} className="max-w-2xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10 border-b border-[#E7E5E4] pb-8">
        <button onClick={() => navigate('dashboard')} className="w-10 h-10 bg-white border border-[#E7E5E4] rounded-full flex items-center justify-center hover:bg-[#F5F5F4] transition-colors">
          <ArrowLeft className="w-4 h-4 text-[#78716C]" />
        </button>
        <div>
          <h2 className="text-3xl font-serif italic text-[#1C1917] tracking-tight">Nouvelle Commande</h2>
          <p className="text-xs text-[#A8A29E] uppercase tracking-widest mt-1">
            Étape {step + 1} / {STEPS.length} — {STEPS[step]}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-2 mb-10">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 h-1.5 rounded-full overflow-hidden bg-[#E7E5E4]">
            <div
              className="h-full bg-[#1C1917] rounded-full transition-all duration-500"
              style={{ width: i <= step ? '100%' : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Step 0: Select Client */}
      {step === 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[#B68D40]" />
              <h3 className="text-lg font-bold">Choisir le client</h3>
            </div>
            <button
              onClick={() => openModal('client_form')}
              className="h-10 px-5 bg-[#B68D40] text-white rounded-full flex items-center gap-2 font-bold text-[9px] uppercase tracking-widest hover:bg-[#9A7535] transition-all active:scale-95 shadow-md"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nouveau Client</span>
            </button>
          </div>
          <input
            type="text"
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            placeholder="Chercher un client..."
            className="w-full bg-white border border-[#E7E5E4] rounded-2xl py-3.5 px-5 text-sm focus:outline-none focus:ring-4 focus:ring-[#B68D40]/5 focus:border-[#B68D40]/30 transition-all"
          />
          <div className="max-h-72 overflow-y-auto space-y-2 pr-2">
            {filteredClients.map((c) => (
              <button
                key={c.id}
                onClick={() => setClientId(c.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  clientId === c.id ? 'border-[#B68D40] bg-[#B68D40]/5 shadow-md' : 'border-[#E7E5E4] bg-white hover:bg-[#FAF9F6]'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-[#FAF9F6] border border-[#E7E5E4] flex items-center justify-center flex-shrink-0">
                  {c.portrait_path ? (
                    <img src={c.portrait_path} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-sm font-serif italic text-[#B68D40]">{c.name.charAt(0)}</span>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">{c.name}</p>
                  <p className="text-xs text-[#A8A29E]">{c.phone}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Select Model (optional) */}
      {step === 1 && (
        <div className="space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <Shirt className="w-5 h-5 text-[#B68D40]" />
            <h3 className="text-lg font-bold text-[#1C1917]">Choisir un modèle</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => {
                setIsCustomModel(false);
                openModal('catalog_picker', { onSelect: handleSelectModelFromCatalog });
              }}
              className={cn(
                "group p-8 rounded-[2.5rem] border-2 transition-all duration-500 flex flex-col items-center text-center gap-6",
                selectedModel && !isCustomModel 
                  ? "border-[#B68D40] bg-[#B68D40]/5 shadow-xl shadow-[#B68D40]/10" 
                  : "border-[#E7E5E4] bg-white hover:border-[#B68D40]/30 hover:shadow-lg"
              )}
            >
              <div className="w-full aspect-[3/4] max-w-[12rem] rounded-[2rem] bg-[#FAF9F6] border border-[#E7E5E4] flex items-center justify-center text-[#B68D40] group-hover:scale-[1.02] transition-transform overflow-hidden shadow-inner">
                {selectedModel && !isCustomModel && selectedModel.image_paths[0] ? (
                  <img src={selectedModel.image_paths[0]} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-3 opacity-40">
                    <Shirt className="w-10 h-10" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Choisir</span>
                  </div>
                )}
              </div>
              <div>
                <p className="font-bold text-[#1C1917] text-lg">Boutique & Catalogue</p>
                <p className="text-[10px] uppercase font-black tracking-widest text-[#A8A29E] mt-1">Vos modèles enregistrés</p>
              </div>
              {selectedModel && !isCustomModel && (
                <div className="mt-2 bg-[#B68D40] text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] animate-in zoom-in shadow-md">
                  {selectedModel.name}
                </div>
              )}
            </button>

            <button
              onClick={() => { setIsCustomModel(true); setSelectedModel(null); }}
              className={cn(
                "group p-8 rounded-[2.5rem] border-2 transition-all duration-500 flex flex-col items-center text-center gap-6",
                isCustomModel 
                  ? "border-[#1C1917] bg-[#1C1917]/5 shadow-xl shadow-black/10" 
                  : "border-[#E7E5E4] bg-white hover:border-[#1C1917]/30 hover:shadow-lg"
              )}
            >
              <div className="w-full aspect-[3/4] max-w-[12rem] rounded-[2rem] bg-[#FAF9F6] border border-[#E7E5E4] flex items-center justify-center text-[#1C1917] group-hover:scale-[1.02] transition-transform overflow-hidden shadow-inner">
                {referenceImages.length > 0 ? (
                  <img src={referenceImages[0]} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-3 opacity-40">
                    <Save className="w-10 h-10" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Inspiration</span>
                  </div>
                )}
              </div>
              <div>
                <p className="font-bold text-[#1C1917] text-lg">Inspiration Client</p>
                <p className="text-[10px] uppercase font-black tracking-widest text-[#A8A29E] mt-1">Images externes ou propres</p>
              </div>
            </button>
          </div>

          {isCustomModel && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
               <div className="p-8 bg-white border border-[#E7E5E4] rounded-[2.5rem] shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D6D3D1] mb-6">Charger les photos (Pinterest, Instagram...)</p>
                  <FileUploader value={referenceImages} onChange={setReferenceImages} maxFiles={5} />
                  
                  <div className="flex items-center gap-4 mt-8 p-4 bg-[#FAF9F6] rounded-2xl border border-[#E7E5E4]">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="saveNewModel" 
                        checked={saveToCatalog} 
                        onChange={(e) => setSaveToCatalog(e.target.checked)} 
                        className="w-5 h-5 rounded-lg text-[#B68D40] border-[#E7E5E4] focus:ring-[#B68D40] transition-all"
                      />
                      <label htmlFor="saveNewModel" className="text-sm font-bold text-[#1C1917] cursor-pointer selection:bg-transparent">Ajouter ce modèle à la Boutique pour d'autres clients</label>
                    </div>
                  </div>

                  {saveToCatalog && (
                    <div className="mt-8 space-y-6 animate-in slide-in-from-top-2">
                       <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E] mb-3">Nom du modèle</p>
                          <input
                            type="text"
                            placeholder="Ex: Robe de soirée 'Élégance'..."
                            value={customModelName}
                            onChange={(e) => setCustomModelName(e.target.value)}
                            className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-[#B68D40]/50 transition-all font-serif italic"
                          />
                       </div>

                       <div className="space-y-8">
                          <div>
                             <p className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E] mb-4">Genre</p>
                             <div className="flex gap-2">
                                {MODEL_GENDERS.map(g => (
                                   <button
                                      key={g}
                                      type="button"
                                      onClick={() => setCustomModelGender(g)}
                                      className={cn(
                                         "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all",
                                         customModelGender === g ? "bg-[#B68D40]/10 text-[#1C1917] shadow-inner shadow-[#B68D40]/5" : "bg-[#FAF9F6] border border-[#E7E5E4] text-[#A8A29E] hover:text-[#78716C]"
                                      )}
                                   >
                                      {g}
                                   </button>
                                ))}
                             </div>
                          </div>
                          <div>
                             <p className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E] mb-4">Catégorie</p>
                             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {categoryOptions.map(c => (
                                   <button
                                      key={c}
                                      type="button"
                                      onClick={() => setCustomModelCategory(c as any)}
                                      className={cn(
                                         "py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.25em] transition-all text-center",
                                         customModelCategory === c ? "bg-[#1C1917]/5 text-[#1C1917]" : "bg-white border border-[#E7E5E4] text-[#A8A29E] hover:text-[#78716C]"
                                      )}
                                   >
                                      {c}
                                   </button>
                                ))}
                             </div>
                          </div>
                       </div>
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Fabric Selection */}
      {step === 2 && (
        <div className="space-y-8 animate-in slide-in-from-right duration-500">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-5 h-5 text-[#B68D40]" />
            <h3 className="text-lg font-bold text-[#1C1917]">Provenances du Tissu</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setFabricSource('client')}
              className={cn(
                "p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 text-center",
                fabricSource === 'client' ? "border-[#B68D40] bg-[#B68D40]/5" : "border-[#E7E5E4] bg-white hover:border-[#B68D40]/30"
              )}
            >
              <div className="w-12 h-12 bg-[#FAF9F6] rounded-2xl flex items-center justify-center text-[#B68D40]">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-sm">Tissu du Client</p>
                <p className="text-[8px] uppercase font-black text-[#A8A29E] tracking-widest mt-1">Apporté par le client</p>
              </div>
            </button>

            <button
              onClick={() => setFabricSource('stock')}
              className={cn(
                "p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 text-center",
                fabricSource === 'stock' ? "border-[#1C1917] bg-[#1C1917]/5" : "border-[#E7E5E4] bg-white hover:border-[#1C1917]/30"
              )}
            >
              <div className="w-12 h-12 bg-[#FAF9F6] rounded-2xl flex items-center justify-center text-[#1C1917]">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-sm">Tissu du Stock</p>
                <p className="text-[8px] uppercase font-black text-[#A8A29E] tracking-widest mt-1">Vendu par l'Atelier</p>
              </div>
            </button>
          </div>

          {fabricSource === 'client' ? (
            <div className="p-8 bg-white border border-[#E7E5E4] rounded-[3rem] animate-in slide-in-from-top-4 duration-500">
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E] mb-4">Image du tissu témoin</p>
               <input 
                 type="file" 
                 ref={fabricFileInputRef} 
                 onChange={handleFabricFileChange} 
                 accept="image/*" 
                 className="hidden" 
               />
               <div 
                 onClick={handleFabricImageClick}
                 className="w-full aspect-[3/2] rounded-[2rem] bg-[#FAF9F6] border-2 border-dashed border-[#E7E5E4] overflow-hidden flex flex-col items-center justify-center group relative cursor-pointer hover:border-[#B68D40]/30 transition-all"
               >
                 {fabricPhoto ? (
                   <img src={fabricPhoto} alt="Fabric" className="w-full h-full object-cover" />
                 ) : (
                   <div className="flex flex-col items-center text-[#A8A29E]">
                      <Upload className="w-8 h-8 opacity-20 mb-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#B68D40]/60">Cliquer pour charger</span>
                   </div>
                 )}
                 {fabricPhoto && (
                   <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="w-6 h-6 text-white" />
                      <span className="text-[9px] font-black uppercase text-white tracking-widest">Changer d'image</span>
                   </div>
                 )}
               </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
               <div className="p-8 bg-white border border-[#E7E5E4] rounded-[3rem]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E]">Sélectionner dans l'inventaire</p>
                    
                    <div className="relative group flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A8A29E] group-focus-within:text-[#B68D40] transition-colors" />
                      <input
                        type="text"
                        placeholder="Chercher motif/nom..."
                        value={fabricPickerSearch}
                        onChange={(e) => setFabricPickerSearch(e.target.value)}
                        className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-full py-2 pl-10 pr-4 text-[11px] focus:outline-none focus:ring-4 focus:ring-[#B68D40]/5 focus:border-[#B68D40]/30 transition-all placeholder:text-[#A8A29E]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-6">
                    <button
                      onClick={() => setFabricPickerType('Tous')}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                        fabricPickerType === 'Tous' ? "bg-[#1C1917] text-white" : "bg-[#FAF9F6] text-[#78716C] hover:bg-[#E7E5E4]"
                      )}
                    >
                      Tout
                    </button>
                    {fabricTypeList.slice(0, 5).map(t => (
                      <button
                        key={t}
                        onClick={() => setFabricPickerType(t)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                          fabricPickerType === t ? "bg-[#1C1917] text-white" : "bg-[#FAF9F6] text-[#78716C] hover:bg-[#E7E5E4]"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {filteredInventoryFabrics.length === 0 ? (
                      <div className="py-20 text-center opacity-40">
                         <Package className="w-8 h-8 mx-auto mb-3" />
                         <p className="text-[10px] font-serif italic">Aucun tissu correspondant</p>
                      </div>
                    ) : (
                      filteredInventoryFabrics.map(f => {
                        const isOutOfStock = f.stock_quantity <= 0;
                        const isInsufficient = f.stock_quantity < fabricAmount;
                        const isDisabled = isOutOfStock || isInsufficient;

                        return (
                          <button
                            key={f.id}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => setSelectedFabric(f)}
                            className={cn(
                              "flex items-center gap-4 p-4 rounded-2xl border transition-all relative overflow-hidden",
                              selectedFabric?.id === f.id 
                                ? "border-[#B68D40] bg-[#B68D40]/5 shadow-sm" 
                                : "border-[#E7E5E4] bg-white hover:bg-[#FAF9F6]",
                              isDisabled && "opacity-40 grayscale cursor-not-allowed pointer-events-none"
                            )}
                          >
                             <div className="w-12 h-16 bg-[#FAF9F6] rounded-xl overflow-hidden flex-shrink-0 relative">
                               {f.image_path ? (
                                 <img src={f.image_path} className="w-full h-full object-cover" />
                               ) : (
                                 <Package className="w-full h-full p-3 opacity-20" />
                               )}
                               
                               {isDisabled && (
                                 <div className="absolute inset-0 bg-[#1C1917]/20 backdrop-blur-[1px] flex items-center justify-center">
                                    <span className="text-[7px] font-black uppercase text-white bg-red-500 px-1.5 py-0.5 rounded-sm shadow-lg whitespace-nowrap">
                                      {isOutOfStock ? 'Rupture' : 'Insuffisant'}
                                    </span>
                                 </div>
                               )}
                             </div>
                             
                             <div className="text-left flex-1">
                               <div className="flex items-center justify-between">
                                 <p className="text-xs font-bold text-[#1C1917]">{f.name}</p>
                                 <span className={cn(
                                   "text-[9px] font-black uppercase tracking-widest",
                                   isDisabled ? "text-red-500" : "text-[#B68D40]"
                                 )}>
                                   {f.stock_quantity.toFixed(1)}m dispo
                                 </span>
                               </div>
                               <p className="text-[9px] uppercase font-black text-[#A8A29E] tracking-widest mt-1">
                                 {f.type} • {(f.price_per_meter || 0).toLocaleString()} CFA/m
                               </p>
                             </div>
                             
                             {!isDisabled && f.stock_quantity <= 5 && (
                               <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" title="Stock Bas" />
                             )}
                          </button>
                        );
                      }))}
                  </div>

                  <div className="mt-8 pt-8 border-t border-[#E7E5E4] space-y-4">
                     <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#78716C]">Métrage Nécessaire</label>
                        <div className="flex items-center gap-4">
                           <button onClick={() => setFabricAmount(Math.max(0.5, fabricAmount - 0.5))} className="w-10 h-10 rounded-full border border-[#E7E5E4] flex items-center justify-center">-</button>
                           <span className="text-lg font-serif italic w-12 text-center">{fabricAmount}m</span>
                           <button onClick={() => setFabricAmount(fabricAmount + 0.5)} className="w-10 h-10 rounded-full border border-[#E7E5E4] flex items-center justify-center">+</button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Details (audio + description) */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <Camera className="w-5 h-5 text-[#B68D40]" />
            <h3 className="text-lg font-bold">Consignes de Réalisation</h3>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E] mb-2">Description / Instructions</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Boubou manches longues, broderie dorée sur le col..."
              className="w-full bg-white border border-[#E7E5E4] rounded-2xl py-3.5 px-5 text-sm focus:outline-none focus:ring-4 focus:ring-[#B68D40]/5 focus:border-[#B68D40]/30 transition-all resize-none"
            />
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E] mb-2">Note Vocale</p>
            <AudioRecorder value={audioNote} onChange={setAudioNote} />
          </div>

          <div className="space-y-4 pt-4 border-t border-[#E7E5E4]">
            <div className="flex items-center justify-between">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1C1917]">Planning des Disponibilités</p>
                  <p className="text-[9px] text-[#A8A29E] uppercase tracking-widest mt-1">Choisissez une date de livraison intelligente</p>
               </div>
               <div className="flex items-center gap-2 bg-[#FAF9F6] p-1.5 rounded-xl border border-[#E7E5E4]">
                  <button 
                    type="button"
                    onClick={() => setAgendaMonth(subMonths(agendaMonth, 1))}
                    className="p-1.5 hover:bg-white rounded-lg transition-all"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-[#78716C]" />
                  </button>
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 min-w-[100px] text-center">
                    {format(agendaMonth, 'MMMM yyyy', { locale: fr })}
                  </span>
                  <button 
                    type="button"
                    onClick={() => setAgendaMonth(addMonths(agendaMonth, 1))}
                    className="p-1.5 hover:bg-white rounded-lg transition-all"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-[#78716C]" />
                  </button>
               </div>
            </div>

            {/* Smart Calendar Grid */}
            <div className="bg-white border border-[#E7E5E4] rounded-3xl p-4 shadow-inner bg-[#FAF9F6]/30">
               {/* Days Header */}
               <div className="grid grid-cols-7 mb-2">
                 {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, idx) => (
                   <div key={idx} className="text-center py-2">
                     <span className="text-[8px] font-black text-[#D6D3D1] uppercase">{d}</span>
                   </div>
                 ))}
               </div>

               {/* Weeks */}
               <div className="space-y-1">
                 {weeks.map((week, wIdx) => (
                   <div key={wIdx} className="relative grid grid-cols-7 gap-1">
                     {week.map((day) => {
                       const dayOrders = getDateLoad(day);
                       const isSelected = deliveryDate && isSameDay(parseISO(deliveryDate), day);
                       const isOut = !isSameMonth(day, agendaMonth);
                       const isTodayDay = isToday(day);
                       const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
                       const isDisabled = isOut || isPast;

                       return (
                         <button
                           key={day.toISOString()}
                           type="button"
                           disabled={isDisabled}
                           onClick={() => !isDisabled && setDeliveryDate(format(day, 'yyyy-MM-dd'))}
                           className={cn(
                             "relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all border",
                             isOut && "opacity-10 cursor-default border-transparent",
                             isPast && !isOut && "opacity-40 cursor-not-allowed bg-[#FAF9F6] border-transparent line-through",
                             !isDisabled && "hover:scale-95",
                             isSelected
                               ? "bg-[#1C1917] border-[#1C1917] text-white shadow-lg z-20"
                               : isTodayDay
                                 ? "bg-white border-[#B68D40] text-[#B68D40]"
                                 : !isDisabled
                                   ? "bg-white border-[#E7E5E4] text-[#78716C] hover:border-[#B68D40]/30"
                                   : ""
                           )}
                         >
                           <span className="text-[10px] font-bold">{format(day, 'd')}</span>
                           
                           {/* Load Indicator Dots */}
                           {!isOut && dayOrders.length > 0 && (
                             <div className="absolute bottom-1.5 flex gap-0.5">
                               {dayOrders.slice(0, 3).map((_, i) => (
                                 <div key={i} className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white/40" : "bg-[#B68D40]")} />
                               ))}
                               {dayOrders.length > 3 && <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white/40" : "bg-[#B68D40]")} />}
                             </div>
                           )}
                         </button>
                       );
                     })}

                     {/* Timeline Overlay (Expert Visibility) */}
                     {(() => {
                       const weekBars = monthlyOrders.filter(o => {
                         try {
                           const start = parseISO(o.created_at);
                           const end = parseISO(o.delivery_date!);
                           return (start <= week[6] && end >= week[0]);
                         } catch { return false; }
                       });
                       const count = weekBars.length;
                       const barH = count <= 8 ? 'h-1' : count <= 15 ? 'h-0.5' : 'h-px';
                       const gapCls = count <= 8 ? 'gap-0.5' : 'gap-px';
                       const jitter = (id: string) => {
                         let h = 5381;
                         for (let i = 0; i < id.length; i++) h = (h * 33) ^ id.charCodeAt(i);
                         const n = Math.abs(h) % 3;
                         return n === 0 ? 1 : n === 1 ? 0.72 : 1.28;
                       };
                       return (
                         <div className={cn("absolute inset-x-0 bottom-0 top-0 pointer-events-none px-1 flex flex-col justify-center opacity-80", gapCls)}>
                           {weekBars.map((order) => {
                             const start = parseISO(order.created_at);
                             const end = parseISO(order.delivery_date!);
                             const actualStart = start > week[0] ? start : week[0];
                             const actualEnd = end < week[6] ? end : week[6];
                             const sIdx = week.findIndex(d => isSameDay(d, actualStart));
                             const eIdx = week.findIndex(d => isSameDay(d, actualEnd));
                             if (sIdx === -1 || eIdx === -1) return null;
                             const left = (sIdx * (100/7)) + 0.5;
                             const width = ((eIdx - sIdx + 1) * (100/7)) - 1;
                             const color = getItemColor(order.id);
                             return (
                               <div
                                 key={order.id}
                                 className={cn("rounded-full border border-white/20 shadow-sm", barH)}
                                 style={{
                                   marginLeft: `${left}%`,
                                   width: `${width}%`,
                                   backgroundColor: color,
                                   filter: `brightness(${jitter(order.id)})`,
                                   boxShadow: `0 1px 2px ${color}40`
                                 }}
                               />
                             );
                           })}
                         </div>
                       );
                     })()}
                   </div>
                 ))}
               </div>
            </div>

            {/* Expert Analysis Panel */}
            {deliveryDate && (() => {
              const selectedDate = parseISO(deliveryDate);
              const dayOrders = getDateLoad(selectedDate);
              
              // Expert Workload Analysis
              const activeConfections = monthlyOrders.filter(o => {
                const s = parseISO(o.created_at);
                const e = parseISO(o.delivery_date!);
                return (selectedDate >= s && selectedDate <= e);
              }).length;

              const totalLoad = dayOrders.length + (activeConfections * 0.5); // Confections count as 0.5 workload
              
              // Find alternative if too busy
              let optimalDate = null;
              if (totalLoad >= 3) {
                // Look ahead 7 days
                for (let i = 1; i <= 7; i++) {
                   const next = new Date(selectedDate);
                   next.setDate(next.getDate() + i);
                   const nextOrders = getDateLoad(next);
                   const nextConfections = monthlyOrders.filter(o => {
                      const s = parseISO(o.created_at);
                      const e = parseISO(o.delivery_date!);
                      return (next >= s && next <= e);
                   }).length;
                   if (nextOrders.length + (nextConfections * 0.5) < 2) {
                     optimalDate = next;
                     break;
                   }
                }
              }

              const isSaturated = totalLoad >= 4;
              const isBusy = totalLoad >= 2;

              return (
                <div 
                  ref={expertPanelRef}
                  className={cn(
                    "p-6 rounded-[2rem] border transition-all animate-in slide-in-from-top-4 duration-500 shadow-xl",
                    isSaturated 
                      ? "bg-[#1C1917] border-[#1C1917] text-white" 
                      : (isBusy || differenceInDays(selectedDate, new Date()) < 2)
                        ? "bg-amber-50 border-amber-100 text-amber-900" 
                        : "bg-green-50 border-green-100 text-green-900"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse",
                      isSaturated ? "bg-[#B68D40] text-white" : "bg-white border border-current/20 shadow-sm"
                    )}>
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                         <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">
                           {isSaturated 
                             ? "⚠️ Alerte Surcharge" 
                             : differenceInDays(selectedDate, new Date()) < 2
                               ? "⚠️ Délai Critique"
                               : isBusy ? "Journée Chargée" : "Fenêtre de Qualité"}
                         </p>
                         <span className="text-[9px] font-black uppercase tracking-widest bg-current/10 px-2 py-0.5 rounded">Expert Tailleur</span>
                      </div>
                      
                      <p className="text-sm font-serif italic py-1">
                        {isSaturated 
                          ? "Attention, l'atelier est à saturation. Viser cette date compromet la finesse des finitions."
                          : differenceInDays(selectedDate, new Date()) < 2
                            ? "Expert Tailleur : Livrer en moins de 48h est risqué. Cela laisse peu de place aux imprévus et aux retouches."
                            : isBusy
                              ? "Charge modérée. Un travail soigné est possible mais demande une organisation rigoureuse."
                              : "Disponibilité exceptionnelle. C'est le moment idéal pour une confection de haute couture."}
                      </p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 opacity-80">
                         <div className="flex items-center gap-1.5 text-[10px]">
                            <div className="w-1 h-1 rounded-full bg-current" />
                            <span>{dayOrders.length} livraisons prévues</span>
                         </div>
                         <div className="flex items-center gap-1.5 text-[10px]">
                            <div className="w-1 h-1 rounded-full bg-current" />
                            <span>{activeConfections} confections en simultané</span>
                         </div>
                      </div>

                      {optimalDate && (
                        <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-xl animate-in zoom-in-95 duration-700">
                           <p className="text-[10px] font-bold">💡 Orientation Expert :</p>
                           <p className="text-[11px] opacity-80 mt-1">
                             Pour garantir un résultat impeccable, je vous oriente plutôt vers le <span className="underline font-bold">{format(optimalDate, 'EEEE d MMMM', { locale: fr })}</span>.
                           </p>
                           <button 
                             type="button" 
                             onClick={() => setDeliveryDate(format(optimalDate!, 'yyyy-MM-dd'))}
                             className="mt-2 text-[9px] font-black uppercase tracking-widest underline hover:no-underline"
                           >
                             Appliquer cette proposition
                           </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Step 4: Payment */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="w-5 h-5 text-[#B68D40]" />
            <h3 className="text-lg font-bold">Tarification & Acompte</h3>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E] mb-2">Prix total de la commande ({CURRENCY}) *</p>
            <div className="relative">
              <input
                type="number"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                placeholder="25000"
                className="w-full bg-white border border-[#E7E5E4] rounded-2xl py-5 px-6 text-2xl font-serif italic focus:outline-none focus:ring-4 focus:ring-[#B68D40]/5 focus:border-[#B68D40]/30 transition-all shadow-inner"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                 <span className="text-[9px] font-black uppercase tracking-widest text-[#B68D40] bg-[#B68D40]/5 px-3 py-1.5 rounded-lg border border-[#B68D40]/10">Total Garanti</span>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
               <div className="p-4 bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#A8A29E] mb-1">Couture / Main d'œuvre</p>
                  <p className="font-serif italic text-[#1C1917]">
                    {((Number(totalPrice) || 0) - (fabricPrice || 0)).toLocaleString()} <span className="text-[10px] opacity-40 not-italic">{CURRENCY}</span>
                  </p>
               </div>
               <div className={cn(
                 "p-4 border rounded-2xl transition-all",
                 fabricSource === 'stock' ? "bg-[#B68D40]/5 border-[#B68D40]/20" : "bg-[#FAF9F6] border-[#E7E5E4] opacity-50"
               )}>
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#A8A29E] mb-1">Fourniture Tissu</p>
                  <p className="font-serif italic text-[#1C1917]">
                    {(fabricPrice || 0).toLocaleString()} <span className="text-[10px] opacity-40 not-italic">{CURRENCY}</span>
                  </p>
               </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E] mb-2">Acompte versé ({CURRENCY})</p>
            <input
              type="number"
              value={advance}
              onChange={(e) => setAdvance(e.target.value)}
              placeholder="10000"
              className="w-full bg-white border border-[#E7E5E4] rounded-2xl py-3.5 px-5 text-sm focus:outline-none focus:ring-4 focus:ring-[#B68D40]/5 focus:border-[#B68D40]/30 transition-all"
            />
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E] mb-2">Méthode de paiement</p>
            <div className="flex gap-2 flex-wrap">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayMethod(m)}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    payMethod === m ? 'bg-[#1C1917] text-white' : 'bg-white border border-[#E7E5E4] text-[#78716C] hover:bg-[#FAF9F6]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          {Number(totalPrice) > 0 && (
            <div className="bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#78716C]">Total</span>
                <span className="font-bold">{(Number(totalPrice) || 0).toLocaleString()} {CURRENCY}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#78716C]">Acompte</span>
                <span className="text-green-600 font-bold">-{(Number(advance) || 0).toLocaleString()} {CURRENCY}</span>
              </div>
              <div className="border-t border-[#E7E5E4] pt-3 flex justify-between text-sm">
                <span className="font-black uppercase tracking-widest text-[10px] text-[#1C1917]">Reste</span>
                <span className="font-bold text-[#B68D40]">{((Number(totalPrice) || 0) - (Number(advance) || 0)).toLocaleString()} {CURRENCY}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl mt-4">{error}</p>}

      {/* Navigation */}
      <div className="flex gap-4 mt-10 pt-8 border-t border-[#E7E5E4]">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="h-14 px-8 bg-white border border-[#E7E5E4] rounded-2xl flex items-center gap-3 font-bold text-[10px] uppercase tracking-widest text-[#78716C] hover:bg-[#F5F5F4] transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Précédent
          </button>
        )}
        <div className="flex-1" />
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => canNext() && setStep((s) => s + 1)}
            disabled={!canNext()}
            className="h-14 px-8 bg-[#1C1917] text-white rounded-2xl flex items-center gap-3 font-bold text-[10px] uppercase tracking-widest disabled:opacity-30 hover:bg-black transition-all active:scale-[0.98]"
          >
            Suivant <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !canNext()}
            className="h-14 px-10 bg-[#1C1917] text-white rounded-2xl flex items-center gap-3 font-bold text-[10px] uppercase tracking-widest disabled:opacity-30 hover:bg-black transition-all active:scale-[0.98]"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><Save className="w-4 h-4" /> Confirmer la Commande</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
