
import React, { useState, useEffect, useMemo } from 'react';
import { normalizeSplitId } from '../constants';
import { Team, Match, Stage } from '../types';
import { dataService } from '../services/dataService';
import { Loader2, TrendingUp, TrendingDown, Minus, Trophy, X, Calendar, ChevronRight } from 'lucide-react';

interface StandingRow {
    team: Team;
    played: number;
    wins: number;
    losses: number;
    streak: number; // positive for Win streak, negative for Loss streak
    lastFive: ('W' | 'L')[];
}

interface TeamScheduleModalProps {
    team: Team;
    matches: Match[];
    onClose: () => void;
}

const TeamScheduleModal: React.FC<TeamScheduleModalProps> = ({ team, matches, onClose }) => {
    // Filter matches involving this team
    const teamMatches = useMemo(() => {
        return matches
            .filter(m => m.teamA?.id === team.id || m.teamB?.id === team.id)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }, [matches, team]);

    // Calculate quick stats for the header
    const stats = useMemo(() => {
        let w = 0, l = 0;
        teamMatches.forEach(m => {
            if (m.isCompleted && m.winnerId) {
                if (m.winnerId === team.id) w++;
                else l++;
            }
        });
        return { w, l };
    }, [teamMatches, team]);

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-[#091428] border-2 border-[#c8aa6e] rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95">
                
                {/* Header */}
                <div className="relative p-6 bg-gradient-to-br from-[#0f1d36] to-[#091428] border-b border-gray-700">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors hover:bg-white/10 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col items-center">
                        <div className="w-20 h-20 bg-[#0a1428] rounded-full p-4 border-2 border-[#c8aa6e] shadow-[0_0_20px_rgba(200,170,110,0.2)] mb-3 relative">
                            {team.logo ? (
                                <img src={team.logo} className="w-full h-full object-contain" alt={team.name} />
                            ) : (
                                <span className="w-full h-full flex items-center justify-center font-bold text-2xl text-gray-500">{team.shortName}</span>
                            )}
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#0a1428] rounded-full border border-gray-600 flex items-center justify-center">
                                <span className="text-xs font-bold text-white">{stats.w}-{stats.l}</span>
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-wide">{team.name}</h2>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{team.region}</span>
                    </div>
                </div>

                {/* Match List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 bg-[#050a14]">
                    {teamMatches.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No hay partidos programados.</p>
                        </div>
                    ) : (
                        teamMatches.map(match => {
                            const isHome = match.teamA?.id === team.id;
                            const opponent = isHome ? match.teamB : match.teamA;
                            const isWin = match.winnerId === team.id;
                            const isLoss = match.winnerId && match.winnerId !== team.id;
                            const isFuture = !match.isCompleted;

                            return (
                                <div key={match.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#0f1d36] border border-gray-800 hover:border-gray-600 transition-colors">
                                    {/* Date/Info */}
                                    <div className="flex flex-col w-16 text-center border-r border-gray-700 pr-3">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">
                                            {match.stage === Stage.GROUPS ? `Jor ${match.day}` : 'Playoff'}
                                        </span>
                                        <span className="text-xs font-bold text-gray-300">
                                            {new Date(match.startTime).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                                        </span>
                                    </div>

                                    {/* Opponent */}
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-8 h-8 bg-black/40 rounded p-1 border border-gray-700 flex-shrink-0">
                                            {opponent.logo ? (
                                                <img src={opponent.logo} className="w-full h-full object-contain" alt={opponent.shortName} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[8px] font-bold">{opponent.shortName}</div>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 font-bold uppercase">VS</span>
                                            <span className="text-sm font-bold text-gray-200 leading-none">{opponent.shortName}</span>
                                        </div>
                                    </div>

                                    {/* Result */}
                                    <div className="text-right pl-2">
                                        {isFuture ? (
                                            <span className="px-2 py-1 rounded bg-gray-800 text-gray-400 text-[10px] font-bold uppercase border border-gray-700">
                                                {new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        ) : (
                                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded border text-xs font-bold uppercase w-20 justify-center
                                                ${isWin ? 'bg-green-900/30 border-green-500/50 text-green-400' : 'bg-red-900/30 border-red-500/50 text-red-400'}
                                            `}>
                                                {isWin ? 'Win' : 'Loss'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export const OfficialStandings: React.FC = () => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [selectedSplit] = useState<string>(() => normalizeSplitId(localStorage.getItem('selectedSplit')));

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [m, tMap] = await Promise.all([
                    dataService.getMatches(),
                    dataService.getTeams()
                ]);
                setMatches(m);
                setTeams(Object.values(tMap));
            } catch (e) {
                console.error("Error loading standings data", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const standings = useMemo(() => {
        const stats: Record<string, StandingRow> = {};

        // Initialize teams
        teams.forEach(t => {
            if (t.id === 'tbd') return;
            stats[t.id] = {
                team: t,
                played: 0,
                wins: 0,
                losses: 0,
                streak: 0,
                lastFive: []
            };
        });

        // Filter valid completed matches
        const regularSeasonMatches = matches
            .filter(m => m.stage === Stage.GROUPS && m.isCompleted && m.winnerId)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()); // Sort chronological

        // Calculate Stats
        regularSeasonMatches.forEach(m => {
            const winnerId = m.winnerId!;
            const loserId = m.teamA?.id === winnerId ? m.teamB?.id : m.teamA?.id;

            if (stats[winnerId]) {
                stats[winnerId].played++;
                stats[winnerId].wins++;
                stats[winnerId].lastFive.push('W');
            }
            if (stats[loserId]) {
                stats[loserId].played++;
                stats[loserId].losses++;
                stats[loserId].lastFive.push('L');
            }
        });

        // Calculate Streaks
        Object.values(stats).forEach(row => {
            // Keep only last 5 for form
            if (row.lastFive.length > 5) {
                row.lastFive = row.lastFive.slice(row.lastFive.length - 5);
            }

            // Calculate active streak from full history (we need to rebuild history for accurate streak)
            // Simplified approach: Iterate reversed match history per team
            let currentStreak = 0;
            const teamMatches = regularSeasonMatches
                .filter(m => m.teamA?.id === row.team.id || m.teamB?.id === row.team.id)
                .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()); // Reverse Chrono

            for (const m of teamMatches) {
                const isWin = m.winnerId === row.team.id;
                if (currentStreak === 0) {
                    currentStreak = isWin ? 1 : -1;
                } else if (currentStreak > 0) {
                    if (isWin) currentStreak++;
                    else break;
                } else if (currentStreak < 0) {
                    if (!isWin) currentStreak--;
                    else break;
                }
            }
            row.streak = currentStreak;
        });

        // Sort: Wins > Losses (less is better) > Alphabetical
        return Object.values(stats).sort((a, b) => {
            if (a.wins !== b.wins) return b.wins - a.wins;
            if (a.losses !== b.losses) return a.losses - b.losses; // Less losses is better technically but usually handled by wins
            return a.team.name.localeCompare(b.team.name);
        });

    }, [matches, teams]);

    if (isLoading) {
        return (
            <div className="flex justify-center py-20 text-[#c8aa6e]">
                <Loader2 className="w-12 h-12 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4">
            
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white uppercase tracking-wider mb-2">Clasificación Oficial</h2>
                <div className="flex items-center justify-center gap-2">
                    <span className="px-3 py-1 bg-[#c8aa6e]/20 text-[#c8aa6e] text-xs font-bold uppercase rounded border border-[#c8aa6e]/30">
                        LEC {selectedSplit.toLowerCase().includes('spring') ? 'Spring 2026' : 'Winter 2026'}
                    </span>
                    <span className="px-3 py-1 bg-gray-800 text-gray-400 text-xs font-bold uppercase rounded border border-gray-700">
                        Fase Regular
                    </span>
                </div>
            </div>

            <div className="bg-[#091428] border border-gray-700 rounded-xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0f1d36] text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-gray-700">
                                <th className="p-4 text-center w-16">#</th>
                                <th className="p-4">Equipo</th>
                                <th className="p-4 text-center">W</th>
                                <th className="p-4 text-center">L</th>
                                <th className="p-4 text-center hidden sm:table-cell">% Win</th>
                                <th className="p-4 text-center">Racha</th>
                                <th className="p-4 text-center hidden sm:table-cell">Forma</th>
                                <th className="p-4 text-center w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {standings.map((row, index) => {
                                const rank = index + 1;
                                const isSpring = selectedSplit.toLowerCase().includes('spring');
                                const playoffThreshold = isSpring ? 6 : 8;
                                const isPlayoffs = rank <= playoffThreshold;
                                const isEliminated = rank > playoffThreshold; 
                                
                                const winrate = row.played > 0 ? Math.round((row.wins / row.played) * 100) : 0;

                                return (
                                    <tr 
                                        key={row.team.id} 
                                        onClick={() => setSelectedTeam(row.team)}
                                        className={`group cursor-pointer transition-colors ${isPlayoffs ? 'bg-[#0a1428] hover:bg-[#1a2c4e]' : 'bg-[#050a14] hover:bg-[#1a2c4e]'}`}
                                    >
                                        
                                        {/* RANK */}
                                        <td className="p-4 text-center">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm mx-auto
                                                ${rank === 1 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 
                                                  isPlayoffs ? 'bg-[#1e293b] text-white border border-gray-600' :
                                                  'bg-red-900/20 text-red-500 border border-red-900/30'}
                                            `}>
                                                {rank}
                                            </div>
                                        </td>

                                        {/* TEAM */}
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 p-1 bg-black/40 rounded border border-gray-700 flex items-center justify-center">
                                                    {row.team.logo ? (
                                                        <img src={row.team.logo} className="w-full h-full object-contain" />
                                                    ) : (
                                                        <span className="font-bold text-gray-500">{row.team.shortName}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`font-bold ${isEliminated ? 'text-gray-500' : 'text-white'}`}>
                                                        {row.team.name}
                                                    </span>
                                                    {index === (selectedSplit.toLowerCase().includes('spring') ? 5 : 7) && <span className="text-[9px] text-[#c8aa6e] font-bold uppercase tracking-wide">Límite Playoffs</span>}
                                                </div>
                                            </div>
                                        </td>

                                        {/* WINS */}
                                        <td className="p-4 text-center font-bold text-green-400 text-lg">{row.wins}</td>

                                        {/* LOSSES */}
                                        <td className="p-4 text-center font-bold text-red-400 text-lg">{row.losses}</td>

                                        {/* WINRATE */}
                                        <td className="p-4 text-center text-gray-300 font-mono hidden sm:table-cell">
                                            {winrate}%
                                        </td>

                                        {/* STREAK */}
                                        <td className="p-4 text-center">
                                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold w-16 justify-center
                                                ${row.streak > 0 
                                                    ? 'bg-green-900/30 text-green-400 border border-green-500/30' 
                                                    : row.streak < 0
                                                        ? 'bg-red-900/30 text-red-400 border border-red-500/30'
                                                        : 'bg-gray-800 text-gray-500'
                                                }
                                            `}>
                                                {row.streak > 0 ? <TrendingUp className="w-3 h-3" /> : row.streak < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                                {Math.abs(row.streak)} {row.streak > 0 ? 'W' : row.streak < 0 ? 'L' : '-'}
                                            </div>
                                        </td>

                                        {/* LAST 5 */}
                                        <td className="p-4 hidden sm:table-cell">
                                            <div className="flex items-center justify-center gap-1">
                                                {row.lastFive.map((res, i) => (
                                                    <div key={i} className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold border
                                                        ${res === 'W' ? 'bg-green-500 text-black border-green-400' : 'bg-red-900/50 text-red-200 border-red-800'}
                                                    `}>
                                                        {res}
                                                    </div>
                                                ))}
                                                {Array.from({length: 5 - row.lastFive.length}).map((_, i) => (
                                                    <div key={`empty-${i}`} className="w-5 h-5 rounded bg-gray-800 border border-gray-700"></div>
                                                ))}
                                            </div>
                                        </td>

                                        {/* ARROW ICON */}
                                        <td className="p-4 text-center text-gray-600 group-hover:text-[#c8aa6e] transition-colors">
                                            <ChevronRight className="w-5 h-5" />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                
                {/* Legend Footer */}
                <div className="p-4 bg-[#0f1d36] border-t border-gray-700 flex justify-center gap-6 text-[10px] uppercase font-bold text-gray-500">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#1e293b] border border-gray-600 rounded"></div>
                        <span>Clasifican a Playoffs (Top {selectedSplit.toLowerCase().includes('spring') ? '6' : '8'})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-900/20 border border-red-900/30 rounded"></div>
                        <span>Eliminados</span>
                    </div>
                </div>
            </div>

            {/* TEAM SCHEDULE MODAL */}
            {selectedTeam && (
                <TeamScheduleModal 
                    team={selectedTeam} 
                    matches={matches} 
                    onClose={() => setSelectedTeam(null)} 
                />
            )}
        </div>
    );
};
