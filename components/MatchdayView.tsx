import React, { useState, useRef, useEffect } from 'react';
import { MatchCard } from './MatchCard';
import { DaySelector } from './DaySelector';
import { UserPrediction, Match, Team, Stage } from '../types';
import { CalendarCheck, Save, Loader2, CheckCircle2, Settings, Plus, CalendarOff, AlertTriangle, AlertCircle, Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import { dataService } from '../services/dataService';
import { TEAMS } from '../constants';

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
  const [closedDays, setClosedDays] = useState<number[]>([]); // New state for manually closed days
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);

  const [predictions, setPredictions] = useState<UserPrediction[]>(initialPredictions);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null); 

  // Admin Mode State
  const [isEditMode, setIsEditMode] = useState(false);
  const [newMatch, setNewMatch] = useState<Match | null>(null);

  // Sincronizar estado local con props (Cloud Data)
  useEffect(() => {
    setPredictions(initialPredictions);
  }, [initialPredictions]);

  useEffect(() => {
    const loadData = async () => {
        setIsLoadingMatches(true);
        setNewMatch(null); 
        try {
            const [fetchedMatches, teamsMap, config] = await Promise.all([
                dataService.getMatches(currentDay),
                dataService.getTeams(),
                dataService.getDaysConfig()
            ]);
            // Sort matches by time to find the first one easily
            const sortedMatches = fetchedMatches.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
            setMatches(sortedMatches);
            setAllTeams(Object.values(teamsMap));
            
            setVisibleDays(config.visibleDays);
            setClosedDays(config.closedDays);
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setIsLoadingMatches(false);
        }
    };
    loadData();
  }, [currentDay]);

  const checkUnsavedChanges = (day: number) => {
    const dayPrefix = `d${day}-`;
    const currentDayPreds = predictions.filter(p => p.matchId.startsWith(dayPrefix));
    const initialDayPreds = initialPredictions.filter(p => p.matchId.startsWith(dayPrefix));
    
    if (currentDayPreds.length !== initialDayPreds.length) return true;
    return currentDayPreds.some(curr => {
        const init = initialDayPreds.find(i => i.matchId === curr.matchId);
        return !init || init.predictedWinnerId !== curr.predictedWinnerId;
    });
  };

  // --- LOGIC RULES ---
  
  // 1. Visibility: Controlled by Admin (Eye Icon).
  const isDayVisible = visibleDays.includes(currentDay);

  // 2. Manual Lock: Controlled by Admin (Lock Icon).
  const isManuallyClosed = closedDays.includes(currentDay);

  // 3. Auto-Lock: Locked if the FIRST match of the day has started.
  const now = new Date();
  const firstMatchTime = matches.length > 0 ? new Date(matches[0].startTime) : null;
  const isTimeLocked = firstMatchTime ? now >= firstMatchTime : false;

  // 4. Is Effectively Locked for User UI (shows Lock icon and disables inputs)
  const isLockedForUser = isManuallyClosed || isTimeLocked;

  // 5. Can Vote: Not Locked (Admin can override ONLY if they are editing via the Admin Tools, not clicking the cards directly)
  // Logic: If locked, nobody votes via cards.
  const canVote = !isLockedForUser;

  const handleSelectWinner = (matchId: string, teamId: string) => {
    if (isEditMode) return;
    
    // Strict Lock Check: If locked manually or by time, REJECT vote even for admin via this method
    // (Admin should use Edit Mode to force results, not pick winners as a user would)
    if (isLockedForUser) return; 

    // Additional check for specific match time just in case
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
          stage: Stage.GROUPS,
          isCompleted: false,
          day: currentDay
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
                stage: 'Regular Season',
                status: updates.status,
                day: currentDay
             });
             setNewMatch(null);
          } else {
             const dbUpdates = {
                team_a_id: updates.teamA,
                team_b_id: updates.teamB,
                start_time: updates.startTime, 
                status: updates.winnerId ? 'finished' : updates.status,
                winner_id: updates.winnerId || null,
                day: updates.day
             };
             await dataService.updateMatch(matchId, dbUpdates);
          }
          const updatedMatches = await dataService.getMatches(currentDay);
          const sorted = updatedMatches.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
          setMatches(sorted);
      } catch (error) {
          console.error("Failed to update/create match:", error);
          alert("Error actualizando o creando el partido. Comprueba la consola.");
      }
  };

  const handleAdminDelete = async (matchId: string) => {
      if (!confirm("¿Estás seguro de que quieres borrar este partido?")) return;
      try {
          if (matchId.startsWith('temp-')) {
              setNewMatch(null);
              return;
          }
          await dataService.deleteMatch(matchId);
          const updatedMatches = await dataService.getMatches(currentDay);
          const sorted = updatedMatches.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
          setMatches(sorted);
      } catch (error) {
          console.error("Error deleting match", error);
          alert("Error al borrar el partido.");
      }
  };

  // Toggle Visibility (TBD vs Show Matches)
  const handleToggleVisibility = async () => {
      if (!isAdmin) return;
      let newVisibleDays = visibleDays.includes(currentDay) 
          ? visibleDays.filter(d => d !== currentDay) 
          : [...visibleDays, currentDay];
      
      setVisibleDays(newVisibleDays);
      await dataService.updateGlobalConfig({ visibleDays: newVisibleDays, closedDays });
  };

  // Toggle Lock (Voting Allowed vs Voting Closed)
  const handleToggleLock = async () => {
      if (!isAdmin) return;
      let newClosedDays = closedDays.includes(currentDay)
          ? closedDays.filter(d => d !== currentDay)
          : [...closedDays, currentDay];
      
      setClosedDays(newClosedDays);
      await dataService.updateGlobalConfig({ visibleDays, closedDays: newClosedDays });
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
          // Handle non-standard error objects (like empty objects from JSON.stringify)
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
                {/* 1. VISIBILITY TOGGLE */}
                <button 
                    onClick={handleToggleVisibility}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase border transition-all ${
                        isDayVisible 
                        ? 'bg-blue-900/50 border-blue-500 text-blue-300 hover:bg-blue-900' 
                        : 'bg-gray-800 border-gray-500 text-gray-400 hover:bg-gray-700'
                    }`}
                    title={isDayVisible ? "La jornada es visible para todos" : "La jornada aparece como TBD"}
                >
                    {isDayVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {isDayVisible ? 'Visible' : 'Oculto (TBD)'}
                </button>

                {/* 2. LOCK TOGGLE */}
                <button 
                    onClick={handleToggleLock}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase border transition-all ${
                        !isManuallyClosed 
                        ? 'bg-green-900/50 border-green-500 text-green-300 hover:bg-green-900' 
                        : 'bg-red-900/50 border-red-500 text-red-300 hover:bg-red-900'
                    }`}
                    title={!isManuallyClosed ? "Se pueden enviar predicciones" : "Predicciones bloqueadas manualmente"}
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
                {/* Case 1: Hidden (TBD) - Overrides everything else visual */}
                {!isDayVisible && (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-500 border-2 border-dashed border-gray-800 rounded-2xl bg-black/20">
                        <CalendarOff className="w-12 h-12 mb-4 opacity-50" />
                        <h3 className="text-lg font-bold text-gray-400 mb-1">Jornada {currentDay}</h3>
                        <p className="uppercase tracking-widest text-xs font-bold text-[#c8aa6e]">
                            TBD / Partidos por determinar
                        </p>
                    </div>
                )}

                {/* Case 2: Visible but Locked (Either Time or Manual) */}
                {isDayVisible && isLockedForUser && (
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 flex items-center justify-center gap-2 text-red-300 mb-6 animate-in slide-in-from-top-2 font-bold uppercase tracking-widest text-sm">
                        <Lock className="w-4 h-4" />
                        <span>Jornada Cerrada</span>
                    </div>
                )}
            </>
        )}

        {/* Show matches if:
            1. Admin is Editing (always show everything)
            2. Day is Visible (User Mode)
        */}
        {(isEditMode || isDayVisible) && (
            <>
                {/* Admin Visual Feedback */}
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
                    matches.map(match => (
                        <MatchCard 
                            key={match.id} 
                            match={match}
                            teams={allTeams}
                            selectedWinnerId={predictions.find(p => p.matchId === match.id)?.predictedWinnerId}
                            onSelectWinner={handleSelectWinner}
                            isEditing={isEditMode}
                            isDayLocked={isLockedForUser} // Pass the global lock state
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
    </div>
  );
};