import React, { useEffect, useState } from 'react';
import { Snowflake, Sun, Flower2, ArrowRight, Lock, Loader2 } from 'lucide-react';
import { dataService } from '../services/dataService';

interface SplitSelectionProps {
  onSelect: (splitName: string) => void;
}

// Metadata visual (colores, imágenes) que la DB no tiene
const VISUAL_METADATA: Record<string, any> = {
    'winter': {
        icon: Snowflake,
        color: 'from-blue-400 to-cyan-300',
        borderColor: 'border-blue-400',
        shadow: 'shadow-blue-500/20',
        bgImage: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Bard_1.jpg'
    },
    'spring': {
        icon: Flower2,
        color: 'from-emerald-400 to-green-300',
        borderColor: 'border-emerald-400',
        shadow: 'shadow-emerald-500/20',
        bgImage: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ornn_2.jpg'
    },
    'summer': {
        icon: Sun,
        color: 'from-amber-400 to-orange-300',
        borderColor: 'border-amber-400',
        shadow: 'shadow-amber-500/20',
        bgImage: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Leona_4.jpg'
    }
};

export const SplitSelection: React.FC<SplitSelectionProps> = ({ onSelect }) => {
  const [splits, setSplits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSplits = async () => {
        try {
            const dbSplits = await dataService.getSplits();
            setSplits(dbSplits);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    loadSplits();
  }, []);

  if (loading) {
      return (
          <div className="min-h-[70vh] flex flex-col items-center justify-center text-[#c8aa6e]">
              <Loader2 className="w-10 h-10 animate-spin mb-4" />
              <p>Cargando temporadas...</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 animate-in fade-in duration-700">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-white uppercase tracking-wider mb-3">
          Selecciona la Temporada
        </h2>
        <p className="text-gray-400">Elige el Split de la LEC en el que quieres competir</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-[1400px]">
        {splits.map((split) => {
          // Determinar qué estilo visual usar basado en el ID o nombre
          let styleKey = 'winter';
          if (split.id.includes('spring')) styleKey = 'spring';
          else if (split.id.includes('summer')) styleKey = 'summer';
          
          const visual = VISUAL_METADATA[styleKey];
          const Icon = visual.icon;
          const isLocked = split.status !== 'active';
          
          return (
            <button
              key={split.id}
              onClick={() => !isLocked && onSelect(split.name)}
              disabled={isLocked}
              className={`
                group relative h-[400px] rounded-2xl overflow-hidden border-2 transition-all duration-500
                ${isLocked 
                  ? 'border-gray-800 opacity-60 cursor-not-allowed' 
                  : `${visual.borderColor} ${visual.shadow} shadow-2xl hover:scale-105 cursor-pointer`
                }
              `}
            >
              {/* Background Image with Overlay */}
              <div className="absolute inset-0">
                <img 
                  src={visual.bgImage} 
                  alt={split.name} 
                  className={`
                    w-full h-full object-cover transition-transform duration-700 
                    ${isLocked ? 'grayscale' : 'grayscale group-hover:grayscale-0 group-hover:scale-110'} 
                    ${styleKey === 'summer' ? 'object-right-top' : 'object-center'}
                  `} 
                />
                <div className={`absolute inset-0 transition-colors duration-500 ${isLocked ? 'bg-black/80' : 'bg-black/70 group-hover:bg-black/40'}`}></div>
              </div>

              {/* Content */}
              <div className="relative z-10 h-full flex flex-col items-center justify-center p-6 text-center">
                <div className={`
                  w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg transition-transform duration-500
                  ${isLocked 
                    ? 'bg-gray-800 border border-gray-700' 
                    : `bg-gradient-to-br ${visual.color} transform group-hover:-translate-y-2`
                  }
                `}>
                  {isLocked ? <Lock className="w-8 h-8 text-gray-500" /> : <Icon className="w-10 h-10 text-black/70" />}
                </div>

                <h3 className={`text-2xl font-bold mb-2 uppercase tracking-wide transition-transform ${isLocked ? 'text-gray-500' : 'text-white group-hover:scale-110'}`}>
                  {split.name}
                </h3>

                <span className={`
                  text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border mb-8
                  ${split.status === 'active' ? 'bg-green-500/20 border-green-500 text-green-300' : 'bg-gray-800/50 border-gray-600 text-gray-400'}
                `}>
                  {split.status === 'active' ? 'En Curso' : (split.status === 'completed' ? 'Finalizado' : 'Próximamente')}
                </span>

                {!isLocked && (
                  <div className={`
                    flex items-center gap-2 text-sm font-bold uppercase tracking-widest opacity-0 transform translate-y-4
                    group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300
                    bg-white/10 backdrop-blur px-4 py-2 rounded-lg border border-white/20 hover:bg-white/20
                  `}>
                    Entrar <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
        {splits.length === 0 && !loading && (
             <div className="col-span-3 text-center text-gray-500">
                 No se encontraron temporadas en la base de datos.
             </div>
        )}
      </div>
    </div>
  );
};