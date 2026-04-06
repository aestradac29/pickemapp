// ──────────────────────────────────────────────────────────────────────────────
// Toast — sistema de notificaciones no bloqueantes
//
// Uso:
//   const { toast } = useToast();
//   toast.success('Guardado');
//   toast.error('Algo falló');
//   toast.info('Información');
//
//   // En el JSX del componente:
//   <ToastContainer />
// ──────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback, useRef, createContext, useContext } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastAPI {
  success: (msg: string) => void;
  error:   (msg: string) => void;
  warning: (msg: string) => void;
  info:    (msg: string) => void;
}

// Icono y colores por tipo
const CONFIG: Record<ToastType, { icon: React.ElementType; border: string; bg: string; text: string; iconColor: string }> = {
  success: { icon: CheckCircle2, border: 'border-green-500/40',  bg: 'bg-green-900/20',  text: 'text-green-200',  iconColor: 'text-green-400'  },
  error:   { icon: AlertCircle,  border: 'border-red-500/40',    bg: 'bg-red-900/20',    text: 'text-red-200',    iconColor: 'text-red-400'    },
  warning: { icon: AlertTriangle,border: 'border-yellow-500/40', bg: 'bg-yellow-900/20', text: 'text-yellow-100', iconColor: 'text-yellow-400' },
  info:    { icon: Info,         border: 'border-blue-500/40',   bg: 'bg-blue-900/20',   text: 'text-blue-200',   iconColor: 'text-blue-400'   },
};

const ToastContext = createContext<{ toast: ToastAPI } | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const add = useCallback((message: string, type: ToastType) => {
    const id = ++counter.current;
    setItems(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setItems(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const remove = useCallback((id: number) => {
    setItems(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast: ToastAPI = {
    success: (msg) => add(msg, 'success'),
    error:   (msg) => add(msg, 'error'),
    warning: (msg) => add(msg, 'warning'),
    info:    (msg) => add(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer items={items} remove={remove} />
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}

const ToastContainer: React.FC<{ items: ToastItem[], remove: (id: number) => void }> = ({ items, remove }) => (
    <div className="fixed top-20 right-4 z-[200] flex flex-col gap-2 pointer-events-none max-w-xs w-full">
      {items.map(item => {
        const cfg  = CONFIG[item.type];
        const Icon = cfg.icon;
        return (
          <div
            key={item.id}
            className={`
              flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md
              shadow-2xl pointer-events-auto
              animate-in slide-in-from-right-4 fade-in duration-300
              ${cfg.bg} ${cfg.border}
            `}
          >
            <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.iconColor}`} />
            <p className={`text-sm font-medium leading-snug flex-1 ${cfg.text}`}>{item.message}</p>
            <button
              onClick={() => remove(item.id)}
              className="flex-shrink-0 text-gray-500 hover:text-white transition-colors mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
);
