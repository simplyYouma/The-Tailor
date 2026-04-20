/**
 * 🧵 ToastContainer — Affichage des notifications
 */
import { useUIStore } from '@/store/uiStore';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none w-80">
      {toasts.map((toast) => {
        let Icon = Info;
        let colorClass = 'text-blue-500 bg-blue-50 border-blue-100';
        
        if (toast.type === 'success') {
          Icon = CheckCircle;
          colorClass = 'text-green-600 bg-green-50 border-green-100';
        } else if (toast.type === 'warning' || toast.type === 'error') {
          Icon = AlertTriangle;
          colorClass = 'text-red-600 bg-red-50 border-red-100';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-lg border animate-in slide-in-from-right-4 fade-in duration-300 ${colorClass}`}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-bold flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-black/5 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
