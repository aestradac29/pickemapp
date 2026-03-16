
import React, { useState, useEffect } from 'react';
import { ViewState } from '../types';
import { Trophy, ListOrdered, Sparkles, CalendarCheck, Swords, UserPlus, Lock, Unlock, Database, Users, Table2, Crown } from 'lucide-react';
import { dataService } from '../services/dataService';

interface DashboardProps {
  onChangeView: (view: ViewState) => void;
  currentUser?: string | null;
  isAdmin?: boolean;
  selectedSplit?: string | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ onChangeView, currentUser, isAdmin = false, selectedSplit }) => {
  const [playoffsAccessible, setPlayoffsAccessible] = useState(false);
  const [albumEnabled, setAlbumEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const isWinterSplit = selectedSplit?.toLowerCase().includes('winter') ?? true;

  useEffect(() => {
    const loadConfig = async () => {
        setIsLoading(true);
        try {
            const config = await dataService.getDaysConfig();
            setPlayoffsAccessible(config.playoffsAccessible || false);
            setAlbumEnabled(config.albumEnabled !== false);
        } catch (e) {
            console.error("Failed to load dashboard config", e);
        } finally {
            setIsLoading(false);
        }
    };
    loadConfig();
  }, []);

  const handleTogglePlayoffs = async () => {
      if (!isAdmin) return;
      const newValue = !playoffsAccessible;
      setPlayoffsAccessible(newValue);
      await dataService.updateGlobalConfig({ playoffsAccessible: newValue });
  };

  const handleToggleAlbum = async () => {
      if (!isAdmin) return;
      const newValue = !albumEnabled;
      setAlbumEnabled(newValue);
      await dataService.updateGlobalConfig({ albumEnabled: newValue });
  };

  const options = [
    {
      id: ViewState.MATCHDAY,
      title: 'Jornadas',
      subtitle: 'Fase Regular (1-11)',
      icon: Swords, 
      color: 'text-blue-500',
      border: 'hover:border-blue-500',
      bg: 'hover:bg-blue-500/10',
      locked: !isWinterSplit
    },
    {
      id: ViewState.RANKING,
      title: 'Tu Ranking',
      subtitle: 'Predicción Top 12',
      icon: ListOrdered,
      color: 'text-gray-300',
      border: 'hover:border-gray-300',
      bg: 'hover:bg-gray-300/10',
      locked: !isWinterSplit
    },
    {
      id: ViewState.PLAYOFFS,
      title: 'Playoffs',
      subtitle: 'Cuadro final',
      icon: Trophy,
      color: 'text-[#c8aa6e]',
      border: 'hover:border-[#c8aa6e]',
      bg: 'hover:bg-[#c8aa6e]/10',
      locked: (!isWinterSplit) || (!playoffsAccessible && !isAdmin) // Bloqueado para usuarios normales si no está accesible
    },
    {
      id: ViewState.CRYSTAL_BALL,
      title: 'Bola de Cristal',
      subtitle: 'Predicciones especiales',
      icon: Sparkles,
      color: 'text-purple-400',
      border: 'hover:border-purple-400',
      bg: 'hover:bg-purple-400/10',
      locked: !isWinterSplit
    },
    {
      id: ViewState.FANTASY,
      title: 'Fantasy Team',
      subtitle: 'Crea tu alineación ideal',
      icon: UserPlus,
      color: 'text-[#0ac8b9]', // Cyan for Fantasy
      border: 'hover:border-[#0ac8b9]',
      bg: 'hover:bg-[#0ac8b9]/10',
      locked: !isWinterSplit
    },
    {
      id: ViewState.TEAMS,
      title: 'Equipos',
      subtitle: 'Rosters y Estadísticas',
      icon: Users,
      color: 'text-orange-400',
      border: 'hover:border-orange-400',
      bg: 'hover:bg-orange-400/10',
      locked: !isWinterSplit
    },
    {
      id: ViewState.RESULTS,
      title: 'Resultados',
      subtitle: 'Historial y puntos',
      icon: CalendarCheck,
      color: 'text-green-400',
      border: 'hover:border-green-400',
      bg: 'hover:bg-green-400/10',
      locked: !isWinterSplit
    },
    {
      id: ViewState.OFFICIAL_STANDINGS,
      title: 'Clasificación Oficial',
      subtitle: 'Tabla real LEC Winter',
      icon: Table2,
      color: 'text-amber-400',
      border: 'hover:border-amber-400',
      bg: 'hover:bg-amber-400/10',
      locked: !isWinterSplit
    },
    {
      id: ViewState.HALL_OF_FAME,
      title: 'Hall of Fame',
      subtitle: 'MVPs y LVPs',
      icon: Crown,
      color: 'text-yellow-400',
      border: 'hover:border-yellow-400',
      bg: 'hover:bg-yellow-400/10',
      locked: !isWinterSplit
    }
  ];

  return (
    <div className="px-4 py-8 animate-in slide-in-from-bottom-8 duration-500 pb-20 relative">
      <h2 className="text-2xl font-bold text-center mb-8 text-[#f0e6d2] uppercase tracking-widest">
        Panel de Control
      </h2>

      {/* Admin Quick Actions */}
      {isAdmin && !isLoading && (
          <div className="flex flex-col items-center gap-4 mb-8">
              <div className="flex flex-wrap justify-center gap-4">
                  <button 
                      onClick={handleTogglePlayoffs}
                      className={`
                          flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all shadow-lg
                          ${playoffsAccessible 
                              ? 'bg-red-900/30 border-red-500 text-red-300 hover:bg-red-900/50' 
                              : 'bg-green-900/30 border-green-500 text-green-300 hover:bg-green-900/50'
                          }
                      `}
                  >
                      {playoffsAccessible ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      {playoffsAccessible ? 'Bloquear Acceso Playoffs' : 'Abrir Acceso Playoffs'}
                  </button>

                  <button 
                      onClick={handleToggleAlbum}
                      className={`
                          flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all shadow-lg
                          ${albumEnabled 
                              ? 'bg-red-900/30 border-red-500 text-red-300 hover:bg-red-900/50' 
                              : 'bg-green-900/30 border-green-500 text-green-300 hover:bg-green-900/50'
                          }
                      `}
                  >
                      {albumEnabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      {albumEnabled ? 'Deshabilitar Álbum' : 'Habilitar Álbum'}
                  </button>

                  <button 
                      onClick={() => onChangeView(ViewState.DB_MANAGER)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-[#c8aa6e] bg-[#c8aa6e]/10 text-[#c8aa6e] hover:bg-[#c8aa6e]/20 transition-all shadow-lg"
                  >
                      <Database className="w-4 h-4" />
                      Gestión Base de Datos
                  </button>
              </div>
          </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => !option.locked && onChangeView(option.id)}
            disabled={option.locked}
            className={`
              relative group flex flex-col items-center justify-center p-6 h-48
              bg-[#091428]/80 backdrop-blur border rounded-xl 
              transition-all duration-300 shadow-xl
              ${option.locked 
                  ? 'border-gray-800 opacity-60 cursor-not-allowed grayscale' 
                  : `border-gray-700 ${option.border} ${option.bg} hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:-translate-y-1`
              }
            `}
          >
            {/* Lock Overlay */}
            {option.locked && (
                <div className="absolute top-4 right-4 z-10">
                    <Lock className="w-6 h-6 text-gray-500" />
                </div>
            )}

            <div className={`mb-4 p-3 rounded-full bg-[#0a1428] border border-gray-700 group-hover:scale-110 transition-transform ${option.locked ? 'text-gray-600' : option.color}`}>
              {option.locked ? <Lock className="w-8 h-8" /> : <option.icon className="w-8 h-8" />}
            </div>
            
            <h3 className={`text-lg font-bold mb-1 uppercase tracking-wide ${option.locked ? 'text-gray-500' : 'text-[#f0e6d2]'}`}>
                {option.title}
            </h3>
            
            <p className="text-gray-500 text-xs group-hover:text-gray-300 transition-colors">
                {option.locked ? (!isWinterSplit ? 'Próximamente' : 'Fase Regular en curso') : option.subtitle}
            </p>
            
            {/* Corner Accents (Only if not locked) */}
            {!option.locked && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className={`w-2 h-2 rounded-full animate-pulse bg-current ${option.color}`}></div>
                </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};