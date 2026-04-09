
import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../services/dataService';
import { Player, Team, Match, Role, Stage, PlayerGameStats } from '../types';
import { ROLE_ICONS, normalizeSplitId } from '../constants';
import { Loader2, Crown, Star, Medal, Trophy, Calendar, Users, Skull, TrendingDown, AlertTriangle, Swords } from 'lucide-react';
import { DaySelector } from './DaySelector';

interface ScoredPlayer extends Player {
    dayPoints: number;
}

interface HallOfFameProps { selectedSplit?: string | null; }

export const HallOfFame: React.FC<HallOfFameProps> = ({ selectedSplit: propSelectedSplit }) => {
    const [viewMode, setViewMode] = useState<'GROUPS' | 'PLAYOFFS'>('GROUPS');
    const [currentDay, setCurrentDay] = useState(1);
    const selectedSplit = normalizeSplitId(propSelectedSplit || localStorage.getItem('selectedSplit'));
    
    const [matches, setMatches] = useState<Match[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [teams, setTeams] = useState<Record<string, Team>>({});
    const [config, setConfig] = useState<any>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [m, p, t, conf] = await Promise.all([
                    dataService.getMatches(undefined, selectedSplit),
                    dataService.getPlayers(false, selectedSplit),
                    dataService.getTeams(false, selectedSplit),
                    dataService.getDaysConfig(selectedSplit)
                ]);
                
                setMatches(m);
                setPlayers(p);
                setTeams(t);
                setConfig(conf);
                
                // Smart init: If playoffs are accessible and have data, default to playoff view? 
                // Let's keep default as GROUPS for now unless specified.
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [selectedSplit]);

    // Filter available days based on View Mode
    const availableDays = useMemo(() => {
        const relevantMatches = matches.filter(m => 
            viewMode === 'GROUPS' 
                ? m.stage === Stage.GROUPS 
                : (m.stage === Stage.PLAYOFFS || m.stage === Stage.FINALS)
        );

        // Days that have completed matches with stats
        const daysWithResults = new Set(relevantMatches.filter(match => match.isCompleted).map(match => match.day || 0));
        
        // Merge with configured visible days
        const configVisible = viewMode === 'GROUPS' ? (config.visibleDays || [1]) : (config.playoffVisibleDays || [1]);
        
        const combinedDays = Array.from(new Set([...configVisible, ...Array.from(daysWithResults)]));
        return combinedDays.filter(d => d > 0).sort((a, b) => a - b);
    }, [matches, config, viewMode]);

    // Reset day when switching modes
    useEffect(() => {
        if (availableDays.length > 0) {
            // Default to the last available day usually, but let's stick to 1 or logic
            // If the currentDay is not in the new list, reset to 1
            if (!availableDays.includes(currentDay)) {
                setCurrentDay(availableDays[0] || 1);
            }
        } else {
            setCurrentDay(1);
        }
    }, [viewMode, availableDays]);

    // Logic: Calculate points for the selected day/round
    const dayStats = useMemo(() => {
        const stats: ScoredPlayer[] = [];
        
        const dayMatches = matches.filter(m => 
            m.day === currentDay && 
            m.isCompleted && 
            (viewMode === 'GROUPS' ? m.stage === Stage.GROUPS : (m.stage === Stage.PLAYOFFS || m.stage === Stage.FINALS))
        );

        // Identify Teams that ACTUALLY played.
        // This is crucial for Playoffs to avoid showing eliminated players with 0 points in the Hall of Shame.
        const activeTeamIds = new Set<string>();
        dayMatches.forEach(m => {
            activeTeamIds.add(m.teamA.id);
            activeTeamIds.add(m.teamB.id);
        });

        // Map containing points per player ID for this day
        const pointsMap: Record<string, number> = {};

        dayMatches.forEach(match => {
            if (match.stats) {
                Object.values(match.stats).forEach((s: any) => {
                    const stat = s as PlayerGameStats;
                    if (!pointsMap[stat.playerId]) pointsMap[stat.playerId] = 0;
                    pointsMap[stat.playerId] += stat.totalPoints;
                });
            }
        });

        // Merge with player info
        players.forEach(p => {
            // ONLY include player if their team played this round OR if they have points recorded (subs check)
            if (activeTeamIds.has(p.teamId) || pointsMap[p.id] !== undefined) {
                stats.push({
                    ...p,
                    dayPoints: pointsMap[p.id] || 0
                });
            }
        });

        return stats.sort((a, b) => b.dayPoints - a.dayPoints);
    }, [matches, players, currentDay, viewMode]);

    // --- HALL OF FAME (BEST) ---
    const top3Overall = dayStats.slice(0, 3);
    const topPerRole = useMemo(() => {
        const result: Record<Role, ScoredPlayer[]> = {
            [Role.TOP]: [], [Role.JUNGLE]: [], [Role.MID]: [], [Role.ADC]: [], [Role.SUPPORT]: []
        };
        Object.values(Role).forEach(role => {
            result[role] = dayStats.filter(p => p.role === role).slice(0, 3);
        });
        return result;
    }, [dayStats]);

    // --- HALL OF SHAME (WORST) ---
    const worstStats = [...dayStats].reverse(); // Lowest first
    const bottom3Overall = worstStats.slice(0, 3);
    const bottomPerRole = useMemo(() => {
        const result: Record<Role, ScoredPlayer[]> = {
            [Role.TOP]: [], [Role.JUNGLE]: [], [Role.MID]: [], [Role.ADC]: [], [Role.SUPPORT]: []
        };
        Object.values(Role).forEach(role => {
            result[role] = dayStats.filter(p => p.role === role).reverse().slice(0, 3); // Take bottom 3
        });
        return result;
    }, [dayStats]);

    if (loading) {
        return <div className="flex justify-center py-20 text-[#c8aa6e]"><Loader2 className="w-12 h-12 animate-spin" /></div>;
    }

    // Rank Badge Helper
    const RankBadge = ({ rank, type = 'fame' }: { rank: number, type?: 'fame' | 'shame' }) => {
        if (type === 'shame') {
             if (rank === 1) return <div className="w-6 h-6 rounded-full bg-red-900 border border-red-500 flex items-center justify-center text-red-200 font-bold text-xs shadow-lg">1</div>;
             if (rank === 2) return <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-gray-400 font-bold text-xs shadow-lg">2</div>;
             if (rank === 3) return <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-gray-400 font-bold text-xs shadow-lg">3</div>;
             return null;
        }
        if (rank === 1) return <div className="w-6 h-6 rounded-full bg-yellow-500 border border-yellow-300 flex items-center justify-center text-[#0a1428] font-bold text-xs shadow-lg shadow-yellow-500/20">1</div>;
        if (rank === 2) return <div className="w-6 h-6 rounded-full bg-gray-300 border border-gray-100 flex items-center justify-center text-[#0a1428] font-bold text-xs shadow-lg">2</div>;
        if (rank === 3) return <div className="w-6 h-6 rounded-full bg-amber-700 border border-amber-500 flex items-center justify-center text-white font-bold text-xs shadow-lg">3</div>;
        return null;
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 pb-20">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-[#c8aa6e] to-[#7a6230] rounded-full shadow-[0_0_20px_rgba(200,170,110,0.3)] mb-4 border-2 border-[#f0e6d2]">
                    <Crown className="w-8 h-8 text-[#0a1428]" />
                </div>
                <h2 className="text-3xl font-bold text-white uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#c8aa6e] via-[#f0e6d2] to-[#c8aa6e] drop-shadow-sm">
                    Hall of Fame
                </h2>
                <p className="text-[#c8aa6e]/70 text-sm font-bold uppercase tracking-wide mt-1">
                    {viewMode === 'GROUPS' ? `Jornada ${currentDay}` : `Ronda ${currentDay}`}
                </p>
            </div>

            {/* Stage Selector */}
            <div className="flex justify-center mb-6">
                <div className="bg-[#0f1d36] p-1 rounded-lg border border-gray-700 inline-flex">
                    <button 
                        onClick={() => setViewMode('GROUPS')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-md text-xs font-bold uppercase transition-all ${viewMode === 'GROUPS' ? 'bg-[#c8aa6e] text-[#0a1428] shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Swords className="w-4 h-4" /> Fase Regular
                    </button>
                    <button 
                        onClick={() => setViewMode('PLAYOFFS')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-md text-xs font-bold uppercase transition-all ${viewMode === 'PLAYOFFS' ? 'bg-[#c8aa6e] text-[#0a1428] shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Trophy className="w-4 h-4" /> Playoffs
                    </button>
                </div>
            </div>

            {/* Day/Round Selector */}
            <div className="mb-8">
                <DaySelector 
                    days={availableDays}
                    currentDay={currentDay}
                    onSelect={setCurrentDay}
                    isEditMode={false}
                    checkUnsaved={() => false}
                    activeDays={availableDays}
                    labelPrefix={viewMode === 'GROUPS' ? 'Jornada' : 'Ronda'}
                />
            </div>

            {dayStats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500 border-2 border-dashed border-gray-800 rounded-2xl bg-[#091428]/50">
                    <Calendar className="w-12 h-12 mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-gray-400 mb-1">Sin Datos</h3>
                    <p className="uppercase tracking-widest text-xs font-bold text-[#c8aa6e]">
                        La {viewMode === 'GROUPS' ? 'jornada' : 'ronda'} {currentDay} aún no ha finalizado
                    </p>
                </div>
            ) : (
                <>
                    {/* ========================================== */}
                    {/* HALL OF FAME (BEST)                        */}
                    {/* ========================================== */}
                    <div className="mb-20 relative">
                        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c8aa6e]/20 to-transparent"></div>
                        <h3 className="text-center text-xl font-bold text-[#c8aa6e] uppercase tracking-widest mb-8 relative inline-block bg-[#0a1428] px-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
                            <Star className="w-5 h-5 fill-current" /> MVP de la {viewMode === 'GROUPS' ? 'Jornada' : 'Ronda'}
                        </h3>

                        {/* PODIUM FAME */}
                        <div className="flex flex-col md:flex-row justify-center items-end gap-4 md:gap-8 px-4 mb-12">
                            {/* 2nd Place */}
                            {top3Overall[1] && (
                                <div className="order-2 md:order-1 w-full md:w-64 flex flex-col items-center">
                                    <div className="relative w-full bg-gradient-to-b from-gray-800 to-[#091428] rounded-t-xl p-4 border-t-4 border-gray-400 shadow-xl flex flex-col items-center transform md:scale-90">
                                        <div className="absolute -top-5">
                                            <div className="w-10 h-10 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-[#0a1428] font-bold text-lg shadow-lg">2</div>
                                        </div>
                                        <img src={top3Overall[1].photo} className="w-20 h-20 rounded-full border-2 border-gray-400 bg-black object-cover mb-2 mt-4" onError={(e) => (e.target as HTMLImageElement).src = ROLE_ICONS[top3Overall[1].role]} />
                                        <h4 className="font-bold text-gray-200 text-lg">{top3Overall[1].name}</h4>
                                        <div className="text-[10px] uppercase font-bold text-gray-500 mb-2">{teams[top3Overall[1].teamId]?.name}</div>
                                        <div className="text-2xl font-bold text-gray-300">{top3Overall[1].dayPoints.toFixed(1)} <span className="text-xs">pts</span></div>
                                    </div>
                                </div>
                            )}

                            {/* 1st Place */}
                            {top3Overall[0] && (
                                <div className="order-1 md:order-2 w-full md:w-72 flex flex-col items-center z-10">
                                    <div className="relative w-full bg-gradient-to-b from-yellow-900/40 to-[#091428] rounded-t-xl p-6 border-t-4 border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.15)] flex flex-col items-center transform scale-105">
                                        <div className="absolute -top-6">
                                            <div className="w-12 h-12 rounded-full bg-yellow-400 border-2 border-[#f0e6d2] flex items-center justify-center text-[#0a1428] font-bold text-xl shadow-[0_0_15px_rgba(250,204,21,0.6)]">
                                                <Trophy className="w-6 h-6" />
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full"></div>
                                            <img src={top3Overall[0].photo} className="w-28 h-28 rounded-full border-4 border-yellow-400 bg-black object-cover mb-3 mt-4 relative z-10" onError={(e) => (e.target as HTMLImageElement).src = ROLE_ICONS[top3Overall[0].role]} />
                                        </div>
                                        <h4 className="font-bold text-white text-2xl drop-shadow-md">{top3Overall[0].name}</h4>
                                        <div className="text-xs uppercase font-bold text-yellow-500/80 mb-3">{teams[top3Overall[0].teamId]?.name}</div>
                                        <div className="text-4xl font-bold text-yellow-400 drop-shadow-lg">{top3Overall[0].dayPoints.toFixed(1)} <span className="text-sm text-yellow-200">pts</span></div>
                                    </div>
                                </div>
                            )}

                            {/* 3rd Place */}
                            {top3Overall[2] && (
                                <div className="order-3 md:order-3 w-full md:w-64 flex flex-col items-center">
                                    <div className="relative w-full bg-gradient-to-b from-amber-900/20 to-[#091428] rounded-t-xl p-4 border-t-4 border-amber-700 shadow-xl flex flex-col items-center transform md:scale-90">
                                        <div className="absolute -top-5">
                                            <div className="w-10 h-10 rounded-full bg-amber-700 border-2 border-amber-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">3</div>
                                        </div>
                                        <img src={top3Overall[2].photo} className="w-20 h-20 rounded-full border-2 border-amber-700 bg-black object-cover mb-2 mt-4" onError={(e) => (e.target as HTMLImageElement).src = ROLE_ICONS[top3Overall[2].role]} />
                                        <h4 className="font-bold text-amber-100 text-lg">{top3Overall[2].name}</h4>
                                        <div className="text-[10px] uppercase font-bold text-amber-500/60 mb-2">{teams[top3Overall[2].teamId]?.name}</div>
                                        <div className="text-2xl font-bold text-amber-600">{top3Overall[2].dayPoints.toFixed(1)} <span className="text-xs">pts</span></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* LIST FAME */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                            {Object.values(Role).map(role => (
                                <div key={role} className="bg-[#091428] border border-gray-700 rounded-xl overflow-hidden hover:border-[#c8aa6e]/30 transition-all group">
                                    <div className="bg-[#0f1d36] p-3 border-b border-gray-700 flex items-center justify-center gap-2 group-hover:bg-[#1a2c4e] transition-colors">
                                        <img src={ROLE_ICONS[role]} className="w-5 h-5 opacity-80" />
                                        <h4 className="font-bold text-gray-300 uppercase text-xs tracking-wider">{role}</h4>
                                    </div>
                                    <div className="divide-y divide-gray-800">
                                        {topPerRole[role].map((p, idx) => (
                                            <div key={p.id} className="p-3 flex items-center gap-3 relative overflow-hidden">
                                                <div className="absolute -right-2 -bottom-4 text-6xl font-black text-white/5 z-0 pointer-events-none">{idx + 1}</div>
                                                <div className="relative z-10 flex-shrink-0">
                                                    <RankBadge rank={idx + 1} />
                                                </div>
                                                <div className="flex-1 min-w-0 relative z-10">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-bold text-sm truncate ${idx === 0 ? 'text-white' : 'text-gray-400'}`}>{p.name}</span>
                                                        {teams[p.teamId]?.logo && <img src={teams[p.teamId].logo} className="w-3 h-3 object-contain opacity-70" />}
                                                    </div>
                                                </div>
                                                <div className="text-right relative z-10">
                                                    <span className={`font-bold text-sm ${idx === 0 ? 'text-[#c8aa6e]' : 'text-gray-500'}`}>
                                                        {p.dayPoints.toFixed(1)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ========================================== */}
                    {/* HALL OF SHAME (WORST)                      */}
                    {/* ========================================== */}
                    <div className="relative mt-24">
                        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-900/50 to-transparent"></div>
                        <h3 className="text-center text-xl font-bold text-red-500 uppercase tracking-widest mb-8 relative inline-block bg-[#0a1428] px-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
                            <Skull className="w-5 h-5 fill-current" /> Hall of Shame (El Pozo)
                        </h3>

                        {/* PODIUM SHAME */}
                        <div className="flex flex-col md:flex-row justify-center items-end gap-4 md:gap-8 px-4 mb-12">
                            {/* 2nd Worst */}
                            {bottom3Overall[1] && (
                                <div className="order-2 md:order-1 w-full md:w-64 flex flex-col items-center">
                                    <div className="relative w-full bg-gradient-to-b from-[#1a0f0f] to-[#091428] rounded-t-xl p-4 border-t-4 border-gray-700 shadow-xl flex flex-col items-center transform md:scale-90 grayscale-[0.3]">
                                        <div className="absolute -top-5">
                                            <div className="w-10 h-10 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center text-gray-400 font-bold text-lg shadow-lg">2</div>
                                        </div>
                                        <img src={bottom3Overall[1].photo} className="w-20 h-20 rounded-full border-2 border-gray-700 bg-black object-cover mb-2 mt-4" onError={(e) => (e.target as HTMLImageElement).src = ROLE_ICONS[bottom3Overall[1].role]} />
                                        <h4 className="font-bold text-gray-400 text-lg">{bottom3Overall[1].name}</h4>
                                        <div className="text-[10px] uppercase font-bold text-gray-600 mb-2">{teams[bottom3Overall[1].teamId]?.name}</div>
                                        <div className="text-2xl font-bold text-gray-500">{bottom3Overall[1].dayPoints.toFixed(1)} <span className="text-xs">pts</span></div>
                                    </div>
                                </div>
                            )}

                            {/* 1st Worst (LVP) */}
                            {bottom3Overall[0] && (
                                <div className="order-1 md:order-2 w-full md:w-72 flex flex-col items-center z-10">
                                    <div className="relative w-full bg-gradient-to-b from-red-950/40 to-[#091428] rounded-t-xl p-6 border-t-4 border-red-700 shadow-[0_0_30px_rgba(185,28,28,0.15)] flex flex-col items-center transform scale-105">
                                        <div className="absolute -top-6">
                                            <div className="w-12 h-12 rounded-full bg-red-900 border-2 border-red-500 flex items-center justify-center text-red-200 font-bold text-xl shadow-lg">
                                                <AlertTriangle className="w-6 h-6" />
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-red-500/10 blur-xl rounded-full"></div>
                                            <img src={bottom3Overall[0].photo} className="w-28 h-28 rounded-full border-4 border-red-900/50 bg-black object-cover mb-3 mt-4 relative z-10 grayscale-[0.5]" onError={(e) => (e.target as HTMLImageElement).src = ROLE_ICONS[bottom3Overall[0].role]} />
                                        </div>
                                        <h4 className="font-bold text-red-200 text-2xl drop-shadow-md">{bottom3Overall[0].name}</h4>
                                        <div className="text-xs uppercase font-bold text-red-500/60 mb-3">{teams[bottom3Overall[0].teamId]?.name}</div>
                                        <div className="text-4xl font-bold text-red-600 drop-shadow-lg">{bottom3Overall[0].dayPoints.toFixed(1)} <span className="text-sm text-red-800">pts</span></div>
                                    </div>
                                </div>
                            )}

                            {/* 3rd Worst */}
                            {bottom3Overall[2] && (
                                <div className="order-3 md:order-3 w-full md:w-64 flex flex-col items-center">
                                    <div className="relative w-full bg-gradient-to-b from-[#1a0f0f] to-[#091428] rounded-t-xl p-4 border-t-4 border-gray-700 shadow-xl flex flex-col items-center transform md:scale-90 grayscale-[0.3]">
                                        <div className="absolute -top-5">
                                            <div className="w-10 h-10 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center text-gray-400 font-bold text-lg shadow-lg">3</div>
                                        </div>
                                        <img src={bottom3Overall[2].photo} className="w-20 h-20 rounded-full border-2 border-gray-700 bg-black object-cover mb-2 mt-4" onError={(e) => (e.target as HTMLImageElement).src = ROLE_ICONS[bottom3Overall[2].role]} />
                                        <h4 className="font-bold text-gray-400 text-lg">{bottom3Overall[2].name}</h4>
                                        <div className="text-[10px] uppercase font-bold text-gray-600 mb-2">{teams[bottom3Overall[2].teamId]?.name}</div>
                                        <div className="text-2xl font-bold text-gray-500">{bottom3Overall[2].dayPoints.toFixed(1)} <span className="text-xs">pts</span></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* LIST SHAME */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                            {Object.values(Role).map(role => (
                                <div key={role} className="bg-[#091428] border border-gray-800 rounded-xl overflow-hidden hover:border-red-900/50 transition-all group">
                                    <div className="bg-[#0f1d36] p-3 border-b border-gray-800 flex items-center justify-center gap-2 group-hover:bg-[#1a0f0f] transition-colors">
                                        <img src={ROLE_ICONS[role]} className="w-5 h-5 opacity-50 grayscale" />
                                        <h4 className="font-bold text-gray-500 uppercase text-xs tracking-wider">{role}</h4>
                                    </div>
                                    <div className="divide-y divide-gray-800">
                                        {bottomPerRole[role].map((p, idx) => (
                                            <div key={p.id} className="p-3 flex items-center gap-3 relative overflow-hidden bg-black/20">
                                                <div className="absolute -right-2 -bottom-4 text-6xl font-black text-red-900/10 z-0 pointer-events-none">{idx + 1}</div>
                                                <div className="relative z-10 flex-shrink-0">
                                                    <RankBadge rank={idx + 1} type="shame" />
                                                </div>
                                                <div className="flex-1 min-w-0 relative z-10">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-bold text-sm truncate ${idx === 0 ? 'text-red-300' : 'text-gray-500'}`}>{p.name}</span>
                                                        {teams[p.teamId]?.logo && <img src={teams[p.teamId].logo} className="w-3 h-3 object-contain opacity-50 grayscale" />}
                                                    </div>
                                                </div>
                                                <div className="text-right relative z-10">
                                                    <span className={`font-bold text-sm ${idx === 0 ? 'text-red-500' : 'text-gray-600'}`}>
                                                        {p.dayPoints.toFixed(1)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
