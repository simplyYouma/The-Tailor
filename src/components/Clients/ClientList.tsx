/**
 * 🧵 ClientList — Galerie des Clients
 */
import React, { useEffect, useState } from 'react';
import { Users, Search, UserPlus, Phone, ChevronRight, ChevronLeft } from 'lucide-react';
import { useClientStore } from '@/store/clientStore';
import { useUIStore } from '@/store/uiStore';
import { PAGINATION } from '@/types/constants';
import { cn } from '@/lib/utils';

export function ClientList() {
  const clients = useClientStore((s) => s.clients);
  const isLoading = useClientStore((s) => s.isLoading);
  const searchQuery = useClientStore((s) => s.searchQuery);
  const fetchClients = useClientStore((s) => s.fetchClients);
  const setSearchQuery = useClientStore((s) => s.setSearchQuery);
  const selectClient = useClientStore((s) => s.selectClient);
  const navigate = useUIStore((s) => s.navigate);
  const openModal = useUIStore((s) => s.openModal);
  const [currentPage, setCurrentPage] = useState(1);

  const refreshCounter = useUIStore((s) => s.refreshCounter);

  useEffect(() => {
    fetchClients();
  }, [fetchClients, refreshCounter]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    fetchClients(q);
    setCurrentPage(1); // Reset on search
  };

  const handleClientClick = async (id: string) => {
    await selectClient(id);
    navigate('client_detail');
  };

  const totalPages = Math.ceil(clients.length / PAGINATION.CLIENTS);
  const paginatedClients = clients.slice(
    (currentPage - 1) * PAGINATION.CLIENTS,
    currentPage * PAGINATION.CLIENTS
  );

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E7E5E4] pb-10">
        <div>
          <h2 className="text-4xl font-serif italic text-[#1C1917] tracking-tight mb-2">
            Galerie des Clients
          </h2>
          <p className="text-[#78716C] text-sm">{clients.length} client{clients.length !== 1 ? 's' : ''} enregistré{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => openModal('client_form')}
          className="h-12 px-8 bg-[#1C1917] text-white rounded-full flex items-center gap-3 font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-black transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          Nouveau Client
        </button>
      </div>

      {/* Search */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E] group-focus-within:text-[#B68D40] transition-colors" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Chercher par nom ou téléphone..."
          className="w-full bg-white border border-[#E7E5E4] rounded-2xl py-4 pl-14 pr-6 text-sm focus:outline-none focus:ring-4 focus:ring-[#B68D40]/5 focus:border-[#B68D40]/30 transition-all placeholder:text-[#A8A29E]"
        />
      </div>

      {/* Client Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#B68D40] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-[#F5F5F4] rounded-full flex items-center justify-center mb-6">
            <Users className="w-8 h-8 text-[#B68D40]/40" />
          </div>
          <h3 className="text-xl font-serif italic mb-2">Aucun client pour le moment</h3>
          <p className="text-xs text-[#A8A29E] uppercase tracking-widest">
            Votre premier client attend d'être accueilli.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paginatedClients.map((client) => (
            <div
              key={client.id}
              onClick={() => handleClientClick(client.id)}
              className="flex items-center gap-5 p-6 bg-white border border-[#E7E5E4] rounded-3xl cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 transition-all duration-300 group"
            >
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full bg-[#FAF9F6] border border-[#E7E5E4] flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
                {client.portrait_path ? (
                  <img src={client.portrait_path} alt={client.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="text-lg font-serif italic text-[#B68D40]">
                    {client.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#1C1917] truncate">{client.name}</p>
                <div className="flex items-center gap-2 mt-1 text-[#A8A29E]">
                  <Phone className="w-3 h-3" />
                  <span className="text-xs">{client.phone}</span>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-[#D6D3D1] group-hover:text-[#B68D40] transition-colors flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-[#E7E5E4] rounded-3xl p-4 shadow-sm animate-in slide-in-from-bottom-4 mb-20">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#A8A29E] px-4">
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
                   onClick={() => { setCurrentPage((i + 1) as number); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
