
import React, { useState, useEffect } from 'react';
import { Match, Team, Stage } from '../types';
import { CheckCircle2, Save, X, Calendar, Trophy, Loader2, AlertCircle, Lock, Trash2, AlertTriangle, Swords, ShieldAlert, Crown, GitMerge, BarChart2, FileBarChart, Clock } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  selectedWinnerId?: string;
  onSelectWinner: (matchId: string, teamId: string) => void;
  isDayLocked?: boolean; // Prop para bloqueo global de jornada
  isExplicitlyOpened?: boolean; // Nuevo: Override para ignorar bloqueo por tiempo
  isAdmin?: boolean; // Nuevo: Para permitir acciones de admin
  customTitle?: string; // Nuevo prop para mostrar "R1 1", "L-SEMI", etc.
  teamARecord?: string; // Nuevo: Record del equipo A (ej: "3-0")
  teamBRecord?: string; // Nuevo: Record del equipo B
  // Admin Props
  isEditing?: boolean;
  teams?: Team[]; // Required for editing dropdowns
  onUpdate?: (updates: any) => Promise<void> | void;
  onCancel?: () => void; // New prop for cancelling new match
  onDelete?: () => Promise<void> | void; // New prop for deleting
  onEditStats?: (match: Match) => void; // Trigger stats modal (ADMIN)
  onViewStats?: (match: Match) => void; // Trigger stats viewer (USER)
}

// Sub-component extracted for performance and cleanliness
const TeamButton = ({ 
    team, 
    isSelected, 
    match, 
    isEditing, 
    isLocked, 
    onSelect,
    record
}: { 
    team: Team; 
    isSelected: boolean; 
    match: Match; 
    isEditing: boolean;
    isLocked: boolean;
    onSelect: (id: string, teamId: string) => void; 
    record?: string;
}) => {
    // Determinar si es el ganador oficial
    const isWinner = match.winnerId === team.id;
    // Determinar si es una predicción fallida (Estaba seleccionado, el partido acabó, y NO es el ganador)
    const isWrongPick = match.isCompleted && isSelected && match.winnerId && !isWinner;

    return (
      <button
        onClick={() => !isEditing && !isLocked && onSelect(match.id, team.id)}
        disabled={isEditing || match.isCompleted || isLocked}
        className={`
          flex-1 flex flex-col items-center justify-center p-4 rounded-lg transition-all duration-200 border-2 relative
          ${isSelected && !isWrongPick
            ? 'bg-hextech-500/10 border-hextech-500 shadow-[0_0_15px_rgba(200,170,110,0.3)]' 
            : isWrongPick
                ? 'bg-red-900/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
            : (match.isCompleted || isLocked)
                ? 'bg-gray-800/30 border-gray-800 opacity-70 grayscale-[0.5] cursor-not-allowed' 
                : 'bg-hextech-800 border-gray-700 hover:border-gray-500 hover:bg-gray-800'
          }
          ${isWinner ? 'ring-2 ring-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] !opacity-100 !grayscale-0' : ''}
        `}
      >
        <div className="mb-2 relative w-16 h-16 flex items-center justify-center">
            {team.id === 'tbd' ? (
                <div className="w-14 h-14 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 flex items-center justify-center shadow-inner">
                    <span className="text-gray-500 font-bold text-xs tracking-tighter">TBD</span>
                </div>
            ) : team.logo ? (
                 <img 
                    src={team.logo} 
                    alt={team.name}
                    className={`w-14 h-14 object-contain drop-shadow-md`}
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                 />
            ) : null}
            
            {/* Fallback Initial */}
            <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-lg ${team.logo || team.id === 'tbd' ? 'hidden' : ''}`}
                style={{ backgroundColor: team.color }}
            >
                {team.shortName[0]}
            </div>
        </div>
        
        <div className="flex flex-col items-center">
            <span className={`font-bold text-lg leading-none ${isSelected ? (isWrongPick ? 'text-red-500' : 'text-hextech-500') : 'text-gray-300'}`}>
            {team.shortName}
            </span>
            {record && (
                <span className="text-[10px] font-bold text-gray-500 mt-1 bg-black/30 px-1.5 rounded">
                    {record}
                </span>
            )}
        </div>
        
        {/* Indicators */}
        {isSelected && !match.isCompleted && (
          <CheckCircle2 className="w-5 h-5 text-hextech-500 mt-2 animate-bounce" />
        )}
        
        {/* Etiqueta de Ganador */}
        {isWinner && (
           <div className="mt-2 bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-green-500/50 flex items-center gap-1">
               <Trophy className="w-3 h-3" /> Ganador
           </div>
        )}

        {/* Etiqueta de Fallo */}
        {isWrongPick && (
           <div className="mt-2 bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-red-500/50 flex items-center gap-1">
               <X className="w-3 h-3" /> Fallado
           </div>
        )}
      </button>
    );
};

export const MatchCard: React.FC<MatchCardProps> = ({ 
    match, 
    selectedWinnerId, 
    onSelectWinner,
    isDayLocked = false,
    isExplicitlyOpened = false,
    isAdmin = false,
    customTitle,
    teamARecord,
    teamBRecord,
    isEditing = false,
    teams = [],
    onUpdate,
    onCancel,
    onDelete,
    onEditStats,
    onViewStats
}) => {
  
  // Local Edit State
  const [editState, setEditState] = useState({
      teamA: match.teamA?.id || 'tbd',
      teamB: match.teamB?.id || 'tbd',
      startTime: match.startTime,
      winnerId: match.winnerId || '',
      status: match.isCompleted ? 'finished' : 'scheduled',
      day: match.day || 1,
      bestOf: match.bestOf || 1, // Default to BO1
      bracketStage: match.bracketStage || 'winners'
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Local delete confirmation state (to avoid window.confirm blocking)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Effective Lock: Global Day Lock OR Individual Time Lock
  const isTbd = match.teamA?.id === 'tbd' || match.teamB?.id === 'tbd';
  const isTimeLocked = new Date() > new Date(match.startTime) && !match.isCompleted;
  // If isExplicitlyOpened is true, we ignore the time lock
  const isLocked = (isDayLocked || (isTimeLocked && !isExplicitlyOpened) || isTbd) && !isAdmin;

  // Has Stats Data?
  const hasStats = ((match.games && match.games.length > 0) || (match.stats && Object.keys(match.stats).length > 0)) && !isTbd;

  // Calculate Score for Completed Matches or In-Progress Matches
  let scoreA = 0;
  let scoreB = 0;
  
  if (match.games && match.games.length > 0) {
      match.games.forEach(g => {
          if (g.winnerId === match.teamA?.id) scoreA++;
          if (g.winnerId === match.teamB?.id) scoreB++;
      });
  } else if (match.winnerId) {
      // Fallback for simple BO1
      if (match.winnerId === match.teamA?.id) scoreA = 1;
      else if (match.winnerId === match.teamB?.id) scoreB = 1;
  }

  // Sync state with props when match changes
  useEffect(() => {
    setEditState({
      teamA: match.teamA?.id || 'tbd',
      teamB: match.teamB?.id || 'tbd',
      startTime: match.startTime,
      winnerId: match.winnerId || '',
      status: match.isCompleted ? 'finished' : 'scheduled',
      day: match.day || 1,
      bestOf: match.bestOf || 1,
      bracketStage: match.bracketStage || 'winners'
    });
  }, [match]);

  const handleSaveEdit = async () => {
      if (!onUpdate) return;
      
      setIsSaving(true);
      setErrorMsg(null);

      try {
          // Convert local datetime input string to ISO for DB
          let validDate = new Date().toISOString();
          
          if (editState.startTime) {
              const d = new Date(editState.startTime);
              if (!isNaN(d.getTime())) {
                  validDate = d.toISOString();
              }
          }

          await onUpdate({
              ...editState,
              startTime: validDate,
              bestOf: Number(editState.bestOf)
          });
      } catch (error: any) {
          console.error("Error saving match:", error);
          setErrorMsg("Error al guardar");
      } finally {
          setIsSaving(false);
      }
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Delete confirmed for match:", match.id);
      if (onDelete) {
          onDelete();
      }
      setShowDeleteConfirm(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setShowDeleteConfirm(false);
  };

  const triggerDeleteMode = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setShowDeleteConfirm(true);
  };

  // --- ADMIN EDIT MODE RENDER ---
  if (isEditing) {
      // Format date for input: Convert UTC ISO to Local formatted string for input type="datetime-local"
      const date = new Date(editState.startTime);
      const safeDate = isNaN(date.getTime()) ? new Date() : date;
      const isoDate = new Date(safeDate.getTime() - (safeDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

      // Check if match is Playoff/Final to show bracket selector
      const isPlayoffMatch = match.stage === Stage.PLAYOFFS || match.stage === Stage.FINALS;

      return (
          <div className="w-full bg-red-950/20 backdrop-blur-sm rounded-xl border border-red-500/30 overflow-hidden mb-4 shadow-xl p-4 animate-in fade-in relative">
              
              {/* Overlay de confirmación de borrado */}
              {showDeleteConfirm && (
                  <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4 text-center animate-in fade-in">
                      <AlertTriangle className="w-10 h-10 text-red-500 mb-2" />
                      <h4 className="text-white font-bold text-lg mb-1">¿Borrar Partido?</h4>
                      <p className="text-gray-400 text-xs mb-4">Esta acción no se puede deshacer.</p>
                      <div className="flex gap-3">
                          <button 
                              onClick={handleCancelDelete}
                              className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold"
                          >
                              Cancelar
                          </button>
                          <button 
                              onClick={handleConfirmDelete}
                              className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-2"
                          >
                              <Trash2 className="w-3 h-3" />
                              Confirmar
                          </button>
                      </div>
                  </div>
              )}

              <div className="flex items-center justify-between mb-4 border-b border-red-900/50 pb-2">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-widest">
                      {match.id.startsWith('temp') ? 'Creando Nuevo Partido' : 'Editando Partido'}
                  </span>
                  <div className="flex items-center gap-2">
                    
                    {/* STATS BUTTON (Only for non-temp matches) */}
                    {!match.id.startsWith('temp') && onEditStats && (
                        <button 
                            type="button"
                            onClick={() => onEditStats(match)}
                            disabled={isTbd}
                            className={`flex items-center gap-1 text-xs font-bold uppercase px-3 py-1.5 rounded border transition-colors mr-2
                                ${isTbd 
                                    ? 'bg-gray-800/50 border-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                                    : hasStats 
                                        ? 'bg-green-900/30 border-green-500 text-green-300 hover:bg-green-900/50' 
                                        : 'bg-purple-900/30 border-purple-500 text-purple-300 hover:bg-purple-900/50'
                                }
                            `}
                            title={isTbd ? "Estadísticas no disponibles (TBD)" : "Editar Estadísticas Fantasy"}
                        >
                            <BarChart2 className="w-3 h-3" />
                            Stats
                        </button>
                    )}

                    {/* Botón de borrar: Ahora activa el modo confirmación */}
                    {!match.id.startsWith('temp') && onDelete && (
                        <button 
                            type="button"
                            onClick={triggerDeleteMode}
                            className="text-red-500 hover:text-red-300 bg-red-900/30 p-1.5 rounded border border-red-900 mr-2 transition-colors hover:bg-red-900/50 z-20 cursor-pointer"
                            title="Borrar Partido"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}

                    {match.id.startsWith('temp') && onCancel && (
                        <button onClick={onCancel} className="text-red-400 hover:text-red-300 bg-red-900/30 p-1.5 rounded border border-red-900">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <button 
                        onClick={handleSaveEdit} 
                        disabled={isSaving}
                        className={`p-1.5 rounded border disabled:opacity-50 transition-colors ${errorMsg ? 'bg-red-900/50 border-red-500 text-red-200' : 'bg-green-900/30 border-green-900 text-green-400 hover:text-green-300'}`}
                        title={errorMsg || "Guardar"}
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                         errorMsg ? <AlertCircle className="w-4 h-4" /> :
                         <Save className="w-4 h-4" />}
                    </button>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  {/* Time & Day */}
                  <div>
                      <label className="text-[10px] text-gray-500 uppercase font-bold">Fecha</label>
                      <input 
                        type="datetime-local" 
                        value={isoDate}
                        onChange={(e) => setEditState({...editState, startTime: e.target.value})}
                        className="w-full bg-black/40 border border-gray-700 rounded p-2 text-sm text-white focus:border-red-500 outline-none"
                      />
                  </div>
                  <div>
                      <label className="text-[10px] text-gray-500 uppercase font-bold">Jornada</label>
                      <input 
                        type="number" 
                        disabled
                        value={editState.day}
                        className="w-full bg-black/20 border border-gray-800 rounded p-2 text-sm text-gray-500 cursor-not-allowed"
                        title="La jornada no se puede modificar desde aquí"
                      />
                  </div>

                  {/* Teams */}
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Equipo Azul</label>
                    <select 
                        value={editState.teamA || 'tbd'}
                        onChange={(e) => setEditState({...editState, teamA: e.target.value})}
                        className="w-full bg-black/40 border border-gray-700 rounded p-2 text-sm text-white focus:border-red-500 outline-none"
                    >
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Equipo Rojo</label>
                    <select 
                        value={editState.teamB || 'tbd'}
                        onChange={(e) => setEditState({...editState, teamB: e.target.value})}
                        className="w-full bg-black/40 border border-gray-700 rounded p-2 text-sm text-white focus:border-red-500 outline-none"
                    >
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  {/* Winner & Status & BestOf */}
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Ganador</label>
                    <select 
                        value={editState.winnerId}
                        onChange={(e) => setEditState({...editState, winnerId: e.target.value})}
                        className="w-full bg-black/40 border border-gray-700 rounded p-2 text-sm text-white focus:border-red-500 outline-none"
                    >
                        <option value="">-- Pendiente --</option>
                        <option value={editState.teamA}>{teams.find(t => t.id === editState.teamA)?.shortName || 'Azul'}</option>
                        <option value={editState.teamB}>{teams.find(t => t.id === editState.teamB)?.shortName || 'Rojo'}</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase font-bold">Estado</label>
                        <select 
                            value={editState.status}
                            onChange={(e) => setEditState({...editState, status: e.target.value})}
                            className="w-full bg-black/40 border border-gray-700 rounded p-2 text-sm text-white focus:border-red-500 outline-none uppercase"
                        >
                            <option value="scheduled">Programado</option>
                            <option value="live">En Vivo</option>
                            <option value="finished">Finalizado</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase font-bold">Formato</label>
                        <select 
                            value={editState.bestOf}
                            onChange={(e) => setEditState({...editState, bestOf: Number(e.target.value)})}
                            className="w-full bg-black/40 border border-gray-700 rounded p-2 text-sm text-white focus:border-red-500 outline-none uppercase"
                        >
                            <option value={1}>BO1</option>
                            <option value={3}>BO3</option>
                            <option value={5}>BO5</option>
                        </select>
                      </div>
                  </div>

                  {/* Bracket Selector - Only show if stage is Playoffs or Finals */}
                  {isPlayoffMatch && (
                       <div className="col-span-2">
                            <label className="text-[10px] text-gray-500 uppercase font-bold">Bracket (Playoffs)</label>
                            <select 
                                value={editState.bracketStage}
                                onChange={(e) => setEditState({...editState, bracketStage: e.target.value as 'winners'|'losers'|'finals' })}
                                className="w-full bg-black/40 border border-gray-700 rounded p-2 text-sm text-white focus:border-red-500 outline-none uppercase"
                            >
                                <option value="winners">Winners Bracket</option>
                                <option value="losers">Losers Bracket</option>
                                <option value="finals">Gran Final</option>
                            </select>
                       </div>
                  )}
              </div>
              
              {/* Extra delete button for visibility */}
               {!match.id.startsWith('temp') && onDelete && (
                  <div className="mt-4 pt-4 border-t border-red-900/30 flex justify-end">
                      <button 
                        type="button"
                        onClick={triggerDeleteMode}
                        className="text-xs text-red-500 hover:text-red-300 underline font-bold px-2 py-1"
                      >
                          Eliminar Partido Definitivamente
                      </button>
                  </div>
               )}
          </div>
      );
  }

  // --- NORMAL RENDER ---
  return (
    <div className={`w-full bg-gray-900/50 backdrop-blur-sm rounded-xl border overflow-hidden mb-4 shadow-xl transition-all ${match.isCompleted ? 'border-gray-800 opacity-90' : isLocked ? 'border-gray-800 opacity-95' : 'border-gray-700'}`}>
      {/* Header */}
      <div className="bg-black/30 px-4 py-2 flex justify-between items-center text-xs text-gray-400">
        <div className="flex items-center gap-2">
           {customTitle ? (
               // SHOW CUSTOM BRACKET TITLE (e.g., "R1 1" or "L-SEMI")
               <span className="text-white font-bold uppercase flex items-center gap-1 bg-[#c8aa6e]/20 px-2 py-0.5 rounded border border-[#c8aa6e]/50 text-[#c8aa6e]">
                  <GitMerge className="w-3 h-3" /> {customTitle}
               </span>
           ) : (
               (match.stage === Stage.PLAYOFFS || match.stage === Stage.FINALS) ? (
                  match.bracketStage === 'losers' ? (
                      <span className="text-gray-500 font-bold uppercase flex items-center gap-1 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">
                         <ShieldAlert className="w-3 h-3" /> Losers
                      </span>
                   ) : match.bracketStage === 'finals' ? (
                       <span className="text-[#c8aa6e] font-bold uppercase flex items-center gap-1 bg-[#c8aa6e]/20 px-1.5 py-0.5 rounded border border-[#c8aa6e]/50">
                          <Trophy className="w-3 h-3" /> Gran Final
                       </span>
                   ) : (
                       <span className="text-yellow-500 font-bold uppercase flex items-center gap-1 bg-yellow-900/20 px-1.5 py-0.5 rounded border border-yellow-700/50">
                          <Crown className="w-3 h-3" /> Winners
                       </span>
                   )
               ) : (
                 <span className="uppercase tracking-wider font-semibold">{match.stage}</span>
               )
           )}
           
           <span className="text-gray-600">|</span>
           <span className="text-[#c8aa6e] font-bold">JORNADA {match.day}</span>
           <span className="text-gray-600">|</span>
           <div className="flex items-center gap-1 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 text-gray-300 font-bold">
               <Swords className="w-3 h-3" />
               <span>BO{match.bestOf || 1}</span>
           </div>
        </div>
        
        {/* RIGHT SIDE HEADER ACTIONS */}
        <div className="flex items-center gap-2">
            {match.isCompleted && <span className="text-green-400 font-bold uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Finalizado</span>}
            {isLocked && !match.isCompleted && (
                <span 
                    className="text-red-400 font-bold uppercase flex items-center gap-1 cursor-help"
                    title={`Debug: DayLocked=${isDayLocked}, TimeLocked=${isTimeLocked}, ExplicitOpen=${isExplicitlyOpened}, TBD=${isTbd}`}
                >
                    <Lock className="w-3 h-3"/> Cerrado
                </span>
            )}
            <span className={isLocked || match.isCompleted ? 'opacity-50' : ''}>
                {new Date(match.startTime).toLocaleDateString([], {day: '2-digit', month: '2-digit'})} - {new Date(match.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
        </div>
      </div>

      {/* Teams Selection */}
      <div className="p-4 relative">
        <div className="flex justify-between items-stretch gap-4">
          <TeamButton 
            team={match.teamA} 
            isSelected={selectedWinnerId === match.teamA.id} 
            match={match}
            isEditing={isEditing}
            isLocked={isLocked}
            onSelect={onSelectWinner}
            record={teamARecord}
          />
          
          <div className="flex flex-col items-center justify-center gap-2 min-w-[60px]">
            {(match.isCompleted || (match.games && match.games.length > 0)) ? (
                // SHOW NUMERIC SCORE FOR COMPLETED MATCHES OR MATCHES IN PROGRESS
                <div className="flex items-center gap-2 text-2xl font-black italic tracking-widest drop-shadow-md">
                    <span className={scoreA > scoreB ? 'text-green-400' : 'text-gray-500'}>{scoreA}</span>
                    <span className="text-gray-700 text-base">-</span>
                    <span className={scoreB > scoreA ? 'text-green-400' : 'text-gray-500'}>{scoreB}</span>
                </div>
            ) : (
                <span className="text-gray-600 font-bold text-xl italic">VS</span>
            )}
            
            {/* VIEW STATS BUTTON (User Mode) */}
            {hasStats && onViewStats && !isEditing && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onViewStats(match); }}
                    disabled={isTbd}
                    className={`flex flex-col items-center justify-center bg-blue-900/20 hover:bg-blue-900/40 text-blue-300 border border-blue-500/30 hover:border-blue-400 rounded px-2 py-1 transition-colors group z-20 ${isTbd ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={isTbd ? "Estadísticas no disponibles" : "Ver Estadísticas Detalladas"}
                >
                    <FileBarChart className="w-4 h-4 mb-0.5 group-hover:text-white" />
                    <span className="text-[9px] font-bold uppercase">Stats</span>
                </button>
            )}
          </div>

          <TeamButton 
            team={match.teamB} 
            isSelected={selectedWinnerId === match.teamB.id} 
            match={match}
            isEditing={isEditing}
            isLocked={isLocked}
            onSelect={onSelectWinner}
            record={teamBRecord}
          />
        </div>
      </div>
    </div>
  );
};
