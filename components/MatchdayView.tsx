
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MatchCard } from './MatchCard';
import { DaySelector } from './DaySelector';
import { UserPrediction, Match, Team, Stage, Player } from '../types';
import { CalendarCheck, Save, Loader2, CheckCircle2, Settings, Plus, CalendarOff, AlertTriangle, AlertCircle, Lock, Unlock, Eye, EyeOff, Trophy } from 'lucide-react';
import { dataService } from '../services/dataService';
import { TEAMS } from '../constants';
import { StatsEntryModal } from './StatsEntryModal';
import { StatsViewerModal } from './StatsViewerModal';

interface MatchdayViewProps {
    currentUserId: string | null;
    initialPredictions?: UserPrediction[];
    isAdmin?: boolean;
    onPredictionsSaved?: () => Promise<void> | void; 
}

export const MatchdayView: React.FC<MatchdayViewProps> = ({ 
    currentUserId, 
    initialPredictions = [], 
    isAdmin = false,
    onPredictionsSaved 
}) => {
  const [currentDay, setCurrentDay] = useState(1);
  const [visibleDays, setVisibleDays] = useState<number[]>([]); 
  const [closedDays, setClosedDays] = useState<number[]>([]); 
  
  // State for ALL matches loaded from DB
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]); // Need players for stats
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);

  const [predictions, setPredictions] = useState<UserPrediction[]>(initialPredictions);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null); 

  // Admin Mode State
  const [isEditMode, setIsEditMode] = useState(false);
  const [newMatch, setNewMatch] = useState<Match | null>(null);
  
  // Stats Modal State (Admin)
  const [statsMatch, setStatsMatch] = useState<Match | null>(null);
  const [isSavingStats, setIsSavingStats] = useState(false);

  // Stats View State (User)
  const [viewStatsMatch, setViewStatsMatch] = useState<Match | null>(null);

  // Sync state with props (Cloud Data)
  useEffect(() => {
    setPredictions(initialPredictions);
  }, [initialPredictions]);

  // Initial Data Load (All Matches + Players)
  useEffect(() => {
    const loadData = async () => {
        setIsLoadingMatches(true);
        setNewMatch(null); 
        try {
            // Cargar TODOS los partidos de una vez para poder calcular cambios en cualquier jornada
            const [fetchedMatches, teamsMap, config, playersList] = await Promise.all([
                dataService.getMatches(), 
                dataService.getTeams(),
                dataService.getDaysConfig(),
                dataService.getPlayers()
            ]);
            
            setAllMatches(fetchedMatches);
            setAllTeams(Object.values(teamsMap));
            setAllPlayers(playersList);
            
            setVisibleDays(config.visibleDays);
            setClosedDays(config.closedDays);
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setIsLoadingMatches(false);
        }
    };
    loadData();
  }, []);

  // Derive matches for current day from allMatches state
  const matches = useMemo(() => {
      return allMatches
        .filter(m => m.day === currentDay && m.stage === Stage.GROUPS)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [allMatches, currentDay]);

  // Calculate Standing Records (Wins-Losses) based on ALL completed regular season matches
  const teamRecords = useMemo(() => {
      const records: Record<string, { w: number, l: number }> = {};
      
      // Initialize for all known teams
      allTeams.forEach(t => {
          records[t.id] = { w: 0, l: 0 };
      });

      // Filter for completed Regular Season matches
      const completedMatches = allMatches.filter(m => 
          m.stage === Stage.GROUPS && m.isCompleted && m.winnerId
      );

      completedMatches.forEach(m => {
          if (m.winnerId) {
              // Ensure record object exists (for teams added later or not in initial list)
              if (!records[m.teamA.id]) records[m.teamA.id] = { w: 0, l: 0 };
              if (!records[m.teamB.id]) records[m.teamB.id] = { w: 0, l: 0 };

              if (m.winnerId === m.teamA.id) {
                  records[m.teamA.id].w++;
                  records[m.teamB.id].l++;
              } else {
                  records[m.teamB.id].w++;
                  records[m.teamA.id].l++;
              }
          }
      });

      return records;
  }, [allMatches, allTeams]);

  // Robust check for unsaved changes using actual match data logic instead of ID string parsing
  const checkUnsavedChanges = (day: number) => {
    // 1. Obtener los IDs de los partidos que pertenecen a este día Y son de fase regular
    const dayMatchIds = allMatches
        .filter(m => m.day === day && m.stage === Stage.GROUPS && !m.id.startsWith('temp-'))
        .map(m => m.id);

    if (dayMatchIds.length === 0) return false;

    // 2. Filtrar las predicciones locales e iniciales relevantes para este día
    const currentDayPreds = predictions.filter(p => dayMatchIds.includes(p.matchId));
    const initialDayPreds = initialPredictions.filter(p => dayMatchIds.includes(p.matchId));
    
    // 3. Comparar cantidades
    if (currentDayPreds.length !== initialDayPreds.length) return true;

    // 4. Comparar contenido (si cambió el ganador)
    return currentDayPreds.some(curr => {
        const init = initialDayPreds.find(i => i.matchId === curr.matchId);
        return !init || init.predictedWinnerId !== curr.predictedWinnerId;
    });
  };

  // --- LOGIC RULES ---
  const isDayVisible = visibleDays.includes(currentDay);
  const isManuallyClosed = closedDays.includes(currentDay);
  const now = new Date();
  const firstMatchTime = matches.length > 0 ? new Date(matches[0].startTime) : null;
  const isTimeLocked = firstMatchTime ? now >= firstMatchTime : false;
  const isLockedForUser = isManuallyClosed || isTimeLocked;

  const handleSelectWinner = (matchId: string, teamId: string) => {
    if (isEditMode) return;
    if (isLockedForUser) return; 

    const match = matches.find(m => m.id === matchId);
    if (match) {
        const startTime = new Date(match.startTime);
        if (now >= startTime && !match.isCompleted && !isAdmin) return; 
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
          stage: Stage.GROUPS, // Force Stage.GROUPS for Matchday View
          isCompleted: false,
          day: currentDay,
          bestOf: 1 // Default BO1
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
                stage: Stage.GROUPS, // Explicitly set to GROUPS
                status: updates.status,
                day: currentDay,
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
                bestOf: updates.bestOf
             };
             await dataService.updateMatch(matchId, dbUpdates);
          }
          // Re-fetch ALL to keep state consistent
          const updatedMatches = await dataService.getMatches();
          setAllMatches(updatedMatches);
      } catch (error) {
          console.error("Failed to update/create match:", error);
          alert("Error actualizando o creando el partido. Comprueba la consola.");
      }
  };

  const handleAdminDelete = async (matchId: string) => {
      // Optimistic update
      const originalMatches = [...allMatches];
      setAllMatches(prev => prev.filter(m => m.id !== matchId));

      try {
          if (matchId.startsWith('temp-')) {
              setNewMatch(null);
              return;
          }
          await dataService.deleteMatch(matchId);
          // Confirm with server state
          const updatedMatches = await dataService.getMatches();
          setAllMatches(updatedMatches);
      } catch (error: any) {
          console.error("FATAL ERROR deleting match", error);
          alert("Error crítico al borrar el partido: " + (error.message || JSON.stringify(error)));
          setAllMatches(originalMatches); // Rollback
      }
  };

  const handleToggleVisibility = async () => {
      if (!isAdmin) return;
      let newVisibleDays = visibleDays.includes(currentDay) 
          ? visibleDays.filter(d => d !== currentDay) 
          : [...visibleDays, currentDay];
      
      setVisibleDays(newVisibleDays);
      await dataService.updateGlobalConfig({ visibleDays: newVisibleDays, closedDays });
  };

  const handleToggleLock = async () => {
      if (!isAdmin) return;
      let newClosedDays = closedDays.includes(currentDay)
          ? closedDays.filter(d => d !== currentDay)
          : [...closedDays, currentDay];
      
      setClosedDays(newClosedDays);
      await dataService.updateGlobalConfig({ visibleDays, closedDays: newClosedDays });
  };

  const handleSaveStats = async (games: any) => {
      if (!statsMatch) return;
      setIsSavingStats(true);
      try {
          await dataService.saveMatchStatsAndCalculate(statsMatch.id, games);
          setStatsMatch(null); // Close modal
          // Refresh matches to show updated state (e.g. green button?)
          const updated = await dataService.getMatches();
          setAllMatches(updated);
      } catch (e) {
          console.error(e);
          alert("Error guardando estadísticas");
      } finally {
          setIsSavingStats(false);
      }
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

      // Use matches (filtered for current day) to determine what to save
      const currentDayMatchIds = matches.filter(m => !m.id.startsWith('temp-')).map(m => m.id);
      
      const dayPredictions = predictions
        .filter(p => currentDayMatchIds.includes(p.matchId))
        .map(p => ({
            user_id: currentUserId,
            match_id: p.matchId,
            predicted_winner_id: p.predictedWinnerId
        }));

      const fallbackTimer = setTimeout(() => {
          if (isSavingRef.current) {
              setIsSaving(false);
              isSavingRef.current = false;
              setSaveStatus('error');
              setErrorMessage("La conexión es lenta, pero seguimos intentándolo...");
          }
      }, 60000);

      try {
          await dataService.savePredictions(dayPredictions);
          
          if (onPredictionsSaved) {
              await onPredictionsSaved();
          }

          setSaveStatus('success');
          setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (error: any) {
          console.error("Error saving matchday:", error);
          setSaveStatus('error');
          const msg = error instanceof Error ? error.message : (typeof error === 'string' ? error : "Error desconocido al guardar");
          setErrorMessage(msg);
      } finally {
          clearTimeout(fallbackTimer);
          setIsSaving(false);
          isSavingRef.current = false;
      }
  };

  const days = Array.from({ length: 11 }, (_, i) => i + 1);
  const validMatches = matches.filter(m => !m.id.startsWith('temp-'));
  const validMatchIds = validMatches.map(m => m.id);
  const currentDayPredictionsCount = predictions.filter(p => validMatchIds.includes(p.matchId)).length;
  const totalMatches = validMatches.length;

  return (
    <div className={`animate-in fade-in slide-in-from-bottom-4 pb-24 transition-all duration-300 ${isEditMode ? 'border-l-4 border-r-4 border-red-900/50 bg-red-950/10 min-h-screen' : ''}`}>
      
      {/* Header with Day Selector */}
      <div className={`sticky top-0 z-30 pt-4 pb-4 -mx-4 px-4 border-b mb-6 backdrop-blur-md transition-colors ${isEditMode ? 'bg-red-950/90 border-red-800' : 'bg-[#0a1428]/95 border-gray-800'}`}>
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full border ${isEditMode ? 'bg-red-900 border-red-500' : 'bg-blue-900/20 border-blue-500/30'}`}>
                    <CalendarCheck className={`w-5 h-5 ${isEditMode ? 'text-white' : 'text-blue-400'}`} />
                </div>
                <div>
                    <h2 className={`text-xl font-bold uppercase tracking-wide ${isEditMode ? 'text-white' : 'text-[#c8aa6e]'}`}>
                        {isEditMode ? 'MODO ADMINISTRADOR' : 'Fase Regular'}
                    </h2>
                    <p className={`text-[10px] uppercase tracking-widest leading-none ${isEditMode ? 'text-red-300' : 'text-blue-300/60'}`}>
                        {isEditMode ? 'Editando Datos en Vivo' : 'Winter 2026'}
                    </p>
                </div>
            </div>

            {isAdmin && (
                <button 
                    onClick={() => {
                        setIsEditMode(!isEditMode);
                        setNewMatch(null); 
                    }}
                    className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all
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

        <DaySelector 
            days={days} 
            currentDay={currentDay} 
            isEditMode={isEditMode}
            activeDays={visibleDays}
            closedDays={closedDays}
            checkUnsaved={checkUnsavedChanges}
            onSelect={setCurrentDay}
        />
        
        {/* Admin Dual Control Toolbar */}
        {isEditMode && (
            <div className="mt-4 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 justify-end">
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

      {/* Matches List */}
      <div className="space-y-6 animate-in fade-in duration-500">
        
        {/* State Banner: Closed/Hidden (For User) */}
        {!isEditMode && (
            <>
                {!isDayVisible && (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-500 border-2 border-dashed border-gray-800 rounded-2xl bg-black/20">
                        <CalendarOff className="w-12 h-12 mb-4 opacity-50" />
                        <h3 className="text-lg font-bold text-gray-400 mb-1">Jornada {currentDay}</h3>
                        <p className="uppercase tracking-widest text-xs font-bold text-[#c8aa6e]">
                            TBD / Partidos por determinar
                        </p>
                    </div>
                )}

                {isDayVisible && isLockedForUser && (
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 flex items-center justify-center gap-2 text-red-300 mb-6 animate-in slide-in-from-top-2 font-bold uppercase tracking-widest text-sm">
                        <Lock className="w-4 h-4" />
                        <span>Jornada Cerrada</span>
                    </div>
                )}

                {/* SCORING LEGEND */}
                {isDayVisible && matches.length > 0 && (
                    <div className="flex justify-center -mt-2 mb-2 animate-in fade-in">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-widest shadow-sm">
                            <Trophy className="w-3 h-3" />
                            <span>Acierto: +1 Punto</span>
                        </div>
                    </div>
                )}
            </>
        )}

        {(isEditMode || isDayVisible) && (
            <>
                {isEditMode && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        {!isDayVisible && (
                            <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-3 flex items-center gap-2 text-gray-400 text-xs font-bold uppercase">
                                <EyeOff className="w-4 h-4" />
                                <span>Vista Usuario: TBD</span>
                            </div>
                        )}
                        {isManuallyClosed && (
                            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-400 text-xs font-bold uppercase">
                                <Lock className="w-4 h-4" />
                                <span>Votación: Bloqueada</span>
                            </div>
                        )}
                    </div>
                )}

                {isLoadingMatches ? (
                    <div className="flex flex-col items-center justify-center py-12 text-[#c8aa6e]">
                        <Loader2 className="w-8 h-8 animate-spin mb-4" />
                        <p>Cargando enfrentamientos...</p>
                    </div>
                ) : matches.length === 0 && !newMatch ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-500 border-2 border-dashed border-gray-800 rounded-2xl">
                        <CalendarOff className="w-12 h-12 mb-4 opacity-50" />
                        <h3 className="text-lg font-bold text-gray-400 mb-1">Sin Datos</h3>
                        <p className="uppercase tracking-widest text-xs font-bold text-[#c8aa6e]">
                            No hay partidos creados
                        </p>
                    </div>
                ) : (
                    matches.map(match => {
                        // Get records from calculated map
                        const recA = teamRecords[match.teamA.id];
                        const recB = teamRecords[match.teamB.id];
                        const strRecA = recA ? `${recA.w}-${recA.l}` : undefined;
                        const strRecB = recB ? `${recB.w}-${recB.l}` : undefined;

                        return (
                            <MatchCard 
                                key={match.id} 
                                match={match}
                                teams={allTeams}
                                selectedWinnerId={predictions.find(p => p.matchId === match.id)?.predictedWinnerId}
                                onSelectWinner={handleSelectWinner}
                                isEditing={isEditMode}
                                isDayLocked={isLockedForUser}
                                teamARecord={strRecA}
                                teamBRecord={strRecB}
                                onUpdate={(updates) => handleAdminUpdate(match.id, updates)}
                                onDelete={() => handleAdminDelete(match.id)}
                                onEditStats={(m) => setStatsMatch(m)}
                                onViewStats={(m) => setViewStatsMatch(m)}
                            />
                        );
                    })
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
                        <span className="font-bold uppercase tracking-wider text-sm">Añadir Partido a Jornada {currentDay}</span>
                    </button>
                )}
            </>
        )}

      </div>

      {/* Footer Action (Save Button) */}
      {!isEditMode && matches.length > 0 && isDayVisible && !isLockedForUser && (
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
                        {saveStatus === 'success' ? 'GUARDADO EN LA NUBE' : saveStatus === 'error' ? 'REINTENTAR' : 'GUARDAR PREDICCIONES'}
                    </span>
                    {saveStatus !== 'success' && saveStatus !== 'error' && (
                        <span className="text-[10px] opacity-80 mt-1">
                            {currentDayPredictionsCount} de {totalMatches} seleccionados
                        </span>
                    )}
                </div>
            </button>
          </div>
      )}

      {/* STATS ENTRY MODAL (ADMIN) */}
      {statsMatch && (
          <StatsEntryModal 
              match={statsMatch}
              teamA={statsMatch.teamA}
              teamB={statsMatch.teamB}
              allPlayers={allPlayers}
              onClose={() => setStatsMatch(null)}
              onSave={handleSaveStats}
              isSaving={isSavingStats}
          />
      )}

      {/* STATS VIEWER MODAL (USER) */}
      {viewStatsMatch && (
          <StatsViewerModal 
              match={viewStatsMatch}
              teamA={viewStatsMatch.teamA}
              teamB={viewStatsMatch.teamB}
              allPlayers={allPlayers}
              onClose={() => setViewStatsMatch(null)}
          />
      )}
    </div>
  );
};
