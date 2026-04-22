import { ShieldCheck, Mail, Phone, AlertTriangle, Scale, Lock } from 'lucide-react';

export function SecurityLicenseView() {
  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
      
      {/* ─── Top Header ─── */}
      <header className="border-b border-border/60 pb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-4">
          Propriété Intellectuelle
        </p>
        <h1 className="text-5xl md:text-6xl font-serif text-foreground leading-tight">
          Contrat De Licence & Conditions
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
        
        {/* ─── Main Content (Left) ─── */}
        <div className="lg:col-span-7 space-y-16">
          
          {/* Section: Préambule Légal */}
          <section className="space-y-8">
            <div className="flex items-center gap-3">
              <Scale className="w-5 h-5 text-foreground/40" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground">
                Préambule Légal
              </h2>
            </div>
            
            <div className="relative pl-12 py-1 border-l border-foreground/10">
              <p className="text-lg font-serif italic text-foreground/80 leading-relaxed">
                "Le présent contrat régit l'utilisation du logiciel de gestion The Tailor. L'installation, l'accès ou l'utilisation de ce système par l'établissement client atteste de l'acceptation pleine et entière des présentes conditions."
              </p>
            </div>
          </section>

          {/* Section: Clause de Non-Partage */}
          <section className="space-y-10">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-foreground/40" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground">
                Clause de Non-Partage & Protection
              </h2>
            </div>

            <div className="space-y-10">
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground">
                  1. Exclusivité du Logiciel
                </h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed font-medium">
                  Ce logiciel est fourni sous forme d'abonnement pour l'usage exclusif de l'établissement détenteur de la licence. Tout partage de code source, de fichiers d'installation, ou d'accès utilisateur avec des tiers non autorisés (autres salons, consultants externes, ou particuliers) constitue une violation grave du contrat.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground">
                  2. Propriété Intellectuelle
                </h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed font-medium">
                  The Tailor demeure la propriété exclusive du développeur original. Toute tentative de rétro-ingénierie, de de-compilation ou de modification logicielle sans autorisation écrite fera l'objet de poursuites judiciaires conformément aux lois sur le droit d'auteur.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground">
                  3. Utilisation Vaut Acceptation
                </h3>
                <p className="text-[13px] italic text-muted-foreground leading-relaxed font-medium">
                  Le simple fait de disposer du logiciel sur ses terminaux prouve l'acceptation expresse des termes de ce contrat. L'abonnement est personnel et non transmissible sans accord express du propriétaire.
                </p>
              </div>
            </div>
          </section>

          {/* Warning Banner */}
          <div className="p-10 bg-[#F5F5F5] rounded-[3rem] border border-black/5 flex gap-8 items-start">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
              <AlertTriangle className="w-6 h-6 text-brand-red stroke-[2.5]" />
            </div>
            <div className="space-y-4 pt-2">
              <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground">
                Avis de Sanction
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium italic">
                Le non-respect de ces clauses entraîne la suspension immédiate de la licence sans préavis ni remboursement, ainsi que la désactivation à distance du système de gestion pour protéger les intérêts du propriétaire.
              </p>
            </div>
          </div>
        </div>

        {/* ─── Sidebar (Right) ─── */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Owner Info Card */}
          <div className="bg-[#0A0A0A] text-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl space-y-12 md:space-y-16">
            <div className="space-y-3 md:space-y-4">
              <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.6em] text-white/30">
                Contact Propriétaire
              </p>
              <h2 className="text-3xl md:text-4xl font-serif italic text-white leading-tight">Youba Sokona</h2>
            </div>

            <div className="space-y-8 md:space-y-10">
              {/* Mail Field */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 group min-w-0">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-black transition-all duration-500">
                  <Mail className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] text-white/30 truncate">E-mail Officiel</p>
                  <p className="text-xs md:text-sm font-bold tracking-tight break-all sm:break-normal truncate hover:text-white/80 transition-colors">
                    contact@youbasokona.com
                  </p>
                </div>
              </div>

              {/* Phone Field */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 group min-w-0">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-black transition-all duration-500">
                  <Phone className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] text-white/30 truncate">Ligne Directe</p>
                  <p className="text-xs md:text-sm font-bold tracking-tight truncate">+223 70 00 00 00</p>
                </div>
              </div>
            </div>

            {/* Elite Status Card Tiny */}
            <div className="p-6 md:p-8 bg-white/5 rounded-[1.5rem] md:rounded-[2rem] border border-white/10 space-y-4">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/60" />
                </div>
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] truncate">Statut Elite</p>
              </div>
              <p className="text-[10px] md:text-xs text-white/40 italic leading-relaxed">
                Système de gestion tactique protégé par cryptage dynamique des licences.
              </p>
            </div>
          </div>

          {/* Legal Validation Card */}
          <div className="p-16 border border-black/10 rounded-[3rem] bg-white text-center space-y-8 shadow-[0_40px_80px_rgba(0,0,0,0.03)]">
            <p className="text-[9px] font-black uppercase tracking-[0.5em] text-muted-foreground">
              Validité Contractuelle
            </p>
            <div className="space-y-4">
              <p className="text-5xl font-serif italic text-foreground tracking-tight">Conforme</p>
              <div className="w-16 h-[1px] bg-black/10 mx-auto mt-10 mb-6" />
              <p className="text-[11px] font-black uppercase tracking-[0.6em] text-muted-foreground">
                Usage Autorisé
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

