import React, { useState, useEffect } from 'react';
import { WHITE_LOGO_TEAMS } from '../constants';
import { Team } from '../types';
import { GripVertical, Save, Trophy, AlertOctagon, Loader2, CheckCircle2, AlertCircle, Settings, Lock, XCircle } from 'lucide-react';
import { dataService } from '../services/dataService';

interface RankingViewProps {
    currentUserId?: string | null;
    isAdmin?: boolean;
}

export const RankingView: React.FC<RankingViewProps> = ({ currentUserId, isAdmin }) => {
  const [rankedTeams, setRankedTeams] = useState<Team[]>([]);
  const [officialRanking, setOfficialRanking] = useState<string[]>([]); // Estado para guardar el ranking oficial
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isLocked, setIsLocked] = useState(false);

  // Admin Mode Toggle: "prediction" (default for users) vs "official_result" (only for admin)
  const [mode, setMode] = useState<'prediction' | 'official_result'>('prediction');

  useEffect(() => {
    loadTeamsAndRanking();
    checkLockStatus();
  }, [mode, currentUserId]); // Reload when mode switches or user changes

  const checkLockStatus = async () => {
      // Official result editing is never locked for admin (needed for scoring)
      if (mode === 'official_result') {
          setIsLocked(false);
          return;
      }

      try {
          // Check start time of Day 1 matches
          const matches = await dataService.getMatches(1);
          if (matches.length > 0) {
              const sortedMatches = matches.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
              const firstMatchStart = new Date(sortedMatches[0].startTime);
              const now = new Date();
              
              if (now >= firstMatchStart) {
                  setIsLocked(true);
              } else {
                  setIsLocked(false);
              }
          }
      } catch (e) {
          console.error("Error checking lock status", e);
      }
  };

  const loadTeamsAndRanking = async () => {
    setIsLoading(true);
    setSaveStatus('idle');
    try {
        // 1. Cargar equipos y Ranking Oficial SIEMPRE para comparar
        const [teamsMap, adminRankingIds] = await Promise.all([
            dataService.getTeams(),
            dataService.getAdminRanking()
        ]);
        
        const teamsList = Object.values(teamsMap);
        setOfficialRanking(adminRankingIds || []);
        
        let orderedIds: string[] = [];

        // 2. Determinar qué lista mostrar (Usuario vs Admin Editor)
        if (isAdmin && mode === 'official_result') {
            orderedIds = adminRankingIds;
        } else if (currentUserId) {
            orderedIds = await dataService.getUserRanking(currentUserId);
        }

        // Apply order if exists
        if (orderedIds && orderedIds.length > 0) {
            const orderedTeams = orderedIds
                .map(id => teamsMap[id])
                .filter(Boolean); // remove undefined if any ID mismatch
            
            // Add any missing teams (newly added to DB but not in saved order) at the end
            const missingTeams = teamsList.filter(t => !orderedIds.includes(t.id));
            setRankedTeams([...orderedTeams, ...missingTeams]);
        } else {
            // Default sort (e.g. alphabetical or by DB order)
            setRankedTeams(teamsList);
        }

    } catch (error) {
        console.error("Failed to load teams", error);
    } finally {
        setIsLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isLocked) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (isLocked) return;
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...rankedTeams];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);

    setRankedTeams(newOrder);
    setDraggedIndex(index);
    setSaveStatus('idle'); // Reset status on change
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = async () => {
      if (isLocked && mode === 'prediction') return;

      if (!currentUserId && !isAdmin) {
          alert("Debes iniciar sesión.");
          return;
      }

      setIsSaving(true);
      setSaveStatus('idle');

      const teamIds = rankedTeams.map(t => t.id);

      try {
          if (isAdmin && mode === 'official_result') {
              await dataService.saveAdminRanking(teamIds);
              // Actualizamos el estado local también para reflejar cambios inmediatos en la UI si cambiamos de modo
              setOfficialRanking(teamIds); 
          } else if (currentUserId) {
              await dataService.saveUserRanking(currentUserId, teamIds);
          }
          setSaveStatus('success');
          setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (e) {
          console.error(e);
          setSaveStatus('error');
      } finally {
          setIsSaving(false);
      }
  };

  // Calcular puntos totales visuales
  const totalPoints = React.useMemo(() => {
    if (mode === 'official_result' || officialRanking.length === 0) return 0;
    
    return rankedTeams.reduce((acc, team, index) => {
        const officialIndex = officialRanking.indexOf(team.id);
        if (officialIndex === -1) return acc;
        
        const diff = Math.abs(index - officialIndex);
        if (diff === 0) return acc + 6;
        if (diff === 1) return acc + 3;
        return acc;
    }, 0);
  }, [rankedTeams, officialRanking, mode]);

  if (isLoading) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-[#c8aa6e]">
              <Loader2 className="w-10 h-10 animate-spin mb-4" />
              <p>Cargando clasificación...</p>
          </div>
      );
  }

  // Determinar si hay resultados oficiales publicados para mostrar feedback
  const hasOfficialResults = officialRanking.length > 0 && mode === 'prediction';

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 mb-20">
      
      {/* Admin Mode Toggle */}
      {isAdmin && (
          <div className="flex justify-end mb-4">
              <div className="bg-[#0f1d36] border border-gray-700 p-1 rounded-lg flex items-center gap-1">
                  <button 
                    onClick={() => setMode('prediction')}
                    className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors ${mode === 'prediction' ? 'bg-[#c8aa6e] text-[#0a1428]' : 'text-gray-400 hover:text-white'}`}
                  >
                      Mis Predicciones
                  </button>
                  <button 
                    onClick={() => setMode('official_result')}
                    className={`px-3 py-1.5 rounded text-xs font-bold uppercase flex items-center gap-2 transition-colors ${mode === 'official_result' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                      <Settings className="w-3 h-3" />
                      Resultado Oficial
                  </button>
              </div>
          </div>
      )}

      <div className="text-center mb-6">
        <h2 className={`text-2xl font-bold uppercase ${mode === 'official_result' ? 'text-red-500' : 'text-[#c8aa6e]'}`}>
            {mode === 'official_result' ? 'ADMIN: RESULTADO REAL' : 'Tu Clasificación Winter 2026'}
        </h2>
        <p className="text-gray-400 text-sm">
            {mode === 'official_result' 
                ? 'Establece el orden REAL para calcular puntuaciones.' 
                : 'Arrastra los equipos para predecir el orden final del Split.'}
        </p>

        {/* SCORING LEGEND */}
        <div className="flex items-center justify-center gap-3 mt-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-green-500/30 bg-green-900/10 backdrop-blur-sm">
                <CheckCircle2 className="w-3 h-3 text-green-400" />
                <span className="text-[10px] font-bold text-green-200 uppercase tracking-wider">Posición Exacta: <span className="text-white ml-1">+6 Pts</span></span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-yellow-500/30 bg-yellow-900/10 backdrop-blur-sm">
                <AlertCircle className="w-3 h-3 text-yellow-400" />
                <span className="text-[10px] font-bold text-yellow-200 uppercase tracking-wider">Error por 1 posición: <span className="text-white ml-1">+3 Pts</span></span>
            </div>
        </div>

        {/* Total Score Badge if Results Exist */}
        {hasOfficialResults && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#c8aa6e]/20 to-[#c8aa6e]/5 border border-[#c8aa6e] rounded-full animate-in zoom-in">
                <Trophy className="w-4 h-4 text-[#c8aa6e]" />
                <span className="text-sm font-bold text-[#f0e6d2]">Puntos Totales: <span className="text-[#c8aa6e] text-lg">{totalPoints}</span></span>
            </div>
        )}
      </div>
      
      {isLocked && mode === 'prediction' && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 flex items-center justify-center gap-2 text-red-300 mb-6 animate-in slide-in-from-top-2 font-bold uppercase tracking-widest text-sm max-w-lg mx-auto">
            <Lock className="w-4 h-4" />
            <span>Predicciones Cerradas (El Split ha comenzado)</span>
        </div>
      )}

      <div className={`bg-[#091428]/80 backdrop-blur rounded-xl border p-4 space-y-2 relative transition-colors ${mode === 'official_result' ? 'border-red-900/50 shadow-[0_0_20px_rgba(220,38,38,0.1)]' : 'border-gray-700'}`}>
        
        {/* Header Playoffs */}
        <div className="flex items-center gap-2 pb-2 mb-2 border-b border-[#c8aa6e]/20 text-[#c8aa6e]">
          <Trophy className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Zona de Playoffs</span>
        </div>

        {rankedTeams.map((team, index) => {
          const isEliminated = index >= 8;
          const shouldInvert = WHITE_LOGO_TEAMS.includes(team.id);
          
          // Logic for scoring display
          let scoreBadge = null;
          let diffClass = '';
          
          if (hasOfficialResults) {
              const officialIndex = officialRanking.indexOf(team.id);
              if (officialIndex !== -1) {
                  const diff = Math.abs(index - officialIndex);
                  
                  if (diff === 0) {
                      diffClass = 'border-green-500/50 bg-green-900/10 shadow-[0_0_10px_rgba(34,197,94,0.1)]';
                      scoreBadge = (
                          <div className="flex items-center gap-1 text-green-400 text-xs font-bold bg-green-950/50 px-2 py-1 rounded border border-green-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>+6 Pts</span>
                          </div>
                      );
                  } else if (diff === 1) {
                      diffClass = 'border-yellow-500/50 bg-yellow-900/10';
                      scoreBadge = (
                          <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold bg-yellow-950/50 px-2 py-1 rounded border border-yellow-500/30">
                              <AlertCircle className="w-3 h-3" />
                              <span>+3 Pts</span>
                              <span className="text-[9px] opacity-70 ml-1">(Real: {officialIndex + 1}º)</span>
                          </div>
                      );
                  } else {
                      diffClass = 'opacity-80';
                      scoreBadge = (
                          <div className="flex items-center gap-1 text-gray-500 text-xs font-bold bg-gray-900/50 px-2 py-1 rounded border border-gray-700">
                              <XCircle className="w-3 h-3" />
                              <span>0 Pts</span>
                              <span className="text-[9px] opacity-70 ml-1">(Real: {officialIndex + 1}º)</span>
                          </div>
                      );
                  }
              }
          }

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
                draggable={!isLocked}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  flex items-center gap-4 p-3 rounded 
                  border transition-all select-none
                  ${!isLocked ? 'cursor-move group' : 'cursor-default'}
                  ${draggedIndex === index ? 'opacity-50 ring-2 ring-[#c8aa6e] bg-[#1a2c4e] z-10' : ''}
                  ${isEliminated 
                    ? 'bg-[#050a14] border-red-900/20 grayscale-[0.5] hover:grayscale-0' 
                    : diffClass || 'bg-[#0a1428] border-gray-800 hover:border-[#c8aa6e]/50 shadow-sm'
                  }
                  ${isLocked ? 'opacity-90' : ''}
                `}
              >
                {!isLocked && (
                    <div className={`transition-colors ${isEliminated ? 'text-gray-700' : 'text-gray-500 group-hover:text-[#c8aa6e]'}`}>
                        <GripVertical className="w-5 h-5" />
                    </div>
                )}

                <div className={`w-8 font-bold text-center text-lg ${
                  isEliminated ? 'text-red-900/50' : (index < 3 ? 'text-[#c8aa6e]' : 'text-gray-400')
                }`}>
                  {index + 1}º
                </div>
                
                {/* Logo Container */}
                <div className="relative w-10 h-10 rounded shadow-sm bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
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
                
                <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${isEliminated ? 'text-gray-500' : 'text-gray-200'}`}>
                        {team.name}
                        <span className={`ml-2 text-xs uppercase tracking-wider ${isEliminated ? 'text-gray-700' : 'text-gray-600'}`}>
                            {team.shortName}
                        </span>
                    </div>
                </div>

                {/* Score Badge (Right Side) */}
                {scoreBadge && (
                    <div className="flex-shrink-0 animate-in fade-in slide-in-from-right-4">
                        {scoreBadge}
                    </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center sticky bottom-8 z-20 pointer-events-none">
        <button 
            onClick={handleSave}
            disabled={isSaving || (isLocked && mode === 'prediction')}
            className={`
                pointer-events-auto flex items-center gap-2 px-8 py-3 rounded-full font-bold transition-all shadow-xl transform border
                ${isLocked && mode === 'prediction'
                    ? 'bg-gray-800 border-gray-600 text-gray-500 cursor-not-allowed opacity-80'
                    : mode === 'official_result' 
                        ? 'bg-red-600 border-red-400 text-white hover:bg-red-700 hover:scale-105'
                        : 'bg-[#c8aa6e] border-yellow-500 text-[#0a1428] hover:bg-[#d6bb82] hover:scale-105'
                }
                ${saveStatus === 'success' ? 'ring-4 ring-green-500/50' : ''}
                ${saveStatus === 'error' ? 'ring-4 ring-red-500/50' : ''}
            `}
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 
           isLocked && mode === 'prediction' ? <Lock className="w-5 h-5" /> :
           saveStatus === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
           saveStatus === 'error' ? <AlertCircle className="w-5 h-5" /> :
           <Save className="w-5 h-5" />}
          
          {isLocked && mode === 'prediction' 
            ? 'Predicciones Cerradas' 
            : saveStatus === 'success' 
                ? '¡Guardado!' 
                : saveStatus === 'error' 
                    ? 'Error al guardar' 
                    : (mode === 'official_result' ? 'PUBLICAR RESULTADO OFICIAL' : 'Guardar Predicción')
          }
        </button>
      </div>
    </div>
  );
};