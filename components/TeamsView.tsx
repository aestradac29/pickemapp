
import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../services/dataService';
import { Team, Player, Role, Match, Stage } from '../types';
import { ROLE_ICONS } from '../constants';
import { Loader2, Users, TrendingUp, TrendingDown, Coins, X, Activity, Target, Skull, Trophy, ListOrdered, LayoutGrid } from 'lucide-react';

interface PlayerHistoryModalProps {
    player: Player;
    team: Team;
    matches: Match[];
    teams: Record<string, Team>;
    onClose: () => void;
}

const PlayerHistoryModal: React.FC<PlayerHistoryModalProps> = ({ player, team, matches, teams, onClose }) => {
    // Process matches to get individual game stats
    const history = useMemo(() => {
        const gamesList: any[] = [];

        // Sort matches newest first
        const sortedMatches = [...matches].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

        sortedMatches.forEach(match => {
            // Skip matches where player has no stats
            if (!match.isCompleted) return;

            const opponentId = match.teamA.id === team.id ? match.teamB.id : match.teamA.id;
            const opponent = teams[opponentId];

            // Handle Detailed Games (BO3/BO5)
            if (match.games && match.games.length > 0) {
                match.games.forEach((game, idx) => {
                    const stats = game.stats[player.id];
                    if (stats) {
                        const isWin = game.winnerId === team.id;
                        gamesList.push({
                            uniqueId: `${match.id}-g${game.id}`,
                            match,
                            opponent,
                            stats,
                            isWin,
                            label: match.bestOf && match.bestOf > 1 ? `G${idx + 1}` : 'BO1',
                            date: match.startTime
                        });
                    }
                });
            } 
            // Handle Aggregate/Legacy Stats (Fallback)
            else if (match.stats && match.stats[player.id]) {
                const stats = match.stats[player.id];
                const isWin = match.winnerId === team.id;
                gamesList.push({
                    uniqueId: match.id,
                    match,
                    opponent,
                    stats,
                    isWin,
                    label: 'BO1',
                    date: match.startTime
                });
            }
        });

        return gamesList;
    }, [matches, player, team, teams]);

    // Calculate detailed aggregates for the modal header
    const detailedStats = useMemo(() => {
        const total = { kills: 0, deaths: 0, assists: 0, games: 0, wins: 0 };
        history.forEach(h => {
            total.kills += h.stats.kills;
            total.deaths += h.stats.deaths;
            total.assists += h.stats.assists;
            if (h.isWin) total.wins++;
            total.games++;
        });
        return total;
    }, [history]);

    const winrate = detailedStats.games > 0 ? Math.round((detailedStats.wins / detailedStats.games) * 100) : 0;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-2xl bg-[#091428] border-2 border-[#c8aa6e] rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="relative" style={{ backgroundColor: team.color }}>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-[#091428]/80 to-[#091428]"></div>
                    <button onClick={onClose} className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full transition-colors z-20">
                        <X className="w-5 h-5" />
                    </button>

                    <div className="relative z-10 p-6 flex flex-col items-center">
                        <div className="w-24 h-24 rounded-full border-4 border-[#091428] shadow-xl overflow-hidden bg-black mb-3">
                            <img src={player.photo || ROLE_ICONS[player.role]} className="w-full h-full object-cover" />
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-wide">{player.name}</h2>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-black/40 text-white uppercase tracking-wider">{team.name}</span>
                            <img src={ROLE_ICONS[player.role]} className="w-4 h-4 opacity-80" />
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-4 gap-2 w-full max-w-md">
                            <div className="bg-[#0f1d36]/80 p-2 rounded border border-gray-700 text-center backdrop-blur-sm">
                                <div className="text-[9px] text-gray-400 uppercase font-bold">Games</div>
                                <div className="text-lg font-bold text-white">{detailedStats.games}</div>
                            </div>
                            <div className="bg-[#0f1d36]/80 p-2 rounded border border-gray-700 text-center backdrop-blur-sm">
                                <div className="text-[9px] text-gray-400 uppercase font-bold">Winrate</div>
                                <div className={`text-lg font-bold ${winrate >= 50 ? 'text-green-400' : 'text-red-400'}`}>{winrate}%</div>
                            </div>
                            <div className="bg-[#0f1d36]/80 p-2 rounded border border-gray-700 text-center backdrop-blur-sm">
                                <div className="text-[9px] text-gray-400 uppercase font-bold">KDA</div>
                                <div className="text-lg font-bold text-[#c8aa6e]">{player.kda?.toFixed(2)}</div>
                            </div>
                            <div className="bg-[#0f1d36]/80 p-2 rounded border border-gray-700 text-center backdrop-blur-sm">
                                <div className="text-[9px] text-gray-400 uppercase font-bold">Avg Pts</div>
                                <div className="text-lg font-bold text-[#0ac8b9]">{player.averagePoints?.toFixed(1)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Match List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#050a14] p-4 space-y-2">
                    {history.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No hay partidos registrados aún.</p>
                        </div>
                    ) : (
                        history.map((game) => (
                            <div key={game.uniqueId} className="bg-[#0f1923] border border-gray-800 rounded-lg p-3 flex items-center justify-between hover:bg-[#162231] transition-colors">
                                
                                {/* Left: Match Info */}
                                <div className="flex items-center gap-3 w-1/3">
                                    <div className={`w-1 h-10 rounded-full ${game.isWin ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-500 font-bold uppercase">{game.match.stage === Stage.GROUPS ? `Jor ${game.match.day}` : 'PO'} • {game.label}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-xs text-gray-400 font-bold">vs</span>
                                            {game.opponent?.logo && <img src={game.opponent.logo} className="w-4 h-4 object-contain" />}
                                            <span className="text-sm font-bold text-gray-200">{game.opponent?.shortName || '???'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Center: KDA & Specifics */}
                                <div className="flex flex-col items-center w-1/3">
                                    <div className="text-sm font-mono font-bold tracking-wider">
                                        <span className="text-green-400">{game.stats.kills}</span>/
                                        <span className="text-red-400">{game.stats.deaths}</span>/
                                        <span className="text-blue-400">{game.stats.assists}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center gap-0.5 text-[10px] text-gray-500" title="Súbditos">
                                            <Target className="w-3 h-3" /> {game.stats.cs}
                                        </div>
                                        {game.stats.isMvp && <Trophy className="w-3 h-3 text-yellow-400" title="MVP" />}
                                        {game.stats.pentaKills > 0 && <Skull className="w-3 h-3 text-purple-400" title="Pentakill" />}
                                    </div>
                                </div>

                                {/* Right: Points */}
                                <div className="w-1/3 text-right">
                                    <div className="text-lg font-bold text-[#0ac8b9]">{game.stats.totalPoints.toFixed(1)}</div>
                                    <div className="text-[9px] text-[#0ac8b9]/60 uppercase font-bold">Puntos Fantasy</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export const TeamsView: React.FC = () => {
    const [teams, setTeams] = useState<Record<string, Team>>({});
    const [players, setPlayers] = useState<Player[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Tab State
    const [activeTab, setActiveTab] = useState<'teams' | 'roles'>('teams');

    // Modal State
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

    useEffect(() => {
        const load = async () => {
            const [t, p, m] = await Promise.all([
                dataService.getTeams(),
                dataService.getPlayers(),
                dataService.getMatches()
            ]);
            setTeams(t);
            setPlayers(p);
            setMatches(m);
            setLoading(false);
        };
        load();
    }, []);

    // Calculate Role Stats
    const roleStats = useMemo(() => {
        const stats: Record<Role, { total: number; count: number }> = {
            [Role.TOP]: { total: 0, count: 0 },
            [Role.JUNGLE]: { total: 0, count: 0 },
            [Role.MID]: { total: 0, count: 0 },
            [Role.ADC]: { total: 0, count: 0 },
            [Role.SUPPORT]: { total: 0, count: 0 },
        };

        players.forEach(p => {
            if (stats[p.role]) {
                stats[p.role].total += (p.totalPoints || 0);
                stats[p.role].count += 1;
            }
        });

        return stats;
    }, [players]);

    // Sort Teams by Total Points (Descending)
    const teamsList = useMemo(() => Object.values(teams), [teams]);
    const teamsInOrder = useMemo(() => {
        return [...teamsList].sort((a, b) => {
            const pointsA = players.filter(p => p.teamId === a.id).reduce((sum, p) => sum + (p.totalPoints || 0), 0);
            const pointsB = players.filter(p => p.teamId === b.id).reduce((sum, p) => sum + (p.totalPoints || 0), 0);
            return pointsB - pointsA;
        });
    }, [teamsList, players]);

    // Sort Players by Points within Roles for 'roles' tab
    const playersByRole = useMemo(() => {
        const result: Record<Role, Player[]> = {
            [Role.TOP]: [], [Role.JUNGLE]: [], [Role.MID]: [], [Role.ADC]: [], [Role.SUPPORT]: []
        };
        
        Object.values(Role).forEach(role => {
            result[role] = players
                .filter(p => p.role === role)
                .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
        });
        
        return result;
    }, [players]);

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#c8aa6e]" /></div>;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 pb-20">
            
            {/* Header & Tabs */}
            <div className="flex flex-col items-center mb-8">
                <h2 className="text-2xl font-bold text-[#c8aa6e] mb-6 text-center uppercase tracking-widest flex items-center justify-center gap-3">
                    <Users className="w-8 h-8" />
                    Estadísticas & Rosters
                </h2>

                <div className="flex bg-[#0f1d36] p-1 rounded-lg border border-gray-700">
                    <button 
                        onClick={() => setActiveTab('teams')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold uppercase transition-all ${activeTab === 'teams' ? 'bg-[#c8aa6e] text-[#0a1428]' : 'text-gray-400 hover:text-white'}`}
                    >
                        <LayoutGrid className="w-4 h-4" /> Equipos
                    </button>
                    <button 
                        onClick={() => setActiveTab('roles')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold uppercase transition-all ${activeTab === 'roles' ? 'bg-[#c8aa6e] text-[#0a1428]' : 'text-gray-400 hover:text-white'}`}
                    >
                        <ListOrdered className="w-4 h-4" /> Ranking por Rol
                    </button>
                </div>
            </div>

            {/* TAB: TEAMS (ROSTERS) */}
            {activeTab === 'teams' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12 animate-in fade-in">
                        {teamsInOrder.map(team => {
                            const teamPlayers = players.filter(p => p.teamId === team.id);
                            const rolesOrder = [Role.TOP, Role.JUNGLE, Role.MID, Role.ADC, Role.SUPPORT];
                            const sortedPlayers = teamPlayers.sort((a, b) => rolesOrder.indexOf(a.role) - rolesOrder.indexOf(b.role));

                            const teamTotalPoints = teamPlayers.reduce((sum, p) => sum + (p.totalPoints || 0), 0);
                            const teamTotalCost = teamPlayers.reduce((sum, p) => sum + (p.cost || 0), 0);
                            const teamAvg = teamPlayers.length > 0 ? teamTotalPoints / teamPlayers.length : 0;

                            return (
                                <div key={team.id} className="bg-[#091428] border border-gray-700 rounded-xl overflow-hidden shadow-xl group hover:border-[#c8aa6e]/50 transition-all">
                                    {/* Header */}
                                    <div className="h-28 relative overflow-hidden" style={{ backgroundColor: team.color }}>
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#091428] via-[#091428]/40 to-transparent"></div>
                                        <div className="absolute -right-4 -top-4 opacity-30 transform rotate-12 scale-125 pointer-events-none">
                                            {team.logo && <img src={team.logo} className="w-32 h-32 object-contain grayscale" />}
                                        </div>
                                        
                                        {/* Header Content */}
                                        <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between gap-2 z-10 bg-gradient-to-t from-black/60 to-transparent">
                                            <div className="flex items-end gap-3 flex-1 min-w-0">
                                                <div className="w-14 h-14 bg-[#091428] rounded-lg p-2 border border-gray-600 shadow-lg relative z-10 flex-shrink-0 flex items-center justify-center">
                                                    {team.logo ? (
                                                        <img src={team.logo} className="w-full h-full object-contain" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center font-bold text-xl">{team.shortName}</div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 pb-0.5">
                                                    <h3 className="text-lg font-bold text-white leading-tight shadow-black drop-shadow-md pr-1 break-words" title={team.name}>{team.name}</h3>
                                                    <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">{team.region}</span>
                                                </div>
                                            </div>

                                            <div className="flex-shrink-0 text-right">
                                                <div className="bg-black/60 backdrop-blur-md rounded-lg p-2 border border-white/10 shadow-sm min-w-[90px]">
                                                    <div className="flex justify-between items-center gap-3">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase">Pts Tot</span>
                                                        <span className="text-sm font-bold text-white leading-none">{teamTotalPoints.toFixed(0)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center gap-3 mb-1">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase">Media</span>
                                                        <span className="text-xs font-bold text-blue-300 leading-none">{teamAvg.toFixed(1)}</span>
                                                    </div>
                                                    <div className="h-px bg-white/10 w-full my-1"></div>
                                                    <div className="flex justify-between items-center gap-3">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                                            <Coins className="w-3 h-3 text-[#0ac8b9]" />
                                                        </span>
                                                        <span className="text-xs font-bold text-[#0ac8b9] leading-none">${teamTotalCost}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Roster List */}
                                    <div className="p-3 space-y-2 bg-[#091428]">
                                        {sortedPlayers.map(p => {
                                            const isPriceUp = (p.priceChange || 0) > 0;
                                            const isPriceDown = (p.priceChange || 0) < 0;
                                            
                                            return (
                                                <div 
                                                    key={p.id} 
                                                    onClick={() => setSelectedPlayer(p)}
                                                    className="flex items-center gap-3 p-2 rounded hover:bg-[#1a2c4e] transition-colors border border-transparent hover:border-[#c8aa6e]/30 bg-[#0f1d36]/50 cursor-pointer group/player"
                                                >
                                                    {/* Role */}
                                                    <div className="w-5 h-5 flex-shrink-0 opacity-50">
                                                        <img src={ROLE_ICONS[p.role]} alt={p.role} />
                                                    </div>
                                                    
                                                    {/* Photo */}
                                                    <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden border border-gray-600 flex-shrink-0 group-hover/player:border-[#c8aa6e] transition-colors">
                                                        <img 
                                                            src={p.photo || ROLE_ICONS[p.role]} 
                                                            className="w-full h-full object-cover transform scale-110 pt-1"
                                                            onError={(e) => (e.target as HTMLImageElement).src = ROLE_ICONS[p.role]} 
                                                        />
                                                    </div>

                                                    {/* Info: Name & KDA */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-gray-200 text-sm truncate group-hover/player:text-white transition-colors">{p.name}</div>
                                                        <div className="text-[10px] text-gray-500 font-bold uppercase">
                                                            KDA: <span className="text-gray-300">{p.kda}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Price Column */}
                                                    <div className="text-right min-w-[50px] flex flex-col items-end">
                                                        <div className="text-xs font-bold text-[#0ac8b9]">${p.cost}</div>
                                                        {p.priceChange !== undefined && p.priceChange !== 0 ? (
                                                            <div className={`text-[9px] font-bold flex items-center gap-0.5 ${isPriceUp ? 'text-green-400' : 'text-red-400'}`}>
                                                                {isPriceUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                                                {Math.abs(p.priceChange)}
                                                            </div>
                                                        ) : (
                                                            <div className="text-[9px] text-gray-600 font-bold">-</div>
                                                        )}
                                                    </div>

                                                    {/* Points Column */}
                                                    <div className="text-right w-16 border-l border-gray-700 pl-2 flex flex-col justify-center gap-0.5">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <span className="text-[8px] text-gray-500 uppercase font-bold tracking-tighter">Tot</span>
                                                            <span className="text-xs font-bold text-purple-400">{p.totalPoints || 0}</span>
                                                        </div>
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <span className="text-[8px] text-gray-600 uppercase font-bold tracking-tighter">Avg</span>
                                                            <span className="text-[10px] font-bold text-blue-300">{p.averagePoints}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {sortedPlayers.length === 0 && (
                                            <div className="text-center py-4 text-gray-500 text-sm">
                                                Roster no disponible
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Role Averages Section */}
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-[#091428] border border-gray-700 rounded-xl p-6 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                            
                            <h3 className="text-lg font-bold text-white uppercase tracking-wide mb-6 flex items-center justify-center gap-2 relative z-10">
                                <TrendingUp className="w-5 h-5 text-[#c8aa6e]" />
                                Media de Puntos por Posición
                            </h3>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 relative z-10">
                                {[Role.TOP, Role.JUNGLE, Role.MID, Role.ADC, Role.SUPPORT].map(role => {
                                    const s = roleStats[role];
                                    const avg = s.count > 0 ? s.total / s.count : 0;
                                    return (
                                        <div key={role} className="flex flex-col items-center p-4 bg-[#0f1d36] rounded-xl border border-gray-700 hover:border-[#c8aa6e]/50 transition-colors group">
                                            <div className="p-2 rounded-full bg-black/30 border border-gray-600 mb-3 group-hover:scale-110 transition-transform">
                                                <img src={ROLE_ICONS[role]} className="w-6 h-6 opacity-80" alt={role} />
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{role}</span>
                                            <span className="text-2xl font-bold text-white drop-shadow-md">{avg.toFixed(1)}</span>
                                            <span className="text-[9px] text-gray-600 mt-1">{s.count} Jugadores</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* TAB: ROLES (RANKING) */}
            {activeTab === 'roles' && (
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6 animate-in fade-in">
                    {Object.values(Role).map(role => (
                        <div key={role} className="bg-[#091428] border border-gray-700 rounded-xl overflow-hidden flex flex-col h-full shadow-xl">
                            {/* Column Header */}
                            <div className="p-4 bg-[#0f1d36] border-b border-gray-700 flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-black/30 border border-gray-600 flex items-center justify-center mb-2">
                                    <img src={ROLE_ICONS[role]} className="w-6 h-6 opacity-90" alt={role} />
                                </div>
                                <h3 className="font-bold text-[#c8aa6e] uppercase tracking-widest text-sm">{role}</h3>
                            </div>

                            {/* Player List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#050a14] max-h-[800px]">
                                {playersByRole[role].map((p, index) => {
                                    const rank = index + 1;
                                    const team = teams[p.teamId];
                                    
                                    // Visual styles for Top 3
                                    let rankBadge = <span className="text-gray-500 font-mono text-xs w-5 text-center">{rank}</span>;
                                    let rowBg = 'hover:bg-[#1a2c4e]';
                                    
                                    if (rank === 1) {
                                        rankBadge = <div className="w-5 h-5 rounded-full bg-yellow-500 text-black font-bold text-xs flex items-center justify-center shadow-lg">1</div>;
                                        rowBg = 'bg-yellow-900/10 hover:bg-yellow-900/20';
                                    } else if (rank === 2) {
                                        rankBadge = <div className="w-5 h-5 rounded-full bg-gray-400 text-black font-bold text-xs flex items-center justify-center shadow-lg">2</div>;
                                        rowBg = 'bg-gray-800/30 hover:bg-gray-800/50';
                                    } else if (rank === 3) {
                                        rankBadge = <div className="w-5 h-5 rounded-full bg-amber-700 text-white font-bold text-xs flex items-center justify-center shadow-lg">3</div>;
                                        rowBg = 'bg-amber-900/10 hover:bg-amber-900/20';
                                    }

                                    return (
                                        <div 
                                            key={p.id}
                                            onClick={() => setSelectedPlayer(p)}
                                            className={`flex items-center gap-2 p-3 border-b border-gray-800 cursor-pointer transition-colors ${rowBg}`}
                                        >
                                            {/* Rank */}
                                            <div className="flex-shrink-0">
                                                {rankBadge}
                                            </div>

                                            {/* Photo */}
                                            <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden border border-gray-700 flex-shrink-0">
                                                <img 
                                                    src={p.photo || ROLE_ICONS[role]} 
                                                    className="w-full h-full object-cover transform scale-110 pt-1"
                                                    onError={(e) => (e.target as HTMLImageElement).src = ROLE_ICONS[role]} 
                                                />
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-bold text-gray-200 truncate">{p.name}</div>
                                                <div className="flex items-center gap-1.5 text-[9px] text-gray-500">
                                                    {team?.logo && <img src={team.logo} className="w-3 h-3 object-contain opacity-70" />}
                                                    <span className="uppercase">{team?.shortName}</span>
                                                    <span className="text-[#0ac8b9] font-bold ml-1">${p.cost}</span>
                                                </div>
                                            </div>

                                            {/* Points */}
                                            <div className="text-right">
                                                <div className={`font-bold text-sm ${rank <= 3 ? 'text-white' : 'text-gray-400'}`}>
                                                    {p.totalPoints?.toFixed(1) || '0.0'}
                                                </div>
                                                <div className="text-[9px] text-gray-600">
                                                    Avg: {p.averagePoints?.toFixed(1)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* PLAYER HISTORY MODAL */}
            {selectedPlayer && (
                <PlayerHistoryModal 
                    player={selectedPlayer}
                    team={teams[selectedPlayer.teamId]}
                    matches={matches}
                    teams={teams}
                    onClose={() => setSelectedPlayer(null)}
                />
            )}
        </div>
    );
};
