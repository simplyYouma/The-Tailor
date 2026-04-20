/**
 * 🧵 TopModelsWidget — Classement des modèles les plus commandés
 */
import { useEffect, useState } from 'react';
import { Crown, Shirt } from 'lucide-react';
import { getTopModels } from '@/services/statsService';
import { CURRENCY } from '@/types/constants';

export function TopModelsWidget() {
  const [models, setModels] = useState<{ name: string; count: number; price_ref: number; image_paths: string }[]>([]);

  useEffect(() => {
    getTopModels(5).then(setModels).catch(console.error);
  }, []);

  const maxCount = Math.max(...models.map((m) => m.count), 1);

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-[2rem] p-8 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#FAF9F6] rounded-xl flex items-center justify-center border border-[#E7E5E4]">
          <Crown className="w-5 h-5 text-[#B68D40]" />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#A8A29E]">Top Modèles</p>
          <p className="text-sm font-bold text-[#1C1917]">Les plus commandés</p>
        </div>
      </div>

      {/* List */}
      {models.length === 0 ? (
        <div className="text-center py-8">
          <Shirt className="w-8 h-8 text-[#E7E5E4] mx-auto mb-3" />
          <p className="text-[9px] font-black uppercase tracking-widest text-[#D6D3D1]">Aucune donnée</p>
        </div>
      ) : (
        <div className="space-y-4">
          {models.map((model, i) => {
            const barWidth = (model.count / maxCount) * 100;
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
            
            let firstImage = null;
            try {
              const paths = typeof model.image_paths === 'string' ? JSON.parse(model.image_paths) : model.image_paths;
              if (Array.isArray(paths) && paths.length > 0) firstImage = paths[0];
            } catch(e) {}

            return (
              <div key={model.name} className="group">
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-[#E7E5E4] bg-[#FAF9F6] flex-shrink-0 relative">
                    {firstImage ? (
                      <img src={firstImage} alt={model.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Shirt className="w-4 h-4 text-[#D6D3D1]" />
                      </div>
                    )}
                    {medal && (
                      <div className="absolute -top-1 -right-1 text-[12px] filter drop-shadow-sm">
                        {medal}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1C1917] truncate">{model.name}</p>
                    <p className="text-[9px] text-[#A8A29E] font-black uppercase tracking-widest">
                      {model.count} commande{model.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="ml-[3.25rem] flex items-center gap-3">
                  {/* Progress bar */}
                  <div className="flex-1 h-1.5 bg-[#F5F5F4] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#B68D40] to-[#D4A574]"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-[#B68D40] font-serif italic whitespace-nowrap">
                    {(model.price_ref || 0).toLocaleString()} {CURRENCY}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
