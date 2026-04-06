import React, { useState, useEffect } from 'react';
import { ViewState } from '../types';
import {
  Trophy, ListOrdered, CalendarCheck, Swords, UserPlus,
  Lock, Unlock, Database, Users, Crown, ArrowRight,
} from 'lucide-react';
import { dataService } from '../services/dataService';

interface DashboardProps {
  onChangeView: (view: ViewState) => void;
  currentUser?: string | null;
  isAdmin?: boolean;
  selectedSplit?: string | null;
}

// Definición de cada sección con su identidad visual completa
const SECTIONS = [
  {
    id: ViewState.MATCHDAY,
    title: 'Jornadas',
    subtitle: 'Fase Regular',
    description: 'Predice los resultados de cada jornada y suma puntos.',
    icon: Swords,
    accent: '#3b82f6',        // blue-500
    glow: 'rgba(59,130,246,0.15)',
    border: 'hover:border-blue-500/60',
    iconBg: 'bg-blue-500/10 border-blue-500/30',
    tag: 'JORNADAS 1–11',
  },
  {
    id: ViewState.RANKING,
    title: 'Ranking',
    subtitle: 'Clasificación y tabla',
    description: 'Predice la tabla final de la liga y compara con el ranking real.',
    icon: ListOrdered,
    accent: '#94a3b8',        // slate-400
    glow: 'rgba(148,163,184,0.12)',
    border: 'hover:border-slate-400/60',
    iconBg: 'bg-slate-400/10 border-slate-400/30',
    tag: 'CLASIFICACIÓN',
  },
  {
    id: ViewState.PLAYOFFS,
    title: 'Playoffs',
    subtitle: 'Cuadro eliminatorio',
    description: 'Sigue y predice el camino al título en los playoffs.',
    icon: Trophy,
    accent: '#c8aa6e',        // hextech gold
    glow: 'rgba(200,170,110,0.18)',
    border: 'hover:border-[#c8aa6e]/60',
    iconBg: 'bg-[#c8aa6e]/10 border-[#c8aa6e]/30',
    tag: 'PLAYOFF',
    isPlayoffs: true,
  },
  {
    id: ViewState.FANTASY,
    title: 'Fantasy',
    subtitle: 'Crea tu equipo',
    description: 'Elige tus 5 jugadores, pon un capitán y compite cada ronda.',
    icon: UserPlus,
    accent: '#0ac8b9',        // hextech cyan
    glow: 'rgba(10,200,185,0.15)',
    border: 'hover:border-[#0ac8b9]/60',
    iconBg: 'bg-[#0ac8b9]/10 border-[#0ac8b9]/30',
    tag: 'FANTASY TEAM',
  },
  {
    id: ViewState.TEAMS,
    title: 'Equipos',
    subtitle: 'Rosters y stats',
    description: 'Consulta los rosters, estadísticas y rendimiento de cada equipo.',
    icon: Users,
    accent: '#fb923c',        // orange-400
    glow: 'rgba(251,146,60,0.13)',
    border: 'hover:border-orange-400/60',
    iconBg: 'bg-orange-400/10 border-orange-400/30',
    tag: 'LEC',
  },
  {
    id: ViewState.RESULTS,
    title: 'Resultados',
    subtitle: 'Puntuaciones globales',
    description: 'Ranking de la liga y puntuaciones acumuladas de todos los jugadores.',
    icon: CalendarCheck,
    accent: '#4ade80',        // green-400
    glow: 'rgba(74,222,128,0.13)',
    border: 'hover:border-green-400/60',
    iconBg: 'bg-green-400/10 border-green-400/30',
    tag: 'LEADERBOARD',
  },
  {
    id: ViewState.HALL_OF_FAME,
    title: 'Hall of Fame',
    subtitle: 'MVPs y LVPs',
    description: 'Los mejores y peores momentos de la temporada, inmortalizados.',
    icon: Crown,
    accent: '#facc15',        // yellow-400
    glow: 'rgba(250,204,21,0.13)',
    border: 'hover:border-yellow-400/60',
    iconBg: 'bg-yellow-400/10 border-yellow-400/30',
    tag: 'HONOR',
  },
];

export const Dashboard: React.FC<DashboardProps> = ({
  onChangeView,
  currentUser,
  isAdmin = false,
  selectedSplit,
}) => {
  const [playoffsAccessible, setPlayoffsAccessible] = useState(false);
  const [isLoading, setIsLoading]                   = useState(true);

  const isAccessibleSplit =
    (selectedSplit?.toLowerCase().includes('winter') ||
     selectedSplit?.toLowerCase().includes('spring')) ?? true;

  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      try {
        const config = await dataService.getDaysConfig();
        setPlayoffsAccessible(config.playoffsAccessible || false);
      } catch (e) {
        console.error('Failed to load dashboard config', e);
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

  const isLocked = (section: typeof SECTIONS[0]) => {
    if (!isAccessibleSplit) return true;
    if (section.isPlayoffs && !playoffsAccessible && !isAdmin) return true;
    return false;
  };

  return (
    <div className="px-2 py-8 animate-in fade-in slide-in-from-bottom-6 duration-500">

      {/* ── Cabecera ── */}
      <div className="text-center mb-10">
        <p className="text-[10px] text-[#c8aa6e]/60 uppercase tracking-[0.3em] mb-2">
          {selectedSplit ? selectedSplit.replace('_', ' ').toUpperCase() : 'LEC PICK\'EM'}
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-[#f0e6d2] tracking-wide">
          {currentUser
            ? <>Bienvenido, <span className="text-[#c8aa6e]">{currentUser}</span></>
            : 'Panel de Control'}
        </h2>
        <div className="flex items-center justify-center gap-3 mt-3">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#c8aa6e]/40" />
          <span className="text-[10px] text-gray-600 uppercase tracking-widest">
            {isAccessibleSplit ? 'temporada activa' : 'próximamente'}
          </span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#c8aa6e]/40" />
        </div>
      </div>

      {/* ── Admin Quick Actions ── */}
      {isAdmin && !isLoading && (
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <button
            onClick={handleTogglePlayoffs}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest
              border transition-all shadow-lg
              ${playoffsAccessible
                ? 'bg-red-900/20 border-red-500/50 text-red-300 hover:bg-red-900/40'
                : 'bg-green-900/20 border-green-500/50 text-green-300 hover:bg-green-900/40'
              }
            `}
          >
            {playoffsAccessible ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            {playoffsAccessible ? 'Bloquear Playoffs' : 'Abrir Playoffs'}
          </button>
          <button
            onClick={() => onChangeView(ViewState.DB_MANAGER)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest
                       border border-[#c8aa6e]/40 bg-[#c8aa6e]/5 text-[#c8aa6e]
                       hover:bg-[#c8aa6e]/15 transition-all shadow-lg"
          >
            <Database className="w-3.5 h-3.5" />
            Base de Datos
          </button>
        </div>
      )}

      {/* ── Grid de secciones ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {SECTIONS.map(section => {
          const locked = isLocked(section);
          const Icon = section.icon;

          return (
            <button
              key={section.id}
              onClick={() => !locked && onChangeView(section.id)}
              disabled={locked}
              className={`
                group relative flex flex-col text-left p-5 rounded-xl
                bg-[#060f1e] border transition-all duration-300
                ${locked
                  ? 'border-gray-800/60 opacity-50 cursor-not-allowed'
                  : `border-gray-800/80 ${section.border} hover:-translate-y-0.5`
                }
              `}
              style={locked ? {} : {
                '--section-glow': section.glow,
              } as React.CSSProperties}
            >
              {/* Glow de fondo al hover */}
              {!locked && (
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at 30% 30%, ${section.glow}, transparent 70%)` }}
                />
              )}

              {/* Tag superior */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded border"
                  style={locked ? {
                    color: '#4b5563',
                    borderColor: 'rgba(75,85,99,0.3)',
                    background: 'rgba(75,85,99,0.05)',
                  } : {
                    color: section.accent,
                    borderColor: `${section.accent}30`,
                    background: `${section.accent}08`,
                  }}
                >
                  {locked ? 'BLOQUEADO' : section.tag}
                </span>

                {locked && <Lock className="w-3.5 h-3.5 text-gray-600" />}
              </div>

              {/* Icono */}
              <div
                className={`
                  w-11 h-11 rounded-lg flex items-center justify-center mb-4
                  border transition-transform duration-300 group-hover:scale-110
                  ${locked ? 'bg-gray-800/30 border-gray-700/30' : section.iconBg}
                `}
              >
                <Icon
                  className="w-5 h-5 transition-colors"
                  style={locked ? { color: '#4b5563' } : { color: section.accent }}
                />
              </div>

              {/* Título */}
              <h3
                className="font-bold text-base mb-0.5 transition-colors"
                style={locked ? { color: '#4b5563' } : {}}
              >
                <span className={locked ? '' : 'text-[#f0e6d2] group-hover:text-white'}>
                  {section.title}
                </span>
              </h3>

              {/* Subtítulo */}
              <p className={`text-[11px] font-medium mb-2 ${locked ? 'text-gray-700' : 'text-gray-500'}`}>
                {section.subtitle}
              </p>

              {/* Descripción */}
              <p className={`text-xs leading-relaxed flex-1 ${locked ? 'text-gray-700' : 'text-gray-500 group-hover:text-gray-400'}`}>
                {locked
                  ? (isAccessibleSplit ? 'Disponible cuando se abran los playoffs.' : 'Esta temporada aún no ha comenzado.')
                  : section.description}
              </p>

              {/* CTA */}
              {!locked && (
                <div
                  className="flex items-center gap-1 mt-4 text-[11px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0"
                  style={{ color: section.accent }}
                >
                  Entrar <ArrowRight className="w-3 h-3" />
                </div>
              )}

              {/* Línea de acento inferior */}
              {!locked && (
                <div
                  className="absolute bottom-0 left-4 right-4 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `linear-gradient(90deg, transparent, ${section.accent}60, transparent)` }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Footer info ── */}
      {!isAccessibleSplit && (
        <div className="mt-10 text-center">
          <p className="text-xs text-gray-600 uppercase tracking-widest">
            Esta temporada estará disponible próximamente
          </p>
        </div>
      )}
    </div>
  );
};
