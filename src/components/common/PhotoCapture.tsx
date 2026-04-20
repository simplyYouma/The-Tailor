/**
 * 🧵 PhotoCapture — Composant réutilisable pour import/capture photo
 * Utilisé pour : portrait client, photo tissu, photo modèle catalogue.
 */
import React, { useRef } from 'react';
import { Camera, ImagePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoCaptureProps {
  value: string | null;
  onChange: (path: string | null) => void;
  placeholder?: string;
  className?: string;
  rounded?: boolean;
}

export function PhotoCapture({
  value,
  onChange,
  placeholder = 'Ajouter une photo',
  className,
  rounded = false,
}: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className={cn(
        'relative group cursor-pointer overflow-hidden border-2 border-dashed border-[#E7E5E4] hover:border-[#B68D40]/40 transition-all duration-300',
        rounded ? 'rounded-full' : 'rounded-3xl',
        value ? 'border-solid border-[#E7E5E4]' : '',
        className
      )}
    >
      {value ? (
        <>
          <img
            src={value}
            alt="Photo"
            className={cn('w-full h-full object-cover', rounded ? 'rounded-full' : 'rounded-3xl')}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <Camera className="w-6 h-6 text-white" />
            <button
              onClick={handleRemove}
              className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-red-500/80 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-[#A8A29E] group-hover:text-[#B68D40] transition-colors p-6">
          <ImagePlus className="w-8 h-8 mb-2 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-center">{placeholder}</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
