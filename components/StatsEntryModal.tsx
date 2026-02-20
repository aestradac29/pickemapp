
import React, { useState, useEffect } from 'react';
import { Match, Team, Player, PlayerGameStats, Role, MatchGame } from '../types';
import { fantasyService } from '../services/fantasyService';
import { extractStatsFromData } from '../services/geminiService';
import { X, Save, RefreshCw, Trophy, Skull, Target, Swords, HeartHandshake, Crosshair, Droplet, ChevronDown, ChevronUp, Eye, Flame, Activity, CheckCircle2, Bot, FileText, Download, Sparkles, AlertTriangle, Crown } from 'lucide-react';
import { ROLE_ICONS } from '../constants';

interface StatsEntryModalProps {
    match: Match;
    teamA: Team;
    teamB: Team;
    allPlayers: Player[]; // Required to filter by team
    onClose: () => void;
    onSave: (games: MatchGame[]) => void;
    isSaving?: boolean;
}

interface PlayerRowProps {
    player: Player;
    stats: Record<string, PlayerGameStats>;
    onStatChange: (playerId: string, field: keyof PlayerGameStats, value: any) => void;
}

const PlayerRow: React.FC<PlayerRowProps> = ({ player, stats, onStatChange }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const s = stats[player.id] || { 
        playerId: player.id,
        kills:0, deaths:0, assists:0, cs:0, totalPoints:0, 
        isMvp: false, firstBlood: false, 
        doubleKills:0, tripleKills:0, quadraKills:0, pentaKills:0,
        teamDamagePercentage:0, dragonsKilled:0, baronsKilled:0, damagePerMinute:0, visionScore:0, firstDragon:false
    };
    
    // Indicadores visuales para los bonus (informativo)
    const hasHighKillBonus = s.kills >= 10;
    const kda = (s.kills + s.assists) / Math.max(1, s.deaths);
    const hasPerfectBonus = s.deaths === 0 && kda >= 5;

    // Colores por rol para la sección expandida
    const roleColors: Record<Role, string> = {
        [Role.TOP]: 'border-orange-500/30 bg-orange-900/10 text-orange-200',
        [Role.JUNGLE]: 'border-green-500/30 bg-green-900/10 text-green-200',
        [Role.MID]: 'border-purple-500/30 bg-purple-900/10 text-purple-200',
        [Role.ADC]: 'border-blue-500/30 bg-blue-900/10 text-blue-200',
        [Role.SUPPORT]: 'border-cyan-500/30 bg-cyan-900/10 text-cyan-200',
    };

    return (
        <div className={`bg-[#0a1428] rounded border border-gray-700 text-xs transition-all mb-1 ${isExpanded ? 'border-gray-500 shadow-lg' : 'hover:border-gray-500'}`}>
            
            {/* --- MAIN ROW --- */}
            <div className="grid grid-cols-12 gap-2 items-center p-2">
                {/* ID Info */}
                <div className="col-span-3 flex items-center gap-2 overflow-hidden cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                    <button className="p-0.5 rounded hover:bg-white/10 text-gray-400">
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    <img src={ROLE_ICONS[player.role]} className="w-4 h-4 opacity-70" alt={player.role} />
                    <span className="font-bold truncate text-gray-300 group-hover:text-white" title={player.name}>{player.name}</span>
                </div>

                {/* Inputs with Icons - Expanded to 6 cols */}
                <div className="col-span-6 grid grid-cols-4 gap-1">
                    {/* Kills */}
                    <div className="relative">
                        <div className="absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Swords className={`w-3 h-3 ${hasHighKillBonus ? 'text-red-500' : 'text-red-400'}`} />
                        </div>
                        <input 
                            type="number" 
                            placeholder="K" 
                            className={`w-full bg-[#1e293b] rounded py-1 pl-5 pr-1 text-right text-white outline-none focus:border-red-500 border font-mono ${hasHighKillBonus ? 'border-red-500/50 text-red-200' : 'border-transparent'}`} 
                            value={s.kills} 
                            onChange={(e) => onStatChange(player.id, 'kills', Number(e.target.value))} 
                        />
                    </div>

                    {/* Deaths */}
                    <div className="relative">
                        <div className="absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Skull className={`w-3 h-3 ${hasPerfectBonus ? 'text-blue-400' : 'text-gray-400'}`} />
                        </div>
                        <input 
                            type="number" 
                            placeholder="D" 
                            className={`w-full bg-[#1e293b] rounded py-1 pl-5 pr-1 text-right text-white outline-none focus:border-gray-500 border font-mono ${hasPerfectBonus ? 'border-blue-500/50 text-blue-200' : 'border-transparent'}`} 
                            value={s.deaths} 
                            onChange={(e) => onStatChange(player.id, 'deaths', Number(e.target.value))} 
                        />
                    </div>

                    {/* Assists */}
                    <div className="relative">
                        <div className="absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none">
                            <HeartHandshake className="w-3 h-3 text-blue-400" />
                        </div>
                        <input 
                            type="number" 
                            placeholder="A" 
                            className="w-full bg-[#1e293b] rounded py-1 pl-5 pr-1 text-right text-white outline-none focus:border-blue-500 border border-transparent font-mono" 
                            value={s.assists} 
                            onChange={(e) => onStatChange(player.id, 'assists', Number(e.target.value))} 
                        />
                    </div>

                    {/* CS */}
                    <div className="relative">
                        <div className="absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Target className="w-3 h-3 text-yellow-400" />
                        </div>
                        <input 
                            type="number" 
                            placeholder="CS" 
                            className="w-full bg-[#1e293b] rounded py-1 pl-5 pr-1 text-right text-white outline-none focus:border-yellow-500 border border-transparent font-mono" 
                            value={s.cs} 
                            onChange={(e) => onStatChange(player.id, 'cs', Number(e.target.value))} 
                        />
                    </div>
                </div>

                {/* Toggles - Checkbox for MVP & First Blood */}
                <div className="col-span-2 flex items-center justify-center gap-1.5">
                    {/* MVP */}
                    <label className="relative cursor-pointer group/check" title="MVP del Partido (+3 Puntos)">
                        <input 
                            type="checkbox" 
                            className="peer sr-only" 
                            checked={s.isMvp}
                            onChange={(e) => onStatChange(player.id, 'isMvp', e.target.checked)}
                        />
                        <div className="w-5 h-5 rounded bg-[#1e293b] border border-gray-600 peer-checked:bg-yellow-500 peer-checked:border-yellow-400 flex items-center justify-center transition-all shadow-sm group-hover/check:border-gray-400">
                            <Trophy className={`w-3 h-3 ${s.isMvp ? 'text-black' : 'text-gray-500 group-hover/check:text-gray-300'}`} />
                        </div>
                    </label>

                    {/* First Blood */}
                    <label className="relative cursor-pointer group/check" title="First Blood (+1 Punto)">
                        <input 
                            type="checkbox" 
                            className="peer sr-only" 
                            checked={s.firstBlood}
                            onChange={(e) => onStatChange(player.id, 'firstBlood', e.target.checked)}
                        />
                        <div className="w-5 h-5 rounded bg-[#1e293b] border border-gray-600 peer-checked:bg-red-600 peer-checked:border-red-500 flex items-center justify-center transition-all shadow-sm group-hover/check:border-gray-400">
                            <Droplet className={`w-3 h-3 ${s.firstBlood ? 'text-white fill-current' : 'text-gray-500 group-hover/check:text-gray-300'}`} />
                        </div>
                    </label>
                </div>

                {/* Score Preview with 2 Decimals */}
                <div className="col-span-1 text-right font-bold text-[#0ac8b9] text-xs sm:text-sm">
                    {s.totalPoints.toFixed(2)}
                </div>
            </div>

            {/* --- EXPANDED DETAILS (Multikills & Role Specifics) --- */}
            {isExpanded && (
                <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 border-t border-gray-800/50">
                    <div className="grid grid-cols-2 gap-6 mt-3">
                        
                        {/* LEFT: MULTIKILLS */}
                        <div className="bg-black/20 p-2 rounded border border-gray-800">
                            <span className="text-[10px] uppercase font-bold text-gray-500 mb-2 block tracking-wider">Multikills</span>
                            <div className="grid grid-cols-4 gap-2">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] text-gray-400 text-center">Double</span>
                                    <input 
                                        type="number" 
                                        className="bg-[#1e293b] rounded py-1 text-center text-white border border-gray-700 focus:border-red-500 outline-none"
                                        value={s.doubleKills}
                                        onChange={(e) => onStatChange(player.id, 'doubleKills', Number(e.target.value))}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] text-yellow-200 text-center">Triple</span>
                                    <input 
                                        type="number" 
                                        className="bg-[#1e293b] rounded py-1 text-center text-white border border-gray-700 focus:border-red-500 outline-none"
                                        value={s.tripleKills}
                                        onChange={(e) => onStatChange(player.id, 'tripleKills', Number(e.target.value))}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] text-orange-400 text-center">Quadra</span>
                                    <input 
                                        type="number" 
                                        className="bg-[#1e293b] rounded py-1 text-center text-white border border-gray-700 focus:border-red-500 outline-none"
                                        value={s.quadraKills}
                                        onChange={(e) => onStatChange(player.id, 'quadraKills', Number(e.target.value))}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] text-red-500 font-bold text-center">PENTA</span>
                                    <input 
                                        type="number" 
                                        className="bg-[#1e293b] rounded py-1 text-center text-white border border-gray-700 focus:border-red-500 outline-none ring-1 ring-red-900"
                                        value={s.pentaKills}
                                        onChange={(e) => onStatChange(player.id, 'pentaKills', Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: ROLE SPECIFICS */}
                        <div className={`p-2 rounded border ${roleColors[player.role]}`}>
                            <span className="text-[10px] uppercase font-bold opacity-80 mb-2 block tracking-wider flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                Stats de {player.role}
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                {(player.role === Role.TOP || player.role === Role.MID) && (
                                    <div className="flex flex-col gap-1 col-span-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] opacity-80">% Daño Equipo</span>
                                            <span className="text-[9px] font-bold">{player.role === Role.TOP ? '>= 25%' : '>= 30%'}</span>
                                        </div>
                                        <input 
                                            type="number" 
                                            placeholder="0-100" 
                                            className="bg-black/30 rounded py-1 px-2 text-white border border-white/10 focus:border-white/50 outline-none"
                                            value={s.teamDamagePercentage}
                                            onChange={(e) => onStatChange(player.id, 'teamDamagePercentage', Number(e.target.value))}
                                        />
                                    </div>
                                )}

                                {player.role === Role.JUNGLE && (
                                    <>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] opacity-80">Dragones Team</span>
                                            <input 
                                                type="number" 
                                                placeholder="Total" 
                                                className="bg-black/30 rounded py-1 px-2 text-white border border-white/10 focus:border-white/50 outline-none"
                                                value={s.dragonsKilled}
                                                onChange={(e) => onStatChange(player.id, 'dragonsKilled', Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] opacity-80">Barones Team</span>
                                            <input 
                                                type="number" 
                                                placeholder="Total" 
                                                className="bg-black/30 rounded py-1 px-2 text-white border border-white/10 focus:border-white/50 outline-none"
                                                value={s.baronsKilled}
                                                onChange={(e) => onStatChange(player.id, 'baronsKilled', Number(e.target.value))}
                                            />
                                        </div>
                                    </>
                                )}

                                {player.role === Role.ADC && (
                                    <div className="flex flex-col gap-1 col-span-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] opacity-80">Daño por Minuto</span>
                                            <span className="text-[9px] font-bold">{'>= 1000'}</span>
                                        </div>
                                        <input 
                                            type="number" 
                                            placeholder="DPM" 
                                            className="bg-black/30 rounded py-1 px-2 text-white border border-white/10 focus:border-white/50 outline-none"
                                            value={s.damagePerMinute}
                                            onChange={(e) => onStatChange(player.id, 'damagePerMinute', Number(e.target.value))}
                                        />
                                    </div>
                                )}

                                {player.role === Role.SUPPORT && (
                                    <>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] opacity-80">Vision Score</span>
                                            <input 
                                                type="number" 
                                                placeholder="Total" 
                                                className="bg-black/30 rounded py-1 px-2 text-white border border-white/10 focus:border-white/50 outline-none"
                                                value={s.visionScore}
                                                onChange={(e) => onStatChange(player.id, 'visionScore', Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1 justify-center">
                                            <label className="flex items-center gap-2 cursor-pointer bg-black/30 p-1.5 rounded border border-white/10 hover:bg-black/50">
                                                <input 
                                                    type="checkbox" 
                                                    className="accent-cyan-500"
                                                    checked={s.firstDragon}
                                                    onChange={(e) => onStatChange(player.id, 'firstDragon', e.target.checked)}
                                                />
                                                <span className="text-[9px] font-bold">1er Dragón</span>
                                            </label>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const StatsEntryModal: React.FC<StatsEntryModalProps> = ({ match, teamA, teamB, allPlayers, onClose, onSave, isSaving }) => {
    // Determine number of games based on BO format
    const numGames = match.bestOf || 1;
    const gameIndices = Array.from({ length: numGames }, (_, i) => i + 1);
    
    // State: Active Tab
    const [activeGame, setActiveGame] = useState(1);

    // State: Data Structure for ALL games
    const [gamesData, setGamesData] = useState<Record<number, { winnerId: string | null, stats: Record<string, PlayerGameStats> }>>({});
    
    // Import AI State
    const [isImporting, setIsImporting] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importText, setImportText] = useState("");

    // Players lists
    const playersA = allPlayers.filter(p => p.teamId === teamA.id);
    const playersB = allPlayers.filter(p => p.teamId === teamB.id);
    const matchPlayers = [...playersA, ...playersB];

    // Initialize logic (FIXED)
    useEffect(() => {
        const initialData: Record<number, any> = {};
        
        // Helper to find existing game data in match object
        const getExistingGame = (id: number) => match.games?.find(g => g.id === id);

        for (let i = 1; i <= numGames; i++) {
            const existingGame = getExistingGame(i);

            if (existingGame) {
                // Load existing data if available
                initialData[i] = { 
                    winnerId: existingGame.winnerId, 
                    stats: existingGame.stats 
                };
            } else {
                // Initialize New / Empty Structure
                
                // Legacy fallback: Only if NO match.games exist at all, and it's game 1, and match.stats exists.
                // This covers cases where data was saved before multi-game support.
                const isLegacyStatsAvailable = (!match.games || match.games.length === 0) && match.stats;
                const useLegacyStats = i === 1 && isLegacyStatsAvailable;
                
                const statsMap: Record<string, PlayerGameStats> = {};
                matchPlayers.forEach(p => {
                    if (useLegacyStats && match.stats && match.stats[p.id]) {
                        statsMap[p.id] = { ...match.stats[p.id] };
                    } else {
                        statsMap[p.id] = {
                            playerId: p.id,
                            kills: 0, deaths: 0, assists: 0, cs: 0,
                            isMvp: false, firstBlood: false,
                            doubleKills:0, tripleKills:0, quadraKills:0, pentaKills:0,
                            teamDamagePercentage:0, dragonsKilled:0, baronsKilled:0, damagePerMinute:0, visionScore:0, firstDragon:false,
                            totalPoints: 0
                        };
                    }
                });
                
                initialData[i] = {
                    winnerId: useLegacyStats ? match.winnerId || null : null,
                    stats: statsMap
                };
            }
        }
        setGamesData(initialData);
    }, [match, numGames]); // Dependency on match ensures re-init if match prop updates

    const handleStatChange = (playerId: string, field: keyof PlayerGameStats, value: any) => {
        setGamesData(prev => {
            const currentGameData = prev[activeGame];
            const currentStatsMap = currentGameData.stats;
            const currentPlayerStats = currentStatsMap[playerId];

            let updates: any = { [field]: value };
            
            // Logic for MVP/First Blood exclusivity within THIS GAME
            const newStatsMap = { ...currentStatsMap };

            if ((field === 'isMvp' || field === 'firstBlood') && value === true) {
                Object.keys(newStatsMap).forEach(pid => {
                    if (pid !== playerId) {
                        newStatsMap[pid] = { ...newStatsMap[pid], [field]: false };
                        // Recalculate neighbors
                        recalculatePlayerPoints(newStatsMap[pid], currentGameData.winnerId);
                    }
                });
            }

            // Update current player
            newStatsMap[playerId] = { ...currentPlayerStats, ...updates };
            recalculatePlayerPoints(newStatsMap[playerId], currentGameData.winnerId);

            return {
                ...prev,
                [activeGame]: { ...currentGameData, stats: newStatsMap }
            };
        });
    };

    const handleWinnerChange = (teamId: string) => {
        setGamesData(prev => {
            const currentGameData = prev[activeGame];
            // Toggle logic: if clicking same winner, unselect
            const newWinner = currentGameData.winnerId === teamId ? null : teamId;
            
            const newStatsMap = { ...currentGameData.stats };
            
            // Recalculate ALL players points because Win Bonus changed
            Object.keys(newStatsMap).forEach(pid => {
                recalculatePlayerPoints(newStatsMap[pid], newWinner);
            });

            return {
                ...prev,
                [activeGame]: { ...currentGameData, winnerId: newWinner, stats: newStatsMap }
            };
        });
    };

    // Helper to calc points in-place
    const recalculatePlayerPoints = (stats: PlayerGameStats, winnerId: string | null) => {
        const player = allPlayers.find(p => p.id === stats.playerId);
        if (!player) return;
        
        const isWinner = winnerId === player.teamId;
        
        stats.totalPoints = fantasyService.calculatePoints(
            { ...stats, win: isWinner } as any,
            player.role,
            false,
            match.bracketStage,
            match.stage
        );
    };

    const handleSave = () => {
        // Transform internal state to array
        const gamesList: MatchGame[] = [];
        
        Object.keys(gamesData).forEach(key => {
            const gameId = parseInt(key);
            const data = gamesData[gameId];
            const hasData = data.winnerId !== null || Object.values(data.stats).some((s: PlayerGameStats) => s.totalPoints !== 0);
            
            if (hasData) {
                gamesList.push({
                    id: gameId,
                    winnerId: data.winnerId,
                    stats: data.stats
                });
            }
        });

        onSave(gamesList);
    };

    // --- AI IMPORT LOGIC ---
    const handleAIImport = async () => {
        if (!importText.trim()) return;
        
        setIsImporting(true);
        try {
            // Call Gemini service
            const extractedStats = await extractStatsFromData(importText, matchPlayers);
            
            // Merge into current game state
            setGamesData(prev => {
                const currentGameData = prev[activeGame];
                const currentStatsMap = currentGameData.stats;
                const newStatsMap = { ...currentStatsMap };

                Object.keys(extractedStats).forEach(playerId => {
                    if (newStatsMap[playerId]) {
                        const newStats = extractedStats[playerId]!;
                        // Merge fields carefully
                        newStatsMap[playerId] = {
                            ...newStatsMap[playerId],
                            ...newStats
                        };
                        // Recalculate points for this player
                        recalculatePlayerPoints(newStatsMap[playerId], currentGameData.winnerId);
                    }
                });

                return {
                    ...prev,
                    [activeGame]: { ...currentGameData, stats: newStatsMap }
                };
            });

            setImportText("");
            setShowImportModal(false);
        } catch (error) {
            console.error("AI Import Failed:", error);
            alert("Falló la importación. Inténtalo de nuevo o revisa la consola.");
        } finally {
            setIsImporting(false);
        }
    };

    // Current View Helpers
    // Safe access with fallback
    const currentStats = gamesData[activeGame]?.stats || {};
    const currentWinner = gamesData[activeGame]?.winnerId;

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-5xl bg-[#091428] border-2 border-red-500 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] relative">
                
                {/* Header */}
                <div className="p-4 bg-red-900/20 border-b border-red-500/30">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4">
                            <span className="text-red-400 font-bold uppercase tracking-wider flex items-center gap-2">
                                <Crosshair className="w-5 h-5" />
                                Editor de Estadísticas
                            </span>
                            <span className="text-gray-500">|</span>
                            <span className="text-white font-bold">{teamA.shortName} vs {teamB.shortName}</span>
                            <div className="flex gap-2">
                                <span className="text-xs bg-black/30 px-2 py-1 rounded border border-gray-700 text-gray-400">BO{numGames}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setShowImportModal(true)}
                                className="group relative inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-purple-500/30 transition-all hover:scale-105 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                <Sparkles className="w-4 h-4 fill-current animate-pulse" />
                                <span>Importar con IA</span>
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Game Tabs */}
                    <div className="flex gap-2 overflow-x-auto">
                        {gameIndices.map(i => {
                            const isActive = activeGame === i;
                            const hasWinner = gamesData[i]?.winnerId;
                            return (
                                <button
                                    key={i}
                                    onClick={() => setActiveGame(i)}
                                    className={`
                                        px-4 py-2 rounded-t-lg text-xs font-bold uppercase tracking-wider transition-all border-t border-x border-b-0 relative
                                        ${isActive 
                                            ? 'bg-[#091428] text-white border-red-500/50 z-10' 
                                            : 'bg-black/40 text-gray-500 border-transparent hover:bg-black/60'
                                        }
                                    `}
                                >
                                    Partida {i}
                                    {hasWinner && <span className="ml-2 text-green-400">✓</span>}
                                    {isActive && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#091428]"></div>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Game Specific Toolbar (Winner Selection) */}
                <div className="p-2 bg-[#050a14] border-b border-gray-800 flex justify-center gap-6 items-center">
                    <span className="text-xs text-gray-500 uppercase font-bold">Ganador Partida {activeGame}:</span>
                    <button 
                        onClick={() => handleWinnerChange(teamA.id)}
                        className={`flex items-center gap-2 px-3 py-1 rounded border transition-all ${currentWinner === teamA.id ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-[#1e293b] border-gray-700 text-gray-400 hover:border-gray-500'}`}
                    >
                        {teamA.logo ? <img src={teamA.logo} className="w-4 h-4 object-contain" /> : null}
                        <span className="text-xs font-bold">{teamA.shortName}</span>
                        {currentWinner === teamA.id && <CheckCircle2 className="w-3 h-3" />}
                    </button>
                    <button 
                        onClick={() => handleWinnerChange(teamB.id)}
                        className={`flex items-center gap-2 px-3 py-1 rounded border transition-all ${currentWinner === teamB.id ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-[#1e293b] border-gray-700 text-gray-400 hover:border-gray-500'}`}
                    >
                        {teamB.logo ? <img src={teamB.logo} className="w-4 h-4 object-contain" /> : null}
                        <span className="text-xs font-bold">{teamB.shortName}</span>
                        {currentWinner === teamB.id && <CheckCircle2 className="w-3 h-3" />}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8 custom-scrollbar bg-[#091428]">
                    
                    {/* Team A Column */}
                    <div>
                        <div className="flex items-center gap-2 mb-4 border-b border-gray-700 pb-2">
                            <img src={teamA.logo} className="w-6 h-6 object-contain" />
                            <h3 className={`font-bold text-lg ${currentWinner === teamA.id ? 'text-green-400' : 'text-white'}`}>{teamA.name}</h3>
                        </div>
                        <div className="space-y-2">
                            {playersA.map(p => <PlayerRow key={p.id} player={p} stats={currentStats} onStatChange={handleStatChange} />)}
                        </div>
                    </div>

                    {/* Team B Column */}
                    <div>
                        <div className="flex items-center gap-2 mb-4 border-b border-gray-700 pb-2">
                            <img src={teamB.logo} className="w-6 h-6 object-contain" />
                            <h3 className={`font-bold text-lg ${currentWinner === teamB.id ? 'text-green-400' : 'text-white'}`}>{teamB.name}</h3>
                        </div>
                        <div className="space-y-2">
                            {playersB.map(p => <PlayerRow key={p.id} player={p} stats={currentStats} onStatChange={handleStatChange} />)}
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-[#050a14] border-t border-gray-800 flex justify-end items-center gap-3">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-green-600 hover:bg-green-500 text-white px-8 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all transform hover:scale-105"
                    >
                        {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar Serie
                    </button>
                </div>

                {/* --- AI IMPORT OVERLAY --- */}
                {showImportModal && (
                    <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-8 backdrop-blur-sm animate-in fade-in">
                        <div className="w-full max-w-2xl bg-[#0f1d36] rounded-xl border border-purple-500/50 shadow-2xl p-6 relative">
                            <button onClick={() => setShowImportModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                            
                            <h3 className="text-xl font-bold text-purple-300 mb-4 flex items-center gap-2">
                                <Bot className="w-6 h-6" /> Importación Inteligente (Gemini)
                            </h3>

                            {/* WARNING NOTICE */}
                            <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                                    <div className="space-y-2">
                                        <p className="text-sm text-yellow-200 font-bold">
                                            Verificación Manual Requerida
                                        </p>
                                        <p className="text-xs text-yellow-400/80 leading-relaxed">
                                            La IA extrae KDA y Daño. Por favor, asigna manualmente:
                                        </p>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-gray-400 uppercase font-bold tracking-wide">
                                            <span className="flex items-center gap-1.5"><Crown className="w-3 h-3 text-yellow-500" /> Ganador del Mapa</span>
                                            <span className="flex items-center gap-1.5"><Trophy className="w-3 h-3 text-yellow-500" /> MVP</span>
                                            <span className="flex items-center gap-1.5"><Droplet className="w-3 h-3 text-red-500" /> Primera Sangre</span>
                                            <span className="flex items-center gap-1.5"><Crosshair className="w-3 h-3 text-green-500" /> Jungla: Objetivos</span>
                                            <span className="flex items-center gap-1.5"><Eye className="w-3 h-3 text-cyan-500" /> Supp: 1º Dragón</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mb-4">
                                <p className="text-sm text-gray-300 mb-2">
                                    Copia todo el texto de la página de estadísticas (Ctrl+A, Ctrl+C en <strong>gol.gg</strong>) y pégalo aquí.
                                </p>
                                <textarea 
                                    className="w-full h-64 bg-black/50 border border-gray-600 rounded-lg p-4 text-xs font-mono text-gray-300 focus:border-purple-500 outline-none resize-none"
                                    placeholder="Pega aquí el contenido crudo de la web de estadísticas..."
                                    value={importText}
                                    onChange={(e) => setImportText(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button 
                                    onClick={() => setShowImportModal(false)}
                                    className="px-4 py-2 rounded text-gray-400 hover:text-white"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleAIImport}
                                    disabled={isImporting || !importText}
                                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded font-bold flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    {isImporting ? 'Analizando...' : 'Procesar Datos'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
