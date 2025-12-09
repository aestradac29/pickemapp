import React, { useState, useRef, useEffect } from 'react';
import { MatchCard } from './MatchCard';
import { UserPrediction, Match, Team, Stage } from '../types';
import { CalendarCheck, Save, Loader2, Lock, CheckCircle2, Settings, Plus, CalendarOff, AlertTriangle } from 'lucide-react';
import { dataService } from '../services/dataService';
import { TEAMS } from '../constants';

interface MatchdayViewProps {
    currentUserId: string | null;
    initialPredictions?: UserPrediction[];
    isAdmin?: boolean;
    onPredictionsSaved?: () => void;
}

export const MatchdayView: React.FC<MatchdayViewProps> = ({ 
    currentUserId, 
    initialPredictions = [], 
    isAdmin = false,
    onPredictionsSaved 
}) => {
  const UNLOCKED_DAY = 1; // Solo la jornada 1 está disponible

  const [currentDay, setCurrentDay] = useState(1);
  const [matches, setMatches] = useState<Match[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);

  const [predictions, setPredictions] = useState<UserPrediction[]>(initialPredictions);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Admin Mode State
  const [isEditMode, setIsEditMode] = useState(false);
  const [newMatch, setNewMatch] = useState<Match | null>(null);

  // Sync with global predictions on mount or update
  useEffect(() => {
    if (initialPredictions.length > 0) {
        setPredictions(initialPredictions);
    }
  }, [initialPredictions]);

  // Fetch matches and teams
  useEffect(() => {
    const loadData = async () => {
        setIsLoadingMatches(true);
        setNewMatch(null); 
        try {
            const [fetchedMatches, teamsMap] = await Promise.all([
                dataService.getMatches(currentDay),
                dataService.getTeams()
            ]);
            setMatches(fetchedMatches);
            setAllTeams(Object.values(teamsMap));
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setIsLoadingMatches(false);
        }
    };
    loadData();
  }, [currentDay]);

  // Center selected day
  useEffect(() => {
    if (scrollContainerRef.current) {
        const button = scrollContainerRef.current.children[currentDay - 1] as HTMLElement;
        if (button) {
            const scrollLeft = button.offsetLeft - (scrollContainerRef.current.clientWidth / 2) + (button.clientWidth / 2);
            scrollContainerRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
    }
  }, [currentDay]);

  const handleSelectWinner = (matchId: string, teamId: string) => {
    if (isEditMode) return;
    
    setPredictions(prev => {
      const existing = prev.find(p => p.matchId === matchId);
      if (existing) {
        return prev.map(p => p.matchId === matchId ? { ...p, predictedWinnerId: teamId } : p);
      }
      return [...prev, { matchId, predictedWinnerId: teamId }];
    });
    setSaveStatus('idle');
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
          setMatches(updatedMatches);
      } catch (error) {
          console.error("Failed to update/create match:", error);
          alert("Error actualizando o creando el partido. Revisa la consola.");
      }
  };

  const handleBatchSave = async () => {
      if (!currentUserId) {
          alert("Debes iniciar sesión para guardar.");
          return;
      }
      if (isEditMode) return;
      
      setIsSaving(true);
      setSaveStatus('idle');

      const currentDayMatchIds = matches.filter(m => !m.id.startsWith('temp-')).map(m => m.id);
      const dayPredictions = predictions
        .filter(p => currentDayMatchIds.includes(p.matchId))
        .map(p => ({
            user_id: currentUserId,
            match_id: p.matchId,
            predicted_winner_id: p.predictedWinnerId
        }));

      try {
          await dataService.savePredictions(dayPredictions);
          setSaveStatus('success');
          if (onPredictionsSaved) onPredictionsSaved();
          setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (error) {
          console.error("Error saving matchday:", error);
          setSaveStatus('error');
          alert("Error al guardar en la base de datos. Ver consola para detalles.");
      } finally {
          setIsSaving(false);
      }
  };

  const days = Array.from({ length: 11 }, (_, i) => i + 1);

  // --- LOGIC: CHECK COMPLETION ---
  // Solo contamos partidos reales (no temp) y predicciones válidas
  const validMatches = matches.filter(m => !m.id.startsWith('temp-'));
  const validMatchIds = validMatches.map(m => m.id);
  const currentDayPredictions = predictions.filter(p => validMatchIds.includes(p.matchId));
  
  const totalMatches = validMatches.length;
  const predictionCount = currentDayPredictions.length;
  const isComplete = totalMatches > 0 && predictionCount === totalMatches;

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

        <div className="relative max-w-sm mx-auto">
            <div className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r to-transparent z-10 pointer-events-none ${isEditMode ? 'from-red-950' : 'from-[#0a1428]'}`}></div>
            <div 
                ref={scrollContainerRef}
                className="flex overflow-x-auto gap-2 py-2 px-8 no-scrollbar scroll-smooth snap-x"
            >
                {days.map((day) => {
                    const isLocked = !isEditMode && day > UNLOCKED_DAY;
                    return (
                        <button
                            key={day}
                            onClick={() => (!isLocked || isEditMode) && setCurrentDay(day)}
                            disabled={isLocked && !isEditMode}
                            className={`
                                flex-shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center border snap-center transition-all duration-300 relative group
                                ${currentDay === day 
                                    ? 'bg-[#c8aa6e] border-[#c8aa6e] text-[#0a1428] shadow-[0_0_15px_rgba(200,170,110,0.4)] scale-110 z-10' 
                                    : isLocked
                                        ? 'bg-[#050a14] border-gray-800 text-gray-700 cursor-not-allowed opacity-70'
                                        : 'bg-[#0f1d36] border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                                }
                            `}
                        >
                            {isLocked ? (
                                <Lock className="w-5 h-5 text-gray-600" />
                            ) : (
                                <>
                                    <span className="text-[10px] uppercase font-bold tracking-tighter opacity-70">Day</span>
                                    <span className="text-lg font-bold leading-none">{day}</span>
                                    {predictions.some(p => p.matchId.startsWith(`d${day}-`)) && (
                                        <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${currentDay === day ? 'bg-[#0a1428]' : 'bg-[#c8aa6e]'}`}></div>
                                    )}
                                </>
                            )}
                        </button>
                    );
                })}
            </div>
            <div className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l to-transparent z-10 pointer-events-none ${isEditMode ? 'from-red-950' : 'from-[#0a1428]'}`}></div>
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-6 animate-in fade-in duration-500">
        {isLoadingMatches ? (
             <div className="flex flex-col items-center justify-center py-12 text-[#c8aa6e]">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>Cargando enfrentamientos...</p>
             </div>
        ) : matches.length === 0 && !newMatch ? (
             <div className="flex flex-col items-center justify-center py-16 text-gray-500 border-2 border-dashed border-gray-800 rounded-2xl">
                 <CalendarOff className="w-12 h-12 mb-4 opacity-50" />
                 <h3 className="text-lg font-bold text-gray-400 mb-1">Jornada {currentDay}</h3>
                 <p className="uppercase tracking-widest text-xs font-bold text-[#c8aa6e]">
                     Partidos por determinar (TBD)
                 </p>
             </div>
        ) : (
            <>
                {matches.map(match => (
                    <MatchCard 
                        key={match.id} 
                        match={match}
                        teams={allTeams}
                        selectedWinnerId={predictions.find(p => p.matchId === match.id)?.predictedWinnerId}
                        onSelectWinner={handleSelectWinner}
                        isEditing={isEditMode}
                        onUpdate={(updates) => handleAdminUpdate(match.id, updates)}
                    />
                ))}
            </>
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

      </div>

      {/* Footer Action (Save Button) */}
      {!isEditMode && matches.length > 0 && (
          <div className="fixed bottom-8 left-0 right-0 px-4 flex justify-center pointer-events-none z-40">
            <button 
                onClick={handleBatchSave}
                disabled={isSaving || !isComplete}
                className={`
                    pointer-events-auto shadow-2xl px-6 py-3 rounded-full font-bold flex items-center gap-3 transition-all transform border
                    ${saveStatus === 'success' 
                        ? 'bg-green-600 border-green-400 text-white scale-105' 
                        : isSaving 
                            ? 'bg-blue-900 border-blue-700 text-gray-400 cursor-wait'
                            : isComplete
                                ? 'bg-[#c8aa6e] border-yellow-500 text-[#0a1428] hover:bg-[#d6bb82] hover:scale-105 shadow-[0_0_20px_rgba(200,170,110,0.5)]'
                                : 'bg-gray-800/90 border-gray-600 text-gray-500 cursor-not-allowed backdrop-blur-md'
                    }
                `}
            >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                saveStatus === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
                !isComplete ? <AlertTriangle className="w-5 h-5 text-yellow-500" /> :
                <Save className="w-5 h-5" />}
                
                <div className="flex flex-col items-start leading-none">
                    <span className="text-sm">
                        {saveStatus === 'success' ? 'GUARDADO' : !isComplete ? 'INCOMPLETO' : 'GUARDAR JORNADA'}
                    </span>
                    {!isComplete && saveStatus !== 'success' && (
                        <span className="text-[10px] opacity-80 mt-1">
                            {predictionCount} de {totalMatches} selecciones
                        </span>
                    )}
                </div>
            </button>
          </div>
      )}
    </div>
  );
};