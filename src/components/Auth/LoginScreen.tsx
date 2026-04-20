import React, { useState, useEffect, useRef } from 'react';
import { User as UserIcon, Lock, ChevronRight, ChevronLeft, Shield, Award, Package, Delete } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getUsers } from '@/services/authService';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

const MARKETING_TEXTS = [
  "La précision au service de votre élégance.",
  "Chaque point de couture raconte une histoire.",
  "Le futur de la haute couture est entre vos mains.",
  "Gérez vos commandes avec la finesse d'un maître tailleur.",
  "La technologie rencontre le savoir-faire traditionnel.",
  "Optimisez votre atelier, sublimez vos créations.",
  "Des mesures parfaites pour un tombé impeccable.",
  "L'excellence digitale pour les artisans du style.",
  "Votre créativité mérite le meilleur outil de gestion.",
  "Le compagnon idéal pour chaque coup de ciseaux.",
  "Élégance, Performance, Tradition.",
  "Simplifiez votre quotidien, focalisez sur l'art.",
  "Vos clients méritent une expérience sur-mesure.",
  "La signature des plus grands tailleurs.",
  "Réinventez votre passion avec The Tailor.",
  "L'harmonie parfaite entre l'aiguille et le code.",
  "Le sur-mesure numérique pour vos créations physiques.",
  "Sublimez l'art du vêtement avec une gestion parfaite.",
  "L'élégance du Mali entre vos mains.",
  "Une vision signée Youma pour la couture malienne.",
  "Le savoir-faire de Bamako, la puissance du digital.",
  "The Tailor : L'excellence malienne sur-mesure.",
  "Par Youma, pour les maîtres du style au Mali.",
  "Sublimer le Bazin avec l'intelligence de Youma.",
  "L'innovation au cœur de l'artisanat malien.",
  "Redéfinir la mode malienne avec précision et passion.",
  "Le génie créatif de Youma au service de votre atelier.",
  "Honorer la tradition, embrasser la modernité malienne."
];

interface Point {
  x: number;
  y: number;
  age: number;
}

export const LoginScreen: React.FC = () => {
  const platform_name = useSettingsStore(s => s.platform_name);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorStatus, setErrorStatus] = useState<'invalid' | 'blocked' | 'maintenance' | null>(null);
  
  // Marketing Texts State (Carousel)
  const [currentText, setCurrentText] = useState("");
  const [fadeStatus, setFadeStatus] = useState<'in'|'out'>('in');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const lastPosRef = useRef<{x: number, y: number} | null>(null);

  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    getUsers().then(data => {
      // Pour un équilibre visuel : placer l'admin au milieu de la liste si possible
      const adminIdx = data.findIndex(u => u.role === 'admin');
      let reordered = [...data];
      
      if (adminIdx !== -1 && data.length >= 3) {
        // Déplacer l'admin à l'index 1 (milieu visuel pour 3 items)
        const admin = reordered.splice(adminIdx, 1)[0];
        reordered.splice(Math.floor(reordered.length / 2), 0, admin);
      }
      
      setUsers(reordered);
      
      const newAdminIdx = reordered.findIndex(u => u.role === 'admin');
      if (newAdminIdx !== -1) {
        setCurrentIndex(newAdminIdx);
      }
    }).catch(console.error);
    
    // Init random text
    setCurrentText(MARKETING_TEXTS[Math.floor(Math.random() * MARKETING_TEXTS.length)]);
  }, []);

  // Marketing Text Carousel Effect
  useEffect(() => {
    const interval = setInterval(() => {
      setFadeStatus('out');
      setTimeout(() => {
        let nextText;
        do {
          nextText = MARKETING_TEXTS[Math.floor(Math.random() * MARKETING_TEXTS.length)];
        } while (nextText === currentText);
        
        setCurrentText(nextText);
        setFadeStatus('in');
      }, 400);
    }, 2800); 

    return () => clearInterval(interval);
  }, [currentText]);

  // Canvas Animation Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const handleMouseMove = (e: MouseEvent) => {
      const newPos = { x: e.clientX, y: e.clientY };
      if (!lastPosRef.current || 
          Math.hypot(newPos.x - lastPosRef.current.x, newPos.y - lastPosRef.current.y) > 8) {
        pointsRef.current.push({ ...newPos, age: 0 });
        lastPosRef.current = newPos;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const points = pointsRef.current;
      if (points.length > 1) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = '#B68D40';
        ctx.setLineDash([12, 10]); 

        for (let i = 1; i < points.length; i++) {
          const opacity = Math.max(0, 1 - points[i].age / 80);
          ctx.beginPath();
          ctx.moveTo(points[i-1].x, points[i-1].y);
          ctx.lineTo(points[i].x, points[i].y);
          ctx.globalAlpha = opacity;
          ctx.stroke();
        }
      }

      pointsRef.current = points
        .map(p => ({ ...p, age: p.age + 1.2 }))
        .filter(p => p.age < 80);

      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handlePinPress = (digit: string) => {
    if (pin.length < 4) {
      setError(false);
      const newPin = pin + digit;
      setPin(newPin);
      
      if (newPin.length === 4) {
        handleConfirm(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
    setErrorStatus(null);
  };

  const handleConfirm = async (finalPin: string) => {
    if (!selectedUser) return;
    setLoading(true);
    const result = await login(selectedUser.id, finalPin);
    setLoading(false);
    
    if (result !== 'success') {
      setError(true);
      setErrorStatus(result);
      setPin('');
      
      // Auto-clear error after a few seconds
      setTimeout(() => {
          setError(false);
          setErrorStatus(null);
      }, 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#FAF9F6] flex flex-col items-center justify-center p-6 overflow-hidden cursor-crosshair">
      {/* Background subtil texture "lin" */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#1C1917 0.8px, transparent 0.8px)', backgroundSize: '32px 32px' }} />
      
      {/* Couture Canvas Animation */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <div className="z-10 w-full max-w-lg flex flex-col items-center">
        {!selectedUser ? (
          /* User Selection View */
          <div className="w-full animate-in fade-in zoom-in-95 duration-1000">
            <div className="text-center mb-12 sm:mb-16">
              <h1 className="text-6xl sm:text-7xl font-serif italic text-[#1C1917] mb-6 tracking-tighter animate-in fade-in duration-1000">
                 {platform_name}
              </h1>
              
              {/* Marketing Texts Carousel (Like Splash Screen) */}
              <div className="h-10 flex items-center justify-center max-w-lg mx-auto">
                <p className={cn(
                    "text-sm sm:text-base text-[#78716C] font-serif italic transition-all duration-400 transform",
                    fadeStatus === 'in' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                )}>
                  {currentText}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E] mb-10">Sélectionner votre profil</h2>
              
              <div className="relative w-screen left-1/2 right-1/2 -ml-[50vw] +mr-[50vw] flex items-center">
                {/* Horizontal Fade Masks */}
                <div className="absolute inset-y-0 left-0 w-48 bg-gradient-to-r from-[#FAF9F6] to-transparent z-20 pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-48 bg-gradient-to-l from-[#FAF9F6] to-transparent z-20 pointer-events-none" />

                {/* Navigation Arrows */}
                {currentIndex > 0 && (
                   <button 
                     onClick={() => setCurrentIndex(prev => prev - 1)}
                     className="absolute left-10 z-30 w-14 h-14 bg-white/70 backdrop-blur-md border border-[#E7E5E4] rounded-full flex items-center justify-center text-[#1C1917] shadow-xl hover:border-[#B68D40] hover:text-[#B68D40] transition-all active:scale-90"
                   >
                     <ChevronLeft className="w-6 h-6" />
                   </button>
                )}
                {currentIndex < users.length - 1 && (
                   <button 
                     onClick={() => setCurrentIndex(prev => prev + 1)}
                     className="absolute right-10 z-30 w-14 h-14 bg-white/70 backdrop-blur-md border border-[#E7E5E4] rounded-full flex items-center justify-center text-[#1C1917] shadow-xl hover:border-[#B68D40] hover:text-[#B68D40] transition-all active:scale-90"
                   >
                     <ChevronRight className="w-6 h-6" />
                   </button>
                )}

                <div className="w-full overflow-hidden">
                  <div 
                    className="flex transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
                    style={{ transform: `translateX(calc(50vw - 10rem - ${currentIndex * (20 + 2)}rem))` }}
                  >
                    {users.map((u, i) => (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUser(u)}
                        className={cn(
                          "flex-shrink-0 w-80 group bg-white/60 backdrop-blur-sm border p-8 rounded-[3rem] flex items-center gap-6 transition-all duration-700 mx-4",
                          i === currentIndex 
                            ? "border-[#B68D40] shadow-[0_40px_80px_rgba(182,141,64,0.12)] scale-100 opacity-100" 
                            : "border-[#E7E5E4] scale-90 opacity-40 blur-[1px]"
                        )}
                      >
                        <div className="w-16 h-16 bg-[#F5F5F4] rounded-full flex items-center justify-center text-[#B68D40] group-hover:bg-[#B68D40] group-hover:text-white transition-colors overflow-hidden border border-transparent group-hover:border-white shadow-sm ring-4 ring-transparent group-hover:ring-[#B68D40]/10">
                          {u.avatar_path ? (
                              <img src={u.avatar_path} alt="" className="w-full h-full object-cover" />
                          ) : (
                              <UserIcon className="w-7 h-7" />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="font-serif italic text-2xl leading-tight text-[#1C1917]">{u.full_name}</p>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B68D40] mt-1.5 flex items-center gap-2">
                             {u.role === 'admin' ? (
                               <>
                                 <Shield className="w-3 h-3" />
                                 Coordinateur Admin
                               </>
                             ) : u.role === 'manager' ? (
                               <>
                                 <Award className="w-3 h-3" />
                                 Maître Gérant
                               </>
                             ) : (
                               <>
                                 <Package className="w-3 h-3" />
                                 Équipe Confection
                               </>
                             )}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* PIN Pad View */
          <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Back link */}
            <button 
              onClick={() => { setSelectedUser(null); setPin(''); setError(false); }}
              className="absolute top-10 left-10 flex items-center gap-2 text-[#78716C] hover:text-[#1C1917] transition-colors group cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Retour</span>
            </button>

            <div className="text-center mb-12">
                <div className="w-24 h-24 rounded-full mx-auto mb-6 p-1 border-2 border-[#E7E5E4] relative group">
                    <div className="w-full h-full bg-[#F5F5F4] rounded-full flex items-center justify-center overflow-hidden shadow-inner translate-z-0">
                        {selectedUser.avatar_path ? (
                            <img src={selectedUser.avatar_path} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <UserIcon className="w-10 h-10 text-[#B68D40]" />
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#1C1917] rounded-full flex items-center justify-center text-white border-2 border-[#FAF9F6] shadow-lg">
                        <Lock className="w-4 h-4" />
                    </div>
                </div>
                <h2 className="text-3xl font-serif italic mb-1 text-[#1C1917]">{selectedUser.full_name}</h2>
                {errorStatus === 'blocked' && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500 animate-pulse">Compte Suspendu</p>
                )}
                {errorStatus === 'maintenance' && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#B68D40] animate-pulse">Atelier en maintenance. Revenez bientôt.</p>
                )}
                {!errorStatus || errorStatus === 'invalid' ? (
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#B68D40]">Saisir votre Code PIN</p>
                ) : null}
            </div>

            {/* PIN Indicators */}
            <div className={cn("flex justify-center gap-5 mb-14", error && "animate-shake")}>
              {[0, 1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-4 h-4 rounded-full border-2 transition-all duration-300",
                    pin.length > i 
                      ? "bg-[#1C1917] border-[#1C1917] scale-125 shadow-lg shadow-black/10" 
                      : error ? "border-red-500 scale-110" : "border-[#E7E5E4]"
                  )}
                />
              ))}
            </div>

            {/* PIN Pad */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handlePinPress(String(num))}
                  disabled={loading}
                  className="h-16 w-16 mx-auto rounded-full text-xl font-bold border border-[#E7E5E4] hover:border-[#1C1917] hover:bg-white bg-white/40 backdrop-blur-sm transition-all active:scale-90 flex items-center justify-center shadow-sm hover:shadow-md"
                >
                  {num}
                </button>
              ))}
              <div />
              <button
                onClick={() => handlePinPress('0')}
                disabled={loading}
                className="h-16 w-16 mx-auto rounded-full text-xl font-bold border border-[#E7E5E4] hover:border-[#1C1917] hover:bg-white bg-white/40 backdrop-blur-sm transition-all active:scale-90 flex items-center justify-center shadow-sm hover:shadow-md"
              >
                0
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="h-16 w-16 mx-auto rounded-full flex items-center justify-center text-[#78716C] hover:text-[#1C1917] transition-colors active:scale-90"
              >
                <Delete className="w-6 h-6" />
              </button>
            </div>

            {error && (
                <p className="text-center text-red-500 text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-1">
                    Accès refusé. PIN incorrect.
                </p>
            )}
          </div>
        )}
      </div>

      {/* Footer Signature */}
      <div className="absolute bottom-10 left-0 right-0 text-center opacity-40 pointer-events-none select-none">
         <p className="text-[10px] font-serif italic text-[#1C1917]">Système créé par Fatoumata Y Sokona</p>
      </div>

      <style>{`
          @keyframes shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-8px); }
              75% { transform: translateX(8px); }
          }
          .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};
