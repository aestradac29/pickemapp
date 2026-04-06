
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MatchCard } from './MatchCard';
import { DaySelector } from './DaySelector';
import { MatchdayImageUploader } from './MatchdayImageUploader';
import { UserPrediction, Match, Team, Stage, Player, User } from '../types';
import { CalendarCheck, Save, Loader2, CheckCircle2, Settings, Plus, CalendarOff, AlertTriangle, AlertCircle, Lock, Unlock, Eye, EyeOff, Trophy, LogOut, User as UserIcon } from 'lucide-react';
import { dataService } from '../services/dataService';
import { useToast } from './ui/Toast';
import { TEAMS, normalizeSplitId } from '../constants';
import { StatsEntryModal } from './StatsEntryModal';
import { StatsViewerModal } from './StatsViewerModal';

interface MatchdayViewProps {
    currentUserId: string | null;
    initialPredictions?: UserPrediction[];
    isAdmin?: boolean;
    onPredictionsSaved?: () => Promise<void> | void; 
    selectedSplit?: string | null;
}

export const MatchdayView: React.FC<MatchdayViewProps> = ({ 
    currentUserId, 
    initialPredictions = [], 
    isAdmin = false,
    onPredictionsSaved,
    selectedSplit: propSelectedSplit
}) => {
  const selectedSplit = propSelectedSplit || normalizeSplitId(localStorage.getItem('selectedSplit'));
  const daysCount = selectedSplit.toLowerCase().includes('spring') ? 7 : 11;
  const [currentDay, setCurrentDay] = useState(1);
  const [hasInitializedDay, setHasInitializedDay] = useState(false);
  const [visibleDays, setVisibleDays] = useState<number[]>([]); 
  const [closedDays, setClosedDays] = useState<number[]>([]); 
  const [openedDays, setOpenedDays] = useState<number[]>([]); 
  
  // State for ALL matches loaded from DB
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]); // Need players for stats
  const [allUsers, setAllUsers] = useState<User[]>([]); // For User Selector
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);

  // Auto-initialize to first incomplete day
  useEffect(() => {
      if (!isLoadingMatches && allMatches.length > 0 && !hasInitializedDay) {
          let dayToSelect = 1;
          for (let d = 1; d <= daysCount; d++) {
              const dayMatches = allMatches.filter(m => m.day === d && m.stage === Stage.GROUPS);
              if (dayMatches.length > 0 && dayMatches.every(m => m.isCompleted)) {
                  dayToSelect = d + 1;
              } else {
                  break;
              }
          }
          if (dayToSelect > daysCount) dayToSelect = daysCount;
          setCurrentDay(dayToSelect);
          setHasInitializedDay(true);
      }
  }, [isLoadingMatches, allMatches, hasInitializedDay, daysCount]);

  // Viewing State
  const [viewingUserId, setViewingUserId] = useState<string | null>(currentUserId);
  
  // Sync viewingUserId when currentUserId loads
  useEffect(() => {
      if (currentUserId) {
          setViewingUserId(currentUserId);
      }
  }, [currentUserId]);

  const [predictions, setPredictions] = useState<UserPrediction[]>(initialPredictions);
  const [isLoadingPicks, setIsLoadingPicks] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const { toast, ToastContainer } = useToast();
  
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

  // Sync state with props (Cloud Data) only if viewing self
  useEffect(() => {
    if (viewingUserId === currentUserId) {
        setPredictions(initialPredictions);
    }
  }, [initialPredictions, viewingUserId, currentUserId]);

  // Initial Data Load (All Matches + Players + Users)
  useEffect(() => {
    const loadData = async () => {
        setIsLoadingMatches(true);
        setNewMatch(null); 
        try {
            // Cargar TODOS los datos necesarios
            const [fetchedMatches, teamsMap, config, playersList, usersList] = await Promise.all([
                dataService.getMatches(undefined, selectedSplit), 
                dataService.getTeams(false, selectedSplit),
                dataService.getDaysConfig(selectedSplit),
                dataService.getPlayers(false, selectedSplit),
                dataService.getAllUsers(selectedSplit)
            ]);
            
            setAllMatches(fetchedMatches);
            setAllTeams(Object.values(teamsMap));
            setAllPlayers(playersList);
            setAllUsers(usersList);
            
            setVisibleDays(config.visibleDays || []);
            setClosedDays(config.closedDays || []);
            setOpenedDays(config.openedDays || []);
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setIsLoadingMatches(false);
        }
    };
    loadData();
  }, [selectedSplit]);

  // Fetch predictions when viewingUserId changes
  useEffect(() => {
      const fetchPicks = async () => {
          if (!viewingUserId) return;
          
          let userPicks = [];
          
          if (viewingUserId === currentUserId) {
              userPicks = initialPredictions;
          } else {
              setIsLoadingPicks(true);
              try {
                  userPicks = await dataService.getUserPredictions(viewingUserId, selectedSplit);
              } catch (e) {
                  console.error("Error fetching user picks", e);
                  userPicks = [];
              } finally {
                  setIsLoadingPicks(false);
              }
          }
          
          // AUTO-FILL LOGIC: Check for locked matches without predictions
          if (allMatches.length > 0) {
              const now = new Date();
              const filledPicks = [...userPicks];
              let hasAutoPicks = false;

              allMatches.forEach(match => {
                  const isStarted = new Date(match.startTime) <= now;
                  const isTbd = match.teamA.id === 'tbd' || match.teamB.id === 'tbd';
                  
                  if (isStarted && !isTbd) {
                      const hasPrediction = filledPicks.some(p => p.matchId === match.id);
                      if (!hasPrediction) {
                          const autoPick = dataService.getDeterministicWinner(viewingUserId, match);
                          // Only show auto-pick if match is on/after Feb 21, 2026
                          const matchTime = new Date(match.startTime).getTime();
                          const cutoff = new Date('2026-02-21T00:00:00').getTime();
                          
                          if (autoPick !== 'tbd' && matchTime >= cutoff) {
                              filledPicks.push({ matchId: match.id, predictedWinnerId: autoPick });
                              hasAutoPicks = true;
                          }
                      }
                  }
              });
              
              if (hasAutoPicks) {
                  setPredictions(filledPicks);
                  return;
              }
          }

          setPredictions(userPicks);
      };
      
      fetchPicks();
  }, [viewingUserId, currentUserId, allMatches.length, selectedSplit]); // Depend on matches length to re-run if matches load late

  // Calculate Standing Records
  const teamRecords = useMemo(() => {
      const records: Record<string, { w: number, l: number }> = {};
      allTeams.forEach(t => { records[t.id] = { w: 0, l: 0 }; });
      const completedMatches = allMatches.filter(m => m.stage === Stage.GROUPS && m.isCompleted && m.winnerId);
      completedMatches.forEach(m => {
          if (m.winnerId) {
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

  const checkUnsavedChanges = (day: number) => {
    // Only check unsaved changes for the current user
    if (viewingUserId !== currentUserId) return false;

    const dayMatchIds = allMatches
        .filter(m => m.day === day && m.stage === Stage.GROUPS && !m.id.startsWith('temp-'))
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

  // --- LOGIC RULES ---
  const isDayVisible = visibleDays.includes(currentDay);
  const isManuallyClosed = closedDays.includes(currentDay);
  const isExplicitlyOpened = openedDays.includes(currentDay);
  
  const matches = useMemo(() => {
      return allMatches
        .filter(m => m.day === currentDay && m.stage === Stage.GROUPS)
        .sort((a, b) => {
            const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
            const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
            return timeA - timeB;
        });
  }, [allMatches, currentDay]);

  const now = new Date();
  const firstMatchTime = matches.length > 0 && matches[0].startTime ? new Date(matches[0].startTime) : null;
  
  // A day is time-locked if the first match has started
  const isTimeLocked = firstMatchTime && !isNaN(firstMatchTime.getTime()) ? now >= firstMatchTime : false;
  
  // Final lock logic: 
  // 1. If manually closed -> Locked
  // 2. If explicitly opened -> Open (overrides time lock)
  // 3. If time passed -> Locked
  // 4. Otherwise -> Open
  const isLockedForUser = isManuallyClosed || (isTimeLocked && !isExplicitlyOpened);

  useEffect(() => {
      if (isAdmin && isEditMode) {
          console.log(`Day ${currentDay} Debug:`, {
              isManuallyClosed,
              isTimeLocked,
              isExplicitlyOpened,
              isLockedForUser,
              firstMatchTime: firstMatchTime?.toISOString(),
              now: now.toISOString()
          });
      }
  }, [currentDay, isManuallyClosed, isTimeLocked, isExplicitlyOpened, isLockedForUser, isAdmin, isEditMode]);
  
  // Derived state for Spectating
  const isSpectating = viewingUserId !== currentUserId;
  const viewingUser = allUsers.find(u => u.id === viewingUserId);

  const handleSelectWinner = (matchId: string, teamId: string) => {
    if (isEditMode || isSpectating) return; // Disable picking if spectating
    if (isLockedForUser && !isAdmin) return; 

    const match = matches.find(m => m.id === matchId);
    if (match) {
        const startTime = new Date(match.startTime);
        // Individual match lock: Only if NOT explicitly opened
        if (now >= startTime && !match.isCompleted && !isAdmin && !isExplicitlyOpened) return; 
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
          teamA: TEAMS.tbd,
          teamB: TEAMS.tbd,
          startTime: new Date().toISOString(),
          stage: Stage.GROUPS, 
          isCompleted: false,
          day: currentDay,
          bestOf: 1 
      };
      setNewMatch(tempMatch);
  };

  const handleAdminUpdate = async (matchId: string, updates: any) => {
      try {
          if (matchId.startsWith('temp-')) {
             await dataService.createMatch({
                split_id: dataService._getCurrentSplitId(),
                team_a_id: updates.teamA,
                team_b_id: updates.teamB,
                start_time: updates.startTime,
                stage: Stage.GROUPS,
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
          const updatedMatches = await dataService.getMatches();
          setAllMatches(updatedMatches);
      } catch (error) {
          console.error("Failed to update/create match:", error);
          toast.error("Error actualizando el partido.");
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
          console.error("FATAL ERROR deleting match", error);
          toast.error("Error al borrar el partido.");
          setAllMatches(originalMatches);
      }
  };

  const handleToggleVisibility = async () => {
      if (!isAdmin) return;
      
      setVisibleDays(prev => {
          const newVisibleDays = prev.includes(currentDay) 
              ? prev.filter(d => d !== currentDay) 
              : [...prev, currentDay];
          
          dataService.updateGlobalConfig({ 
              visibleDays: newVisibleDays, 
              closedDays,
              openedDays
          }, selectedSplit);
          
          return newVisibleDays;
      });
  };

  const handleToggleLock = async () => {
      if (!isAdmin) return;
      
      // If it's currently time-locked, "opening" it means adding it to openedDays
      // If it's manually closed, "opening" it means removing it from closedDays
      
      if (isManuallyClosed) {
          // It's manually closed -> Open it
          setClosedDays(prev => {
              const newClosedDays = prev.filter(d => d !== currentDay);
              dataService.updateGlobalConfig({ 
                  visibleDays, 
                  closedDays: newClosedDays,
                  openedDays
              }, selectedSplit);
              return newClosedDays;
          });
      } else if (isTimeLocked && !isExplicitlyOpened) {
          // It's auto-locked by time -> Force open it
          setOpenedDays(prev => {
              const newOpenedDays = [...prev, currentDay];
              dataService.updateGlobalConfig({ 
                  visibleDays, 
                  closedDays,
                  openedDays: newOpenedDays
              }, selectedSplit);
              return newOpenedDays;
          });
      } else if (isTimeLocked && isExplicitlyOpened) {
          // It was forced open -> Close it (back to auto-lock)
          setOpenedDays(prev => {
              const newOpenedDays = prev.filter(d => d !== currentDay);
              dataService.updateGlobalConfig({ 
                  visibleDays, 
                  closedDays,
                  openedDays: newOpenedDays
              }, selectedSplit);
              return newOpenedDays;
          });
      } else {
          // It's open -> Manually close it
          setClosedDays(prev => {
              const newClosedDays = [...prev, currentDay];
              dataService.updateGlobalConfig({ 
                  visibleDays, 
                  closedDays: newClosedDays,
                  openedDays
              }, selectedSplit);
              return newClosedDays;
          });
      }
  };

  const handleSaveStats = async (games: any) => {
      if (!statsMatch) return;
      setIsSavingStats(true);
      try {
          await dataService.saveMatchStatsAndCalculate(statsMatch.id, games, selectedSplit);
          setStatsMatch(null); 
          const updated = await dataService.getMatches(undefined, selectedSplit);
          setAllMatches(updated);
      } catch (e) {
          console.error(e);
          toast.error("Error guardando estadísticas.");
      } finally {
          setIsSavingStats(false);
      }
  };

  const handleBatchSave = async () => {
      if (!currentUserId) {
          toast.warning("Debes iniciar sesión para guardar.");
          return;
      }
      if (isEditMode || isSpectating) return;
      
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
              setErrorMessage("La conexión es lenta...");
          }
      }, 60000);

      try {
          await dataService.savePredictions(dayPredictions, selectedSplit);
          if (onPredictionsSaved) await onPredictionsSaved();
          setSaveStatus('success');
          setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (error: any) {
          console.error("Error saving matchday:", error);
          setSaveStatus('error');
          setErrorMessage(error.message || "Error al guardar");
      } finally {
          clearTimeout(fallbackTimer);
          setIsSaving(false);
          isSavingRef.current = false;
      }
  };

  const days = Array.from({ length: daysCount }, (_, i) => i + 1);
  const validMatches = matches.filter(m => !m.id.startsWith('temp-'));
  const validMatchIds = validMatches.map(m => m.id);
  const currentDayPredictionsCount = predictions.filter(p => validMatchIds.includes(p.matchId)).length;
  const totalMatches = validMatches.length;

  return (
    <div className={`animate-in fade-in slide-in-from-bottom-4 pb-24 transition-all duration-300 ${isEditMode ? 'border-l-4 border-r-4 border-red-900/50 bg-red-950/10 min-h-screen' : ''}`}>
      
      {/* Header with Day Selector & User Selector */}
      <div className={`sticky top-0 z-30 pt-4 pb-4 -mx-4 px-4 border-b mb-6 backdrop-blur-md transition-colors ${isEditMode ? 'bg-red-950/90 border-red-800' : 'bg-[#0a1428]/95 border-gray-800'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full border ${isEditMode ? 'bg-red-900 border-red-500' : 'bg-blue-900/20 border-blue-500/30'}`}>
                    <CalendarCheck className={`w-5 h-5 ${isEditMode ? 'text-white' : 'text-blue-400'}`} />
                </div>
                <div>
                    <h2 className={`text-xl font-bold uppercase tracking-wide ${isEditMode ? 'text-white' : 'text-[#c8aa6e]'}`}>
                        {isEditMode ? 'ADMINISTRADOR' : 'Fase Regular'}
                    </h2>
                    <p className={`text-[10px] uppercase tracking-widest leading-none ${isEditMode ? 'text-red-300' : 'text-blue-300/60'}`}>
                        {isEditMode ? 'Modo Edición' : selectedSplit.toLowerCase().includes('spring') ? 'Spring 2026' : 'Winter 2026'}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* User Selector Dropdown (Shown if viewing allowed) */}
                {!isEditMode && (
                    <div className="flex items-center gap-2 bg-[#0f1923] p-1 pr-3 rounded-lg border border-gray-700 max-w-[200px] md:max-w-xs">
                        <div className="w-8 h-8 rounded bg-black flex items-center justify-center overflow-hidden border border-gray-600 flex-shrink-0">
                            {viewingUser?.avatar ? (
                                <img src={viewingUser.avatar} className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon className="w-4 h-4 text-gray-500" />
                            )}
                        </div>
                        <select 
                            value={viewingUserId || ''}
                            onChange={(e) => setViewingUserId(e.target.value)}
                            className="bg-transparent text-white text-xs sm:text-sm outline-none font-bold w-full truncate"
                        >
                            <option value={currentUserId || ''} className="bg-black text-[#c8aa6e]">Mis Predicciones</option>
                            {allUsers.filter(u => u.id !== currentUserId).map(u => (
                                <option key={u.id} value={u.id} className="bg-black">{u.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {isAdmin && (
                    <button 
                        onClick={() => {
                            setIsEditMode(!isEditMode);
                            setNewMatch(null); 
                        }}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all h-10
                            ${isEditMode 
                                ? 'bg-red-600 border-red-400 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' 
                                : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white hover:border-gray-400'
                            }
                        `}
                    >
                        <Settings className={`w-4 h-4 ${isEditMode ? 'animate-spin-slow' : ''}`} />
                        <span className="hidden sm:inline">{isEditMode ? 'Salir' : 'Admin'}</span>
                    </button>
                )}
            </div>
        </div>

        <DaySelector 
            days={days} 
            currentDay={currentDay} 
            isEditMode={isEditMode}
            activeDays={visibleDays}
            closedDays={closedDays}
            openedDays={openedDays}
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
                        !isLockedForUser 
                        ? 'bg-green-900/50 border-green-500 text-green-300 hover:bg-green-900' 
                        : 'bg-red-900/50 border-red-500 text-red-300 hover:bg-red-900'
                    }`}
                >
                    {isLockedForUser ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    {isLockedForUser ? 'Cerrada' : 'Abierta'}
                    {isTimeLocked && !isManuallyClosed && !isExplicitlyOpened && <span className="ml-1 opacity-50 text-[8px]">(Auto)</span>}
                    {isExplicitlyOpened && <span className="ml-1 opacity-50 text-[8px]">(Forzada)</span>}
                </button>
                <MatchdayImageUploader 
                    currentDay={currentDay} 
                    onMatchesCreated={async () => {
                        const updatedMatches = await dataService.getMatches();
                        setAllMatches(updatedMatches);
                    }}
                />
            </div>
        )}
      </div>

      {/* Spectator Banner */}
      {isSpectating && (
          <div className="mb-6 bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg flex items-center gap-3 animate-in slide-in-from-top-2 mx-4 sm:mx-0">
              <Eye className="w-5 h-5 text-blue-400" />
              <div>
                  <p className="text-sm font-bold text-blue-200 uppercase">Modo Espectador</p>
                  <p className="text-xs text-blue-300/70">
                      Viendo predicciones de <span className="font-bold text-white">{viewingUser?.name}</span>. 
                      Solo verás las de partidos ya iniciados.
                  </p>
              </div>
              <button 
                  onClick={() => setViewingUserId(currentUserId)}
                  className="ml-auto p-2 bg-blue-900/40 hover:bg-blue-900/60 rounded-full border border-blue-500/30 text-blue-300 transition-colors"
                  title="Volver a mi perfil"
              >
                  <LogOut className="w-4 h-4" />
              </button>
          </div>
      )}

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

                {isDayVisible && isLockedForUser && !isSpectating && (
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
                            <span>Acierto: +1.5 Puntos</span>
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

                {isLoadingMatches || isLoadingPicks ? (
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
                        const recA = match.teamA ? teamRecords[match.teamA.id] : undefined;
                        const recB = match.teamB ? teamRecords[match.teamB.id] : undefined;
                        const strRecA = recA ? `${recA.w}-${recA.l}` : undefined;
                        const strRecB = recB ? `${recB.w}-${recB.l}` : undefined;

                        // Visibility Logic for Spectating
                        // If spectating, you can ONLY see the pick if the match has started OR the day is closed
                        const matchStarted = new Date() >= new Date(match.startTime);
                        const isMatchLocked = (isManuallyClosed || (matchStarted && !isExplicitlyOpened)) && !isSpectating;
                        const canSeePick = !isSpectating || isLockedForUser || matchStarted || isAdmin;
                        const userPick = predictions.find(p => p.matchId === match.id)?.predictedWinnerId;

                        return (
                            <MatchCard 
                                key={match.id} 
                                match={match}
                                teams={allTeams}
                                // Pass pick only if visible logic passes, otherwise undefined (visually hides selection)
                                selectedWinnerId={canSeePick ? userPick : undefined}
                                onSelectWinner={handleSelectWinner}
                                isEditing={isEditMode}
                                isAdmin={isAdmin}
                                // Per-match locking
                                isLocked={isMatchLocked || isSpectating}
                                isExplicitlyOpened={isExplicitlyOpened}
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
                            isAdmin={isAdmin}
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

      {/* Footer Action (Save Button) - Only show if current user */}
      {!isEditMode && matches.length > 0 && isDayVisible && !isManuallyClosed && matches.some(match => !(new Date() >= new Date(match.startTime) && !isExplicitlyOpened)) && !isSpectating && (
          <div className="fixed bottom-20 md:bottom-8 left-0 right-0 px-4 flex flex-col items-center pointer-events-none z-40 gap-2">
            
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
              selectedSplit={selectedSplit}
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
      <ToastContainer />
    </div>
  );
};
