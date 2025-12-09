import React from 'react';
import { ViewState } from '../types';
import { Trophy, ListOrdered, Sparkles, CalendarCheck, Swords, UserPlus } from 'lucide-react';

interface DashboardProps {
  onChangeView: (view: ViewState) => void;
  currentUser?: string | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ onChangeView, currentUser }) => {
  const options = [
    {
      id: ViewState.MATCHDAY,
      title: 'Jornadas',
      subtitle: 'Fase Regular (1-11)',
      icon: Swords, 
      color: 'text-blue-500',
      border: 'hover:border-blue-500',
      bg: 'hover:bg-blue-500/10'
    },
    {
      id: ViewState.RANKING,
      title: 'Clasificación 2026',
      subtitle: 'Ordena los 12 equipos',
      icon: ListOrdered,
      color: 'text-gray-300',
      border: 'hover:border-gray-300',
      bg: 'hover:bg-gray-300/10'
    },
    {
      id: ViewState.PLAYOFFS,
      title: 'Playoffs',
      subtitle: 'Cuadro final',
      icon: Trophy,
      color: 'text-[#c8aa6e]',
      border: 'hover:border-[#c8aa6e]',
      bg: 'hover:bg-[#c8aa6e]/10'
    },
    {
      id: ViewState.CRYSTAL_BALL,
      title: 'Bola de Cristal',
      subtitle: 'Predicciones especiales',
      icon: Sparkles,
      color: 'text-purple-400',
      border: 'hover:border-purple-400',
      bg: 'hover:bg-purple-400/10'
    },
    {
      id: ViewState.FANTASY,
      title: 'Fantasy Team',
      subtitle: 'Crea tu alineación ideal',
      icon: UserPlus,
      color: 'text-[#0ac8b9]', // Cyan for Fantasy
      border: 'hover:border-[#0ac8b9]',
      bg: 'hover:bg-[#0ac8b9]/10'
    },
    {
      id: ViewState.RESULTS,
      title: 'Resultados',
      subtitle: 'Historial y puntos',
      icon: CalendarCheck,
      color: 'text-green-400',
      border: 'hover:border-green-400',
      bg: 'hover:bg-green-400/10'
    }
  ];

  return (
    <div className="px-4 py-8 animate-in slide-in-from-bottom-8 duration-500 pb-20">
      <h2 className="text-2xl font-bold text-center mb-8 text-[#f0e6d2] uppercase tracking-widest">
        Panel de Control
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onChangeView(option.id)}
            className={`
              relative group flex flex-col items-center justify-center p-6 h-48
              bg-[#091428]/80 backdrop-blur border border-gray-700 rounded-xl 
              transition-all duration-300 shadow-xl
              ${option.border} ${option.bg}
              hover:shadow-[0_0_20px_rgba(0,0,0,0.5)]
              hover:-translate-y-1
            `}
          >
            <div className={`mb-4 p-3 rounded-full bg-[#0a1428] border border-gray-700 group-hover:scale-110 transition-transform ${option.color}`}>
              <option.icon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#f0e6d2] mb-1 uppercase tracking-wide">{option.title}</h3>
            <p className="text-gray-500 text-xs group-hover:text-gray-300 transition-colors">{option.subtitle}</p>
            
            {/* Corner Accents */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className={`w-2 h-2 rounded-full animate-pulse bg-current ${option.color}`}></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};