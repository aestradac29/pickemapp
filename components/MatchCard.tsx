import React, { useState, useEffect } from 'react';
import { Match, Team } from '../types';
import { CheckCircle2, Save, X, Calendar, Trophy, Loader2, AlertCircle, Lock, Trash2 } from 'lucide-react';
import { WHITE_LOGO_TEAMS } from '../constants';

interface MatchCardProps {
  match: Match;
  selectedWinnerId?: string;
  onSelectWinner: (matchId: string, teamId: string) => void;
  isDayLocked?: boolean; // Prop para bloqueo global de jornada
  // Admin Props
  isEditing?: boolean;
  teams?: Team[]; // Required for editing dropdowns
  onUpdate?: (updates: any) => Promise<void> | void;
  onCancel?: () => void; // New prop for cancelling new match
  onDelete?: () => Promise<void> | void; // New prop for deleting
}

// Sub-component extracted for performance and cleanliness
const TeamButton = ({ 
    team, 
    isSelected, 
    match, 
    isEditing, 
    isLocked,
    onSelect 
}: { 
    team: Team; 
    isSelected: boolean; 
    match: Match; 
    isEditing: boolean;
    isLocked: boolean;
    onSelect: (id: string, teamId: string) => void; 
}) => {
    const shouldInvert = WHITE_LOGO_TEAMS.includes(team.id);

    return (
      <button
        onClick={() => !isEditing && !isLocked && onSelect(match.id, team.id)}
        disabled={isEditing || match.isCompleted || isLocked}
        className={`
          flex-1 flex flex-col items-center justify-center p-4 rounded-lg transition-all duration-200 border-2 relative
          ${isSelected 
            ? 'bg-hextech-500/10 border-hextech-500 shadow-[0_0_15px_rgba(200,170,110,0.3)]' 
            : (match.isCompleted || isLocked)
                ? 'bg-gray-800/30 border-gray-800 opacity-70 grayscale-[0.5] cursor-not-allowed' 
                : 'bg-hextech-800 border-gray-700 hover:border-gray-500 hover:bg-gray-800'
          }
          ${match.winnerId === team.id ? 'ring-2 ring-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] !opacity-100 !grayscale-0' : ''}
        `}
      >
        <div className="mb-2 relative w-16 h-16 flex items-center justify-center">
            {team.logo ? (
                 <img 
                    src={team.logo} 
                    alt={team.name}
                    className={`w-14 h-14 object-contain drop-shadow-md ${shouldInvert ? 'brightness-0 invert' : ''}`}
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                 />
            ) : null}
            
            {/* Fallback Initial */}
            <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-lg ${team.logo ? 'hidden' : ''}`}
                style={{ backgroundColor: team.color }}
            >
                {team.shortName[0]}
            </div>
        </div>
        
        <span className={`font-bold text-lg ${isSelected ? 'text-hextech-500' : 'text-gray-300'}`}>
          {team.shortName}
        </span>
        
        {/* Indicators */}
        {isSelected && !match.isCompleted && (
          <CheckCircle2 className="w-5 h-5 text-hextech-500 mt-2 animate-bounce" />
        )}
        {match.winnerId === team.id && (
           <div className="mt-2 bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-green-500/50 flex items-center gap-1">
               <Trophy className="w-3 h-3" /> Winner
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
    isEditing = false,
    teams = [],
    onUpdate,
    onCancel,
    onDelete
}) => {
  
  // Local Edit State
  const [editState, setEditState] = useState({
      teamA: match.teamA.id,
      teamB: match.teamB.id,
      startTime: match.startTime,
      winnerId: match.winnerId || '',
      status: match.isCompleted ? 'finished' : 'scheduled',
      day: match.day || 1
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Effective Lock: Global Day Lock OR Individual Time Lock
  const isTimeLocked = new Date() > new Date(match.startTime) && !match.isCompleted;
  const isLocked = isDayLocked || isTimeLocked;

  // Sync state with props when match changes
  useEffect(() => {
    setEditState({
      teamA: match.teamA.id,
      teamB: match.teamB.id,
      startTime: match.startTime,
      winnerId: match.winnerId || '',
      status: match.isCompleted ? 'finished' : 'scheduled',
      day: match.day || 1
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
              startTime: validDate
          });
      } catch (error: any) {
          console.error("Error saving match:", error);
          setErrorMsg("Error al guardar");
      } finally {
          setIsSaving(false);
      }
  };

  // --- ADMIN EDIT MODE RENDER ---
  if (isEditing) {
      // Format date for input: Convert UTC ISO to Local formatted string for input type="datetime-local"
      const date = new Date(editState.startTime);
      const safeDate = isNaN(date.getTime()) ? new Date() : date;
      const isoDate = new Date(safeDate.getTime() - (safeDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

      return (
          <div className="w-full bg-red-950/20 backdrop-blur-sm rounded-xl border border-red-500/30 overflow-hidden mb-4 shadow-xl p-4 animate-in fade-in">
              <div className="flex items-center justify-between mb-4 border-b border-red-900/50 pb-2">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-widest">
                      {match.id.startsWith('temp') ? 'Creando Nuevo Partido' : 'Editando Partido'}
                  </span>
                  <div className="flex items-center gap-2">
                    {/* Botón de borrar si existe la prop y no es un partido temporal */}
                    {!match.id.startsWith('temp') && onDelete && (
                        <button 
                            onClick={onDelete}
                            className="text-red-500 hover:text-red-300 bg-red-900/30 p-1.5 rounded border border-red-900 mr-2"
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
                      <label className="text-[10px] text-gray-500 uppercase font-bold">Jornada (Bloqueado)</label>
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
                        value={editState.teamA}
                        onChange={(e) => setEditState({...editState, teamA: e.target.value})}
                        className="w-full bg-black/40 border border-gray-700 rounded p-2 text-sm text-white focus:border-red-500 outline-none"
                    >
                        <option value="">Selecciona Equipo</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Equipo Rojo</label>
                    <select 
                        value={editState.teamB}
                        onChange={(e) => setEditState({...editState, teamB: e.target.value})}
                        className="w-full bg-black/40 border border-gray-700 rounded p-2 text-sm text-white focus:border-red-500 outline-none"
                    >
                        <option value="">Selecciona Equipo</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  {/* Winner & Status */}
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
              </div>
          </div>
      );
  }

  // --- NORMAL RENDER ---
  return (
    <div className={`w-full bg-gray-900/50 backdrop-blur-sm rounded-xl border overflow-hidden mb-4 shadow-xl transition-all ${match.isCompleted ? 'border-gray-800 opacity-80' : isLocked ? 'border-gray-800 opacity-90' : 'border-gray-700'}`}>
      {/* Header */}
      <div className="bg-black/30 px-4 py-2 flex justify-between items-center text-xs text-gray-400">
        <div className="flex items-center gap-2">
           <span className="uppercase tracking-wider font-semibold">{match.stage}</span>
           <span className="text-gray-600">|</span>
           <span className="text-[#c8aa6e] font-bold">DAY {match.day}</span>
        </div>
        <div className="flex items-center gap-2">
            {match.isCompleted && <span className="text-green-400 font-bold uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Finalizado</span>}
            {isLocked && !match.isCompleted && <span className="text-red-400 font-bold uppercase flex items-center gap-1"><Lock className="w-3 h-3"/> Cerrado</span>}
            <span className={isLocked || match.isCompleted ? 'opacity-50' : ''}>
                {new Date(match.startTime).toLocaleDateString([], {day: '2-digit', month: '2-digit'})} - {new Date(match.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
        </div>
      </div>

      {/* Teams Selection */}
      <div className="p-4 relative">
        {/* Overlay for Locked matches that aren't finished yet */}
        {isLocked && !match.isCompleted && (
            <div className="absolute inset-0 bg-black/10 z-10 flex items-center justify-center pointer-events-none">
                <div className="bg-black/80 px-4 py-2 rounded-full border border-gray-700 backdrop-blur text-gray-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-xl">
                    <Lock className="w-3 h-3 text-red-400" /> Predicciones Cerradas
                </div>
            </div>
        )}

        <div className="flex justify-between items-stretch gap-4">
          <TeamButton 
            team={match.teamA} 
            isSelected={selectedWinnerId === match.teamA.id} 
            match={match}
            isEditing={isEditing}
            isLocked={isLocked}
            onSelect={onSelectWinner}
          />
          
          <div className="flex flex-col items-center justify-center">
            <span className="text-gray-600 font-bold text-xl italic">VS</span>
          </div>

          <TeamButton 
            team={match.teamB} 
            isSelected={selectedWinnerId === match.teamB.id} 
            match={match}
            isEditing={isEditing}
            isLocked={isLocked}
            onSelect={onSelectWinner}
          />
        </div>
      </div>
    </div>
  );
};