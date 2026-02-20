
import React from 'react';
import { Match, Team, Stage } from '../types';
import { Trophy, ShieldAlert, Crown, Clock, Swords, Lock } from 'lucide-react';

interface PlayoffBracketProps {
  matches: Match[];
  teams: Team[];
  predictions: { matchId: string; predictedWinnerId: string }[];
  onSelectWinner: (matchId: string, teamId: string) => void;
  isLocked: boolean;
}

const BracketMatch = ({ 
    match, 
    prediction, 
    onSelect, 
    isLocked, 
    label 
}: { 
    match?: Match; 
    teams: Team[]; 
    prediction?: string; 
    onSelect: (mId: string, tId: string) => void; 
    isLocked: boolean;
    label?: string;
}) => {
    if (!match) {
        return (
            <div className="w-full h-20 bg-[#0a1428]/30 border border-dashed border-gray-800 rounded-lg flex flex-col items-center justify-center p-2">
                <span className="text-[9px] uppercase text-gray-600 font-bold mb-1">{label}</span>
                <span className="text-gray-700 text-[10px]">Por definir</span>
            </div>
        );
    }

    const isFinished = match.isCompleted;
    // Calculate if this specific match has started
    const isTimeLocked = new Date() > new Date(match.startTime);
    // Effective lock: Global Admin Lock OR Match Started OR Finished
    const effectiveLock = isLocked || isTimeLocked;

    const dateObj = new Date(match.startTime);
    const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = dateObj.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    
    // CALCULATE SCORE FOR BRACKET
    let scoreA = 0;
    let scoreB = 0;
    if (match.games && match.games.length > 0) {
        match.games.forEach(g => {
            if (g.winnerId === match.teamA.id) scoreA++;
            if (g.winnerId === match.teamB.id) scoreB++;
        });
    } else if (match.winnerId) {
        if (match.winnerId === match.teamA.id) scoreA = 1;
        else scoreB = 1;
    }

    const hasScore = scoreA > 0 || scoreB > 0;

    const renderTeam = (team: Team, isTeamA: boolean) => {
        if (!team) return (
            <div className="flex items-center justify-between px-2 py-1 w-full transition-all border-l-2 h-7 bg-gray-800/30 border-transparent opacity-50">
                <span className="text-[10px] text-gray-600 italic">TBD</span>
            </div>
        );

        const isSelected = team.id ? prediction === team.id : false;
        const isWinner = team.id && match.winnerId === team.id;
        const isLoser = team.id && match.winnerId && match.winnerId !== team.id;
        const teamScore = isTeamA ? scoreA : scoreB;
        
        const isPlaceholder = !team.id || team.id.toLowerCase().includes('winner') || team.id.toLowerCase().includes('loser') || team.name.includes('Winner') || team.name.includes('Loser') || team.name === 'TBD';

        let bgClass = isPlaceholder ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-700/50 cursor-pointer';
        let textClass = 'text-gray-400';
        let borderClass = 'border-transparent';

        if (isSelected) {
            bgClass = 'bg-[#c8aa6e]/10 cursor-pointer';
            borderClass = 'border-[#c8aa6e]';
            textClass = 'text-[#c8aa6e] font-bold';
        }
        
        if (isFinished) {
            if (isWinner) {
                bgClass = 'bg-green-900/30';
                textClass = 'text-green-400 font-bold';
                if (isSelected) borderClass = 'border-green-500';
            } else if (isLoser) {
                textClass = 'text-gray-600 line-through';
                if (isSelected) {
                    bgClass = 'bg-red-900/20';
                    borderClass = 'border-red-500';
                    textClass = 'text-red-500 line-through';
                }
            }
        }

        return (
            <button
                disabled={effectiveLock || isFinished || isPlaceholder}
                onClick={() => onSelect(match.id, team.id)}
                className={`flex items-center justify-between px-2 py-1 w-full transition-all border-l-2 h-7 ${bgClass} ${borderClass}`}
                title={isPlaceholder ? 'Equipo por determinar' : effectiveLock ? 'Predicción Cerrada' : ''}
            >
                <div className="flex items-center gap-2 overflow-hidden w-full">
                    {team.logo ? (
                        <img src={team.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center text-[7px]" style={{backgroundColor: team.color}}>{team.shortName[0]}</div>
                    )}
                    <span className={`text-[10px] truncate ${textClass}`}>{team.name}</span>
                </div>
                
                {/* SHOW SCORE IF AVAILABLE */}
                {(isFinished || hasScore) && (
                    <span className={`text-[10px] font-bold ml-1 ${isWinner ? 'text-green-400' : isFinished ? 'text-gray-600' : 'text-gray-400'}`}>
                        {teamScore}
                    </span>
                )}
                
                {isWinner && <Trophy className="w-2.5 h-2.5 text-green-400 flex-shrink-0 ml-1" />}
            </button>
        );
    };

    const isLockedState = effectiveLock && !isFinished;

    return (
        <div className={`w-36 sm:w-44 bg-[#0f1923] border ${isLockedState ? 'border-red-900/40' : 'border-gray-700'} rounded overflow-hidden shadow-lg flex flex-col relative z-10 transition-transform hover:scale-[1.02]`}>
             
             {/* Header */}
             <div className={`px-2 py-1 flex justify-between items-center border-b ${isLockedState ? 'bg-red-950/20 border-red-900/30' : 'bg-[#050a14] border-gray-800'}`}>
                <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold uppercase ${isLockedState ? 'text-red-400' : 'text-gray-500'}`}>{label || `M${match.id}`}</span>
                    {!isLockedState && (
                        <span className={`text-[9px] font-bold px-1 rounded ${match.isCompleted ? 'bg-gray-800 text-gray-400' : 'bg-blue-900/30 text-blue-300 border border-blue-900'}`}>
                            BO{match.bestOf || 1}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 text-[9px] text-gray-400">
                    {isLockedState ? (
                        <div className="flex items-center gap-1 text-red-400">
                            <Lock className="w-2.5 h-2.5" />
                            <span className="uppercase font-bold tracking-wider">Cerrado</span>
                        </div>
                    ) : (
                        <>
                            <Clock className="w-2.5 h-2.5" />
                            <span>{match.isCompleted ? 'Final' : `${dateString} ${timeString}`}</span>
                        </>
                    )}
                </div>
             </div>
             
             {/* Teams */}
             <div className="flex flex-col">
                {renderTeam(match.teamA, true)}
                <div className={`h-px w-full ${isLockedState ? 'bg-red-900/20' : 'bg-gray-800'}`}></div>
                {renderTeam(match.teamB, false)}
             </div>
        </div>
    );
};

export const PlayoffBracket: React.FC<PlayoffBracketProps> = ({ matches, teams, predictions, onSelectWinner, isLocked }) => {
    
    // Sort all matches by time
    const sortedMatches = [...matches].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    // 1. Identify Grand Final (Strict check)
    let grandFinal = sortedMatches.find(m => m.stage === Stage.FINALS);
    
    // 2. Identify Winners Matches (exclude finals)
    let winnersMatches = sortedMatches.filter(m => m.bracketStage === 'winners' && m.stage !== Stage.FINALS);
    
    // CORRECCIÓN INTELIGENTE:
    // Si no hay Gran Final explícita (Stage.FINALS) pero el Winners Bracket tiene más de 7 partidos,
    // asumimos que el último partido (el 8º o posterior) es la Gran Final que fue mal etiquetada.
    if (!grandFinal && winnersMatches.length > 7) {
        grandFinal = winnersMatches[winnersMatches.length - 1];
        winnersMatches = winnersMatches.slice(0, winnersMatches.length - 1); // Lo quitamos del array de winners
    }

    const upperRound1 = winnersMatches.slice(0, 4); // Top 8 
    const upperRound2 = winnersMatches.slice(4, 6); // Top 4
    const upperFinal = winnersMatches.slice(6, 7);  // Winner Final

    // 3. Identify Losers Matches (exclude finals)
    const losersMatches = sortedMatches.filter(m => m.bracketStage === 'losers' && m.stage !== Stage.FINALS);
    const lowerRound1 = losersMatches.slice(0, 2); 
    const lowerRound2 = losersMatches.slice(2, 4); 
    const lowerRound3 = losersMatches.slice(4, 5); // Semi
    const lowerFinal  = losersMatches.slice(5, 6); // Final Lower

    // Helper for columns
    const renderColumn = (matchesForColumn: (Match | undefined)[], labelPrefix: string, emptyCount: number, justify: string = 'justify-around') => {
        const items = [...matchesForColumn];
        while (items.length < emptyCount) items.push(undefined);

        return (
            <div className={`flex flex-col ${justify} h-full py-2`}>
                {items.map((match, idx) => (
                    <div key={match?.id || `empty-${labelPrefix}-${idx}`} className="relative flex justify-center py-2">
                         <BracketMatch 
                            match={match} 
                            teams={teams}
                            prediction={predictions.find(p => p.matchId === match?.id)?.predictedWinnerId}
                            onSelect={onSelectWinner}
                            isLocked={isLocked}
                            label={`${labelPrefix} ${idx + 1}`}
                         />
                         
                         {/* Conector Horizontal Básico */}
                         {!labelPrefix.includes('Final') && !labelPrefix.includes('Semi') && (
                             <div className="absolute -right-4 top-1/2 w-4 h-px bg-gray-700 hidden md:block"></div>
                         )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="w-full bg-[#050a14] rounded-xl border border-gray-800 p-2 sm:p-4 overflow-x-auto">
            <div className="flex flex-nowrap min-w-max gap-8">
                
                {/* --- LEFT SIDE: UPPER & LOWER BRACKETS --- */}
                <div className="flex flex-col gap-12">
                    
                    {/* UPPER BRACKET */}
                    <div>
                        <div className="flex items-center gap-2 mb-2 border-b border-[#c8aa6e]/30 pb-1">
                            <Crown className="w-4 h-4 text-[#c8aa6e]" />
                            <h3 className="text-sm font-bold text-[#c8aa6e] uppercase tracking-widest">Upper Bracket</h3>
                        </div>
                        <div className="flex gap-6">
                            {/* R1 */}
                            <div className="relative">
                                {renderColumn(upperRound1, "R1", 4)}
                                <div className="absolute right-0 top-[12%] bottom-[12%] w-px bg-gray-800 hidden md:block"></div>
                            </div>
                            {/* R2 */}
                            <div className="relative">
                                {renderColumn(upperRound2, "R2", 2)}
                                <div className="absolute right-0 top-[25%] bottom-[25%] w-px bg-gray-800 hidden md:block"></div>
                            </div>
                            {/* Winner Final */}
                            <div>
                                {renderColumn(upperFinal, "Final W", 1, 'justify-center')}
                            </div>
                        </div>
                    </div>

                    {/* LOWER BRACKET */}
                    <div>
                        <div className="flex items-center gap-2 mb-2 border-b border-gray-700 pb-1">
                            <ShieldAlert className="w-4 h-4 text-gray-500" />
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Lower Bracket</h3>
                        </div>
                        <div className="flex gap-6">
                            {/* L-R1 */}
                            <div>
                                {renderColumn(lowerRound1, "L-R1", 2, 'justify-center')}
                            </div>
                            {/* L-R2 */}
                            <div>
                                {renderColumn(lowerRound2, "L-R2", 2, 'justify-center')}
                            </div>
                            {/* L-Semi & L-Final Stacked */}
                            <div className="flex flex-col justify-center gap-8">
                                <div className="relative">
                                    <span className="absolute -top-3 left-0 text-[9px] text-gray-600 uppercase font-bold">Semifinal</span>
                                    {renderColumn(lowerRound3, "L-Semi", 1, 'justify-center')}
                                </div>
                                <div className="relative">
                                    <span className="absolute -top-3 left-0 text-[9px] text-gray-600 uppercase font-bold">Final Lower</span>
                                    {renderColumn(lowerFinal, "L-Final", 1, 'justify-center')}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* --- RIGHT SIDE: GRAND FINAL --- */}
                <div className="flex flex-col justify-center items-center pl-8 border-l border-gray-800 border-dashed min-w-[200px]">
                    <div className="relative">
                        {/* Lines connecting to Final */}
                        <div className="absolute -left-8 top-[30%] w-8 h-px bg-gray-600"></div> {/* From Upper */}
                        <div className="absolute -left-8 bottom-[30%] w-8 h-px bg-gray-600"></div> {/* From Lower */}

                        <div className="transform scale-110 mb-4">
                             <BracketMatch 
                                match={grandFinal}
                                teams={teams}
                                prediction={predictions.find(p => p.matchId === grandFinal?.id)?.predictedWinnerId}
                                onSelect={onSelectWinner}
                                isLocked={isLocked}
                                label="GRAN FINAL"
                             />
                        </div>
                        <div className="text-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c8aa6e]/10 border border-[#c8aa6e] text-[#c8aa6e] text-[10px] font-bold uppercase tracking-widest">
                                <Trophy className="w-3 h-3" />
                                <span>Campeón</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
