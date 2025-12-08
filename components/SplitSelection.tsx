import React from 'react';
import { Snowflake, Sun, Flower2, ArrowRight } from 'lucide-react';

interface SplitSelectionProps {
  onSelect: (splitName: string) => void;
}

export const SplitSelection: React.FC<SplitSelectionProps> = ({ onSelect }) => {
  const splits = [
    {
      id: 'winter',
      name: 'Winter 2026',
      icon: Snowflake,
      color: 'from-blue-400 to-cyan-300',
      borderColor: 'border-blue-400',
      shadow: 'shadow-blue-500/20',
      // Official Splash Art: Snow Day Bard (Fits Winter Theme perfectly)
      bgImage: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Bard_1.jpg',
      status: 'En curso'
    },
    {
      id: 'spring',
      name: 'Spring 2026',
      icon: Flower2,
      color: 'from-emerald-400 to-green-300',
      borderColor: 'border-emerald-400',
      shadow: 'shadow-emerald-500/20',
      // Official Splash Art: Elderwood Ornn (Fits Spring/Forest Theme)
      bgImage: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ornn_2.jpg',
      status: 'Próximamente'
    },
    {
      id: 'summer',
      name: 'Summer 2026',
      icon: Sun,
      color: 'from-amber-400 to-orange-300',
      borderColor: 'border-amber-400',
      shadow: 'shadow-amber-500/20',
      // Official Splash Art: Pool Party Leona (Fits Summer Theme)
      bgImage: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Leona_4.jpg',
      status: 'Próximamente'
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 animate-in fade-in duration-700">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-white uppercase tracking-wider mb-3">
          Selecciona la Temporada
        </h2>
        <p className="text-gray-400">Elige el Split de la LEC en el que quieres competir</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-[1400px]">
        {splits.map((split) => (
          <button
            key={split.id}
            onClick={() => onSelect(split.name)}
            className={`
              group relative h-[400px] rounded-2xl overflow-hidden border-2 transition-all duration-500 hover:scale-105
              ${split.borderColor} ${split.shadow} shadow-2xl
            `}
          >
            {/* Background Image with Overlay */}
            <div className="absolute inset-0">
              {/* object-right-top for Summer, object-center for others to center them horizontally and vertically */}
              <img 
                src={split.bgImage} 
                alt={split.name} 
                className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0 ${split.id === 'summer' ? 'object-right-top' : 'object-center'}`} 
              />
              <div className="absolute inset-0 bg-black/70 group-hover:bg-black/40 transition-colors duration-500"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center p-6 text-center">
              <div className={`
                w-20 h-20 rounded-full bg-gradient-to-br ${split.color} 
                flex items-center justify-center mb-6 shadow-lg transform group-hover:-translate-y-2 transition-transform duration-500
              `}>
                <split.icon className="w-10 h-10 text-black/70" />
              </div>

              <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-wide group-hover:scale-110 transition-transform">
                {split.name}
              </h3>

              <span className={`
                text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border mb-8
                ${split.id === 'winter' ? 'bg-green-500/20 border-green-500 text-green-300' : 'bg-gray-800/50 border-gray-600 text-gray-400'}
              `}>
                {split.status}
              </span>

              <div className={`
                flex items-center gap-2 text-sm font-bold uppercase tracking-widest opacity-0 transform translate-y-4
                group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300
                bg-white/10 backdrop-blur px-4 py-2 rounded-lg border border-white/20 hover:bg-white/20
              `}>
                Entrar <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};