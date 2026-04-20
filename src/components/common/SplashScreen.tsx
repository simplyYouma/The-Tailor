import { useEffect, useState, useRef } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

const MARKETING_TEXTS = [
  "La précision au service de votre élégance.",
  "Chaque point de couture raconte une histoire.",
  "Le futur de la haute couture est entre vos mains.",
  "Gérez vos commandes avec la finesse d'un maître tailleur.",
  "La technologie rencontre le savoir-faire traditionnel.",
  "Optimisez votre atelier, sublimez vos créations.",
  "Des mesures parfaites pour un tombé impeccable.",
  "Ne perdez plus jamais le fil de vos commandes.",
  "L'excellence digitale pour les artisans du style.",
  "Votre créativité mérite le meilleur outil de gestion.",
  "Domptez le Bazin, maîtrisez votre planning.",
  "Le compagnon idéal pour chaque coup de ciseaux.",
  "Élégance, Performance, Tradition.",
  "Simplifiez votre quotidien, focalisez sur l'art.",
  "Chaque détail compte, chaque commande est unique.",
  "L'atelier intelligent pour une mode d'exception.",
  "Vos clients méritent une expérience sur-mesure.",
  "Gagnez en temps, gagnez en prestige.",
  "La signature des plus grands tailleurs.",
  "Réinventez votre passion avec The Tailor.",
  "Parce que votre talent n'a pas de limites.",
  "L'harmonie parfaite entre l'aiguille et le code.",
  "Le sur-mesure numérique pour vos créations physiques.",
  "Sublimez l'art du vêtement avec une gestion parfaite.",
  "L'élégance du Mali entre vos mains.",
  "Une vision signée Youma pour la couture malienne.",
  "Le savoir-faire de Bamako, la puissance du digital.",
  "The Tailor : L'excellence malienne sur-mesure.",
  "Par Youma, pour les maîtres du style au Mali.",
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

export function SplashScreen() {
  const platform_name = useSettingsStore(s => s.platform_name);
  const [isVisible, setIsVisible] = useState(true);
  const [currentText, setCurrentText] = useState("");
  const [fadeStatus, setFadeStatus] = useState<'in'|'out'>('in');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const lastPosRef = useRef<{x: number, y: number} | null>(null);
  
  // Montage initial : choisir un premier texte aléatoire
  useEffect(() => {
    setCurrentText(MARKETING_TEXTS[Math.floor(Math.random() * MARKETING_TEXTS.length)]);
  }, []);

  // Timer de disparition globale
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 5500); // Un peu plus long pour lire les textes
    return () => clearTimeout(timer);
  }, []);

  // Carousel de textes marketing (Random)
  useEffect(() => {
    const interval = setInterval(() => {
      setFadeStatus('out');
      setTimeout(() => {
        // Sélection aléatoire d'un nouveau texte différent du précédent
        let nextText;
        do {
          nextText = MARKETING_TEXTS[Math.floor(Math.random() * MARKETING_TEXTS.length)];
        } while (nextText === currentText);
        
        setCurrentText(nextText);
        setFadeStatus('in');
      }, 400);
    }, 1200); 

    return () => clearInterval(interval);
  }, [currentText]);

  // Canvas Animation
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
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#B68D40';
        ctx.setLineDash([15, 12]); // Espacement couture plus large et aéré

        for (let i = 1; i < points.length; i++) {
          const opacity = Math.max(0, 1 - points[i].age / 80);
          ctx.beginPath();
          ctx.moveTo(points[i-1].x, points[i-1].y);
          ctx.lineTo(points[i].x, points[i].y);
          ctx.globalAlpha = opacity;
          ctx.stroke();
        }
      }

      // Vieillissement des points
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

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white overflow-hidden animate-out fade-out duration-1000 delay-[5000ms] fill-mode-forwards cursor-crosshair">
      {/* Background subtil texture "lin" */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#1C1917 0.8px, transparent 0.8px)', backgroundSize: '32px 32px' }} />
      
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 pointer-events-none" 
      />

      <div className="z-10 flex flex-col items-center select-none pointer-events-none text-center px-6">
        <h1 className="text-7xl font-serif italic tracking-tighter text-[#1C1917] mb-8 drop-shadow-sm animate-in fade-in zoom-in duration-1000">
          {platform_name}
        </h1>

        {/* Carousel de textes marketing */}
        <div className="h-12 flex items-center justify-center max-w-lg">
            <p className={`text-base text-[#78716C] font-serif italic transition-all duration-400 transform ${fadeStatus === 'in' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
               {currentText}
            </p>
        </div>
      </div>
    </div>
  );
}
