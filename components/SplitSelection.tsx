import React, { useEffect, useState, useMemo } from 'react';
import { Snowflake, Sun, Flower2, ArrowRight, Lock, Loader2, Trophy, Medal, Swords } from 'lucide-react';
import { dataService } from '../services/dataService';
import { User } from '../types';

interface SplitSelectionProps {
  onSelect: (splitName: string) => void;
  isAdmin: boolean;
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

export const SplitSelection: React.FC<SplitSelectionProps> = ({ onSelect, isAdmin }) => {
  const [splits, setSplits] = useState<any[]>([]);
  const [splitRankings, setSplitRankings] = useState<Record<string, { global: User[], fantasy: User[] }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
        try {
            const dbSplits = await dataService.getSplits();
            setSplits(dbSplits);
            
            const rankings: Record<string, { global: User[], fantasy: User[] }> = {};
            
            // Fetch rankings for each split in parallel
            await Promise.all(dbSplits.map(async (split: any) => {
                if (split.status === 'upcoming') return;
                
                try {
                    const splitUsers = await dataService.getAllUsers(split.id);
                    rankings[split.id] = {
                        global: [...splitUsers].sort((a, b) => b.score - a.score).slice(0, 3),
                        fantasy: [...splitUsers].sort((a, b) => (b.scoreBreakdown?.fantasy || 0) - (a.scoreBreakdown?.fantasy || 0)).slice(0, 3)
                    };
                } catch (err) {
                    console.error(`Error loading rankings for split ${split.id}:`, err);
                }
            }));
            
            setSplitRankings(rankings);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    loadData();
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

      <div className="flex flex-wrap justify-center gap-8 w-full max-w-[1400px] mb-20">
        {splits.map((split) => {
          // Determinar qué estilo visual usar basado en el ID o nombre
          let styleKey = 'winter';
          if (split.id.includes('spring')) styleKey = 'spring';
          else if (split.id.includes('summer')) styleKey = 'summer';
          
          const visual = VISUAL_METADATA[styleKey];
          const Icon = visual.icon;
          // Allow access to active AND completed splits
          const isLocked = split.status === 'upcoming' || split.status === 'locked';
          const rankings = splitRankings[split.id];
          
          return (
            <div key={split.id} className="flex flex-col gap-6 w-full sm:w-[300px]">
                <button
                  onClick={() => !isLocked && onSelect(split.name)}
                  disabled={isLocked}
                  className={`
                    group relative h-[400px] w-full rounded-2xl overflow-hidden border-2 transition-all duration-500
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
                      ${split.status === 'active' 
                        ? 'bg-green-500/20 border-green-500 text-green-300' 
                        : (split.status === 'completed' 
                            ? 'bg-blue-500/20 border-blue-500 text-blue-300' 
                            : 'bg-gray-800/50 border-gray-600 text-gray-400')
                      }
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

                {/* Rankings below card */}
                {rankings && (
                    <div className="bg-[#060f1e]/80 backdrop-blur border border-gray-800 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
                            <Trophy className="w-4 h-4 text-[#c8aa6e]" />
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Palmarés</span>
                        </div>
                        
                        <div className="space-y-4">
                            {/* Global */}
                            <div>
                                <p className="text-[10px] font-bold text-[#c8aa6e] uppercase tracking-widest mb-2 flex items-center justify-between">
                                    <span>Top 3 Global</span>
                                    <Medal className="w-3 h-3" />
                                </p>
                                <div className="space-y-2">
                                    {rankings.global.map((u, i) => (
                                        <div key={u.id} className="flex items-center gap-2 text-xs bg-[#0a1428]/50 p-1.5 rounded border border-gray-800/50">
                                            <span className={`w-4 font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : 'text-amber-700'}`}>
                                                {i + 1}
                                            </span>
                                            <img src={u.avatar} className="w-5 h-5 rounded-full border border-gray-700" referrerPolicy="no-referrer" />
                                            <span className="flex-1 truncate text-gray-300 font-medium">{u.name}</span>
                                            <span className="font-bold text-[#c8aa6e]">{u.score}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Fantasy */}
                            <div>
                                <p className="text-[10px] font-bold text-[#0ac8b9] uppercase tracking-widest mb-2 flex items-center justify-between">
                                    <span>Top 3 Fantasy</span>
                                    <Swords className="w-3 h-3" />
                                </p>
                                <div className="space-y-2">
                                    {rankings.fantasy.map((u, i) => (
                                        <div key={u.id} className="flex items-center gap-2 text-xs bg-[#0a1428]/50 p-1.5 rounded border border-gray-800/50">
                                            <span className={`w-4 font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : 'text-amber-700'}`}>
                                                {i + 1}
                                            </span>
                                            <img src={u.avatar} className="w-5 h-5 rounded-full border border-gray-700" referrerPolicy="no-referrer" />
                                            <span className="flex-1 truncate text-gray-300 font-medium">{u.name}</span>
                                            <span className="font-bold text-[#0ac8b9]">{u.scoreBreakdown?.fantasy || 0}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
          );
        })}

        {splits.length === 0 && !loading && (
             <div className="col-span-full text-center text-gray-500">
                 No se encontraron temporadas en la base de datos.
             </div>
        )}
      </div>
    </div>
  );
};
