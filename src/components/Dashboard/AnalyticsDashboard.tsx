import { useEffect, useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  Activity, 
  Clock, 
  Wallet, 
  LayoutDashboard,
  AlertCircle,
  Shirt,
  Star
} from 'lucide-react';
import { StatCard, ChartInfo } from './AnalyticsComponents';
import { getDashboardStats, getRevenueComparison, getRevenueComparisonByYear } from '@/services/statsService';
import { CURRENCY } from '@/types/constants';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { DashboardStats } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * AnalyticsDashboard — Tableau de bord version Data Scientist
 */
export function AnalyticsDashboard({ stats: initialStats }: { stats: DashboardStats }) {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [revenuePeriod, setRevenuePeriod] = useState<7 | 30 | 90 | null>(7);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [hoveredStatus, setHoveredStatus] = useState<{ status: string; count: number } | null>(null);
  const refreshCounter = useUIStore((s) => s.refreshCounter);
  
  const [revenueData, setRevenueData] = useState<{ date: string; amount: number }[]>([]);
  const [previousData, setPreviousData] = useState<{ date: string; amount: number }[]>([]);
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(true);

  useEffect(() => {
    const filter = selectedYear ? { year: selectedYear } : { days: revenuePeriod || 30 };
    
    // Global Refresh (KPIs, Donut, etc.)
    getDashboardStats(filter).then(setStats).catch(console.error);
    
    setIsLoadingRevenue(true);

    if (selectedYear) {
      // Monthly mode for a specific year (YoY Comparison)
      getRevenueComparisonByYear(selectedYear).then(({ current, previous }) => {
        const formatM = (data: any[], y: number) => (data || []).map(d => ({
          date: `${y}-${(d.month || 1).toString().padStart(2, '0')}`,
          amount: d.amount || 0
        }));
        setRevenueData(formatM(current, selectedYear));
        setPreviousData(formatM(previous, selectedYear - 1));
        setIsLoadingRevenue(false);
      }).catch(console.error);
    } else {
      // Daily mode with comparison
      getRevenueComparison(revenuePeriod || 30).then(({ current, previous }) => {
        setRevenueData(current);
        setPreviousData(previous);
        setIsLoadingRevenue(false);
      }).catch(console.error);
    }
  }, [revenuePeriod, selectedYear, refreshCounter]);

  // Area Chart Calculations
  const chartConfig = useMemo(() => {
    let timeline: string[] = [];
    
    if (selectedYear) {
      // Months Jan-Dec
      timeline = Array.from({ length: 12 }, (_, i) => `${selectedYear}-${(i + 1).toString().padStart(2, '0')}`);
    } else {
      // Days
      const period = revenuePeriod || 30;
      timeline = Array.from({ length: period }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (period - 1 - i));
        return d.toISOString().split('T')[0];
      });
    }

    const currentFilled = timeline.map(t => {
      const found = revenueData.find(d => d.date?.startsWith(t));
      return { label: t, amount: found?.amount ?? 0 };
    });

    const previousFilled = timeline.map((t, idx) => {
      if (selectedYear) return { label: t, amount: 0 };
      // For daily comparison, we just need the previous N days. 
      // But we map them index-to-index for visual comparison
      const found = previousData[idx]; 
      return { label: t, amount: found?.amount ?? 0 };
    });

    const maxAmount = Math.max(...currentFilled.map(d => d.amount), ...previousFilled.map(d => d.amount), 1);
    
    const padding = 20;
    const width = 800;
    const height = 200;
    const step = (width - padding * 2) / (timeline.length - 1);

    const getPoints = (data: { amount: number }[]) => data.map((d, i) => ({
      x: padding + i * step,
      y: height - padding - (d.amount / maxAmount) * (height - padding * 2),
      amount: d.amount
    }));

    const currentPoints = getPoints(currentFilled);
    const prevPoints = getPoints(previousFilled);

    const buildPath = (pts: { x: number; y: number }[]) => pts.reduce((acc, p, i) => {
       if (i === 0) return `M ${p.x} ${p.y}`;
       const prev = pts[i-1];
       const cx = (prev.x + p.x) / 2;
       return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
    }, "");

    const linePath = buildPath(currentPoints);
    const areaPath = `${linePath} L ${currentPoints[currentPoints.length-1].x} ${height - padding} L ${currentPoints[0].x} ${height - padding} Z`;
    const prevLinePath = buildPath(prevPoints);

    return { currentPoints, prevPoints, linePath, areaPath, prevLinePath, timeline, maxAmount };
  }, [revenueData, previousData, revenuePeriod, selectedYear]);

  // Donut Chart Logic (Confection Lifecycle)
  const donutData = useMemo(() => {
    const total = Object.values(stats.statusDistribution).reduce((a, b) => a + b, 0) || 1;
    let cumulativePercent = 0;

    // Define colors for status (Yumi palette)
    const statusColors: Record<string, string> = {
      'Réception': '#D6D3D1',
      'Coupe': '#B68D40',
      'Couture': '#D4A574',
      'Essayage': '#E7E5E4',
      'Finition': '#A8A29E',
      'Prêt': '#1C1917',
      'Livré': '#10B981', // Emerald Green instead of black
      'Annulé': '#EF4444'
    };

    return Object.entries(stats.statusDistribution).map(([status, count]) => {
      const percent = (count / total) * 100;
      const start = cumulativePercent;
      cumulativePercent += percent;
      return { status, count, percent, start, color: statusColors[status] || '#E7E5E4' };
    });
  }, [stats.statusDistribution]);

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-12 animate-in fade-in duration-700">
      {/* Title / Period Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#E7E5E4] pb-10 gap-6">
        <div>
          <h2 className="text-4xl lg:text-5xl font-serif italic text-[#1C1917] tracking-tighter leading-none mb-3 decoration-[#B68D40] underline decoration-from-font underline-offset-8">
            Analyse de Performance.
          </h2>
          <p className="text-[#78716C] text-sm font-medium tracking-tight">Vue d'ensemble de la santé financière et opérationnelle de votre maison.</p>
        </div>

        <div className="flex bg-white/40 backdrop-blur-md p-1.5 rounded-[2rem] border border-white shadow-2xl shadow-[#B68D40]/5 items-center gap-1.5 self-center md:self-end">
           {/* Year Controls (Archive Mode) */}
           <div className={cn(
             "flex items-center bg-[#FAF9F6] rounded-full border border-[#E7E5E4] p-0.5 transition-opacity",
             revenuePeriod ? "opacity-40 grayscale-[0.5]" : "opacity-100"
           )}>
              <button 
                onClick={() => {
                   const y = selectedYear || new Date().getFullYear();
                   setSelectedYear(y - 1);
                   setRevenuePeriod(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white text-[#A8A29E] hover:text-[#B68D40] transition-all active:scale-90"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              
              <button
                onClick={() => {
                   setSelectedYear(new Date().getFullYear());
                   setRevenuePeriod(null);
                }}
                className={cn(
                   "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] transition-all",
                   selectedYear ? "bg-[#1C1917] text-white shadow-md scale-105" : "text-[#A8A29E] hover:text-[#1C1917]"
                )}
              >
                 {selectedYear ? selectedYear : "Archives"}
              </button>

              <button 
                disabled={!selectedYear || selectedYear >= new Date().getFullYear()}
                onClick={() => {
                   const next = (selectedYear || 0) + 1;
                   if (next <= new Date().getFullYear()) {
                      setSelectedYear(next);
                      setRevenuePeriod(null);
                   }
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white text-[#A8A29E] hover:text-[#B68D40] transition-all disabled:opacity-20 active:scale-90"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
           </div>

           {/* Divider */}
           <div className="w-[1px] h-4 bg-[#E7E5E4] mx-1" />

           {/* Recent Windows Mode */}
           <div className={cn(
             "flex gap-1 transition-opacity",
             selectedYear ? "opacity-40 grayscale-[0.5]" : "opacity-100"
           )}>
              {[7, 30, 90].map(p => (
                <button
                  key={p}
                  onClick={() => {
                     setRevenuePeriod(p as any);
                     setSelectedYear(null);
                  }}
                  className={cn(
                    "px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.15em] transition-all",
                    revenuePeriod === p ? "bg-[#1C1917] text-white shadow-md scale-105" : "text-[#A8A29E] hover:text-[#1C1917]"
                  )}
                >
                  {p}J
                </button>
              ))}
           </div>
        </div>
      </div>

      {/* KPI Insight Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Réussite" 
          value={`${stats.conversionRate}%`} 
          subLabel="Commandes livrées / TOTAL" 
          icon={<Users className="w-5 h-5" />} 
          info="C'est la part de vos commandes qui sont allées jusqu'au bout (livrées). Un chiffre élevé veut dire que vos clients récupèrent bien leurs vêtements et sont satisfaits."
        />
        <StatCard 
          label="Rapidité" 
          value={`${stats.avgDeliveryDays} Jours`} 
          subLabel="Temps moyen de confection" 
          trend={stats.avgDeliveryDaysTrend || undefined} 
          icon={<Clock className="w-5 h-5" />} 
          info="C'est le nombre de jours qu'il vous faut en moyenne pour finir un habit, du moment de la commande jusqu'à la remise du vêtement."
        />
        <StatCard 
          label="Valeur Création" 
          value={`${(stats.avgOrderValue || 0).toLocaleString()} ${CURRENCY}`} 
          subLabel="Gain moyen par commande" 
          trend={stats.avgOrderValueTrend || undefined} 
          icon={<TrendingUp className="w-5 h-5" />} 
          info="C'est l'argent que vous rapporte chaque commande en moyenne. Plus c'est haut, plus vos créations ont de la valeur."
        />
        <StatCard 
          label="Paiement Préféré" 
          value={stats.topPaymentMethod} 
          subLabel="Méthode la plus utilisée" 
          icon={<Wallet className="w-5 h-5" />} 
          info="C'est le moyen de paiement que vos clients utilisent le plus pour vous régler (Orange Money, Cash, etc.)."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Revenue Area Chart */}
        <div className="lg:col-span-2 bg-white border border-[#E7E5E4] rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-10">
             <div>
               <div className="flex items-center gap-2 mb-1">
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E]">Recettes {selectedYear ? selectedYear : `${revenuePeriod}J`}</p>
                 <ChartInfo title="Argent encaissé" description="Ce graphique montre comment votre argent rentre chaque jour. La partie colorée montre la masse totale d'argent que vous avez accumulée." />
               </div>
               <h3 className="text-3xl font-serif italic text-[#1C1917] tracking-tight">
                 {(stats.totalRevenuePeriod || 0).toLocaleString()} <span className="text-[#B68D40]">{CURRENCY}</span>
               </h3>
             </div>
             <div className="w-12 h-12 bg-[#FAF9F6] rounded-2xl flex items-center justify-center border border-[#E7E5E4] group-hover:rotate-12 transition-transform duration-500">
               <TrendingUp className="w-6 h-6 text-[#B68D40]" />
             </div>
          </div>

          <div className="h-64 relative bg-[#FAF9F6]/30 rounded-3xl border border-[#F5F5F4] p-4">
             {isLoadingRevenue ? (
               <div className="absolute inset-0 flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#B68D40] border-t-transparent rounded-full animate-spin" /></div>
             ) : (
                <svg viewBox="0 0 800 200" className="w-full h-full drop-shadow-2xl overflow-visible">
                  {/* Grid Lines */}
                  {[0, 0.5, 1].map(l => (
                    <line key={l} x1="20" y1={180 - l * 160} x2="780" y2={180 - l * 160} stroke="#E7E5E4" strokeWidth="1" strokeDasharray="4 4" />
                  ))}
                  
                  {/* Subtle Area Gradient */}
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#B68D40" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#B68D40" stopOpacity="0" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Previous Period Curve (Comparison) */}
                  {!selectedYear && (
                    <path 
                      d={chartConfig.prevLinePath} 
                      fill="none" 
                      stroke="#A8A29E" 
                      strokeWidth="2" 
                      strokeDasharray="6 4" 
                      strokeOpacity="0.3" 
                      className="animate-in fade-in duration-1000" 
                    />
                  )}

                  <path d={chartConfig.areaPath} fill="url(#areaGradient)" className="animate-in fade-in duration-1000" />
                  <path d={chartConfig.linePath} fill="none" stroke="#B68D40" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" className="animate-in slide-in-from-left duration-1000" />
                  
                  {/* Points / Tooltips */}
                  {chartConfig.currentPoints.filter((_, i) => (selectedYear ? true : ((revenuePeriod || 30) <= 7 ? true : i % Math.floor((revenuePeriod || 30)/7) === 0))).map((p, i) => {
                    const prevV = chartConfig.prevPoints[i]?.amount || 0;
                    const diff = prevV > 0 ? ((p.amount - prevV) / prevV) * 100 : 0;
                    const dateKey = chartConfig.timeline[i];
                    
                    let formattedDate = "";
                    try {
                      formattedDate = selectedYear 
                        ? format(parseISO(`${dateKey}-01`), 'MMMM', { locale: fr })
                        : format(parseISO(dateKey), 'EEEE d MMMM', { locale: fr });
                    } catch { 
                      formattedDate = dateKey; 
                    }

                    return (
                     <g key={i} className="group/dot cursor-pointer">
                        <circle cx={p.x} cy={p.y} r="5" fill="#B68D40" className="opacity-0 group-hover/dot:opacity-100 transition-opacity" />
                        <circle cx={p.x} cy={p.y} r="3" fill="white" stroke="#B68D40" strokeWidth="2" />
                        
                        <foreignObject x={p.x - 75} y={p.y - 130} width="150" height="120" className="opacity-0 group-hover/dot:opacity-100 transition-opacity pointer-events-none overflow-visible">
                           <div className="bg-[#1C1917] text-white p-3 rounded-2xl shadow-2xl border border-white/10 space-y-2 translate-y-3">
                              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-[#A8A29E] border-b border-white/5 pb-1 capitalize">
                                 {formattedDate}
                              </div>
                              <div className="flex items-center justify-between">
                                 <span className="text-[10px] font-serif italic text-white/50">Gain actuel</span>
                                 <span className="text-xs font-bold">{(p.amount || 0).toLocaleString()} CFA</span>
                               </div>
                               <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-serif italic text-white/50">
                                    {selectedYear ? "Année Précédente" : "Période Passée"}
                                  </span>
                                  <div className={cn("text-[10px] font-bold flex items-center gap-1", diff >= 0 ? "text-green-400" : "text-red-400")}>
                                     {diff >= 0 ? '↑' : '↓'} {Math.abs(Math.round(diff))}%
                                  </div>
                               </div>
                            </div>
                         </foreignObject>
                      </g>
                    );
                  })}
                </svg>
             )}
          </div>
          
          <div className="flex justify-between mt-6 px-4">
             {chartConfig.currentPoints.filter((_, i) => 
               selectedYear 
                 ? (i % 3 === 0 || i === 11) 
                 : (i === 0 || i === Math.floor((chartConfig.timeline.length-1)/2) || i === chartConfig.timeline.length - 1)
             ).map((p, i) => {
               const dateKey = chartConfig.timeline[chartConfig.currentPoints.indexOf(p)];
               return (
                 <span key={i} className="text-[9px] font-black uppercase tracking-widest text-[#D6D3D1]">
                    {selectedYear 
                      ? format(parseISO(`${dateKey}-01`), 'MMM', { locale: fr })
                      : format(parseISO(dateKey), 'd MMM', { locale: fr })}
                 </span>
               );
             })}
          </div>
        </div>

        {/* Donut Chart — Confection Status */}
        <div className="bg-white border border-[#E7E5E4] rounded-[2.5rem] p-10 shadow-sm flex flex-col items-center">
           <div className="w-full flex items-center justify-between mb-10">
              <div className="flex items-center gap-2">
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E]">Activités Atelier</p>
                 <ChartInfo title="Où en sont les habits ?" description="Un aperçu de l'étape où se trouve chaque commande. Ça vous aide à voir si un poste (comme la couture) est surchargé et a besoin d'aide." />
              </div>
              <Activity className="w-5 h-5 text-[#B68D40]/30" />
           </div>

           <div className="relative w-48 h-48 mb-8 group/donut">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                 {donutData.map((d) => {
                    const radius = 40;
                    const circumference = 2 * Math.PI * radius;
                    const isActive = hoveredStatus?.status === d.status;
                    
                    return (
                      <circle
                        key={d.status}
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke={d.color}
                        strokeWidth={isActive ? "16" : "12"}
                        strokeDasharray={circumference}
                        style={{ 
                           strokeDashoffset: - (d.start / 100) * circumference, 
                           strokeDasharray: `${(d.percent / 100) * circumference} ${circumference}`,
                           transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                           opacity: hoveredStatus && !isActive ? 0.3 : 1
                        }}
                        onMouseEnter={() => setHoveredStatus({ status: d.status, count: d.count })}
                        onMouseLeave={() => setHoveredStatus(null)}
                        className="cursor-pointer"
                        strokeLinecap="butt"
                      />
                    );
                 })}
                 <circle cx="50" cy="50" r="30" fill="white" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
                 <span className="text-3xl font-serif italic text-[#1C1917] transition-all duration-300">
                    {hoveredStatus ? hoveredStatus.count : stats.activeOrders}
                 </span>
                 <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#A8A29E] transition-all duration-300 leading-tight">
                    {hoveredStatus ? hoveredStatus.status : "En Cours"}
                 </span>
              </div>
           </div>

           <div className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-x-4 gap-y-3 w-full">
              {donutData.filter(d => d.count > 0).map(d => (
                <div 
                  key={d.status} 
                  className={cn(
                    "flex items-center gap-2 transition-all duration-300",
                    hoveredStatus?.status === d.status ? "opacity-100 scale-105" : hoveredStatus ? "opacity-30" : "opacity-100"
                  )}
                  onMouseEnter={() => setHoveredStatus({ status: d.status, count: d.count })}
                  onMouseLeave={() => setHoveredStatus(null)}
                >
                   <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                   <span className="text-[9px] font-black uppercase tracking-widest text-[#1C1917]">{d.status}</span>
                   <span className="text-[9px] font-bold text-[#A8A29E] ml-auto">{d.count}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Intelligence Textile & Styles */}
        <div className="bg-white border border-[#E7E5E4] rounded-[2.5rem] p-8 shadow-sm flex flex-col relative overflow-hidden">
           <div className="flex items-center justify-between mb-8">
              <div>
                 <h4 className="text-xl font-serif italic text-[#1C1917]">Tendances & Matières</h4>
                 <p className="text-[10px] font-black uppercase tracking-widest text-[#B68D40] mt-1 opacity-60">Styles Prisés</p>
              </div>
              <ChartInfo 
                title="Tendances de l'Atelier"
                description="Analyse des catégories de modèles et types de tissus les plus demandés sur la période sélectionnée."
              />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8">
              <div className="space-y-4">
                 <p className="text-[9px] font-black uppercase tracking-widest text-[#78716C]">Modèles Favoris</p>
                 <div className="space-y-3">
                    {Object.entries(stats.categoryDistribution || {}).sort((a,b) => b[1] - a[1]).slice(0, 3).map(([cat, count]) => (
                       <TrendProgress key={cat} label={cat} value={count} total={Object.values(stats.categoryDistribution || {}).reduce((a,b)=>a+b,0)} />
                    ))}
                    {Object.keys(stats.categoryDistribution || {}).length === 0 && <p className="text-[9px] text-[#D6D3D1] italic">En attente des tendances...</p>}
                 </div>
              </div>
              <div className="space-y-4">
                 <p className="text-[9px] font-black uppercase tracking-widest text-[#78716C]">Matières Prisées</p>
                 <div className="space-y-3">
                    {Object.entries(stats.fabricDistribution || {}).sort((a,b) => b[1] - a[1]).slice(0, 3).map(([fab, count]) => (
                       <TrendProgress key={fab} label={fab} value={count} total={Object.values(stats.fabricDistribution || {}).reduce((a,b)=>a+b,0)} color="#D4A574" />
                    ))}
                    {Object.keys(stats.fabricDistribution || {}).length === 0 && <p className="text-[9px] text-[#D6D3D1] italic">En attente des matières...</p>}
                 </div>
              </div>
           </div>

           {/* Galerie des Modèles du Catalogue */}
           {stats.topModelsPeriod && stats.topModelsPeriod.length > 0 && (
              <div className="pt-8 border-t border-[#F5F5F4] mt-auto">
                 <p className="text-[9px] font-black uppercase tracking-widest text-[#78716C] mb-4">Modèles Vedettes (Période)</p>
                 <div className="grid grid-cols-3 gap-4">
                    {stats.topModelsPeriod.slice(0, 3).map((m, i) => {
                       const images = m.image_paths ? JSON.parse(m.image_paths) : [];
                       const mainImg = images[0];
                       return (
                          <div key={i} className="group cursor-pointer">
                             <div className="aspect-[3/4] rounded-2xl bg-[#FAF9F6] border border-[#E7E5E4] overflow-hidden mb-3 relative">
                                {mainImg ? (
                                   <img src={mainImg} alt={m.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                   <div className="w-full h-full flex items-center justify-center">
                                      <Shirt className="w-6 h-6 text-[#D6D3D1]" />
                                   </div>
                                )}
                                <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded-full">
                                   <span className="text-[7px] font-black text-white">{m.count}x</span>
                                </div>
                             </div>
                             <p className="text-[10px] font-bold text-[#1C1917] truncate leading-tight mb-0.5">{m.name || 'Sans Nom'}</p>
                             <p className="text-[9px] font-black text-[#B68D40] uppercase tracking-tighter">{(m.price_ref || 0).toLocaleString()} {CURRENCY}</p>
                          </div>
                       );
                    })}
                 </div>
              </div>
           )}
        </div>

        {/* Intelligence Clients & Profils */}
        <div className="bg-white border border-[#E7E5E4] rounded-[2.5rem] p-8 shadow-sm flex flex-col">
           <div className="flex items-center justify-between mb-8">
              <div>
                 <h4 className="text-xl font-serif italic text-[#1C1917]">Profils & Fidélité</h4>
                 <p className="text-[10px] font-black uppercase tracking-widest text-[#B68D40] mt-1 opacity-60">Base Clientèle</p>
              </div>
              <ChartInfo 
                title="Analyse Client"
                description="Répartition de votre clientèle par genre, indice de fidélité et classement de vos ambassadeurs."
              />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-[0.8fr_1.2fr] gap-10 flex-1">
              <div className="space-y-10">
                 <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#78716C] mb-4">Répartition Genres</p>
                    <div className="space-y-4">
                        {(() => {
                           const male = stats.genderDistribution?.['Homme'] || 0;
                           const female = stats.genderDistribution?.['Femme'] || 0;
                           const total = (male + female) || 1;
                           const malePct = Math.round((male / total) * 100);
                           const femalePct = 100 - malePct;
                           return (
                              <div className="space-y-3">
                                 <div className="h-8 w-full rounded-2xl overflow-hidden flex border border-[#E7E5E4]/30 shadow-inner">
                                    <div 
                                       className="h-full bg-[#1C1917] transition-all duration-1000 flex items-center px-3" 
                                       style={{ width: `${malePct}%` }}
                                    >
                                       {malePct >= 20 && <span className="text-[9px] font-black text-white uppercase tracking-tighter shrink-0">H</span>}
                                    </div>
                                    <div 
                                       className="h-full bg-[#B68D40] transition-all duration-1000 flex items-center justify-end px-3" 
                                       style={{ width: `${femalePct}%` }}
                                    >
                                       {femalePct >= 20 && <span className="text-[9px] font-black text-white uppercase tracking-tighter shrink-0">F</span>}
                                    </div>
                                 </div>
                                 <div className="flex justify-between items-center px-1">
                                    <div className="flex items-center gap-1.5">
                                       <div className="w-2 h-2 rounded-full bg-[#1C1917]" />
                                       <span className="text-[10px] font-bold text-[#1C1917]">{malePct}% <span className="text-[#A8A29E] font-medium italic opacity-60">Homme</span></span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                       <span className="text-[10px] font-bold text-[#1C1917]"><span className="text-[#A8A29E] font-medium italic opacity-60 mr-1">Femme</span> {femalePct}%</span>
                                       <div className="w-2 h-2 rounded-full bg-[#B68D40]" />
                                    </div>
                                 </div>
                              </div>
                           );
                        })()}
                    </div>
                 </div>
                 
                 <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#78716C] mb-4">Fidélisation</p>
                    <div className="space-y-3">
                       {(stats.loyaltyDistribution || []).map((l, i) => (
                          <div key={l.label} className={cn(
                            "flex items-center justify-between p-3 rounded-2xl border border-transparent transition-all",
                            i === 0 ? "bg-[#FAF9F6] border-[#E7E5E4]" : ""
                          )}>
                             <span className="text-[11px] font-bold text-[#1C1917]">{l.label}</span>
                             <span className="text-[10px] font-black text-[#B68D40] bg-white px-2.5 py-1 rounded-full shadow-sm border border-[#E7E5E4]/50">{l.count}</span>
                          </div>
                       ))}
                       {(!stats.loyaltyDistribution || stats.loyaltyDistribution.length === 0) && <p className="text-[9px] text-[#D6D3D1] italic">Calcul en cours...</p>}
                    </div>
                 </div>

                 {/* NEW: Performance Insight Client (to fill gap) */}
                 <div className="p-5 bg-[#1C1917] rounded-3xl text-white relative overflow-hidden group">
                    <Star className="absolute -bottom-4 -right-4 w-16 h-16 text-white/5 group-hover:rotate-12 transition-transform duration-500" />
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Impact Client</p>
                    <p className="text-xl font-serif italic mb-1">{stats.totalClientsPeriod || 0} <span className="text-xs text-[#B68D40] font-sans font-black uppercase">Visiteurs</span></p>
                    <p className="text-[9px] text-[#A8A29E] leading-tight">Augmentation de l'engagement fidèle de la base.</p>
                 </div>
              </div>

              <div className="space-y-6">
                 <p className="text-[9px] font-black uppercase tracking-widest text-[#78716C] border-b border-[#F5F5F4] pb-2">Top Clients (Ambassadeurs)</p>
                 <div className="space-y-4">
                    {(stats.topClients || []).slice(0, 4).map((c, i) => (
                       <div key={i} className="flex items-center gap-4 p-3 hover:bg-[#FAF9F6] rounded-3xl transition-all group border border-transparent hover:border-[#E7E5E4]/50">
                          <div className="w-16 h-16 rounded-[1.25rem] bg-[#white] flex items-center justify-center text-sm font-black text-[#1C1917] shrink-0 overflow-hidden border-2 border-[#FAF9F6] shadow-md ring-1 ring-[#E7E5E4] group-hover:scale-105 transition-transform duration-500">
                             {c.portrait_path ? (
                                <img src={c.portrait_path} alt={c.name} className="w-full h-full object-cover" />
                             ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#1C1917] text-white font-serif italic text-xl">
                                   {(c.name || '?').charAt(0)}
                                </div>
                             )}
                          </div>
                          <div className="min-w-0 flex-1">
                             <p className="text-sm font-serif italic text-[#1C1917] mb-1 truncate leading-tight">{c.name || 'Inconnu'}</p>
                             <div className="flex items-center gap-2">
                                <span className="text-xs text-[#B68D40] font-black tracking-tight tabular-nums">{(c.total || 0).toLocaleString()} {CURRENCY}</span>
                                <div className="w-1 h-1 rounded-full bg-[#E7E5E4]" />
                                <span className="text-[9px] font-black text-[#A8A29E] uppercase tracking-widest">Premium</span>
                             </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#D6D3D1] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                       </div>
                    ))}
                    {(!stats.topClients || stats.topClients.length === 0) && (
                      <div className="py-20 text-center">
                        <Users className="w-10 h-10 text-[#D6D3D1] mx-auto opacity-20 mb-3" />
                        <p className="text-[9px] text-[#A8A29E] italic uppercase tracking-widest">Aucune donnée période</p>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Smart Alerts Center */}
      <div className="bg-[#1C1917] rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <LayoutDashboard className="w-48 h-48" />
         </div>
         
         <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="w-20 h-20 bg-[#B68D40] rounded-3xl flex items-center justify-center shadow-lg transform rotate-3">
               <AlertCircle className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
               <h4 className="text-xl font-serif italic mb-2 tracking-tight">Conseils de l'Atelier</h4>
               <p className="text-xs text-[#A8A29E] max-w-xl leading-relaxed">
                  D'après vos activités, vous avez {stats.activeOrders} commandes en cours. 
                  {stats.totalClientsPeriod > 0 && ` Bienvenue aux ${stats.totalClientsPeriod} nouveaux clients de la période ! `}
                  Pensez à surveiller l'étape de "{donutData[1]?.status || 'Couture'}" pour que personne ne soit bloqué.
               </p>
            </div>
            <div className="flex flex-col gap-3 min-w-[200px]">
               <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">Commandes en retard</span>
                  <span className={cn(
                    "text-sm font-serif italic",
                    stats.lateOrders > 0 ? "text-red-400" : "text-[#B68D40]"
                  )}>{stats.lateOrders}</span>
               </div>
               <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">Tissus en rupture</span>
                  <span className={cn(
                    "text-sm font-serif italic",
                    stats.outOfStockFabrics > 0 ? "text-red-400" : "text-[#B68D40]"
                  )}>{stats.outOfStockFabrics}</span>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

/** 📊 Mini-Barre de Progression Stylisée */
function TrendProgress({ label, value, total, color = "#B68D40" }: { label: string; value: number; total: number; color?: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
       <div className="flex justify-between items-end">
          <span className="text-[10px] font-bold text-[#1C1917] truncate max-w-[120px]">{label}</span>
          <span className="text-[9px] font-black text-[#A8A29E]">{value}</span>
       </div>
       <div className="h-1 bg-[#FAF9F6] rounded-full overflow-hidden border border-[#E7E5E4]/30">
          <div 
            className="h-full transition-all duration-1000 ease-out rounded-full" 
            style={{ width: `${pct}%`, backgroundColor: color }} 
          />
       </div>
    </div>
  );
}
