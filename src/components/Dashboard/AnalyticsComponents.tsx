import React, { useState } from 'react';
import { Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 🧵 ChartInfo — Bouton d'information subtil avec popup explicative
 */
export function ChartInfo({ title, description }: { title: string; description: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block ml-2">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="text-[#D6D3D1] hover:text-[#B68D40] transition-colors p-1"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[60] cursor-default" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-8 right-0 w-64 bg-[#1C1917] text-white p-4 rounded-2xl shadow-2xl z-[70] animate-in zoom-in-95 duration-200 origin-top-right">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-[#B68D40]">{title}</h5>
              <button onClick={() => setIsOpen(false)}><X className="w-3 h-3" /></button>
            </div>
            <p className="text-[11px] leading-relaxed text-[#A8A29E] font-medium">
              {description}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * 🧵 StatCard — Carte KPI version Data Scientist
 */
export function StatCard({ label, value, subLabel, icon, trend, info }: { 
  label: string; 
  value: string; 
  subLabel?: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  info?: string;
}) {
  return (
    <div className="bg-white border border-[#E7E5E4] p-8 rounded-[2rem] shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group relative">
      <div className="flex items-start justify-between mb-8">
        <div className="w-12 h-12 bg-[#FAF9F6] rounded-2xl flex items-center justify-center text-[#B68D40] border border-[#E7E5E4] group-hover:scale-110 transition-transform duration-500">
           {icon}
        </div>
        {info && <ChartInfo title={label} description={info} />}
      </div>
      
      <div className="space-y-1">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#A8A29E]">{label}</p>
        <div className="flex items-baseline gap-3">
           <h3 className="text-3xl font-serif italic text-[#1C1917] tracking-tight">{value}</h3>
           {trend && (
             <span className={cn(
               "text-[10px] font-bold px-2 py-0.5 rounded-full",
               trend.positive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
             )}>
               {trend.positive ? '+' : '-'}{trend.value}%
             </span>
           )}
        </div>
        {subLabel && <p className="text-[10px] font-medium text-[#78716C] mt-1">{subLabel}</p>}
      </div>
    </div>
  );
}
