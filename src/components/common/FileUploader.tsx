/**
 * 🧵 FileUploader — Import de fichiers premium (Drag & Drop)
 */
import { useState, useRef } from 'react';
import { Upload, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';

interface FileUploaderProps {
  value: string[]; // Base64 strings
  onChange: (files: string[]) => void;
  maxFiles?: number;
  className?: string;
}

export function FileUploader({ value = [], onChange, maxFiles = 5, className }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useUIStore((s) => s.addToast);

  const handleFiles = async (files: FileList | File[]) => {
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    
    if (value.length + newFiles.length > maxFiles) {
      addToast(`Limite de ${maxFiles} photos atteinte.`, 'warning');
      return;
    }

    const readAsBase64 = (file: File): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    };

    const base64Results = await Promise.all(newFiles.map(readAsBase64));
    onChange([...value, ...base64Results]);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (index: number) => {
    const newVal = [...value];
    newVal.splice(index, 1);
    onChange(newVal);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Zone de Drop / Sélection */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative group cursor-pointer border-2 border-dashed rounded-[2.5rem] p-10 transition-all duration-500 flex flex-col items-center justify-center text-center",
          isDragging 
            ? "border-[#B68D40] bg-[#B68D40]/5 scale-[0.99] shadow-inner" 
            : "border-[#E7E5E4] bg-[#FAF9F6] hover:border-[#D4A574] hover:bg-white hover:shadow-xl hover:shadow-black/5"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-500",
          isDragging ? "bg-[#B68D40] text-white rotate-12" : "bg-white text-[#D6D3D1] group-hover:text-[#B68D40] group-hover:rotate-12 shadow-sm"
        )}>
          <Upload className="w-6 h-6" />
        </div>

        <h4 className="text-sm font-bold text-[#1C1917] mb-1">
          {isDragging ? "Déposez vos photos ici" : "Cliquez ou glissez vos photos"}
        </h4>
        <p className="text-[10px] uppercase font-black tracking-widest text-[#A8A29E]">
          JPG, PNG — Max {maxFiles} fichiers
        </p>
      </div>

      {/* Prévisualisations */}
      {value.length > 0 && (
        <div className="grid grid-cols-5 gap-3">
          {value.map((src, idx) => (
            <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-[#E7E5E4] group animate-in zoom-in-50 duration-300">
              <img src={src} alt="Preview" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(idx);
                }}
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          ))}
          {value.length < maxFiles && (
            <button
               type="button"
               onClick={() => fileInputRef.current?.click()}
               className="aspect-square rounded-2xl border border-dashed border-[#E7E5E4] flex items-center justify-center text-[#D6D3D1] hover:text-[#B68D40] hover:border-[#B68D40] hover:bg-[#B68D40]/5 transition-all"
            >
               <Plus className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
