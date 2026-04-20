import { ShieldCheck, Info, Quote, Award, Fingerprint } from 'lucide-react';

export function SecurityLicenseView() {
  return (
    <div className="max-w-4xl space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* ─── Majestic Header ─── */}
      <header className="relative py-8 border-b border-[#E7E5E4]/60">
        <div className="absolute -top-4 -left-4 w-12 h-12 bg-[#B68D40]/5 rounded-full blur-2xl" />
        <h3 className="text-4xl font-serif italic text-[#1C1917] tracking-tight leading-none">
          Propriété Fatoumata Y. Sokona
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mt-6">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#B68D40] flex items-center gap-2">
            fysokona@gmail.com <span className="opacity-30">•</span> +223 90041369
          </p>
          <div className="h-px flex-1 bg-gradient-to-r from-[#E7E5E4] to-transparent opacity-50" />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* ─── Main Document Section ─── */}
        <div className="lg:col-span-7 space-y-12">
          
          {/* Official Accord Card */}
          <div className="relative bg-white border border-[#E7E5E4] rounded-[3rem] p-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.03)] overflow-hidden group">
            {/* Subtle Watermark */}
            <ShieldCheck className="absolute -bottom-8 -right-8 w-48 h-48 text-[#FAF9F6] -rotate-12 transition-transform duration-1000 group-hover:rotate-0" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-10 h-10 bg-[#1C1917] rounded-xl flex items-center justify-center text-[#B68D40] shadow-lg shadow-black/10">
                  <Fingerprint className="w-5 h-5 stroke-[1.5]" />
                </div>
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1C1917]">Protocole d'Usage Atelier</h4>
              </div>

              <div className="space-y-8 text-sm text-[#78716C] leading-relaxed">
                <section>
                  <p className="font-serif italic text-[15px] text-[#1C1917] mb-2 font-medium">Article I : Œuvre Protégée</p>
                  <p className="font-medium text-[13px]">
                    Le présent système "The Tailor" constitue une œuvre de l'esprit, développée sur mesure pour les artisans de la haute couture. Sa structure, son code et son interface sont régis par les lois internationales de propriété intellectuelle.
                  </p>
                </section>

                <div className="relative py-8 px-10 bg-[#FAF9F6] rounded-[2rem] border-l-2 border-[#B68D40]/30 overflow-hidden">
                  <Quote className="absolute top-4 right-6 w-12 h-12 text-[#1C1917]/5 -scale-x-100" />
                  <p className="relative z-10 italic text-[#1C1917] font-serif text-[14px] leading-relaxed">
                    L'utilisateur s'engage formellement au respect de l'unicité de cette licence. Le partage, la reproduction ou l'exploitation tiers sans l'accord explicite du créateur est strictement prohibé sous peine de révocation immédiate de l'accès.
                  </p>
                </div>

                <section>
                  <p className="font-serif italic text-[15px] text-[#1C1917] mb-2 font-medium">Article II : Engagement de Confidentialité</p>
                  <p className="font-medium text-[13px]">
                    L'utilisation sur cette machine engage la responsabilité du détenteur. Chaque déploiement est unique et certifié pour un usage strictement professionnel au sein de l'unité de confection enregistrée.
                  </p>
                </section>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Sidebar info / Label ─── */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Premium Label Initiative */}
          <div className="p-10 bg-[#1C1917] rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
             {/* Decorative lines (tailor's tape feel) */}
             <div className="absolute top-0 right-10 w-0.5 h-full bg-[#B68D40]/5" />
             <div className="absolute top-0 right-12 w-0.5 h-full bg-[#B68D40]/5" />
             
             {/* National Colors (Sober accent) */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 flex h-1 w-20">
               <div className="flex-1 bg-[#009A44]" />
               <div className="flex-1 bg-[#FCD116]" />
               <div className="flex-1 bg-[#CE1126]" />
             </div>
             
             <div className="relative z-10">
               <div className="flex justify-between items-start mb-12">
                 <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-[#B68D40] backdrop-blur-md border border-white/10 group-hover:bg-[#B68D40] group-hover:text-white transition-colors duration-500">
                   <Award className="w-6 h-6 stroke-[1.2]" />
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Certification</p>
                    <p className="text-[12px] font-serif italic text-[#B68D40]">Elite Edition</p>
                 </div>
               </div>

                <div className="space-y-6">
                  <div>
                     <h5 className="text-[13px] font-black uppercase tracking-widest text-white mb-2">Fatoumata Y. Sokona</h5>
                     <div className="h-px w-8 bg-[#B68D40] mb-6" />
                  </div>
                 <p className="text-[11px] text-white/50 leading-loose uppercase tracking-[0.1em] font-medium">
                   Artisanat numérique Malien au service des maîtres tailleurs. Chaque point de code est assemblé avec rigueur pour élever les standards de la gestion artisanale.
                 </p>
               </div>

               <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between">
                 <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-6 h-6 bg-white/5 rounded-full border border-white/10" />
                    ))}
                 </div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-[#B68D40]">Propriété Fatoumata Y. Sokona</p>
               </div>
             </div>
          </div>

          {/* Simple Protection Info Box */}
          <div className="p-8 border border-[#E7E5E4] rounded-[2.5rem] bg-[#FAF9F6]/50 flex items-start gap-4">
            <Info className="w-5 h-5 text-[#B68D40] mt-0.5 opacity-40" />
            <p className="text-[10px] text-[#A8A29E] leading-relaxed uppercase font-black tracking-widest">
              L'intégrité de la licence est vérifiée périodiquement via le protocole de sécurité Hub pour garantir la pérennité de votre Atelier.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
