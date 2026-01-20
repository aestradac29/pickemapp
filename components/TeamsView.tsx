
import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../services/dataService';
import { Team, Player, Role } from '../types';
import { ROLE_ICONS } from '../constants';
import { Loader2, Users, TrendingUp, TrendingDown, Coins } from 'lucide-react';

export const TeamsView: React.FC = () => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const [t, p] = await Promise.all([
                dataService.getTeams(),
                dataService.getPlayers()
            ]);
            setTeams(Object.values(t));
            setPlayers(p);
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
    const teamsInOrder = useMemo(() => {
        return [...teams].sort((a, b) => {
            const pointsA = players.filter(p => p.teamId === a.id).reduce((sum, p) => sum + (p.totalPoints || 0), 0);
            const pointsB = players.filter(p => p.teamId === b.id).reduce((sum, p) => sum + (p.totalPoints || 0), 0);
            return pointsB - pointsA;
        });
    }, [teams, players]);

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#c8aa6e]" /></div>;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 pb-20">
            <h2 className="text-2xl font-bold text-[#c8aa6e] mb-6 text-center uppercase tracking-widest flex items-center justify-center gap-3">
                <Users className="w-8 h-8" />
                Rosters
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
                {teamsInOrder.map(team => {
                    const teamPlayers = players.filter(p => p.teamId === team.id);
                    // Order by role: Top, Jgl, Mid, Adc, Supp
                    const rolesOrder = [Role.TOP, Role.JUNGLE, Role.MID, Role.ADC, Role.SUPPORT];
                    const sortedPlayers = teamPlayers.sort((a, b) => rolesOrder.indexOf(a.role) - rolesOrder.indexOf(b.role));

                    // Calculate Team Totals
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
                                
                                {/* Header Content: Flex container for bottom alignment and spacing */}
                                <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between gap-2 z-10 bg-gradient-to-t from-black/60 to-transparent">
                                    
                                    {/* Left: Logo & Name */}
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

                                    {/* Right: Team Stats Badge */}
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
                                        <div key={p.id} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors border border-transparent hover:border-gray-700 bg-[#0f1d36]/50">
                                            {/* Role */}
                                            <div className="w-5 h-5 flex-shrink-0 opacity-50">
                                                <img src={ROLE_ICONS[p.role]} alt={p.role} />
                                            </div>
                                            
                                            {/* Photo */}
                                            <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden border border-gray-600 flex-shrink-0">
                                                <img 
                                                    src={p.photo || ROLE_ICONS[p.role]} 
                                                    className="w-full h-full object-cover transform scale-110 pt-1"
                                                    onError={(e) => (e.target as HTMLImageElement).src = ROLE_ICONS[p.role]} 
                                                />
                                            </div>

                                            {/* Info: Name & KDA */}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-gray-200 text-sm truncate">{p.name}</div>
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
                    {/* Decorative Background */}
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
        </div>
    );
};
