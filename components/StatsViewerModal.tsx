
import React, { useState } from 'react';
import { Match, Team, Player, PlayerGameStats, Role } from '../types';
import { X, Trophy, Skull, Target, Swords, HeartHandshake, Crosshair, Droplet, Crown, AlertTriangle, Shield, ChevronDown, ChevronUp, Flame, Eye, Activity } from 'lucide-react';
import { ROLE_ICONS, normalizeSplitId } from '../constants';

interface StatsViewerModalProps {
    match: Match;
    teamA: Team;
    teamB: Team;
    allPlayers: Player[];
    onClose: () => void;
    selectedSplit?: string | null;
}

const StatBadge = ({ icon: Icon, value, color, tooltip }: any) => (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${color}`} title={tooltip}>
        <Icon className="w-3 h-3" />
        {value && <span>{value}</span>}
    </div>
);

interface PlayerStatRowProps {
    player: Player;
    stats: PlayerGameStats;
    isWinner: boolean;
    mvpPlayerId?: string;
}

const PlayerStatRow: React.FC<PlayerStatRowProps> = ({ player, stats, isWinner, mvpPlayerId }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Calculos básicos
    const kda = stats.deaths === 0 ? (stats.kills + stats.assists) : ((stats.kills + stats.assists) / stats.deaths).toFixed(2);
    
    // Colores por rol para detalles
    const roleColors: Record<Role, string> = {
        [Role.TOP]: 'text-orange-300 border-orange-500/30',
        [Role.JUNGLE]: 'text-green-300 border-green-500/30',
        [Role.MID]: 'text-purple-300 border-purple-500/30',
        [Role.ADC]: 'text-blue-300 border-blue-500/30',
        [Role.SUPPORT]: 'text-cyan-300 border-cyan-500/30',
    };

    return (
        <div className={`flex flex-col rounded border mb-1 transition-all overflow-hidden ${isWinner ? 'bg-green-900/10 border-green-900/30' : 'bg-[#0f1923] border-gray-800'}`}>
            {/* MAIN ROW (CLICKABLE) */}
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between p-2 cursor-pointer hover:bg-white/5"
            >
                {/* Player Info */}
                <div className="flex items-center gap-2 w-1/3 min-w-0">
                    <button className="text-gray-500 hover:text-white transition-colors">
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    <img src={ROLE_ICONS[player.role]} className="w-4 h-4 opacity-50" alt={player.role} />
                    <div className="flex flex-col min-w-0">
                        <span className={`text-xs font-bold truncate ${isWinner ? 'text-green-100' : 'text-gray-300'}`}>{player.name}</span>
                        <span className="text-[9px] text-gray-500 uppercase">
                            ${player.cost}
                        </span>
                    </div>
                </div>

                {/* KDA & CS */}
                <div className="flex flex-col items-center justify-center w-1/4">
                    <div className="text-xs font-mono font-bold text-white tracking-wider">
                        <span className="text-green-400">{stats.kills}</span>/
                        <span className="text-red-400">{stats.deaths}</span>/
                        <span className="text-blue-400">{stats.assists}</span>
                    </div>
                    <div className="text-[9px] text-gray-500 flex items-center gap-1">
                        <Target className="w-2.5 h-2.5" /> {stats.cs} cs
                    </div>
                </div>

                {/* Badges (Mobile Hidden / Desktop Visible) */}
                <div className="hidden sm:flex items-center gap-1 w-1/4 justify-center flex-wrap">
                    {stats.isMvp && <StatBadge icon={Trophy} color="bg-yellow-500/20 text-yellow-400 border-yellow-500/50" tooltip="MVP" />}
                    {stats.firstBlood && <StatBadge icon={Droplet} color="bg-red-500/20 text-red-400 border-red-500/50" tooltip="First Blood" />}
                    {stats.pentaKills > 0 && <StatBadge icon={Skull} color="bg-purple-500/20 text-purple-400 border-purple-500/50" value="PENTA" />}
                    {stats.quadraKills > 0 && !stats.pentaKills && <StatBadge icon={Crosshair} color="bg-orange-500/20 text-orange-400 border-orange-500/50" value="QUADRA" />}
                </div>

                {/* Fantasy Points */}
                <div className="w-1/6 text-right">
                    <span className="text-sm font-bold text-[#0ac8b9] drop-shadow-md">
                        {(stats.totalPoints || 0).toFixed(1)}
                    </span>
                    <span className="block text-[8px] text-[#0ac8b9]/60 uppercase font-bold">Pts</span>
                </div>
            </div>

            {/* EXPANDED DETAILS */}
            {isExpanded && (
                <div className="bg-black/20 p-3 border-t border-gray-800/50 grid grid-cols-2 gap-4 animate-in slide-in-from-top-1 text-[10px]">
                    
                    {/* Multikills Section */}
                    <div className="flex flex-col gap-1">
                        <span className="uppercase font-bold text-gray-500 tracking-wider mb-1">Multikills</span>
                        <div className="flex flex-wrap gap-2">
                            {stats.doubleKills > 0 && (
                                <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                                    Double: <span className="text-white font-bold">{stats.doubleKills}</span>
                                </span>
                            )}
                            {stats.tripleKills > 0 && (
                                <span className="px-2 py-0.5 rounded bg-yellow-900/20 text-yellow-300 border border-yellow-500/30">
                                    Triple: <span className="text-yellow-100 font-bold">{stats.tripleKills}</span>
                                </span>
                            )}
                            {stats.quadraKills > 0 && (
                                <span className="px-2 py-0.5 rounded bg-orange-900/20 text-orange-300 border border-orange-500/30">
                                    Quadra: <span className="text-orange-100 font-bold">{stats.quadraKills}</span>
                                </span>
                            )}
                            {stats.pentaKills > 0 && (
                                <span className="px-2 py-0.5 rounded bg-purple-900/20 text-purple-300 border border-purple-500/30 animate-pulse">
                                    PENTA: <span className="text-white font-bold">{stats.pentaKills}</span>
                                </span>
                            )}
                            {stats.doubleKills === 0 && stats.tripleKills === 0 && stats.quadraKills === 0 && stats.pentaKills === 0 && (
                                <span className="text-gray-600 italic">Sin multikills</span>
                            )}
                        </div>
                    </div>

                    {/* Role Specifics Section */}
                    <div className="flex flex-col gap-1">
                        <span className="uppercase font-bold text-gray-500 tracking-wider mb-1 flex items-center gap-1">
                            <Activity className="w-3 h-3" /> Stats de Rol
                        </span>
                        
                        <div className={`grid grid-cols-3 gap-2 ${roleColors[player.role]}`}>
                            {(player.role === Role.TOP || player.role === Role.MID) && (
                                <>
                                    <div className="flex flex-col bg-black/20 p-1.5 rounded border border-current/20">
                                        <span className="opacity-70 text-[9px]">Daño Equipo</span>
                                        <span className="font-bold text-sm">{stats.teamDamagePercentage}%</span>
                                    </div>
                                    <div className="flex flex-col bg-black/20 p-1.5 rounded border border-current/20">
                                        <span className="opacity-70 text-[9px]">Daño Torretas</span>
                                        <span className="font-bold text-sm">{stats.turretDamage}</span>
                                    </div>
                                </>
                            )}
                            {player.role === Role.TOP && (
                                <div className="flex flex-col bg-black/20 p-1.5 rounded border border-current/20">
                                    <span className="opacity-70 text-[9px]">Minions/min</span>
                                    <span className="font-bold text-sm">{stats.minionsPerMinute}</span>
                                </div>
                            )}
                            {player.role === Role.JUNGLE && (
                                <>
                                    <div className="flex flex-col bg-black/20 p-1.5 rounded border border-current/20">
                                        <span className="opacity-70 text-[9px]">Dragones</span>
                                        <span className="font-bold text-sm">{stats.dragonsKilled}</span>
                                    </div>
                                    <div className="flex flex-col bg-black/20 p-1.5 rounded border border-current/20">
                                        <span className="opacity-70 text-[9px]">Barones</span>
                                        <span className="font-bold text-sm">{stats.baronsKilled}</span>
                                    </div>
                                </>
                            )}
                            {player.role === Role.ADC && (
                                <div className="flex flex-col bg-black/20 p-1.5 rounded border border-current/20 col-span-3">
                                    <span className="opacity-70 text-[9px]">Daño/Minuto</span>
                                    <span className="font-bold text-sm">{stats.damagePerMinute}</span>
                                </div>
                            )}
                            {player.role === Role.SUPPORT && (
                                <>
                                    <div className="flex flex-col bg-black/20 p-1.5 rounded border border-current/20">
                                        <span className="opacity-70 text-[9px]">Visión</span>
                                        <span className="font-bold text-sm flex items-center gap-1">
                                            <Eye className="w-3 h-3" /> {stats.visionScore}
                                        </span>
                                    </div>
                                    {stats.firstDragon && (
                                        <div className="flex items-center justify-center bg-cyan-900/30 p-1.5 rounded border border-cyan-500/30 col-span-2">
                                            <span className="font-bold text-cyan-300">1er Dragón</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Bonus Indicators */}
                    <div className="col-span-2 flex gap-3 pt-2 border-t border-gray-800/50 mt-1">
                        {mvpPlayerId === player.id && (
                            <div className="flex items-center gap-1 text-yellow-400 font-bold uppercase tracking-widest text-[9px]">
                                <Trophy className="w-3 h-3" /> MVP SERIE
                            </div>
                        )}
                        {stats.firstBlood && (
                            <div className="flex items-center gap-1 text-red-400 font-bold uppercase tracking-widest text-[9px]">
                                <Droplet className="w-3 h-3" /> First Blood
                            </div>
                        )}
                        {stats.kills >= 10 && (
                            <div className="flex items-center gap-1 text-orange-400 font-bold uppercase tracking-widest text-[9px]">
                                <Flame className="w-3 h-3" /> High Kill Game
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const StatsViewerModal: React.FC<StatsViewerModalProps> = ({ match, teamA, teamB, allPlayers, onClose, selectedSplit: propSelectedSplit }) => {
    const selectedSplit = normalizeSplitId(propSelectedSplit || localStorage.getItem('selectedSplit'));
    // Detect available games
    const hasDetailedGames = match.games && match.games.length > 0;
    const numGames = match.bestOf || 1;
    
    // Available tabs: Either from detailed games array OR just Game 1 if legacy stats
    const availableTabs = hasDetailedGames 
        ? match.games!.map(g => g.id) 
        : [1];

    const [activeGameId, setActiveGameId] = useState(availableTabs[0]);

    // Get Data for active view
    let currentStats: Record<string, PlayerGameStats> = {};
    let currentWinnerId: string | null = null;

    if (hasDetailedGames) {
        const game = match.games!.find(g => g.id === activeGameId);
        if (game) {
            currentStats = game.stats;
            currentWinnerId = game.winnerId;
        }
    } else if (match.stats) {
        // Fallback for legacy aggregate stats (Treat as Game 1/Total)
        currentStats = match.stats;
        currentWinnerId = match.winnerId || null;
    }

    const playersA = allPlayers.filter(p => p.teamId === teamA.id);
    const playersB = allPlayers.filter(p => p.teamId === teamB.id);

    // --- Helper to calculate Team KDA totals ---
    const getTeamKDA = (teamPlayers: Player[]) => {
        return teamPlayers.reduce((acc, p) => {
            const s = currentStats[p.id];
            if (s) {
                acc.k += s.kills;
                acc.d += s.deaths;
                acc.a += s.assists;
            }
            return acc;
        }, { k: 0, d: 0, a: 0 });
    };

    const statsA = getTeamKDA(playersA);
    const statsB = getTeamKDA(playersB);

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-4xl bg-[#091428] border-2 border-[#c8aa6e] rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-[#091428] via-[#1a2c4e] to-[#091428] border-b border-[#c8aa6e]/30 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                    
                    <div className="text-center mb-4">
                        <h3 className="text-[#c8aa6e] font-bold uppercase tracking-widest text-xs mb-3">Informe de Batalla</h3>
                        
                        <div className="flex items-center justify-center gap-2 sm:gap-6 text-white">
                            {/* Team A (Stats Left, Name Right) */}
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="text-sm sm:text-base font-mono font-bold tracking-wider bg-black/40 px-2 py-1 rounded border border-white/10">
                                    <span className="text-green-400">{statsA.k}</span>/
                                    <span className="text-red-400">{statsA.d}</span>/
                                    <span className="text-blue-400">{statsA.a}</span>
                                </div>
                                <span className={`text-2xl sm:text-4xl font-black ${currentWinnerId === teamA.id ? 'text-green-400' : ''}`}>{teamA.shortName}</span>
                            </div>

                            <span className="text-gray-600 text-lg font-black italic opacity-50 mx-1">VS</span>

                            {/* Team B (Name Left, Stats Right) */}
                            <div className="flex items-center gap-2 sm:gap-3">
                                <span className={`text-2xl sm:text-4xl font-black ${currentWinnerId === teamB.id ? 'text-green-400' : ''}`}>{teamB.shortName}</span>
                                <div className="text-sm sm:text-base font-mono font-bold tracking-wider bg-black/40 px-2 py-1 rounded border border-white/10">
                                    <span className="text-green-400">{statsB.k}</span>/
                                    <span className="text-red-400">{statsB.d}</span>/
                                    <span className="text-blue-400">{statsB.a}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Game Tabs */}
                    {match.bestOf && match.bestOf > 1 && (
                        <div className="flex justify-center gap-2">
                            {availableTabs.map(i => (
                                <button
                                    key={i}
                                    onClick={() => setActiveGameId(i)}
                                    className={`
                                        px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all border
                                        ${activeGameId === i 
                                            ? 'bg-[#c8aa6e] text-[#0a1428] border-[#c8aa6e] shadow-[0_0_10px_rgba(200,170,110,0.3)]' 
                                            : 'bg-black/40 text-gray-400 border-gray-700 hover:border-gray-500'
                                        }
                                    `}
                                >
                                    Partida {i}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#050a14]">
                    {(!currentStats || Object.keys(currentStats).length === 0) ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                            <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-sm">Estadísticas detalladas no disponibles para esta partida.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Team A */}
                            <div>
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <div className="flex items-center gap-2">
                                        {teamA.logo && <img src={teamA.logo} className="w-5 h-5 object-contain" />}
                                        <h4 className="font-bold text-white text-lg">{teamA.name}</h4>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {currentWinnerId === teamA.id && <span className="text-[10px] font-bold bg-green-900/50 text-green-400 px-2 py-0.5 rounded border border-green-500/30 uppercase">Victoria</span>}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    {playersA.map(p => (
                                        <PlayerStatRow 
                                            key={p.id} 
                                            player={p} 
                                            stats={currentStats[p.id] || { kills:0, deaths:0, assists:0, cs:0, totalPoints:0 } as any}
                                            isWinner={currentWinnerId === teamA.id}
                                            mvpPlayerId={match.mvpPlayerId}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Team B */}
                            <div>
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <div className="flex items-center gap-2">
                                        {teamB.logo && <img src={teamB.logo} className="w-5 h-5 object-contain" />}
                                        <h4 className="font-bold text-white text-lg">{teamB.name}</h4>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {currentWinnerId === teamB.id && <span className="text-[10px] font-bold bg-green-900/50 text-green-400 px-2 py-0.5 rounded border border-green-500/30 uppercase">Victoria</span>}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    {playersB.map(p => (
                                        <PlayerStatRow 
                                            key={p.id} 
                                            player={p} 
                                            stats={currentStats[p.id] || { kills:0, deaths:0, assists:0, cs:0, totalPoints:0 } as any}
                                            isWinner={currentWinnerId === teamB.id}
                                            mvpPlayerId={match.mvpPlayerId}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="p-3 bg-[#091428] border-t border-gray-800 text-center text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                    Puntos calculados según reglas Fantasy {selectedSplit.toLowerCase().includes('spring') ? 'Spring 2026' : 'Winter 2026'}
                </div>
            </div>
        </div>
    );
};
