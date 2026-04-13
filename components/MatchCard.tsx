import React, { useState, useEffect } from 'react';
import { Match, Team, Stage, MatchStatus } from '../types';
import {
  CheckCircle2, Save, X, Trophy, Loader2, AlertCircle, Lock,
  Trash2, AlertTriangle, Swords, ShieldAlert, Crown, GitMerge,
  BarChart2, FileBarChart, XCircle
} from 'lucide-react';

interface MatchCardProps {
  match: Match;
  selectedWinnerId?: string;
  onSelectWinner: (matchId: string, teamId: string) => void;
  isLocked?: boolean;
  isExplicitlyOpened?: boolean;
  isAdmin?: boolean;
  customTitle?: string;
  teamARecord?: string;
  teamBRecord?: string;
  isEditing?: boolean;
  teams?: Team[];
  onUpdate?: (updates: any) => Promise<void> | void;
  onCancel?: () => void;
  onDelete?: () => Promise<void> | void;
  onEditStats?: (match: Match) => void;
  onViewStats?: (match: Match) => void;
}

// ── TeamButton ────────────────────────────────────────────────────────────────
const TeamButton = ({
  team, isSelected, match, isEditing, isLocked, onSelect, record, side,
}: {
  team: Team; isSelected: boolean; match: Match; isEditing: boolean;
  isLocked: boolean; onSelect: (id: string, teamId: string) => void;
  record?: string; side: 'left' | 'right';
}) => {
  const isWinner    = match.winnerId === team.id;
  const isWrongPick = match.isCompleted && isSelected && !!match.winnerId && !isWinner;
  const isPending   = match.status === MatchStatus.SCHEDULED && !isLocked;
  const canInteract = isPending && !isEditing;

  // Estado visual dominante
  let stateClass = '';
  let glowStyle: React.CSSProperties = {};

  if (isWinner) {
    stateClass = 'border-green-500/60 bg-green-500/5';
    glowStyle  = { boxShadow: '0 0 20px rgba(34,197,94,0.18)' };
  } else if (isWrongPick) {
    stateClass = 'border-red-500/50 bg-red-900/10';
    glowStyle  = { boxShadow: '0 0 12px rgba(239,68,68,0.12)' };
  } else if (isSelected && !match.isCompleted) {
    stateClass = 'border-[#c8aa6e]/70 bg-[#c8aa6e]/6';
    glowStyle  = { boxShadow: '0 0 20px rgba(200,170,110,0.18)' };
  } else if (!canInteract) {
    stateClass = 'border-gray-800/60 bg-gray-800/10 cursor-not-allowed opacity-60';
  } else {
    stateClass = 'border-gray-700/50 bg-[#060f1e] hover:border-gray-500/60 hover:bg-[#0a1a30]';
  }

  return (
    <button
      onClick={() => canInteract && onSelect(match.id, team.id)}
      disabled={!canInteract}
      className={`
        group flex-1 flex flex-col items-center justify-center py-5 px-3
        rounded-xl border transition-all duration-200 relative overflow-hidden
        ${stateClass}
      `}
      style={glowStyle}
    >
      {/* Acento de color del equipo en el borde superior */}
      {!isLocked && !match.isCompleted && (
        <div
          className="absolute top-0 inset-x-0 h-0.5 transition-opacity duration-200"
          style={{
            background: `linear-gradient(90deg, transparent, ${team.color || '#666'}80, transparent)`,
            opacity: isSelected ? 1 : 0,
          }}
        />
      )}

      {/* Logo / inicial */}
      <div className="relative mb-3 w-14 h-14 flex items-center justify-center">
        {team.id === 'tbd' ? (
          <div className="w-12 h-12 rounded-full bg-gray-800/60 border border-dashed border-gray-600 flex items-center justify-center">
            <span className="text-gray-500 font-bold text-[10px] tracking-tight">TBD</span>
          </div>
        ) : team.logo ? (
          <>
            <img
              src={team.logo}
              alt={team.name}
              className="w-12 h-12 object-contain drop-shadow-md transition-transform duration-200 group-hover:scale-110"
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div
              className="hidden w-10 h-10 rounded-full items-center justify-center font-bold text-white text-base"
              style={{ backgroundColor: team.color || '#334155' }}
            >
              {team.shortName[0]}
            </div>
          </>
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-base"
            style={{ backgroundColor: team.color || '#334155' }}
          >
            {team.shortName[0]}
          </div>
        )}
      </div>

      {/* Nombre + record */}
      <span
        className="font-bold text-base leading-none transition-colors"
        style={isSelected && !isWrongPick ? { color: '#c8aa6e' } : isWrongPick ? { color: '#f87171' } : {}}
      >
        <span className={isSelected || isWinner ? '' : 'text-gray-300'}>
          {team.shortName}
        </span>
      </span>
      {record && (
        <span className="text-[10px] font-medium text-gray-600 mt-1">{record}</span>
      )}

      {/* Badge de estado */}
      {isWinner && (
        <div className="mt-2.5 flex items-center gap-1 bg-green-500/12 border border-green-500/30 text-green-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
          <Trophy className="w-2.5 h-2.5" /> Ganador
        </div>
      )}
      {isWrongPick && (
        <div className="mt-2.5 flex items-center gap-1 bg-red-500/10 border border-red-500/25 text-red-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
          <XCircle className="w-2.5 h-2.5" /> Fallado
        </div>
      )}
      {isSelected && !match.isCompleted && !isWrongPick && (
        <div className="mt-2.5 flex items-center gap-1 bg-[#c8aa6e]/10 border border-[#c8aa6e]/30 text-[#c8aa6e] px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
          <CheckCircle2 className="w-2.5 h-2.5" /> Mi pick
        </div>
      )}
    </button>
  );
};

// ── MatchCard ─────────────────────────────────────────────────────────────────
export const MatchCard: React.FC<MatchCardProps> = ({
  match, selectedWinnerId, onSelectWinner,
  isLocked = false, isExplicitlyOpened = false, isAdmin = false,
  customTitle, teamARecord, teamBRecord,
  isEditing = false, teams = [], onUpdate, onCancel, onDelete,
  onEditStats, onViewStats,
}) => {
  const [editState, setEditState] = useState({
    teamA:        match.teamA?.id || 'tbd',
    teamB:        match.teamB?.id || 'tbd',
    startTime:    match.startTime,
    winnerId:     match.winnerId || '',
    status:       match.isCompleted ? 'finished' : 'scheduled',
    day:          match.day || 1,
    bestOf:       match.bestOf || 1,
    bracketStage: match.bracketStage || 'winners',
  });
  const [isSaving, setIsSaving]               = useState(false);
  const [errorMsg, setErrorMsg]               = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isTbd          = match.teamA?.id === 'tbd' || match.teamB?.id === 'tbd';
  const effectiveLocked = (isLocked || isTbd) && !isAdmin;
  const hasStats        = ((match.games && match.games.length > 0) ||
                           (match.stats && Object.keys(match.stats).length > 0)) && !isTbd;

  let scoreA = 0, scoreB = 0;
  if (match.games && match.games.length > 0) {
    match.games.forEach(g => {
      if (g.winnerId === match.teamA?.id) scoreA++;
      if (g.winnerId === match.teamB?.id) scoreB++;
    });
  } else if (match.winnerId) {
    if (match.winnerId === match.teamA?.id) scoreA = 1;
    else if (match.winnerId === match.teamB?.id) scoreB = 1;
  }

  useEffect(() => {
    setEditState({
      teamA: match.teamA?.id || 'tbd', teamB: match.teamB?.id || 'tbd',
      startTime: match.startTime, winnerId: match.winnerId || '',
      status: match.isCompleted ? 'finished' : 'scheduled',
      day: match.day || 1, bestOf: match.bestOf || 1,
      bracketStage: match.bracketStage || 'winners',
    });
  }, [match]);

  const handleSaveEdit = async () => {
    if (!onUpdate) return;
    setIsSaving(true); setErrorMsg(null);
    try {
      const d = new Date(editState.startTime);
      const validDate = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      await onUpdate({ ...editState, startTime: validDate, bestOf: Number(editState.bestOf) });
    } catch (e: any) {
      console.error('Error saving match:', e); setErrorMsg('Error al guardar');
    } finally { setIsSaving(false); }
  };

  // ── Admin edit mode ───────────────────────────────────────────────────────
  if (isEditing) {
    const d     = new Date(editState.startTime);
    const safe  = isNaN(d.getTime()) ? new Date() : d;
    const iso   = new Date(safe.getTime() - safe.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const isPO  = match.stage === Stage.PLAYOFFS || match.stage === Stage.FINALS;
    const sel   = (val: string, onChange: (v: string) => void, opts: [string,string][]) => {
      const uniqueOpts = Array.from(new Map(opts.map(o => [o[0], o])).values());
      return (
      <select value={val} onChange={e => onChange(e.target.value)}
        className="w-full bg-black/40 border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-red-500 outline-none">
        {uniqueOpts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    );
    };

    return (
      <div className="relative w-full bg-red-950/15 rounded-xl border border-red-500/25 overflow-hidden mb-3 p-4 animate-in fade-in">
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in" onClick={e => { e.stopPropagation(); setShowDeleteConfirm(false); }}>
            <div className="bg-[#0d1b2e] border border-red-500/40 rounded-2xl p-6 max-w-xs w-full shadow-2xl text-center animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-full bg-red-900/30 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h4 className="text-white font-bold text-base mb-1">¿Borrar este partido?</h4>
              <p className="text-gray-500 text-xs mb-5">Esta acción no se puede deshacer.</p>
              <div className="flex gap-3">
                <button onClick={e => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm font-bold transition-colors">
                  Cancelar
                </button>
                <button onClick={e => { e.stopPropagation(); onDelete?.(); setShowDeleteConfirm(false); }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-900/30">
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3 pb-2 border-b border-red-900/40">
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
            {match.id.startsWith('temp') ? 'Nuevo Partido' : 'Editar Partido'}
          </span>
          <div className="flex items-center gap-2">
            {!match.id.startsWith('temp') && onEditStats && (
              <button type="button" onClick={() => onEditStats(match)} disabled={isTbd}
                className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-lg border transition-colors
                  ${isTbd ? 'opacity-40 cursor-not-allowed bg-gray-800 border-gray-700 text-gray-500'
                          : hasStats ? 'bg-green-900/25 border-green-500/50 text-green-300 hover:bg-green-900/40'
                                     : 'bg-purple-900/25 border-purple-500/50 text-purple-300 hover:bg-purple-900/40'}`}>
                <BarChart2 className="w-3 h-3" /> Stats
              </button>
            )}
            {!match.id.startsWith('temp') && onDelete && (
              <button type="button" onClick={e => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                className="p-1.5 rounded-lg border border-red-900/60 bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            {match.id.startsWith('temp') && onCancel && (
              <button onClick={onCancel} className="p-1.5 rounded-lg border border-red-900/60 bg-red-900/20 text-red-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={handleSaveEdit} disabled={isSaving}
              className={`p-1.5 rounded-lg border transition-colors
                ${errorMsg ? 'bg-red-900/40 border-red-500 text-red-300'
                           : 'bg-green-900/25 border-green-900/60 text-green-400 hover:bg-green-900/40'}`}>
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
               : errorMsg ? <AlertCircle className="w-3.5 h-3.5" />
               : <Save className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Fecha</label>
            <input type="datetime-local" value={iso}
              onChange={e => setEditState({ ...editState, startTime: e.target.value })}
              className="w-full bg-black/40 border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-red-500 outline-none" />
          </div>
          <div>
            <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Jornada</label>
            <input type="number" disabled value={editState.day}
              className="w-full bg-black/20 border border-gray-800 rounded-lg p-2 text-sm text-gray-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Equipo A</label>
            {sel(editState.teamA || 'tbd', v => setEditState({ ...editState, teamA: v }),
              teams.map(t => [t.id, t.name] as [string,string]))}
          </div>
          <div>
            <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Equipo B</label>
            {sel(editState.teamB || 'tbd', v => setEditState({ ...editState, teamB: v }),
              teams.map(t => [t.id, t.name] as [string,string]))}
          </div>
          <div>
            <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Ganador</label>
            {sel(editState.winnerId, v => setEditState({ ...editState, winnerId: v }), [
              ['', '-- Pendiente --'],
              [editState.teamA, teams.find(t => t.id === editState.teamA)?.shortName || 'A'],
              [editState.teamB, teams.find(t => t.id === editState.teamB)?.shortName || 'B'],
            ])}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Estado</label>
              {sel(editState.status, v => setEditState({ ...editState, status: v }), [
                ['scheduled','Programado'],['live','En Vivo'],['finished','Finalizado'],
              ])}
            </div>
            <div>
              <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Formato</label>
              {sel(String(editState.bestOf), v => setEditState({ ...editState, bestOf: Number(v) }), [
                ['1','BO1'],['3','BO3'],['5','BO5'],
              ])}
            </div>
          </div>
          {isPO && (
            <div className="col-span-2">
              <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Bracket</label>
              {sel(editState.bracketStage, v => setEditState({ ...editState, bracketStage: v as any }), [
                ['winners','Winners'],['losers','Losers'],['finals','Gran Final'],
              ])}
            </div>
          )}
        </div>
        {!match.id.startsWith('temp') && onDelete && (
          <div className="mt-3 pt-3 border-t border-red-900/25 flex justify-end">
            <button type="button" onClick={e => { e.stopPropagation(); setShowDeleteConfirm(true); }}
              className="text-[10px] text-red-500 hover:text-red-300 underline font-bold">
              Eliminar definitivamente
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Normal render ─────────────────────────────────────────────────────────
  const isFinished = match.isCompleted;
  const isPO       = match.stage === Stage.PLAYOFFS || match.stage === Stage.FINALS;

  // Color de acento según estado
  const accentLine = isFinished
    ? 'from-transparent via-green-500/20 to-transparent'
    : effectiveLocked
    ? 'from-transparent via-red-500/10 to-transparent'
    : 'from-transparent via-[#c8aa6e]/15 to-transparent';

  return (
    <div
      className={`
        relative w-full rounded-xl border overflow-hidden mb-3 transition-all duration-200
        ${isFinished
          ? 'bg-[#050d1a] border-gray-800/50'
          : effectiveLocked
          ? 'bg-[#050d1a] border-gray-800/40 opacity-90'
          : 'bg-[#060f1e] border-gray-700/50 hover:border-gray-600/60'}
      `}
    >
      {/* Línea de acento superior */}
      <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r ${accentLine}`} />

      {/* ── Header ── */}
      <div className="px-4 py-2.5 flex justify-between items-center border-b border-gray-800/50">
        <div className="flex items-center gap-2 text-[11px]">
          {/* Tipo de partido */}
          {customTitle ? (
            <span className="flex items-center gap-1 text-[#c8aa6e] font-bold bg-[#c8aa6e]/10 border border-[#c8aa6e]/25 px-2 py-0.5 rounded">
              <GitMerge className="w-3 h-3" /> {customTitle}
            </span>
          ) : isPO ? (
            match.bracketStage === 'losers' ? (
              <span className="flex items-center gap-1 text-gray-400 font-bold bg-gray-800/60 border border-gray-700/40 px-2 py-0.5 rounded">
                <ShieldAlert className="w-3 h-3" /> Losers
              </span>
            ) : match.bracketStage === 'finals' ? (
              <span className="flex items-center gap-1 text-[#c8aa6e] font-bold bg-[#c8aa6e]/10 border border-[#c8aa6e]/25 px-2 py-0.5 rounded">
                <Trophy className="w-3 h-3" /> Gran Final
              </span>
            ) : (
              <span className="flex items-center gap-1 text-yellow-400 font-bold bg-yellow-900/15 border border-yellow-700/30 px-2 py-0.5 rounded">
                <Crown className="w-3 h-3" /> Winners
              </span>
            )
          ) : (
            <span className="text-gray-500 font-semibold uppercase tracking-wider">{match.stage}</span>
          )}

          <span className="text-gray-700">·</span>

          <span className="text-[#c8aa6e]/80 font-bold">J{match.day}</span>

          <span className="text-gray-700">·</span>

          <span className="flex items-center gap-1 text-gray-500 font-bold bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-700/30">
            <Swords className="w-2.5 h-2.5" /> BO{match.bestOf || 1}
          </span>
        </div>

        {/* Estado derecho */}
        <div className="flex items-center gap-2 text-[11px]">
          {isFinished && (
            <span className="flex items-center gap-1 text-green-400 font-bold">
              <CheckCircle2 className="w-3 h-3" /> Finalizado
            </span>
          )}
          {effectiveLocked && !isFinished && (
            <span className="flex items-center gap-1 text-red-400/70 font-bold">
              <Lock className="w-3 h-3" /> Cerrado
            </span>
          )}
          <span className="text-gray-600">
            {new Date(match.startTime).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
            {' '}&middot;{' '}
            {new Date(match.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* ── Cuerpo: equipos + marcador ── */}
      <div className="p-3">
        <div className="flex items-stretch gap-3">
          <TeamButton
            team={match.teamA} isSelected={selectedWinnerId === match.teamA.id}
            match={match} isEditing={isEditing} isLocked={effectiveLocked}
            onSelect={onSelectWinner} record={teamARecord} side="left"
          />

          {/* Centro: marcador / VS / stats */}
          <div className="flex flex-col items-center justify-center gap-2 min-w-[52px]">
            {(isFinished || (match.games && match.games.length > 0)) ? (
              <div className="flex items-center gap-1.5 text-2xl font-black tracking-wider">
                <span className={scoreA > scoreB ? 'text-green-400' : 'text-gray-500'}>{scoreA}</span>
                <span className="text-gray-700 text-sm">–</span>
                <span className={scoreB > scoreA ? 'text-green-400' : 'text-gray-500'}>{scoreB}</span>
              </div>
            ) : (
              <span className="text-gray-600 font-bold text-xl italic tracking-widest">VS</span>
            )}

            {hasStats && onViewStats && !isEditing && (
              <button
                onClick={e => { e.stopPropagation(); onViewStats(match); }}
                disabled={isTbd}
                className="flex flex-col items-center gap-0.5 bg-[#060f1e] hover:bg-blue-900/20 border border-gray-700/40 hover:border-blue-500/30 text-gray-500 hover:text-blue-300 rounded-lg px-2 py-1.5 transition-colors group"
                title="Ver estadísticas"
              >
                <FileBarChart className="w-3.5 h-3.5" />
                <span className="text-[8px] font-bold uppercase">Stats</span>
              </button>
            )}
          </div>

          <TeamButton
            team={match.teamB} isSelected={selectedWinnerId === match.teamB.id}
            match={match} isEditing={isEditing} isLocked={effectiveLocked}
            onSelect={onSelectWinner} record={teamBRecord} side="right"
          />
        </div>
      </div>
    </div>
  );
};
