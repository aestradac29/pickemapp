import React, { useState } from 'react';
import { Match, Team } from '../types';
import { CheckCircle2, Save, X, Calendar, Trophy } from 'lucide-react';
import { WHITE_LOGO_TEAMS } from '../constants';

interface MatchCardProps {
  match: Match;
  selectedWinnerId?: string;
  onSelectWinner: (matchId: string, teamId: string) => void;
  // Admin Props
  isEditing?: boolean;
  teams?: Team[]; // Required for editing dropdowns
  onUpdate?: (updates: any) => void;
  onCancel?: () => void; // New prop for cancelling new match
}

export const MatchCard: React.FC<MatchCardProps> = ({ 
    match, 
    selectedWinnerId, 
    onSelectWinner,
    isEditing = false,
    teams = [],
    onUpdate,
    onCancel
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

  const handleSaveEdit = () => {
      if (onUpdate) onUpdate(editState);
  };

  const TeamButton = ({ team, isSelected }: { team: Team; isSelected: boolean }) => {
    const shouldInvert = WHITE_LOGO_TEAMS.includes(team.id);

    return (
      <button
        onClick={() => !isEditing && onSelectWinner(match.id, team.id)}
        disabled={isEditing || match.isCompleted}
        className={`
          flex-1 flex flex-col items-center justify-center p-4 rounded-lg transition-all duration-200 border-2
          ${isSelected 
            ? 'bg-hextech-500/10 border-hextech-500 shadow-[0_0_15px_rgba(200,170,110,0.3)]' 
            : match.isCompleted 
                ? 'bg-gray-800/50 border-gray-800 opacity-60 grayscale' 
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

  // --- ADMIN EDIT MODE RENDER ---
  if (isEditing) {
      // Format date for input
      const date = new Date(editState.startTime);
      const isoDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

      return (
          <div className="w-full bg-red-950/20 backdrop-blur-sm rounded-xl border border-red-500/30 overflow-hidden mb-4 shadow-xl p-4 animate-in fade-in">
              <div className="flex items-center justify-between mb-4 border-b border-red-900/50 pb-2">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-widest">
                      {match.id.startsWith('temp') ? 'Creando Nuevo Partido' : 'Editando Partido'}
                  </span>
                  <div className="flex items-center gap-2">
                    {match.id.startsWith('temp') && onCancel && (
                        <button onClick={onCancel} className="text-red-400 hover:text-red-300 bg-red-900/30 p-1.5 rounded border border-red-900">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <button onClick={handleSaveEdit} className="text-green-400 hover:text-green-300 bg-green-900/30 p-1.5 rounded border border-green-900">
                        <Save className="w-4 h-4" />
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
    <div className={`w-full bg-gray-900/50 backdrop-blur-sm rounded-xl border overflow-hidden mb-4 shadow-xl transition-all ${match.isCompleted ? 'border-gray-800 opacity-80' : 'border-gray-700'}`}>
      {/* Header */}
      <div className="bg-black/30 px-4 py-2 flex justify-between items-center text-xs text-gray-400">
        <div className="flex items-center gap-2">
           <span className="uppercase tracking-wider font-semibold">{match.stage}</span>
           <span className="text-gray-600">|</span>
           <span className="text-[#c8aa6e] font-bold">DAY {match.day}</span>
        </div>
        <div className="flex items-center gap-2">
            {match.isCompleted && <span className="text-green-400 font-bold uppercase">Finalizado</span>}
            <span>{new Date(match.startTime).toLocaleDateString()} - {new Date(match.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
      </div>

      {/* Teams Selection */}
      <div className="p-4">
        <div className="flex justify-between items-stretch gap-4">
          <TeamButton team={match.teamA} isSelected={selectedWinnerId === match.teamA.id} />
          
          <div className="flex flex-col items-center justify-center">
            <span className="text-gray-600 font-bold text-xl italic">VS</span>
          </div>

          <TeamButton team={match.teamB} isSelected={selectedWinnerId === match.teamB.id} />
        </div>
      </div>
    </div>
  );
};