/**
 * 🧵 MultiPhotoCapture — Capture de plusieurs photos pour une galerie
 */
import { useRef, useState } from 'react';
import { Camera, X, Plus } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

interface MultiPhotoCaptureProps {
  value: string[]; // Tableau de chaînes Base64
  onChange: (base64Images: string[]) => void;
  className?: string;
  maxPhotos?: number;
}

export function MultiPhotoCapture({ value = [], onChange, className = '', maxPhotos = 5 }: MultiPhotoCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const addToast = useUIStore((s) => s.addToast);

  const startCamera = async () => {
    try {
      if (value.length >= maxPhotos) {
          addToast(`Vous avez atteint la limite de ${maxPhotos} photos.`, 'warning');
          return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCapturing(true);
    } catch (err) {
      console.error('Erreur accès caméra:', err);
      addToast('Impossible d\'accéder à la caméra.', 'error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      onChange([...value, dataUrl]);
      stopCamera();
    }
  };

  const removePhoto = (index: number) => {
    const newVal = [...value];
    newVal.splice(index, 1);
    onChange(newVal);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Galerie des photos prises */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((src, idx) => (
            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-[#E7E5E4] group">
              <img src={src} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-600/90 hover:bg-red-700 text-white rounded-full flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {value.length < maxPhotos && (
            <button
              type="button"
              onClick={startCamera}
              className="aspect-square rounded-xl border border-dashed border-[#B68D40] bg-[#B68D40]/5 flex flex-col items-center justify-center text-[#B68D40] hover:bg-[#B68D40]/10 transition-colors"
            >
              <Plus className="w-6 h-6 mb-1" />
              <span className="text-[9px] font-black uppercase tracking-widest">Ajouter</span>
            </button>
          )}
        </div>
      )}

      {/* Bouton de capture initial ou vue caméra */}
      {!isCapturing && value.length === 0 && (
        <div className="w-full aspect-[4/3] relative rounded-2xl overflow-hidden bg-[#FAF9F6] border border-[#E7E5E4] flex flex-col items-center justify-center group">
          <Camera className="w-8 h-8 text-[#A8A29E] mb-3 group-hover:scale-110 transition-transform" />
          <button
            type="button"
            onClick={startCamera}
            className="px-6 py-2 bg-[#1C1917] text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-md hover:scale-105 transition-all"
          >
            Prendre une photo
          </button>
        </div>
      )}

      {isCapturing && (
        <div className="w-full aspect-[4/3] relative rounded-2xl overflow-hidden bg-black">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <div className="absolute bottom-6 left-0 right-0 gap-4 flex justify-center">
            <button
              type="button"
              onClick={stopCamera}
              className="w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <button
              type="button"
              onClick={takePhoto}
              className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-4 border-white/20 bg-clip-padding cursor-pointer hover:scale-105 transition-transform"
            >
              <div className="w-12 h-12 bg-white rounded-full" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
