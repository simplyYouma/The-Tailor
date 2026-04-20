/**
 * 🧵 RevenueChart — Mini-graphique des revenus sur 7 jours
 * Rendu en SVG pur (pas de dépendance chart).
 */
import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { getRevenueByPeriod } from '@/services/statsService';
import { CURRENCY } from '@/types/constants';

export function RevenueChart() {
  const [data, setData] = useState<{ date: string; amount: number }[]>([]);

  useEffect(() => {
    getRevenueByPeriod(7).then(setData).catch(console.error);
  }, []);

  // Fill missing days
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const filled = last7.map((date) => {
    const found = data.find((d) => d.date === date);
    return { date, amount: found?.amount ?? 0 };
  });

  const max = Math.max(...filled.map((d) => d.amount), 1);
  const total = filled.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-[2rem] p-8 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#A8A29E]">Revenus 7 jours</p>
          <p className="text-2xl font-serif italic text-[#1C1917] mt-1">{(total || 0).toLocaleString()} {CURRENCY}</p>
        </div>
        <div className="w-10 h-10 bg-[#FAF9F6] rounded-xl flex items-center justify-center border border-[#E7E5E4]">
          <TrendingUp className="w-5 h-5 text-[#B68D40]" />
        </div>
      </div>

      {/* SVG Bar Chart */}
      <div className="flex items-end gap-2 h-32">
        {filled.map((d, i) => {
          const height = max > 0 ? (d.amount / max) * 100 : 0;
          const dayLabel = new Date(d.date).toLocaleDateString('fr-FR', { weekday: 'short' }).charAt(0).toUpperCase();
          const isToday = i === filled.length - 1;

          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
              {/* Bar */}
              <div className="w-full flex items-end justify-center h-24 relative group">
                {/* Tooltip */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1C1917] text-white text-[9px] font-bold px-2 py-1 rounded-lg whitespace-nowrap z-10">
                  {(d.amount || 0).toLocaleString()} {CURRENCY}
                </div>
                <div
                  className={`w-full max-w-[32px] rounded-lg transition-all duration-700 cursor-pointer hover:opacity-80 ${
                    isToday ? 'bg-[#B68D40]' : 'bg-[#E7E5E4]'
                  }`}
                  style={{
                    height: `${Math.max(height, 4)}%`,
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              </div>
              {/* Day label */}
              <span className={`text-[9px] font-black ${isToday ? 'text-[#B68D40]' : 'text-[#D6D3D1]'}`}>
                {dayLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
