import { useEffect, useState, useMemo } from 'react';
import { 
  Wallet, 
  Clock, 
  Calendar, 
  Download, 
  TrendingUp, 
  BarChart3,
  ChevronRight,
  ArrowUpRight,
  Shirt,
  Search,
  ChevronLeft
} from 'lucide-react';
import { ChartInfo } from '../Dashboard/AnalyticsComponents';
import * as paymentService from '@/services/paymentService';
import { CURRENCY } from '@/types/constants';
import { cn } from '@/lib/utils';
import { format, parseISO, startOfYear, endOfYear, subDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Payment } from '@/types';

type FilterType = 'today' | '7days' | '30days' | '90days' | 'year' | 'custom';

export function CashJournal() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState({ total: 0, count: 0, avg: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('7days');
  
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 7).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  // Pagination & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Calculate real dates based on filter
  const activeRange = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    switch (filter) {
      case 'today':
        return { from: todayStr, to: todayStr };
      case '7days':
        return { from: subDays(now, 7).toISOString().split('T')[0], to: todayStr };
      case '30days':
        return { from: subDays(now, 30).toISOString().split('T')[0], to: todayStr };
      case '90days':
        return { from: subDays(now, 90).toISOString().split('T')[0], to: todayStr };
      case 'year':
        return { 
          from: startOfYear(now).toISOString().split('T')[0], 
          to: endOfYear(now).toISOString().split('T')[0] 
        };
      case 'custom':
        return dateRange;
      default:
        return { from: todayStr, to: todayStr };
    }
  }, [filter, dateRange]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [p, s] = await Promise.all([
          paymentService.getPaymentsByDateRange(activeRange.from, activeRange.to),
          paymentService.getJournalStats(activeRange.from, activeRange.to),
        ]);
        setPayments(p);
        setStats(s);
      } catch (e) {
        console.error('[CashJournal]', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
    setCurrentPage(1); // Reset pagination on filter change
  }, [activeRange]);

  // Chart Logic (Mini Visualizer)
  const chartData = useMemo(() => {
    if (payments.length === 0) return [];
    
    // Group by date
    const groups: Record<string, number> = {};
    payments.forEach(p => {
      // Split by 'T' (ISO) or ' ' (SQL) to get the date part
      const d = p.payment_date.split(/[T ]/)[0];
      groups[d] = (groups[d] || 0) + p.amount;
    });

    // Create timeline
    const timeline: { date: string, amount: number }[] = [];
    const start = parseISO(activeRange.from);
    const end = parseISO(activeRange.to);
    
    let curr = startOfDay(start);
    const endD = startOfDay(end);

    while (curr <= endD) {
      const dStr = curr.toISOString().split('T')[0];
      timeline.push({ date: dStr, amount: groups[dStr] || 0 });
      curr = subDays(curr, -1);
    }
    
    return timeline;
  }, [payments, activeRange]);

  // Filtering & Pagination Logic
  const filteredPayments = useMemo(() => {
    if (!searchTerm.trim()) return payments;
    const s = searchTerm.toLowerCase();
    return payments.filter(p => 
      (p.client_name?.toLowerCase().includes(s)) ||
      (p.method.toLowerCase().includes(s)) ||
      (p.amount.toString().includes(s)) ||
      (p.order_id.toLowerCase().includes(s))
    );
  }, [payments, searchTerm]);

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(start, start + itemsPerPage);
  }, [filteredPayments, currentPage]);

  const [showExportSuccess, setShowExportSuccess] = useState(false);

  // CSV Export Logic
  const handleExport = () => {
    const title = `Livre de Caisse - The Tailor`;
    const subtitle = `Période du ${format(parseISO(activeRange.from), 'dd/MM/yyyy')} au ${format(parseISO(activeRange.to), 'dd/MM/yyyy')}`;
    const totalRecettes = `${(stats.total || 0).toLocaleString()} ${CURRENCY}`;

    const headers = ['Date', 'Client', 'Methode', 'Montant', 'Devise'];
    const rowsArr = payments.map(p => [
      format(parseISO(p.payment_date), 'dd/MM/yyyy HH:mm'),
      p.client_name || 'Inconnu',
      p.method,
      p.amount.toString(),
      CURRENCY
    ]);

    // Build Native Visual Styles using SpreadsheetML (XML)
    const xmlHeader = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
      <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:html="http://www.w3.org/TR/REC-html40">
      <Styles>
        <Style ss:ID="Default" ss:Name="Normal">
          <Alignment ss:Vertical="Bottom"/>
          <Borders/>
          <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="11"/>
          <Interior/>
          <NumberFormat/>
          <Protection/>
        </Style>
        <Style ss:ID="sTitle">
          <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="18" ss:Bold="1" ss:Color="#1C1917"/>
        </Style>
        <Style ss:ID="sSubtitle">
          <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="12" ss:Bold="1" ss:Color="#B68D40"/>
        </Style>
        <Style ss:ID="sHeader">
          <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
          <Borders>
            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
          </Borders>
          <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
          <Interior ss:Color="#B68D40" ss:Pattern="Solid"/>
        </Style>
        <Style ss:ID="sCell">
          <Borders>
            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
          </Borders>
          <Alignment ss:Vertical="Center" ss:Horizontal="Left" ss:Indent="1"/>
        </Style>
        <Style ss:ID="sAmount">
          <Borders>
            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
          </Borders>
          <Alignment ss:Vertical="Center" ss:Horizontal="Right" ss:Indent="1"/>
          <Font ss:Bold="1"/>
        </Style>
      </Styles>
      <Worksheet ss:Name="Journal de Caisse">
        <Table ss:ExpandedColumnCount="5" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="18">
          <Column ss:AutoFitWidth="0" ss:Width="110"/>
          <Column ss:AutoFitWidth="0" ss:Width="180"/>
          <Column ss:AutoFitWidth="0" ss:Width="100"/>
          <Column ss:AutoFitWidth="0" ss:Width="90"/>
          <Column ss:AutoFitWidth="0" ss:Width="60"/>
          
          <Row ss:AutoFitHeight="0" ss:Height="30">
            <Cell ss:StyleID="sTitle"><Data ss:Type="String">${title}</Data></Cell>
          </Row>
          <Row ss:AutoFitHeight="0">
            <Cell ss:StyleID="sSubtitle"><Data ss:Type="String">${subtitle}</Data></Cell>
          </Row>
          <Row ss:AutoFitHeight="0">
            <Cell><Data ss:Type="String">Recettes totales : ${totalRecettes}</Data></Cell>
          </Row>
          <Row ss:AutoFitHeight="0" ss:Height="10"/>

          <Row ss:AutoFitHeight="0" ss:Height="25">
            ${headers.map(h => `<Cell ss:StyleID="sHeader"><Data ss:Type="String">${h}</Data></Cell>`).join('')}
          </Row>
          
          ${rowsArr.map(row => `
            <Row ss:AutoFitHeight="0" ss:Height="20">
              <Cell ss:StyleID="sCell"><Data ss:Type="String">${row[0]}</Data></Cell>
              <Cell ss:StyleID="sCell"><Data ss:Type="String">${row[1]}</Data></Cell>
              <Cell ss:StyleID="sCell"><Data ss:Type="String">${row[2]}</Data></Cell>
              <Cell ss:StyleID="sAmount"><Data ss:Type="Number">${row[3]}</Data></Cell>
              <Cell ss:StyleID="sCell"><Data ss:Type="String">${row[4]}</Data></Cell>
            </Row>
          `).join('')}
        </Table>
      </Worksheet>
    </Workbook>`;

    const blob = new Blob([xmlHeader], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `journal_caisse_${activeRange.from}_au_${activeRange.to}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Feedback
    setShowExportSuccess(true);
    setTimeout(() => setShowExportSuccess(false), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 no-scrollbar">
      {/* Export Success Toast */}
      {showExportSuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-top-full duration-500">
           <div className="bg-[#1C1917] text-white px-8 py-4 rounded-[2rem] shadow-2xl border border-white/10 flex items-center gap-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                <ArrowUpRight className="w-4 h-4 rotate-45" />
              </div>
              <div className="flex flex-col">
                <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Export Réussi</p>
                <p className="text-[10px] text-[#A8A29E] font-medium italic font-serif">Le fichier est dans votre dossier Téléchargements.</p>
              </div>
           </div>
        </div>
      )}
      {/* ─── Header ─── */}
      <div className="px-4 py-8 border-b border-[#E7E5E4] bg-[#FAF9F6] rounded-[2.5rem] mb-6">
        <div className="flex flex-col xl:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-[#1C1917] rounded-3xl flex items-center justify-center shadow-2xl transform rotate-3">
              <Wallet className="w-7 h-7 text-[#B68D40]" />
            </div>
            <div>
              <h2 className="text-4xl font-serif italic text-[#1C1917] tracking-tight mb-1">Livre de Caisse</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E]">Journal Financier Expert</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex p-1 bg-white rounded-2xl border border-[#E7E5E4] shadow-sm">
              {[
                { id: '7days', label: '7J' },
                { id: '30days', label: '30J' },
                { id: '90days', label: '90J' },
                { id: 'year', label: 'Année' },
                { id: 'custom', label: 'Perso.' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as FilterType)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300",
                    filter === f.id ? "bg-[#1C1917] text-white shadow-lg" : "text-[#A8A29E] hover:text-[#1C1917]"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filter === 'custom' && (
              <div className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-2xl border border-[#E7E5E4] animate-in slide-in-from-right-4 duration-300 shadow-sm">
                 <Calendar className="w-3 h-3 text-[#B68D40]" />
                 <input 
                   type="date" 
                   value={dateRange.from}
                   onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                   className="text-[10px] font-bold bg-transparent outline-none" 
                 />
                 <span className="text-[10px] text-[#A8A29E]">-</span>
                 <input 
                   type="date" 
                   value={dateRange.to}
                   onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                   className="text-[10px] font-bold bg-transparent outline-none" 
                 />
              </div>
            )}

            <button 
              onClick={handleExport}
              disabled={payments.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-[#B68D40] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 px-4">
        {/* ─── Summary Stats ─── */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-[#1C1917] rounded-[2.5rem] p-8 text-white shadow-2xl relative group">
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-700 overflow-hidden pointer-events-none">
                <TrendingUp className="w-32 h-32" />
              </div>
              <div className="flex items-center justify-between mb-6">
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#B68D40]">Total Récolté</p>
                <ChartInfo title="Flux de Caisse" description="C'est le montant total de l'argent factuellement encaissé sur la période." />
              </div>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-4xl font-serif italic">{(stats.total || 0).toLocaleString()}</span>
                <span className="text-sm font-bold text-[#B68D40]/60">{CURRENCY}</span>
              </div>
              <div className="space-y-4">
                 <div className="flex items-center justify-between py-3 border-t border-white/5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E]">Panier Moyen</span>
                    <span className="text-xs font-serif italic text-white">{(Math.round(stats.avg || 0)).toLocaleString()} {CURRENCY}</span>
                 </div>
                 <div className="flex items-center justify-between py-3 border-t border-white/5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E]">Transaction Vol.</span>
                    <span className="text-xs font-serif italic text-white">{stats.count} unités</span>
                 </div>
              </div>
           </div>

           <div className="bg-white border border-[#E7E5E4] rounded-[2.5rem] p-8 shadow-sm h-[320px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-4 h-4 text-[#B68D40]" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E]">Visualisation Flux</p>
                </div>
                <ChartInfo title="Flux" description="Activité quotidienne." />
              </div>
              <div className="flex-1 w-full flex items-end gap-1 px-1">
                 {chartData.map((d, i) => {
                    const max = Math.max(...chartData.map(cd => cd.amount), 1);
                    const height = d.amount === 0 ? 2 : Math.max((d.amount / max) * 100, 4);
                    return (
                      <div 
                        key={i} 
                        className={cn("flex-1 rounded-t-[3px] transition-all duration-1000 group relative", d.amount > 0 ? "bg-[#B68D40]" : "bg-[#B68D40]/5")}
                        style={{ height: `${height}%` }}
                      >
                         <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-[#1C1917] text-white text-[9px] px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-50 pointer-events-none">
                            <p className="font-serif italic text-white mb-0.5">{(d.amount || 0).toLocaleString()} {CURRENCY}</p>
                            <p className="text-[7px] uppercase font-black tracking-widest opacity-40">{format(parseISO(d.date), 'EEEE d MMMM', { locale: fr })}</p>
                         </div>
                      </div>
                    );
                 })}
              </div>
              <div className="mt-6 flex justify-between">
                 <div className="flex flex-col">
                   <span className="text-[8px] text-[#A8A29E] font-black uppercase tracking-widest leading-none mb-1">Début</span>
                   <span className="text-[10px] font-serif italic">{format(parseISO(activeRange.from), 'd MMM', { locale: fr })}</span>
                 </div>
                 <div className="flex flex-col items-end">
                   <span className="text-[8px] text-[#A8A29E] font-black uppercase tracking-widest leading-none mb-1">Fin</span>
                   <span className="text-[10px] font-serif italic">{format(parseISO(activeRange.to), 'd MMM', { locale: fr })}</span>
                 </div>
              </div>
           </div>
        </div>

        {/* ─── Ledger Detail ─── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E]">Registre des Opérations</p>
             <div className="flex items-center gap-4">
                <div className="relative group w-full sm:w-64">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D6D3D1] group-focus-within:text-[#B68D40] transition-colors" />
                   <input 
                      type="text"
                      placeholder="Chercher client, montant..."
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-white border border-[#E7E5E4] rounded-full py-2 pl-10 pr-4 text-[11px] focus:outline-none focus:ring-4 focus:ring-[#B68D40]/5 focus:border-[#B68D40]/30 transition-all font-medium font-sans"
                   />
                </div>
                <p className="text-[9px] font-medium text-[#78716C] whitespace-nowrap">
                   <span className="font-black text-[#1C1917]">{filteredPayments.length}</span> résultats
                </p>
             </div>
          </div>

          {isLoading ? (
            <div className="bg-white border border-dashed border-[#E7E5E4] rounded-[2.5rem] py-32 flex flex-col items-center justify-center">
               <div className="w-10 h-10 border-2 border-[#B68D40] border-t-transparent rounded-full animate-spin mb-4" />
               <p className="text-[9px] font-black uppercase tracking-widest text-[#A8A29E]">Mise à jour...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="bg-white border border-[#E7E5E4] rounded-[2.5rem] py-32 text-center">
               <Search className="w-10 h-10 text-[#D6D3D1] mx-auto mb-6" />
               <h3 className="text-2xl font-serif italic mb-2">Aucun résultat</h3>
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E]">Nous n'avons trouvé aucune transaction pour "{searchTerm || 'cette période'}".</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3">
                {paginatedPayments.map((p, idx) => (
                  <div key={p.id} className="group flex items-center justify-between bg-white border border-[#E7E5E4] rounded-[2rem] p-6 hover:shadow-2xl hover:border-[#B68D40]/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 no-select" style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-500">
                         {p.model_image ? <img src={p.model_image} className="w-full h-full object-cover object-top" /> : <Shirt className="w-8 h-8 text-[#D6D3D1] m-6 opacity-20" />}
                      </div>
                      <div className="space-y-1.5">
                         <div className="flex items-center gap-3">
                            <p className="text-3xl font-serif italic text-[#1C1917] tracking-tight">{(p.amount || 0).toLocaleString()} <span className="text-[12px] uppercase font-black not-italic opacity-20 ml-1">{CURRENCY}</span></p>
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-[#1C1917] text-white px-2.5 py-1 rounded-lg shadow-sm">{p.method}</span>
                         </div>
                         <p className="text-[11px] text-[#78716C] font-medium">De <span className="font-bold text-[#1C1917] uppercase tracking-wider">{p.client_name || 'Inconnu'}</span> <span className="mx-2 opacity-20">|</span> <span className="text-[#A8A29E] font-black uppercase tracking-widest text-[9px]">Ref CMD-{p.order_id.slice(0, 4)}</span></p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 pr-4">
                      <div className="flex items-center gap-2 text-[#A8A29E]">
                         <Calendar className="w-3 h-3" />
                         <span className="text-[8px] font-black uppercase tracking-[0.2em]">{format(parseISO(p.payment_date), 'd MMMM yyyy', { locale: fr })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#D6D3D1]">
                         <Clock className="w-3 h-3" />
                         <span className="text-[10px] font-bold tracking-widest">{format(parseISO(p.payment_date), 'HH:mm')}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#B68D40] opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 mt-1" />
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-12 mb-8">
                  <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="w-12 h-12 rounded-full bg-white border border-[#E7E5E4] flex items-center justify-center text-[#78716C] hover:bg-[#1C1917] hover:text-white transition-all disabled:opacity-10 shadow-sm active:scale-90"><ChevronLeft className="w-6 h-6 -ml-0.5" /></button>
                  <div className="flex items-center gap-4 bg-white px-8 py-3 rounded-full border border-[#E7E5E4] shadow-sm">
                    <div className="flex items-center gap-2">
                       <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[#B68D40]">Page</span>
                       <span className="text-lg font-serif italic text-[#1C1917] leading-none">{currentPage}</span>
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[#A8A29E]">sur</span>
                    <span className="text-lg font-serif italic text-[#1C1917] leading-none">{totalPages}</span>
                  </div>
                  <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="w-12 h-12 rounded-full bg-white border border-[#E7E5E4] flex items-center justify-center text-[#78716C] hover:bg-[#1C1917] hover:text-white transition-all disabled:opacity-10 shadow-sm active:scale-90"><ChevronRight className="w-6 h-6 ml-0.5" /></button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
