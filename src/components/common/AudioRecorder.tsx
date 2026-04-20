/**
 * 🧵 AudioRecorder — Enregistrement de notes vocales
 */
import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Play, Pause } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

interface AudioRecorderProps {
  value: string | null; // Base64 audio string
  onChange: (base64Audio: string | null) => void;
  className?: string;
  variant?: 'default' | 'compact';
  readOnly?: boolean;
}

export function AudioRecorder({ value, onChange, className = '', variant = 'default', readOnly = false }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioElementRef.current) {
         audioElementRef.current.pause();
         audioElementRef.current.src = '';
      }
    };
  }, []);

  useEffect(() => {
      // Re-initialize audio element if value changes
      if (value) {
          if (!audioElementRef.current) {
              audioElementRef.current = new Audio(value);
          } else {
              audioElementRef.current.src = value;
          }
          audioElementRef.current.onended = () => {
              setIsPlaying(false);
              setProgress(0);
          };
          audioElementRef.current.ontimeupdate = () => {
              if (audioElementRef.current && audioElementRef.current.duration) {
                  setProgress((audioElementRef.current.currentTime / audioElementRef.current.duration) * 100);
              }
          };
      } else {
        if (audioElementRef.current) {
            audioElementRef.current.pause();
            audioElementRef.current.src = '';
            setIsPlaying(false);
            setProgress(0);
        }
      }
  }, [value]);


  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            onChange(reader.result);
          }
        };
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied or error:', err);
      useUIStore.getState().addToast('Impossible d\'accéder au microphone. Veuillez autoriser l\'accès.', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const togglePlay = () => {
    if (!audioElementRef.current || !value) return;

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!value) {
    if (variant === 'compact') {
      if (isRecording) {
        return (
          <div className={`flex items-center gap-2 bg-red-50 text-red-600 rounded-full px-3 py-1.5 ${className}`}>
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
             <span className="text-xs font-mono font-medium min-w-[36px]">{formatTime(recordingTime)}</span>
             <button onClick={stopRecording} className="ml-1 hover:text-red-800 p-1">
                <Square className="w-3.5 h-3.5 fill-current" />
             </button>
          </div>
        );
      }
      return (
        <button
          onClick={startRecording}
          type="button"
          className={`flex-shrink-0 w-10 h-10 flex items-center justify-center text-[#78716C] hover:text-[#B68D40] hover:bg-[#FAF9F6] rounded-full transition-all ${className}`}
        >
          <Mic className="w-5 h-5" />
        </button>
      );
    }

    return (
      <div className={`p-4 bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl flex items-center justify-between ${className}`}>
        <div className="flex items-center gap-3">
          {isRecording ? (
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center animate-pulse">
              <Mic className="w-5 h-5 text-red-600" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#E7E5E4] flex items-center justify-center">
              <Mic className="w-5 h-5 text-[#78716C]" />
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-[#1C1917]">
              {isRecording ? 'Enregistrement...' : 'Ajouter une note vocale'}
            </p>
            <p className="text-[10px] uppercase font-black tracking-widest text-[#A8A29E]">
              {isRecording ? formatTime(recordingTime) : 'Instructions audio'}
            </p>
          </div>
        </div>

        {isRecording ? (
          <button
            onClick={stopRecording}
            type="button"
            className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-700 transition"
          >
            <Square className="w-4 h-4 fill-white" />
          </button>
        ) : (
          <button
            onClick={startRecording}
            type="button"
            className="w-10 h-10 bg-[#B68D40] text-white rounded-full flex items-center justify-center shadow-md hover:bg-[#9A7535] transition"
          >
            <Mic className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // Audio Recorded State
  if (variant === 'compact') {
     return (
       <div className={`flex items-center gap-2 bg-[#B68D40]/10 text-[#B68D40] rounded-full pl-1 pr-2 py-1 ${className}`}>
          <button onClick={togglePlay} className="w-6 h-6 flex items-center justify-center bg-[#B68D40] text-white rounded-full hover:bg-[#9A7535]">
             {isPlaying ? <Pause className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-white ml-0.5" />}
          </button>
          
          <div className="w-16 h-1.5 bg-black/10 rounded-full overflow-hidden">
             <div className="h-full bg-[#B68D40] transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
          </div>

          {!readOnly && (
            <button onClick={() => onChange(null)} className="ml-1 hover:text-red-500 p-1 text-[#78716C]">
               <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
       </div>
     );
  }

  // Audio Recorded State
  return (
    <div className={`p-4 bg-white border border-[#B68D40] rounded-2xl flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#B68D40]/10 flex items-center justify-center">
            <Mic className="w-4 h-4 text-[#B68D40]" />
          </div>
          <p className="text-xs font-bold text-[#1C1917]">Note vocale enregistrée</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-red-500 hover:text-red-700 p-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="w-10 h-10 bg-[#1C1917] hover:bg-black text-white rounded-full flex items-center justify-center transition-colors shadow-md flex-shrink-0"
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
        </button>
        
        <div className="flex-1 h-2 bg-[#E7E5E4] rounded-full overflow-hidden">
          <div 
             className="h-full bg-[#B68D40] transition-all duration-100 ease-linear"
             style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
