import React, { useState, useEffect } from 'react';
import { WHITE_LOGO_TEAMS } from '../constants';
import { Team } from '../types';
import { GripVertical, Save, Trophy, AlertOctagon, Loader2, RefreshCw } from 'lucide-react';
import { dataService } from '../services/dataService';

export const RankingView: React.FC = () => {
  const [rankedTeams, setRankedTeams] = useState<Team[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTeams = async () => {
        setIsLoading(true);
        try {
            const teamsMap = await dataService.getTeams();
            const teamsList = Object.values(teamsMap);
            // Default sort could be alphabetical or by region, here just taking DB order
            setRankedTeams(teamsList);
        } catch (error) {
            console.error("Failed to load teams", error);
        } finally {
            setIsLoading(false);
        }
    };
    loadTeams();
  }, []);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...rankedTeams];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);

    setRankedTeams(newOrder);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (isLoading) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-[#c8aa6e]">
              <Loader2 className="w-10 h-10 animate-spin mb-4" />
              <p>Cargando equipos...</p>
          </div>
      );
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 mb-20">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[#c8aa6e] uppercase">Clasificación Winter 2026</h2>
        <p className="text-gray-400 text-sm">Arrastra los equipos. Los 8 primeros clasifican a Playoffs.</p>
      </div>

      <div className="bg-[#091428]/80 backdrop-blur rounded-xl border border-gray-700 p-4 space-y-2 relative">
        
        {/* Header Playoffs */}
        <div className="flex items-center gap-2 pb-2 mb-2 border-b border-[#c8aa6e]/20 text-[#c8aa6e]">
          <Trophy className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Zona de Playoffs</span>
        </div>

        {rankedTeams.map((team, index) => {
          const isEliminated = index >= 8;
          const shouldInvert = WHITE_LOGO_TEAMS.includes(team.id);
          
          return (
            <React.Fragment key={team.id}>
              {/* Separator for Elimination Zone */}
              {index === 8 && (
                <div className="py-6 flex items-center gap-3 opacity-90 animate-in fade-in">
                  <div className="h-px bg-red-900/50 flex-1"></div>
                  <div className="flex items-center gap-2 text-red-500/80 px-2 py-1 rounded bg-red-950/30 border border-red-900/30">
                    <AlertOctagon className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Eliminados</span>
                  </div>
                  <div className="h-px bg-red-900/50 flex-1"></div>
                </div>
              )}

              <div 
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  flex items-center gap-4 p-3 rounded 
                  border transition-all cursor-move
                  group select-none
                  ${draggedIndex === index ? 'opacity-50 ring-2 ring-[#c8aa6e] bg-[#1a2c4e] z-10' : ''}
                  ${isEliminated 
                    ? 'bg-[#050a14] border-red-900/20 grayscale-[0.5] hover:grayscale-0' 
                    : 'bg-[#0a1428] border-gray-800 hover:border-[#c8aa6e]/50 shadow-sm'
                  }
                `}
              >
                <div className={`transition-colors ${isEliminated ? 'text-gray-700' : 'text-gray-500 group-hover:text-[#c8aa6e]'}`}>
                  <GripVertical className="w-5 h-5" />
                </div>

                <div className={`w-8 font-bold text-center text-lg ${
                  isEliminated ? 'text-red-900/50' : (index < 3 ? 'text-[#c8aa6e]' : 'text-gray-400')
                }`}>
                  {index + 1}º
                </div>
                
                {/* Logo Container */}
                <div className="relative w-10 h-10 rounded shadow-sm bg-gray-800 flex items-center justify-center overflow-hidden">
                  {team.logo ? (
                    <img 
                      src={team.logo} 
                      alt={team.name} 
                      className={`w-full h-full object-contain p-1 ${isEliminated ? 'opacity-70' : ''} ${shouldInvert ? 'brightness-0 invert' : ''}`} 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${team.shortName}&background=${team.color.replace('#','')}&color=fff&size=64&bold=true`;
                      }}
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.shortName[0]}
                    </div>
                  )}
                </div>
                
                <div className={`flex-1 font-medium ${isEliminated ? 'text-gray-500' : 'text-gray-200'}`}>
                  {team.name}
                  <span className={`ml-2 text-xs uppercase tracking-wider ${isEliminated ? 'text-gray-700' : 'text-gray-600'}`}>
                    {team.shortName}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center">
        <button className="flex items-center gap-2 bg-[#c8aa6e] text-[#0a1428] px-6 py-3 rounded-full font-bold hover:bg-[#d6bb82] transition-colors shadow-lg transform hover:scale-105">
          <Save className="w-5 h-5" />
          Guardar Predicción
        </button>
      </div>
    </div>
  );
};