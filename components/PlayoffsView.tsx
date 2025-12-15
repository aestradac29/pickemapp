import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MatchCard } from './MatchCard';
import { PlayoffBracket } from './PlayoffBracket';
import { DaySelector } from './DaySelector';
import { UserPrediction, Match, Team, Stage } from '../types';
import { CalendarCheck, Save, Loader2, CheckCircle2, Settings, Plus, CalendarOff, AlertTriangle, AlertCircle, Lock, Unlock, Eye, EyeOff, Trophy, Trash, CirclePlus, GitMerge, List } from 'lucide-react';
import { dataService } from '../services/dataService';
import { TEAMS } from '../constants';

interface PlayoffsViewProps {
    currentUserId: string | null;
    initialPredictions?: UserPrediction[];
    isAdmin?: boolean;
    onPredictionsSaved?: () => Promise<void> | void; 
}

const PointBadge = ({ points, label }: { points: number, label: string }) => {
    let colorClass = "bg-blue-900/30 text-blue-300 border-blue-500/30";
    if (points >= 10) colorClass = "bg-purple-900/30 text-purple-300 border-purple-500/30";
    else if (points >= 8) colorClass = "bg-[#c8aa6e]/20 text-[#c8aa6e] border-[#c8aa6e]/30";
    else if (points >= 6) colorClass = "bg-green-900/30 text-green-300 border-green-500/30";

    return (
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[9px] font-bold uppercase tracking-wider ${colorClass}`}>
            <span>{label}</span>
            <span className="bg-black/40 px-1 rounded text-white">{points} Pts</span>
        </div>
    );
};

export const PlayoffsView: React.FC<PlayoffsViewProps> = ({ 
    currentUserId, 
    initialPredictions = [], 
    isAdmin = false,
    onPredictionsSaved 
}) => {
  // Config
  const [totalRounds, setTotalRounds] = useState(5);
  const [currentDay, setCurrentDay] = useState(1);
  const [visibleDays, setVisibleDays] = useState<number[]>([]); 
  const [closedDays, setClosedDays] = useState<number[]>([]); 
  
  // Data
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);

  // Predictions
  const [predictions, setPredictions] = useState<UserPrediction[]>(initialPredictions);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null); 

  // UI State
  const [isEditMode, setIsEditMode] = useState(false);
  const [newMatch, setNewMatch] = useState<Match | null>(null);
  const [viewMode, setViewMode] = useState<'bracket' | 'list'>('bracket'); 

  // Sync state with props
  useEffect(() => {
    setPredictions(initialPredictions);
  }, [initialPredictions]);

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
        setIsLoadingMatches(true);
        setNewMatch(null); 
        try {
            const [fetchedMatches, teamsMap, config] = await Promise.all([
                dataService.getMatches(), 
                dataService.getTeams(),
                dataService.getDaysConfig()
            ]);
            
            setAllMatches(fetchedMatches);
            setAllTeams(Object.values(teamsMap));
            
            // Use specific Playoff keys
            setVisibleDays(config.playoffVisibleDays);
            setClosedDays(config.playoffClosedDays);
            
            if (config.playoffRounds) {
                setTotalRounds(config.playoffRounds);
            }
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setIsLoadingMatches(false);
        }
    };
    loadData();
  }, []);

  // Filter matches for Bracket View (All Playoff matches)
  const bracketMatches = useMemo(() => {
      return allMatches.filter(m => m.stage === Stage.PLAYOFFS || m.stage === Stage.FINALS);
  }, [allMatches]);

  // Helper to get Label matching the Bracket View
  const getBracketLabel = (match: Match) => {
        // Sort identically to PlayoffBracket.tsx
        const sortedMatches = [...bracketMatches].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        
        // 1. Identify Grand Final (Strict check + Overflow check)
        let grandFinal = sortedMatches.find(m => m.stage === Stage.FINALS);
        let winnersMatches = sortedMatches.filter(m => m.bracketStage === 'winners' && m.stage !== Stage.FINALS);
        
        // Fix for implicit final (same as PlayoffBracket.tsx)
        if (!grandFinal && winnersMatches.length > 7) {
            grandFinal = winnersMatches[winnersMatches.length - 1];
            winnersMatches = winnersMatches.slice(0, winnersMatches.length - 1);
        }

        if (match.id === grandFinal?.id) return "GRAN FINAL";

        // Winners
        const wIndex = winnersMatches.findIndex(m => m.id === match.id);
        if (wIndex !== -1) {
            if (wIndex < 4) return `R1 ${wIndex + 1}`; // Match 1, 2, 3, 4
            if (wIndex < 6) return `R2 ${wIndex - 3}`; // Match 5, 6 -> 1, 2
            return `FINAL WINNERS`;
        }

        // Losers
        const losersMatches = sortedMatches.filter(m => m.bracketStage === 'losers' && m.stage !== Stage.FINALS);
        const lIndex = losersMatches.findIndex(m => m.id === match.id);
        if (lIndex !== -1) {
             if (lIndex < 2) return `L-R1 ${lIndex + 1}`;
             if (lIndex < 4) return `L-R2 ${lIndex - 1}`;
             if (lIndex === 4) return `L-SEMIFINAL`;
             return `L-FINAL`;
        }

        return `PARTIDO ${match.id}`; // Fallback
  };

  // Filter matches for List View (By Round)
  const listMatches = useMemo(() => {
      return allMatches
        .filter(m => (m.stage === Stage.PLAYOFFS || m.stage === Stage.FINALS) && m.day === currentDay)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [allMatches, currentDay]);

  const checkUnsavedChanges = (day: number) => {
    const dayMatchIds = allMatches
        .filter(m => (m.stage === Stage.PLAYOFFS || m.stage === Stage.FINALS) && m.day === day && !m.id.startsWith('temp-'))
        .map(m => m.id);

    if (dayMatchIds.length === 0) return false;

    const currentDayPreds = predictions.filter(p => dayMatchIds.includes(p.matchId));
    const initialDayPreds = initialPredictions.filter(p => dayMatchIds.includes(p.matchId));
    
    if (currentDayPreds.length !== initialDayPreds.length) return true;

    return currentDayPreds.some(curr => {
        const init = initialDayPreds.find(i => i.matchId === curr.matchId);
        return !init || init.predictedWinnerId !== curr.predictedWinnerId;
    });
  };

  const isDayVisible = visibleDays.includes(currentDay);
  const isManuallyClosed = closedDays.includes(currentDay);
  
  // Logic for Global Lock (Manual Only for flexibility)
  const isGlobalPlayoffLock = useMemo(() => {
      // Solo bloqueamos "globalmente" si el admin ha cerrado la jornada 1 manualmente.
      // Ya NO bloqueamos por tiempo del primer partido, permitiendo picks individuales.
      return closedDays.includes(1);
  }, [closedDays]);

  const isLockedForUser = isManuallyClosed || isGlobalPlayoffLock;

  const handleSelectWinner = (matchId: string, teamId: string) => {
    if (isEditMode) return;
    
    // Validación individual de tiempo para seguridad
    const match = allMatches.find(m => m.id === matchId);
    if (match && !isAdmin) {
        // Si el partido ya empezó, no permitir cambios aunque la jornada esté abierta
        if (new Date() >= new Date(match.startTime)) return;
    }

    setPredictions(prev => {
      const existing = prev.find(p => p.matchId === matchId);
      if (existing) {
        return prev.map(p => p.matchId === matchId ? { ...p, predictedWinnerId: teamId } : p);
      }
      return [...prev, { matchId, predictedWinnerId: teamId }];
    });
    setSaveStatus('idle');
    setErrorMessage(null);
  };

  const handleCreateNewMatch = () => {
      const tempMatch: Match = {
          id: `temp-${Date.now()}`,
          teamA: TEAMS.fnc,
          teamB: TEAMS.g2,
          startTime: new Date().toISOString(),
          stage: Stage.PLAYOFFS, 
          isCompleted: false,
          day: currentDay,
          bracketStage: 'winners'
      };
      setNewMatch(tempMatch);
  };

  const handleAdminUpdate = async (matchId: string, updates: any) => {
      try {
          if (matchId.startsWith('temp-')) {
             await dataService.createMatch({
                split_id: 'winter_2026',
                team_a_id: updates.teamA,
                team_b_id: updates.teamB,
                start_time: updates.startTime,
                stage: Stage.PLAYOFFS,
                status: updates.status,
                day: currentDay,
                bracketStage: updates.bracketStage,
                bestOf: updates.bestOf || 1
             });
             setNewMatch(null);
          } else {
             const dbUpdates = {
                team_a_id: updates.teamA,
                team_b_id: updates.teamB,
                start_time: updates.startTime, 
                status: updates.winnerId ? 'finished' : updates.status,
                winner_id: updates.winnerId || null,
                day: updates.day,
                bracketStage: updates.bracketStage,
                bestOf: updates.bestOf
             };
             await dataService.updateMatch(matchId, dbUpdates);
          }
          const updatedMatches = await dataService.getMatches();
          setAllMatches(updatedMatches);
      } catch (error) {
          console.error("Failed to update/create match:", error);
          alert("Error actualizando o creando el partido.");
      }
  };

  const handleAdminDelete = async (matchId: string) => {
      const originalMatches = [...allMatches];
      setAllMatches(prev => prev.filter(m => m.id !== matchId));

      try {
          if (matchId.startsWith('temp-')) {
              setNewMatch(null);
              return;
          }
          await dataService.deleteMatch(matchId);
          const updatedMatches = await dataService.getMatches();
          setAllMatches(updatedMatches);
      } catch (error: any) {
          console.error("Error deleting match", error);
          alert("Error al borrar el partido.");
          setAllMatches(originalMatches);
      }
  };

  const handleToggleVisibility = async () => {
      if (!isAdmin) return;
      let newVisibleDays = visibleDays.includes(currentDay) 
          ? visibleDays.filter(d => d !== currentDay) 
          : [...visibleDays, currentDay];
      
      setVisibleDays(newVisibleDays);
      // Use specific key for Playoffs
      await dataService.updateGlobalConfig({ playoffVisibleDays: newVisibleDays });
  };

  const handleToggleLock = async () => {
      if (!isAdmin) return;
      let newClosedDays = closedDays.includes(currentDay)
          ? closedDays.filter(d => d !== currentDay)
          : [...closedDays, currentDay];
      
      setClosedDays(newClosedDays);
      // Use specific key for Playoffs
      await dataService.updateGlobalConfig({ playoffClosedDays: newClosedDays });
  };

  const handleAddRound = async () => {
      if (!isAdmin) return;
      const newTotal = totalRounds + 1;
      setTotalRounds(newTotal);
      // Update rounds only
      await dataService.updateGlobalConfig({ playoffRounds: newTotal });
  };

  const handleDeleteRound = async () => {
      if (!isAdmin) return;
      if (totalRounds <= 1) return;
      const newTotal = totalRounds - 1;
      setTotalRounds(newTotal);
      if (currentDay > newTotal) setCurrentDay(newTotal);
      // Update rounds only
      await dataService.updateGlobalConfig({ playoffRounds: newTotal });
  };

  const handleBatchSave = async () => {
      if (!currentUserId) {
          alert("Debes iniciar sesión para guardar.");
          return;
      }
      if (isEditMode) return;
      
      setIsSaving(true);
      isSavingRef.current = true;
      setSaveStatus('idle');
      setErrorMessage(null);

      const relevantMatchIds = viewMode === 'bracket' 
          ? bracketMatches.map(m => m.id)
          : listMatches.map(m => m.id);
      
      const predsToSave = predictions
        .filter(p => relevantMatchIds.includes(p.matchId))
        .map(p => ({
            user_id: currentUserId,
            match_id: p.matchId,
            predicted_winner_id: p.predictedWinnerId
        }));

      if (predsToSave.length === 0) {
          setIsSaving(false);
          return;
      }

      const fallbackTimer = setTimeout(() => {
          if (isSavingRef.current) {
              setIsSaving(false);
              isSavingRef.current = false;
              setSaveStatus('error');
              setErrorMessage("La conexión es lenta...");
          }
      }, 60000);

      try {
          await dataService.savePredictions(predsToSave);
          
          if (onPredictionsSaved) {
              await onPredictionsSaved();
          }

          setSaveStatus('success');
          setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (error: any) {
          console.error("Error saving playoffs:", error);
          setSaveStatus('error');
          setErrorMessage(error.message || "Error al guardar");
      } finally {
          clearTimeout(fallbackTimer);
          setIsSaving(false);
          isSavingRef.current = false;
      }
  };

  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);

  return (
    <div className={`animate-in fade-in slide-in-from-bottom-4 pb-24 transition-all duration-300 ${isEditMode ? 'border-l-4 border-r-4 border-red-900/50 bg-red-950/10 min-h-screen' : ''}`}>
      
      {/* Header */}
      <div className={`sticky top-0 z-30 pt-4 pb-4 -mx-4 px-4 border-b mb-6 backdrop-blur-md transition-colors ${isEditMode ? 'bg-red-950/90 border-red-800' : 'bg-[#0a1428]/95 border-gray-800'}`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full border ${isEditMode ? 'bg-red-900 border-red-500' : 'bg-hextech-900 border-hextech-500/30'}`}>
                    <Trophy className={`w-5 h-5 ${isEditMode ? 'text-white' : 'text-hextech-500'}`} />
                </div>
                <div>
                    <h2 className={`text-xl font-bold uppercase tracking-wide ${isEditMode ? 'text-white' : 'text-[#c8aa6e]'}`}>
                        {isEditMode ? 'ADMIN PLAYOFFS' : 'Fase Final'}
                    </h2>
                    <p className={`text-[10px] uppercase tracking-widest leading-none ${isEditMode ? 'text-red-300' : 'text-hextech-500/60'}`}>
                        {isEditMode ? 'Configurando Cuadro' : 'Winter 2026'}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* View Switcher (Hidden on Mobile) */}
                {!isEditMode && (
                    <div className="hidden md:flex bg-[#0f1d36] p-1 rounded-lg border border-gray-700 items-center">
                        <button 
                            onClick={() => setViewMode('bracket')}
                            className={`p-2 rounded flex items-center gap-2 text-xs font-bold uppercase transition-all ${viewMode === 'bracket' ? 'bg-[#c8aa6e] text-[#0a1428]' : 'text-gray-400 hover:text-white'}`}
                        >
                            <GitMerge className="w-4 h-4" />
                            <span className="hidden sm:inline">Árbol</span>
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded flex items-center gap-2 text-xs font-bold uppercase transition-all ${viewMode === 'list' ? 'bg-[#c8aa6e] text-[#0a1428]' : 'text-gray-400 hover:text-white'}`}
                        >
                            <List className="w-4 h-4" />
                            <span className="hidden sm:inline">Lista</span>
                        </button>
                    </div>
                )}

                {isAdmin && (
                    <button 
                        onClick={() => {
                            setIsEditMode(!isEditMode);
                            setNewMatch(null); 
                            // Force list view on edit for easier management
                            if (!isEditMode) setViewMode('list');
                        }}
                        className={`
                            flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all h-full
                            ${isEditMode 
                                ? 'bg-red-600 border-red-400 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' 
                                : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white hover:border-gray-400'
                            }
                        `}
                    >
                        <Settings className={`w-4 h-4 ${isEditMode ? 'animate-spin-slow' : ''}`} />
                        {isEditMode ? 'Salir' : 'Admin'}
                    </button>
                )}
            </div>
        </div>

        {/* --- SCORING LEGEND --- */}
        {!isEditMode && (
            <div className="flex flex-wrap justify-center gap-2 mb-4 animate-in fade-in slide-in-from-top-2">
                <PointBadge points={3} label="R1 / L-R1" />
                <PointBadge points={4} label="R2 / L-R2" />
                <PointBadge points={6} label="L-Semi" />
                <PointBadge points={8} label="Final W / L-Final" />
                <PointBadge points={10} label="Gran Final" />
            </div>
        )}

        {/* Round Selector (Shown in List View, Admin Mode OR Mobile) */}
        {(viewMode === 'list' || isEditMode) && (
            <div className="block md:block"> 
                <DaySelector 
                    days={rounds} 
                    currentDay={currentDay} 
                    isEditMode={isEditMode}
                    activeDays={visibleDays}
                    closedDays={closedDays}
                    checkUnsaved={checkUnsavedChanges}
                    onSelect={setCurrentDay}
                />
            </div>
        )}
        
        {/* Mobile-only DaySelector fallback if viewMode is bracket (since bracket is hidden on mobile) */}
        {viewMode === 'bracket' && !isEditMode && (
            <div className="block md:hidden">
                 <DaySelector 
                    days={rounds} 
                    currentDay={currentDay} 
                    isEditMode={isEditMode}
                    activeDays={visibleDays}
                    closedDays={closedDays}
                    checkUnsaved={checkUnsavedChanges}
                    onSelect={setCurrentDay}
                />
            </div>
        )}
        
        {/* Admin Toolbar */}
        {isEditMode && (
            <div className="mt-4 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 justify-end">
                 <div className="flex items-center gap-2 border-r border-red-800 pr-2 mr-2">
                    <button 
                        onClick={handleDeleteRound}
                        disabled={totalRounds <= 1}
                        className="p-2 rounded-lg bg-red-950 border border-red-800 text-red-400 hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Borrar última ronda"
                    >
                        <Trash className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={handleAddRound}
                        className="p-2 rounded-lg bg-red-950 border border-red-800 text-red-400 hover:bg-red-900"
                        title="Añadir ronda"
                    >
                        <CirclePlus className="w-4 h-4" />
                    </button>
                </div>

                <button 
                    onClick={handleToggleVisibility}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase border transition-all ${
                        isDayVisible 
                        ? 'bg-blue-900/50 border-blue-500 text-blue-300 hover:bg-blue-900' 
                        : 'bg-gray-800 border-gray-500 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                    {isDayVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {isDayVisible ? 'Visible' : 'Oculto (TBD)'}
                </button>

                <button 
                    onClick={handleToggleLock}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase border transition-all ${
                        !isManuallyClosed 
                        ? 'bg-green-900/50 border-green-500 text-green-300 hover:bg-green-900' 
                        : 'bg-red-900/50 border-red-500 text-red-300 hover:bg-red-900'
                    }`}
                >
                    {isManuallyClosed ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    {isManuallyClosed ? 'Cerrada' : 'Abierta'}
                </button>
            </div>
        )}
      </div>

      {/* CONTENT AREA */}
      <div className="animate-in fade-in duration-500">
        
        {/* --- BRACKET VIEW (Desktop Only) --- */}
        {viewMode === 'bracket' && !isEditMode && (
            <div className="hidden md:block overflow-x-auto">
                 {isLoadingMatches ? (
                     <div className="flex flex-col items-center justify-center py-20 text-[#c8aa6e]">
                        <Loader2 className="w-10 h-10 animate-spin mb-4" />
                        <p>Generando cuadro de competición...</p>
                    </div>
                 ) : (
                     <PlayoffBracket 
                        matches={bracketMatches} 
                        teams={allTeams}
                        predictions={predictions}
                        onSelectWinner={handleSelectWinner}
                        isLocked={isGlobalPlayoffLock}
                     />
                 )}
            </div>
        )}

        {/* --- LIST VIEW (Mobile Always OR Desktop if selected) --- */}
        <div className={viewMode === 'list' || isEditMode ? 'block' : 'block md:hidden'}>
            <div className="space-y-6">
                {!isEditMode && (
                    <>
                        {!isDayVisible && (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-500 border-2 border-dashed border-gray-800 rounded-2xl bg-black/20">
                                <CalendarOff className="w-12 h-12 mb-4 opacity-50" />
                                <h3 className="text-lg font-bold text-gray-400 mb-1">Ronda {currentDay}</h3>
                                <p className="uppercase tracking-widest text-xs font-bold text-[#c8aa6e]">
                                    TBD / Por determinar
                                </p>
                            </div>
                        )}

                        {isDayVisible && isLockedForUser && (
                            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 flex items-center justify-center gap-2 text-red-300 mb-6 animate-in slide-in-from-top-2 font-bold uppercase tracking-widest text-sm">
                                <Lock className="w-4 h-4" />
                                <span>Predicciones Cerradas</span>
                            </div>
                        )}
                    </>
                )}

                {(isEditMode || isDayVisible) && (
                    <>
                        {isLoadingMatches ? (
                            <div className="flex flex-col items-center justify-center py-12 text-[#c8aa6e]">
                                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                                <p>Cargando lista...</p>
                            </div>
                        ) : listMatches.length === 0 && !newMatch ? (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-500 border-2 border-dashed border-gray-800 rounded-2xl">
                                <Trophy className="w-12 h-12 mb-4 opacity-50" />
                                <h3 className="text-lg font-bold text-gray-400 mb-1">Sin Partidos</h3>
                                <p className="uppercase tracking-widest text-xs font-bold text-[#c8aa6e]">
                                    No hay encuentros programados en esta ronda
                                </p>
                            </div>
                        ) : (
                            listMatches.map(match => (
                                <MatchCard 
                                    key={match.id} 
                                    match={match}
                                    teams={allTeams}
                                    selectedWinnerId={predictions.find(p => p.matchId === match.id)?.predictedWinnerId}
                                    onSelectWinner={handleSelectWinner}
                                    isEditing={isEditMode}
                                    isDayLocked={isLockedForUser} 
                                    customTitle={getBracketLabel(match)} 
                                    onUpdate={(updates) => handleAdminUpdate(match.id, updates)}
                                    onDelete={() => handleAdminDelete(match.id)}
                                />
                            ))
                        )}

                        {newMatch && (
                            <div className="animate-in slide-in-from-bottom-8">
                                <MatchCard 
                                    key="new-match-temp"
                                    match={newMatch}
                                    teams={allTeams}
                                    isEditing={true}
                                    onSelectWinner={() => {}}
                                    onUpdate={(updates) => handleAdminUpdate(newMatch.id, updates)}
                                    onCancel={() => setNewMatch(null)}
                                    onDelete={() => setNewMatch(null)}
                                />
                            </div>
                        )}

                        {isAdmin && isEditMode && !newMatch && (
                            <button 
                                onClick={handleCreateNewMatch}
                                className="w-full py-4 border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-800/50 transition-all group"
                            >
                                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-gray-700">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <span className="font-bold uppercase tracking-wider text-sm">Añadir Partido a Ronda {currentDay}</span>
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>

      </div>

      {/* Footer Action (Save Button) */}
      {!isEditMode && !isLockedForUser && (
          <div className="fixed bottom-8 left-0 right-0 px-4 flex flex-col items-center pointer-events-none z-40 gap-2">
            
            {saveStatus === 'error' && errorMessage && (
                 <div className="bg-red-900/90 border border-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errorMessage}</span>
                 </div>
            )}

            <button 
                onClick={handleBatchSave}
                disabled={isSaving}
                className={`
                    pointer-events-auto shadow-2xl px-6 py-3 rounded-full font-bold flex items-center gap-3 transition-all transform border
                    ${saveStatus === 'success' 
                        ? 'bg-green-600 border-green-400 text-white scale-105' 
                        : saveStatus === 'error'
                            ? 'bg-red-900 border-red-500 text-white'
                        : isSaving 
                            ? 'bg-blue-900 border-blue-700 text-gray-400 cursor-wait'
                            : 'bg-[#c8aa6e] border-yellow-500 text-[#0a1428] hover:bg-[#d6bb82] hover:scale-105 shadow-[0_0_20px_rgba(200,170,110,0.5)]'
                    }
                `}
            >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                saveStatus === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
                saveStatus === 'error' ? <AlertTriangle className="w-5 h-5" /> :
                <Save className="w-5 h-5" />}
                
                <div className="flex flex-col items-start leading-none">
                    <span className="text-sm">
                        {saveStatus === 'success' ? 'GUARDADO' : saveStatus === 'error' ? 'REINTENTAR' : 'GUARDAR PREDICCIONES'}
                    </span>
                    <span className="text-[10px] opacity-80 mt-1">
                        Se guardarán todos los cambios
                    </span>
                </div>
            </button>
          </div>
      )}
    </div>
  );
};