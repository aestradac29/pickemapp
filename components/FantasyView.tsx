import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { ROLE_ICONS, getFantasySchedule, COUNTRIES, normalizeSplitId } from '../constants';
import { Role, Player, Team, Match, FantasySlot, FantasyTeamState, Stage, User, PlayerGameStats } from '../types';
import { Save, RefreshCw, X, Shield, Zap, Coins, TrendingUp, TrendingDown, AlertTriangle, Swords, Search, ArrowLeft, User as UserIcon, Loader2, CheckCircle2, Crown, Info, Lock, Unlock, DollarSign, History, Layout, ListOrdered, Calendar, Eye, Target, Trophy, EyeOff, Medal, LogOut, RefreshCcw, LockKeyhole, Skull, Crosshair, Droplet } from 'lucide-react';
import { SearchableSelect, Option } from './ui/SearchableSelect';
import { dataService } from '../services/dataService';
import { fantasyService } from '../services/fantasyService';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

// Budget Constants
const MAX_BUDGET = 1500;

// --- RULES MODAL COMPONENT ---
const RulesModal = ({ onClose, selectedSplit }: { onClose: () => void, selectedSplit: string }) => {
    const normalizedSplit = normalizeSplitId(selectedSplit);
    const winBonus = normalizedSplit === 'spring_2026' ? 3 : 1;
    return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
        <div className="w-full max-w-2xl bg-[#091428] border-2 border-[#0ac8b9] rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#0f1d36] border-b border-[#0ac8b9]/30 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Info className="w-5 h-5 text-[#0ac8b9]" />
                    Sistema de Puntuación
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                
                {/* General Stats */}
                <div>
                    <h4 className="text-xs font-bold text-[#0ac8b9] uppercase tracking-widest mb-3 border-b border-[#0ac8b9]/20 pb-1">Estadísticas Base</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                        <div className="bg-black/20 p-2 rounded border border-gray-800 flex justify-between">
                            <span className="text-gray-400">Kill</span> <span className="text-green-400 font-bold">+1.5</span>
                        </div>
                        <div className="bg-black/20 p-2 rounded border border-gray-800 flex justify-between">
                            <span className="text-gray-400">Death</span> <span className="text-red-400 font-bold">-1.0</span>
                        </div>
                        <div className="bg-black/20 p-2 rounded border border-gray-800 flex justify-between">
                            <span className="text-gray-400">Assist</span> <span className="text-blue-400 font-bold">+1.0</span>
                        </div>
                        <div className="bg-black/20 p-2 rounded border border-gray-800 flex justify-between">
                            <span className="text-gray-400">CS</span> <span className="text-yellow-400 font-bold">+0.01</span>
                        </div>
                        <div className="bg-black/20 p-2 rounded border border-gray-800 flex justify-between col-span-2">
                            <span className="text-gray-400">Victoria (Game)</span> <span className="text-green-400 font-bold">+{winBonus}.0</span>
                        </div>
                    </div>
                </div>

                {/* Bonuses */}
                <div>
                    <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-3 border-b border-yellow-500/20 pb-1">Bonus y Multikills</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div className="bg-black/20 p-2 rounded border border-gray-800 flex justify-between">
                            <span className="text-gray-400">MVP Oficial</span> <span className="text-yellow-400 font-bold">+3.0</span>
                        </div>
                        <div className="bg-black/20 p-2 rounded border border-gray-800 flex justify-between">
                            <span className="text-gray-400">First Blood</span> <span className="text-red-400 font-bold">+1.0</span>
                        </div>
                        <div className="bg-black/20 p-2 rounded border border-gray-800 flex justify-between">
                            <span className="text-gray-400">High Kill (&gt;=10)</span> <span className="text-orange-400 font-bold">+3.0</span>
                        </div>
                        <div className="bg-black/20 p-2 rounded border border-gray-800 flex justify-between" title="0 Muertes y KDA >= 5">
                            <span className="text-gray-400">Perfect KDA</span> <span className="text-blue-400 font-bold">+3.0</span>
                        </div>
                        <div className="bg-black/20 p-2 rounded border border-gray-800 flex justify-between">
                            <span className="text-gray-400">Triple Kill</span> <span className="text-purple-300 font-bold">+2.0</span>
                        </div>
                        <div className="bg-black/20 p-2 rounded border border-gray-800 flex justify-between">
                            <span className="text-gray-400">Quadra Kill</span> <span className="text-purple-400 font-bold">+3.0</span>
                        </div>
                        <div className="bg-black/20 p-2 rounded border border-gray-800 flex justify-between col-span-1 sm:col-span-2">
                            <span className="text-gray-400">Penta Kill</span> <span className="text-purple-500 font-bold">+4.0</span>
                        </div>
                    </div>
                </div>

                {/* Roles */}
                <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-700 pb-1">Bonificaciones por Rol</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-6"><img src={ROLE_ICONS.TOP} className="w-4 h-4 opacity-70" /></div>
                            <div className="flex-1 bg-black/20 p-2 rounded border border-gray-800 flex flex-col gap-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-300">Daño Equipo &gt;= 25%</span>
                                    <span className="text-[#0ac8b9] font-bold">+3.0</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-500">
                                    <span>Turret Dmg &gt;= 5000</span>
                                    <span className="text-[#0ac8b9] font-bold">+1.5</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-500">
                                    <span>Min/Min &gt;= 8.5</span>
                                    <span className="text-[#0ac8b9] font-bold">+1.5</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6"><img src={ROLE_ICONS.JUNGLE} className="w-4 h-4 opacity-70" /></div>
                            <div className="flex-1 bg-black/20 p-2 rounded border border-gray-800 flex justify-between">
                                <span className="text-gray-300 flex flex-col">
                                    <span>Alma Dragón (Team &gt;= 4)</span>
                                    <span className="text-[10px] text-gray-500">Baron Nashor (Cada uno)</span>
                                </span>
                                <span className="text-[#0ac8b9] font-bold flex flex-col text-right">
                                    <span>+1.5</span>
                                    <span>+2.0</span>
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6"><img src={ROLE_ICONS.MID} className="w-4 h-4 opacity-70" /></div>
                            <div className="flex-1 bg-black/20 p-2 rounded border border-gray-800 flex flex-col gap-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-300">Daño Equipo &gt;= 30%</span>
                                    <span className="text-[#0ac8b9] font-bold">+3.0</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-500">
                                    <span>Turret Dmg &gt;= 5000</span>
                                    <span className="text-[#0ac8b9] font-bold">+1.5</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6"><img src={ROLE_ICONS.ADC} className="w-4 h-4 opacity-70" /></div>
                            <div className="flex-1 bg-black/20 p-2 rounded border border-gray-800 flex justify-between">
                                <span className="text-gray-300">Daño/Min &gt;= 1000</span>
                                <span className="text-[#0ac8b9] font-bold">+3.0</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6"><img src={ROLE_ICONS.SUPPORT} className="w-4 h-4 opacity-70" /></div>
                            <div className="flex-1 bg-black/20 p-2 rounded border border-gray-800 flex justify-between items-center">
                                <div className="text-gray-300 flex flex-col gap-1">
                                    <span>Asistencias &gt;= 10 <span className="text-[#0ac8b9] font-bold ml-1">+2.0</span></span>
                                    <span>Vision Score <span className="text-[#0ac8b9] font-bold ml-1">x0.03</span></span>
                                    <span>Primer Dragón <span className="text-[#0ac8b9] font-bold ml-1">+1.0</span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Playoffs Multipliers */}
                <div>
                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3 border-b border-red-500/20 pb-1">Fase Final (Playoffs)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                        <div className="bg-black/20 p-2 rounded border border-gray-800 flex flex-col items-center justify-center text-center">
                            <span className="text-gray-400 text-[10px] uppercase font-bold mb-1">Winners Bracket</span>
                            <span className="text-[#c8aa6e] font-bold text-lg">x1.15</span>
                            <span className="text-[9px] text-gray-600">Puntos Totales</span>
                        </div>
                        <div className="bg-black/20 p-2 rounded border border-gray-800 flex flex-col items-center justify-center text-center">
                            <span className="text-gray-400 text-[10px] uppercase font-bold mb-1">Losers Bracket</span>
                            <span className="text-gray-300 font-bold text-lg">x1.0</span>
                            <span className="text-[9px] text-gray-600">Sin Bonus</span>
                        </div>
                        <div className="bg-black/20 p-2 rounded border border-gray-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-yellow-500/5 animate-pulse"></div>
                            <span className="text-yellow-500 text-[10px] uppercase font-bold mb-1 relative z-10">Gran Final</span>
                            <span className="text-yellow-400 font-bold text-lg relative z-10">x1.25</span>
                            <span className="text-[9px] text-gray-500 relative z-10">Máximo Valor</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
);
};


// --- POINTS BREAKDOWN MODAL ---
interface BreakdownEntry { label: string; value: number; color: string; }

const PointsBreakdownModal = ({
    player, matches, isCaptain, onClose, roundLabel, teams
}: {
    player: Player;
    matches: Match[];
    isCaptain: boolean;
    onClose: () => void;
    roundLabel: string;
    teams: Record<string, Team>;
}) => {
    const teamInfo = teams[player.teamId];
    const teamColor = teamInfo?.color || '#0ac8b9';

    // Build per-match, per-game breakdown.
    // IMPORTANT: finalScore uses fantasyService.calculatePoints as the single source of truth
    // so it always matches the backend calculation exactly (correct winBonus, bracket mult, etc).
    // The entries array is built in parallel for display only — it mirrors the service logic
    // but the authoritative number shown is always the one from the service.
    const matchBreakdowns = matches
        .filter(m => m.games && m.games.length > 0)
        .map(m => {
            const teamA = typeof m.teamA === 'object' ? m.teamA : null;
            const teamB = typeof m.teamB === 'object' ? m.teamB : null;
            const opponent = teamA?.id === player.teamId ? teamB : teamA;

            const gameBreakdowns = (m.games || []).map((game, gi) => {
                const pStats = game.stats?.[player.id];
                if (!pStats) return null;
                const isWin = game.winnerId === player.teamId;

                // ── Source of truth: use the real service ──────────────────────
                const finalScore = fantasyService.calculatePoints(
                    { ...pStats, win: isWin } as any,
                    player.role,
                    false, // captain multiplier shown separately in footer
                    m.bracketStage,
                    m.stage,
                    m.splitId,
                    m.bestOf || 1
                );

                // ── Display entries (must mirror fantasyService logic exactly) ─
                const entries: BreakdownEntry[] = [];
                const splitNorm = normalizeSplitId(m.splitId || '');
                const winBonus = splitNorm === 'spring_2026' ? 3 : 1;

                if (isWin) entries.push({ label: 'Victoria', value: winBonus, color: 'text-green-400' });
                if (pStats.kills) entries.push({ label: `Kills (×${pStats.kills})`, value: pStats.kills * 1.5, color: 'text-red-400' });
                if (pStats.deaths) entries.push({ label: `Muertes (×${pStats.deaths})`, value: pStats.deaths * -1, color: 'text-gray-400' });
                if (pStats.assists) entries.push({ label: `Asistencias (×${pStats.assists})`, value: pStats.assists * 1, color: 'text-blue-400' });
                if (pStats.cs) entries.push({ label: `CS (${pStats.cs}×0.01)`, value: parseFloat((pStats.cs * 0.01).toFixed(2)), color: 'text-yellow-300' });
                if (pStats.isMvp) entries.push({ label: 'MVP', value: 3, color: 'text-yellow-400' });
                if (pStats.firstBlood) entries.push({ label: 'First Blood', value: 1, color: 'text-orange-400' });
                if (pStats.kills >= 10) entries.push({ label: 'High Kill (10+)', value: 3, color: 'text-red-500' });
                const kda = (pStats.kills + pStats.assists) / Math.max(1, pStats.deaths);
                if (pStats.deaths === 0 && kda >= 5) entries.push({ label: 'KDA Perfecto', value: 3, color: 'text-purple-400' });
                if (pStats.doubleKills) entries.push({ label: `Double Kill (×${pStats.doubleKills})`, value: pStats.doubleKills * 1, color: 'text-pink-400' });
                if (pStats.tripleKills) entries.push({ label: `Triple Kill (×${pStats.tripleKills})`, value: pStats.tripleKills * 2, color: 'text-pink-500' });
                if (pStats.quadraKills) entries.push({ label: `Quadra Kill (×${pStats.quadraKills})`, value: pStats.quadraKills * 3, color: 'text-fuchsia-400' });
                if (pStats.pentaKills) entries.push({ label: `Penta Kill (×${pStats.pentaKills})`, value: pStats.pentaKills * 4, color: 'text-fuchsia-500' });

                if (player.role === 'TOP' || player.role === Role.TOP) {
                    if (pStats.teamDamagePercentage >= 25) entries.push({ label: `Daño ≥25% (${pStats.teamDamagePercentage.toFixed(0)}%)`, value: 3, color: 'text-orange-300' });
                    if (pStats.turretDamage >= 5000) entries.push({ label: `Torreta ≥5000 (${pStats.turretDamage})`, value: 1.5, color: 'text-orange-300' });
                    if (pStats.minionsPerMinute >= 8.5) entries.push({ label: `MPM ≥8.5 (${pStats.minionsPerMinute?.toFixed(1)})`, value: 1.5, color: 'text-orange-300' });
                }
                if (player.role === 'JUNGLE' || player.role === Role.JUNGLE) {
                    if (pStats.dragonsKilled >= 4) entries.push({ label: `Alma Dragón (${pStats.dragonsKilled})`, value: 1.5, color: 'text-green-300' });
                    if (pStats.baronsKilled) entries.push({ label: `Barón (×${pStats.baronsKilled})`, value: pStats.baronsKilled * 2, color: 'text-purple-300' });
                }
                if (player.role === 'MID' || player.role === Role.MID) {
                    if (pStats.teamDamagePercentage >= 30) entries.push({ label: `Daño ≥30% (${pStats.teamDamagePercentage.toFixed(0)}%)`, value: 3, color: 'text-cyan-300' });
                    if (pStats.turretDamage >= 5000) entries.push({ label: `Torreta ≥5000 (${pStats.turretDamage})`, value: 1.5, color: 'text-cyan-300' });
                }
                if (player.role === 'ADC' || player.role === Role.ADC) {
                    if (pStats.damagePerMinute >= 1000) entries.push({ label: `DPM ≥1000 (${pStats.damagePerMinute?.toFixed(0)})`, value: 3, color: 'text-rose-300' });
                }
                if (player.role === 'SUPPORT' || player.role === Role.SUPPORT) {
                    if (pStats.assists >= 10) entries.push({ label: `Asist. ≥10 (${pStats.assists})`, value: 2, color: 'text-teal-300' });
                    if (pStats.firstDragon) entries.push({ label: 'Primer Dragón', value: 1, color: 'text-teal-300' });
                    if (pStats.visionScore) entries.push({ label: `Visión (${pStats.visionScore}×0.03)`, value: parseFloat((pStats.visionScore * 0.03).toFixed(2)), color: 'text-teal-300' });
                }

                // Bracket multiplier (for display annotation only — value already in finalScore)
                let bracketMult = 1.0;
                if (m.stage === Stage.FINALS || m.bracketStage === 'finals') bracketMult = 1.25;
                else if (m.stage === Stage.PLAYOFFS) bracketMult = m.bracketStage === 'winners' ? 1.15 : 1.0;

                // Spring BO5 scaling (for display annotation)
                const isSpringBo5 = splitNorm === 'spring_2026' && (m.bestOf || 1) === 5;

                return {
                    gameIndex: gi + 1,
                    isWin,
                    entries,
                    bracketMult,
                    isSpringBo5,
                    finalScore, // authoritative value from fantasyService
                    stats: pStats
                };
            }).filter(Boolean);

            if (gameBreakdowns.length === 0) return null;

            const matchTotal = gameBreakdowns.reduce((a, g) => a + (g?.finalScore || 0), 0);
            return { match: m, opponent, gameBreakdowns, matchTotal };
        }).filter(Boolean);

    const grandTotal = matchBreakdowns.reduce((a, m) => a + (m?.matchTotal || 0), 0);
    const captainTotal = isCaptain ? grandTotal * 1.5 : grandTotal;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div
                className="relative bg-[#0a1428] border border-gray-700 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
                style={{ borderColor: teamColor + '60' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-[#0a1428] border-b border-gray-800 px-5 py-4 flex items-center justify-between rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        {teamInfo?.logo && <img src={teamInfo.logo} alt="" className="w-7 h-7 object-contain" />}
                        <div>
                            <h3 className="text-white font-black text-base leading-none">{player.name}</h3>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">{roundLabel} · Desglose</span>
                        </div>
                        {isCaptain && (
                            <div className="flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full px-2 py-0.5">
                                <Crown className="w-3 h-3 text-yellow-400 fill-current" />
                                <span className="text-[9px] text-yellow-400 font-bold">CAPITÁN ×1.5</span>
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-800 text-gray-500 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {matchBreakdowns.length === 0 ? (
                        <div className="text-center text-gray-500 py-8 text-sm">Sin datos de partidos para esta jornada.</div>
                    ) : (
                        matchBreakdowns.map((mb, mi) => mb && (
                            <div key={mi} className="bg-[#0f1923] rounded-xl border border-gray-800 overflow-hidden">
                                {/* Match header */}
                                <div className="flex items-center justify-between px-4 py-2.5 bg-black/30 border-b border-gray-800">
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                                        {mb.opponent?.logo && <img src={mb.opponent.logo} alt="" className="w-5 h-5 object-contain" />}
                                        <span>vs {mb.opponent?.shortName || mb.opponent?.name || '?'}</span>
                                        {mb.match.bestOf && mb.match.bestOf > 1 && (
                                            <span className="text-[9px] text-gray-600 border border-gray-700 rounded px-1">BO{mb.match.bestOf}</span>
                                        )}
                                    </div>
                                    <span className="text-sm font-black" style={{ color: teamColor }}>
                                        {mb.matchTotal.toFixed(2)} pts
                                    </span>
                                </div>

                                {/* Games */}
                                <div className="divide-y divide-gray-800/60">
                                    {mb.gameBreakdowns.map((gb, gi) => gb && (
                                        <div key={gi} className="px-4 py-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-bold text-gray-500 uppercase">Juego {gb.gameIndex}</span>
                                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${gb.isWin ? 'bg-green-900/40 text-green-400 border border-green-700/50' : 'bg-red-900/40 text-red-400 border border-red-700/50'}`}>
                                                        {gb.isWin ? 'Victoria' : 'Derrota'}
                                                    </span>
                                                    <span className="text-[9px] text-gray-600">{gb.stats.kills}/{gb.stats.deaths}/{gb.stats.assists}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {gb.bracketMult > 1 && (
                                                        <span className="text-[9px] text-[#c8aa6e] border border-[#c8aa6e]/30 rounded px-1 font-bold">×{gb.bracketMult}</span>
                                                    )}
                                                    <span className="text-sm font-black text-white">{gb.finalScore.toFixed(2)}</span>
                                                </div>
                                            </div>
                                            {/* Breakdown rows */}
                                            <div className="space-y-0.5">
                                                {gb.entries.map((entry, ei) => (
                                                    <div key={ei} className="flex items-center justify-between text-[11px]">
                                                        <span className="text-gray-500">{entry.label}</span>
                                                        <span className={`font-bold tabular-nums ${entry.color}`}>
                                                            {entry.value > 0 ? '+' : ''}{entry.value.toFixed(2)}
                                                        </span>
                                                    </div>
                                                ))}
                                                {(gb.bracketMult > 1 || gb.isSpringBo5) && (
                                                    <div className="mt-1 pt-1 border-t border-gray-800 space-y-0.5">
                                                        {gb.bracketMult > 1 && (
                                                            <div className="flex items-center justify-between text-[11px]">
                                                                <span className="text-[#c8aa6e]/70">Multiplicador bracket</span>
                                                                <span className="text-[#c8aa6e] font-bold">×{gb.bracketMult}</span>
                                                            </div>
                                                        )}
                                                        {gb.isSpringBo5 && (
                                                            <div className="flex items-center justify-between text-[11px]">
                                                                <span className="text-blue-400/70">Ajuste BO5 Spring (×3/5)</span>
                                                                <span className="text-blue-400 font-bold">×0.6</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer totals */}
                <div className="sticky bottom-0 bg-[#0a1428] border-t border-gray-800 px-5 py-3 rounded-b-2xl">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>Subtotal</span>
                                <span className="text-gray-300 font-bold">{grandTotal.toFixed(2)} pts</span>
                            </div>
                            {isCaptain && (
                                <div className="flex items-center gap-2 text-xs text-yellow-500/80">
                                    <Crown className="w-3 h-3 fill-current" />
                                    <span>×1.5 capitán</span>
                                </div>
                            )}
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-gray-500 uppercase block">Total Jornada</span>
                            <span className="text-2xl font-black" style={{ color: teamColor }}>
                                {captainTotal.toFixed(1)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface PlayerCardProps {
  role: Role;
  slot: FantasySlot | null;
  onSelect: (role: Role, playerId: string | null) => void;
  onSetCaptain: (playerId: string) => void;
  isCaptain: boolean;
  readOnly?: boolean;
  players: Player[];
  teams: Record<string, Team>;
  opponents: Team[]; 
  locked: boolean;
  roundPoints?: number; // New prop: Points specific to the selected round
  roundLabel?: string;  // New prop: Label for the round
  isHistorical?: boolean; // New prop: If true, show strictly purchaseCost
  roundMatches?: Match[]; // Matches for the current round (for breakdown)
  onShowBreakdown?: (playerId: string) => void; // Callback to show breakdown modal
}

const PlayerCard: React.FC<PlayerCardProps> = ({ 
    role, slot, onSelect, onSetCaptain, isCaptain, readOnly = false, 
    players, teams, opponents, locked, roundPoints, roundLabel, isHistorical = false, roundMatches, onShowBreakdown
}) => {
  const playerId = slot?.playerId;
  const player = players.find(p => p.id === playerId);
  const teamInfo = player ? teams[player.teamId] : null;
  const teamColor = teamInfo?.color || '#0ac8b9';
  const [imgError, setImgError] = useState(false);
  
  React.useEffect(() => { setImgError(false); }, [playerId]);

  const options: Option[] = useMemo(() => {
      return players.filter(p => p.role === role).map(p => {
        const t = teams[p.teamId];
        return {
          id: p.id,
          label: `${p.name} ($${p.cost})`, 
          subLabel: t ? t.name : 'Unknown',
          image: p.photo || ROLE_ICONS[role],
          color: t?.color
        };
      });
  }, [role, players, teams]);

  // LOGICA DE PRECIOS
  const legacyPreviousPrice = (player?.cost || 0) - (player?.priceChange || 0);
  const storedCost = slot?.purchaseCost || legacyPreviousPrice || player?.cost || 0;
  const currentMarketCost = player?.cost || 0;
  
  let effectiveCost = 0;
  if (playerId) {
      if (isHistorical) {
          // If historical, strictly show what was paid/stored.
          // Fallback to storedCost (which falls back to current if missing in legacy data)
          effectiveCost = storedCost; 
      } else {
          // Active or Future round: Apply "Best Price" logic
          // Regla: Pagas el MÍNIMO entre tu precio guardado y el precio actual.
          effectiveCost = Math.min(storedCost, currentMarketCost);
      }
  }
  
  // Tienes "Valor Protegido" SOLO si NO es histórico y tu coste efectivo es MENOR que el mercado.
  const isValueProtected = !isHistorical && playerId && effectiveCost < currentMarketCost;
  const savings = currentMarketCost - effectiveCost;

  // Price Trend (Visual indicators only)
  const priceChange = player?.priceChange || 0;
  const isPriceUp = priceChange >= 0;

  // Country Name for Tooltip
  const countryName = player?.country 
    ? (COUNTRIES.find(c => c.code === player.country)?.name || player.country) 
    : '';

  // Points display logic: roundPoints if available (context aware), otherwise '-'
  const displayPoints = roundPoints !== undefined ? roundPoints.toFixed(1) : '-';
  const hasPlayedRound = roundPoints !== undefined && roundPoints !== 0;

  return (
    <div className="relative group perspective-1000 hover:z-50 h-full w-full">
      <div className={`
        relative rounded-2xl border-2 transition-all duration-500 min-h-[500px] flex flex-col h-full
        ${playerId 
          ? `overflow-hidden border-transparent bg-[#0a1428] shadow-[0_0_20px_rgba(0,0,0,0.5)] ${isCaptain ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-[#0a1428] shadow-[0_0_30px_rgba(234,179,8,0.3)]' : ''}` 
          : 'border-dashed border-gray-700 bg-[#091428]/50'
        }
        ${!readOnly && !playerId && !locked ? 'hover:border-[#0ac8b9]/50' : ''}
        ${isValueProtected ? 'ring-1 ring-green-500/50' : ''} 
      `}
      style={playerId ? { borderColor: isCaptain ? '#facc15' : (isValueProtected ? '#22c55e' : teamColor) } : {}}
      >
        {/* Role Icon */}
        <div className="absolute top-3 right-3 z-20 p-1.5 bg-black/40 rounded-full border border-white/10 backdrop-blur-sm">
           <img src={ROLE_ICONS[role]} alt={role} className="w-5 h-5 opacity-80" />
        </div>

        {/* Captain Button */}
        {playerId && !readOnly && !locked && !isHistorical && (
            <button 
                onClick={(e) => { e.stopPropagation(); onSetCaptain(playerId); }}
                className={`absolute top-3 left-3 z-30 p-2 rounded-full transition-all duration-300 transform hover:scale-110 ${isCaptain ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.6)]' : 'bg-black/40 text-gray-500 border border-gray-600 hover:text-yellow-400 hover:border-yellow-400'}`}
                title="Hacer Capitán"
            >
                <Crown className={`w-4 h-4 ${isCaptain ? 'fill-current' : ''}`} />
            </button>
        )}
        
        {/* Read-only Captain Badge */}
        {playerId && (readOnly || locked || isHistorical) && isCaptain && (
             <div className="absolute top-3 left-3 z-30 bg-yellow-500 text-black px-2 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 shadow-[0_0_15px_rgba(234,179,8,0.6)]">
                 <Crown className="w-3 h-3 fill-current" />
                 <span>Capi</span>
             </div>
        )}

        {playerId && player && teamInfo ? (
          <>
            {/* Background Glow */}
            <div className="absolute inset-0 opacity-20 bg-gradient-to-b from-transparent to-black" style={{ backgroundColor: teamColor }} />
            
            {/* Team Logo Background */}
            <div className="absolute -right-10 top-20 opacity-10 rotate-12 pointer-events-none transform scale-150">
               {teamInfo.logo && <img src={teamInfo.logo} alt="" className="w-48 h-48 opacity-50 grayscale" />}
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center flex-1 w-full px-3 pt-8 pb-3">
               
               {/* Player Image */}
               <div className="relative mb-3 group-hover:scale-105 transition-transform duration-300">
                  <div className="absolute inset-0 rounded-full blur-md opacity-50" style={{ backgroundColor: teamColor }}></div>
                  <img 
                      src={imgError ? ROLE_ICONS[role] : (player.photo || ROLE_ICONS[role])} 
                      alt={player.name}
                      onError={() => setImgError(true)}
                      className={`w-24 h-24 rounded-full border-4 shadow-xl relative z-10 object-cover bg-gray-900 ${!player.photo || imgError ? 'p-4 bg-black/50' : ''}`}
                      style={{ borderColor: teamColor }}
                  />
                  
                  {/* Team Logo (Bottom Right) */}
                  <div className="absolute -bottom-1 -right-1 bg-[#0a1428] rounded-full p-1 border border-gray-600 z-20 shadow-lg" title={teamInfo.name}>
                      {teamInfo.logo ? <img src={teamInfo.logo} alt="" className="w-6 h-6 rounded-full object-contain" /> : <div className="w-6 h-6 rounded-full" style={{ backgroundColor: teamColor }}></div>}
                  </div>

                  {/* Country Flag (Bottom Left) */}
                  {player.country && (
                      <div className="absolute -bottom-1 -left-1 bg-[#0a1428] rounded-full p-1 border border-gray-600 z-20 shadow-lg" title={countryName}>
                          <img 
                              src={`https://flagcdn.com/w40/${player.country.toLowerCase()}.png`}
                              srcSet={`https://flagcdn.com/w80/${player.country.toLowerCase()}.png 2x`}
                              alt={countryName}
                              className="w-6 h-6 rounded-full object-cover"
                          />
                      </div>
                  )}
               </div>

               {/* Name & Team */}
               <div className="flex flex-col items-center justify-center w-full mb-2">
                   <h3 className="text-xl font-black text-white tracking-tight text-center leading-none drop-shadow-md truncate max-w-full px-1 italic">{player.name}</h3>
                   <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">{teamInfo.name}</span>
               </div>

               {/* VS MATCHUPS ROW */}
               <div className="w-full flex justify-center gap-1 mb-3 flex-wrap">
                   {opponents.length > 0 ? (
                       opponents.map((opp, idx) => (
                           <div key={idx} className="bg-black/60 border border-gray-700 p-1 rounded backdrop-blur-sm flex items-center justify-center w-6 h-6" title={opp.id === 'tbd' ? 'Por Definir' : `vs ${opp.name}`}>
                               {opp.id === 'tbd' ? (
                                   <span className="text-[8px] font-bold text-gray-500">TBD</span>
                               ) : opp.logo ? (
                                   <img src={opp.logo} className="w-4 h-4 object-contain" />
                               ) : (
                                   <div className="w-4 h-4 rounded-full" style={{backgroundColor: opp.color}}></div>
                               )}
                           </div>
                       ))
                   ) : (
                       <div className="px-2 py-1 rounded border border-gray-800 bg-gray-900/50 text-[9px] text-gray-600 uppercase font-bold">Sin Partidos</div>
                   )}
               </div>

                {/* SELL BUTTON (MOVED HERE) */}
                {!readOnly && !locked && !isHistorical && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onSelect(role, null); }}
                        className={`w-full py-1.5 mb-3 text-[10px] font-bold uppercase tracking-wider rounded border transition-all flex items-center justify-center gap-1.5
                            ${isValueProtected
                                ? 'bg-red-900/40 text-red-200 border-red-500/50 hover:bg-red-600 hover:text-white hover:border-red-400 animate-pulse'
                                : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-red-900/30 hover:text-red-300 hover:border-red-500/50'
                            }`}
                        title={isValueProtected ? "¡CUIDADO! Si vendes y guardas, perderás el precio protegido." : "Vender jugador"}
                    >
                        <X className="w-3 h-3" />
                        Vender
                    </button>
                )}

               {/* STATS GRID */}
               <div className="w-full mt-auto space-y-1.5">
                  
                  {/* DYNAMIC: POINTS FOR SELECTED ROUND */}
                  <div
                      className={`bg-[#0f1923] p-1.5 rounded border flex flex-col items-center justify-center h-[40px] relative overflow-hidden transition-colors duration-300 ${hasPlayedRound && onShowBreakdown ? 'border-gray-600 cursor-pointer hover:border-[#0ac8b9]/60 hover:bg-[#0ac8b9]/5 group/pts' : 'border-gray-700'}`}
                      onClick={hasPlayedRound && onShowBreakdown && playerId ? () => onShowBreakdown(playerId) : undefined}
                      title={hasPlayedRound ? 'Ver desglose de puntos' : undefined}
                  >
                      <span className="text-[8px] text-gray-500 uppercase font-bold tracking-wider mb-0.5 flex items-center gap-1">
                          {roundLabel || 'Puntos Jornada'}
                          {hasPlayedRound && onShowBreakdown && <Info className="w-2.5 h-2.5 opacity-0 group-hover/pts:opacity-100 text-[#0ac8b9] transition-opacity" />}
                      </span>
                      <div className="flex items-center gap-1">
                          <span className={`text-lg font-bold leading-none ${hasPlayedRound ? 'text-white' : 'text-gray-600'}`}>
                              {displayPoints}
                          </span>
                          {isCaptain && <span className="text-[8px] text-yellow-500 bg-yellow-900/20 px-1 rounded border border-yellow-700/50">x1.5</span>}
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                      
                      {/* Price Box with Protection Indicator */}
                      <div className={`bg-[#0f1923] p-1.5 rounded border flex flex-col items-center justify-center relative overflow-hidden h-[50px] ${isValueProtected ? 'border-green-500 bg-green-900/10' : 'border-gray-700'}`}>
                          <span className="text-[8px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">
                              {isValueProtected ? 'Tu Coste' : 'Coste'}
                          </span>
                          <div className="flex items-center gap-1">
                              <span className={`text-sm font-bold ${isValueProtected ? 'text-green-400' : 'text-[#0ac8b9]'}`}>${effectiveCost}</span>
                              
                              {/* If price went up since purchase, show indicator (Active only) */}
                              {isValueProtected && !locked && (
                                  <div className="absolute top-0 right-0 p-0.5 bg-green-500/20 rounded-bl text-[8px] text-green-300 font-bold flex items-center" title={`PRECIO CONGELADO: Te ahorras $${savings} porque fichaste antes de la subida.`}>
                                      <LockKeyhole className="w-2 h-2 mr-0.5" />
                                      -${savings}
                                  </div>
                              )}

                              {/* Standard Trend (If not protected or locked or historical) */}
                              {!isValueProtected && !locked && !isHistorical && (
                                  <div className={`flex flex-col items-center text-[8px] leading-none font-bold ${isPriceUp ? 'text-green-400' : 'text-red-400'}`}>
                                      {isPriceUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                      <span>{Math.abs(priceChange)}</span>
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* Total Points */}
                      <div className="bg-[#0f1923] p-1.5 rounded border border-gray-700 flex flex-col items-center justify-center h-[50px]">
                          <span className="text-[8px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Total Pts</span>
                          <span className="text-sm font-bold text-[#c8aa6e]">{player.totalPoints?.toFixed(1) || '0.0'}</span>
                      </div>

                      {/* KDA Box */}
                      <div className="bg-[#0f1923] p-1.5 rounded border border-gray-700 flex flex-col items-center justify-center h-[50px]">
                          <span className="text-[8px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">KDA</span>
                          <span className="text-sm font-bold text-red-400">
                              {player.kda?.toFixed(2) || '0.00'}
                          </span>
                      </div>

                      {/* Highlights Box */}
                      <div className="bg-[#0f1923] p-1.5 rounded border border-gray-700 flex flex-col items-center justify-center h-[50px] overflow-hidden">
                          <span className="text-[8px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Destacado</span>
                          {player.highlight ? (
                              <span className="text-[9px] font-bold text-purple-300 bg-purple-900/30 px-1.5 py-0.5 rounded border border-purple-500/30 truncate max-w-full">
                                  {player.highlight}
                              </span>
                          ) : (
                              <span className="text-xs text-gray-600">-</span>
                          )}
                      </div>
                  </div>
                  
                  {/* Market Price Context (Only if protected) - REMOVED LINE-THROUGH */}
                  {isValueProtected && !locked && (
                      <div className="text-[9px] text-center text-gray-400 font-mono bg-black/40 rounded py-0.5 border border-gray-800">
                          Precio actual en tienda: <span className="text-red-400">${currentMarketCost}</span>
                      </div>
                  )}
               </div>
            </div>
          </>
        ) : (
          // EMPTY SLOT
          <div className="flex-1 flex flex-col items-center justify-center p-4">
             <div className="w-20 h-20 rounded-full bg-[#0a1428] border-2 border-dashed border-gray-700 flex items-center justify-center mb-4 shadow-inner group-hover:border-[#0ac8b9] transition-colors">
               <Shield className="w-8 h-8 text-gray-700 group-hover:text-[#0ac8b9] transition-colors" />
             </div>
             <h4 className="text-[#0ac8b9] text-lg font-bold uppercase tracking-widest mb-1">{role}</h4>
             <p className="text-gray-500 text-xs text-center mb-6">
                {readOnly || locked || isHistorical ? 'Sin selección' : 'Selecciona un jugador'}
             </p>
             
             {!readOnly && !locked && !isHistorical && (
               <div className="w-full relative z-30">
                 <SearchableSelect 
                    label="" 
                    options={options}
                    value=""
                    onChange={(val) => onSelect(role, val)}
                    placeholder="Fichar..."
                    className="w-full"
                 />
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- RANKING ROW COMPONENT ---
interface RankingRowProps {
    user: User;
    rank: number;
    score: number;
    isMe: boolean;
    isViewing: boolean;
    onClick: () => void;
}

const RankingRow: React.FC<RankingRowProps> = ({ user, rank, score, isMe, isViewing, onClick }) => (
    <div
        onClick={onClick}
        className={`
            relative flex items-center gap-3 px-4 py-3 border-b border-gray-800/60
            cursor-pointer transition-all duration-150
            ${isViewing ? 'bg-[#0ac8b9]/8' : 'hover:bg-[#0f1923]'}
            ${isMe ? 'bg-gradient-to-r from-[#0ac8b9]/6 to-transparent' : ''}
        `}
    >
        {/* Active indicator */}
        {isViewing && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#0ac8b9] rounded-full" />}

        {/* Rank badge */}
        <div className="w-7 flex-shrink-0 text-center">
            {rank === 1
                ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 font-black text-xs">1</span>
                : rank === 2
                ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-500/20 border border-slate-500/30 text-slate-300 font-black text-xs">2</span>
                : rank === 3
                ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 border border-amber-700/30 text-amber-600 font-black text-xs">3</span>
                : <span className="text-gray-600 font-bold text-sm">{rank}</span>
            }
        </div>

        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full overflow-hidden border flex-shrink-0 ${rank === 1 ? 'border-yellow-400/60' : isMe ? 'border-[#0ac8b9]/60' : 'border-gray-700/60'}`}>
            <img src={user.avatar} className="w-full h-full object-cover" alt="" />
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
            <span className={`font-bold text-sm truncate block ${isMe ? 'text-[#0ac8b9]' : 'text-gray-200'}`}>
                {user.name}
            </span>
            {isMe && <span className="text-[9px] text-[#0ac8b9]/70 font-bold uppercase tracking-wider">Tú</span>}
        </div>

        {/* Score */}
        <div className={`text-base font-black flex-shrink-0 ${rank === 1 ? 'text-yellow-400' : isMe ? 'text-[#0ac8b9]' : 'text-gray-300'}`}>
            {score.toFixed(1)}
        </div>
    </div>
);

export const FantasyView: React.FC<{ 
    currentUserId?: string | null; 
    isAdmin?: boolean; 
    emailVerified?: boolean;
    selectedSplit: string 
}> = ({ currentUserId, isAdmin, emailVerified, selectedSplit }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isTeamLoading, setIsTeamLoading] = useState(false);

  const [activeConfigRound, setActiveConfigRound] = useState(1);
  const [viewRoundId, setViewRoundId] = useState(1);
  const [roundLocked, setRoundLocked] = useState(false);

  const [activeTab, setActiveTab] = useState<'lineup' | 'history'>('lineup');
  const [viewingUserId, setViewingUserId] = useState<string | null>(currentUserId || null);
  // Refs para acceder a los IDs actuales desde dentro del closure de subscribeToUsers sin dependencias
  const viewingUserIdRef = useRef(viewingUserId);
  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => { viewingUserIdRef.current = viewingUserId; }, [viewingUserId]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);
  const [isAdminSaving, setIsAdminSaving] = useState(false);
  const [debugLogs, setDebugLogs] = useState<any[]>([]);
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const [pendingRoundChange, setPendingRoundChange] = useState<number | null>(null);
  const [showRules, setShowRules] = useState(false);

  // Current Working Team
  const [myTeam, setMyTeam] = useState<Record<Role, FantasySlot>>({
    [Role.TOP]: {playerId:null}, [Role.JUNGLE]: {playerId:null}, [Role.MID]: {playerId:null}, [Role.ADC]: {playerId:null}, [Role.SUPPORT]: {playerId:null}
  });
  
  // ORIGINAL Team Snapshot (Loaded from DB)
  // This is used to check if we "owned" the player at the start of the session to restore their protected price.
  const [originalTeam, setOriginalTeam] = useState<Record<Role, FantasySlot> | null>(null);

  const [myCaptain, setMyCaptain] = useState<string | null>(null);
  const [breakdownPlayerId, setBreakdownPlayerId] = useState<string | null>(null);
  
  const [historyScores, setHistoryScores] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);

  const loadHistory = useCallback(async (userId: string) => {
      const history = [];
      const schedule = getFantasySchedule(selectedSplit);
      for (const roundConfig of schedule) {
          const i = roundConfig.id;
          const rData = await dataService.getFantasyTeam(userId, i, selectedSplit);
          if (rData) history.push({ round: i, score: rData.score || 0, team: rData.team });
          else history.push({ round: i, score: 0, team: null });
      }
      setHistoryScores(history);
  }, [selectedSplit]);

  const loadFantasyTeam = useCallback(async (round: number, userId: string) => {
      const savedData = await dataService.getFantasyTeam(userId, round, selectedSplit);
      if (savedData) {
          setMyTeam(savedData.team);
          setOriginalTeam(savedData.team); // Save snapshot for price restoration logic
          setMyCaptain(savedData.captain || null);
      } else {
          setMyTeam({[Role.TOP]: {playerId:null}, [Role.JUNGLE]: {playerId:null}, [Role.MID]: {playerId:null}, [Role.ADC]: {playerId:null}, [Role.SUPPORT]: {playerId:null}});
          setOriginalTeam(null);
          setMyCaptain(null);
      }
    }, [selectedSplit]);

  const loadData = useCallback(async () => {
    setIsLoadingData(true);
    try {
        // Cargamos datos base (jugadores, equipos, partidos, config) y usuarios en paralelo.
        // getAllUsers es costoso — se hace en paralelo para no bloquear el resto.
        const [fetchedPlayers, fetchedTeams, fetchedMatches, config, fetchedUsers] = await Promise.all([
            dataService.getPlayers(false, selectedSplit),
            dataService.getTeams(false, selectedSplit),
            dataService.getMatches(undefined, selectedSplit),
            dataService.getDaysConfig(selectedSplit),
            dataService.getAllUsers(selectedSplit)
        ]);
        
        setPlayers(fetchedPlayers);
        setTeams(fetchedTeams);
        setAllMatches(fetchedMatches);
        setAllUsers(fetchedUsers);
        
        const currentRound = config.fantasyRound || 1;
        setActiveConfigRound(currentRound);
        setViewRoundId(currentRound);
        setRoundLocked(config.fantasyLocked || false);

        // viewingUserId se inicializa aquí solo si es la primera carga
        if (currentUserId && !viewingUserId) {
            setViewingUserId(currentUserId);
        }
        // loadHistory se dispara desde su propio useEffect al cambiar viewingUserId/activeTab
        // NO lo llamamos aquí para no duplicar trabajo
    } catch (err) {
        console.error(err);
    } finally {
        setIsLoadingData(false);
    }
  // viewingUserId y loadHistory intencionalmente excluidos — cada uno tiene su propio efecto
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, selectedSplit]);

  useEffect(() => {
    loadData();
  }, [currentUserId, selectedSplit]);

  // Cargar historial cuando los datos base están listos (primera carga o cambio de split)
  useEffect(() => {
      if (!isLoadingData) {
          const uid = viewingUserId || currentUserId;
          if (uid) loadHistory(uid);
      }
  // Solo cuando isLoadingData pasa a false — no en cada render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingData]);

  useEffect(() => {
    // subscribeToUsers dispara cuando cualquier usuario cambia en Firestore.
    // Llamar loadData() completo aquí es muy costoso (getAllUsers + todo lo demás).
    // Solo refrescamos la config de ronda activa y si estamos viendo nuestro propio equipo
    // recargamos el historial — nada más.
    let timeoutId: any;
    const unsubscribe = dataService.subscribeToUsers(() => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
            try {
                const config = await dataService.getDaysConfig(selectedSplit);
                const newRound = config.fantasyRound || 1;
                setActiveConfigRound(newRound);
                setRoundLocked(config.fantasyLocked || false);
                // Solo refrescar historial del usuario actual, no recargar todo
                const uid = viewingUserIdRef.current || currentUserIdRef.current;
                if (uid) await loadHistory(uid);
            } catch (_) {}
        }, 1500);
    });
    return () => {
        if (unsubscribe) unsubscribe();
        if (timeoutId) clearTimeout(timeoutId);
    };
  // selectedSplit, loadHistory son estables; refs para evitar stale closures
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSplit]);

  useEffect(() => {
      if (currentUserId && !viewingUserId) {
          setViewingUserId(currentUserId);
      }
  }, [currentUserId, viewingUserId]);

  // dataReadyRef: true una vez que loadData ha terminado la primera carga.
  // Evita que el efecto de carga del equipo se dispare dos veces durante el mount
  // (una vez con isLoadingData=true→false y otra al cambiar viewRoundId).
  const dataReadyRef = useRef(false);
  useEffect(() => {
      if (!isLoadingData) dataReadyRef.current = true;
  }, [isLoadingData]);

  useEffect(() => {
      if (!viewingUserId || !dataReadyRef.current) return;
      let cancelled = false;
      const fetchTeam = async () => {
          setIsTeamLoading(true);
          setMyTeam({
              [Role.TOP]: {playerId:null},
              [Role.JUNGLE]: {playerId:null},
              [Role.MID]: {playerId:null},
              [Role.ADC]: {playerId:null},
              [Role.SUPPORT]: {playerId:null}
          });
          setOriginalTeam(null);
          setMyCaptain(null);
          setValidationError(null);
          try {
              await loadFantasyTeam(viewRoundId, viewingUserId);
          } catch (e) {
              if (!cancelled) console.error(e);
          } finally {
              if (!cancelled) setIsTeamLoading(false);
          }
      };
      fetchTeam();
      return () => { cancelled = true; };
  }, [viewRoundId, viewingUserId, loadFantasyTeam]);

  // NEW: Calculate Points for Specific Selected Round
  // Matches relevant to the currently viewed round (reused by both roundPointsMap and breakdown)
  const roundMatches = useMemo(() => {
      const roundConfig = getFantasySchedule(selectedSplit).find(r => r.id === viewRoundId);
      if (!roundConfig || allMatches.length === 0) return [];
      return allMatches.filter(m => {
          const isCorrectStage = roundConfig.stage === Stage.GROUPS
              ? m.stage === Stage.GROUPS
              : m.stage !== Stage.GROUPS;
          return isCorrectStage &&
                 roundConfig.matchdays.includes(m.day || 0) &&
                 (m.isCompleted || !!m.stats);
      });
  }, [allMatches, viewRoundId, selectedSplit]);

  const roundPointsMap = useMemo(() => {
      const map: Record<string, number> = {};
      
      if (roundMatches.length === 0) return map;

      // Sum points across ALL relevant matches in the round.
      // A player can appear in multiple matches within the same jornada (e.g. spring split
      // where a round spans several matchdays), so we accumulate rather than overwrite.
      roundMatches.forEach(match => {
          if (match.stats) {
              Object.values(match.stats).forEach((stat: PlayerGameStats) => {
                  if (!map[stat.playerId]) map[stat.playerId] = 0;
                  map[stat.playerId] += stat.totalPoints;
              });
          }
      });

      return map;
  }, [roundMatches]);


  // Cargar historial solo cuando se abre la pestaña de historial
  // (el cambio de viewingUserId para lineup ya lo maneja el efecto de loadFantasyTeam)
  const prevTabRef = useRef<string>('lineup');
  useEffect(() => {
      const switchedToHistory = activeTab === 'history' && prevTabRef.current !== 'history';
      prevTabRef.current = activeTab;
      if (viewingUserId && switchedToHistory) {
          loadHistory(viewingUserId);
      }
  }, [viewingUserId, activeTab, loadHistory]);

  const handleSelect = (role: Role, playerId: string | null) => {
    if (viewingUserId !== currentUserId || roundLocked || viewRoundId !== activeConfigRound) return;
    
    // Logic for Price Persistence
    let costToUse = 0;
    const player = players.find(p => p.id === playerId);

    if (playerId && player) {
        costToUse = player.cost; 

        if (originalTeam) {
            const originalSlot = (Object.values(originalTeam) as FantasySlot[]).find(slot => slot.playerId === playerId);
            if (originalSlot && originalSlot.purchaseCost) {
                costToUse = originalSlot.purchaseCost;
            }
        }
    }
    
    setMyTeam(prev => ({ 
        ...prev, 
        [role]: { 
            playerId, 
            purchaseCost: costToUse
        } 
    }));

    if (!playerId && myCaptain && myTeam[role].playerId === myCaptain) {
        setMyCaptain(null);
    }
    setSaveStatus('idle');
    setValidationError(null);
  };

  const handleSetCaptain = (playerId: string) => {
      if (viewingUserId === currentUserId && !roundLocked && viewRoundId === activeConfigRound) {
          setMyCaptain(playerId);
          setValidationError(null);
          setSaveStatus('idle');
      }
  };

  const getEffectiveCost = (slot: FantasySlot) => {
      if (!slot.playerId) return 0;
      const player = players.find(p => p.id === slot.playerId);
      if (!player) return 0;
      
      const marketCost = player.cost;
      const legacyPreviousPrice = marketCost - (player.priceChange || 0);
      const storedCost = slot.purchaseCost || legacyPreviousPrice || marketCost;
      
      // If viewing past round, we return storedCost strictly
      if (viewRoundId < activeConfigRound) {
          return storedCost;
      }

      return Math.min(storedCost, marketCost);
  };

  const handleSave = async () => {
    setValidationError(null); 
    if (!currentUserId || viewingUserId !== currentUserId || roundLocked || viewRoundId !== activeConfigRound) return;
    
    if (!myCaptain) {
        setValidationError("⚠️ Debes seleccionar un Capitán para tu equipo antes de guardar.");
        setSaveStatus('idle');
        return;
    }

    let currentTotalCost = 0;
    (Object.values(myTeam) as FantasySlot[]).forEach(slot => {
        currentTotalCost += getEffectiveCost(slot);
    });

    if (currentTotalCost > MAX_BUDGET) {
        setValidationError("Presupuesto excedido. No se puede guardar.");
        setSaveStatus('idle');
        return;
    }

    setIsSaving(true);
    setSaveStatus('idle');

    const teamToSave: Record<Role, FantasySlot> = { ...myTeam };
    (Object.keys(teamToSave) as Role[]).forEach(role => {
        const slot = teamToSave[role];
        if (slot.playerId) {
            const player = players.find(p => p.id === slot.playerId);
            if (player) {
                const marketCost = player.cost;
                const legacyPreviousPrice = marketCost - (player.priceChange || 0);
                const storedCost = slot.purchaseCost || legacyPreviousPrice || marketCost;
                
                teamToSave[role] = {
                    ...slot,
                    purchaseCost: Math.min(storedCost, marketCost)
                };
            }
        }
    });

    try {
        await dataService.saveFantasyTeam(currentUserId, teamToSave, myCaptain, activeConfigRound, selectedSplit);
        
        setMyTeam(teamToSave);
        setOriginalTeam(teamToSave);

        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
        
        const rData = await dataService.getFantasyTeam(currentUserId, activeConfigRound, selectedSplit);
        setHistoryScores(prev => prev.map(h => h.round === activeConfigRound ? { ...h, score: rData?.score || 0, team: rData?.team } : h));

    } catch (e) {
        setSaveStatus('error');
    } finally {
        setIsSaving(false);
    }
  };

  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  const handleToggleLock = async () => {
      if (!isAdmin) return;
      const newStatus = !roundLocked;
      setRoundLocked(newStatus);
      await dataService.updateGlobalConfig({ fantasyLocked: newStatus }, selectedSplit);
  };

   const handleForceRecalculate = async () => {
       if (!isAdmin) return;
       
       setAdminMessage("Recalculando puntos... por favor espera.");
      setIsAdminSaving(true);
      try {
          await dataService.forceRecalculateAll(selectedSplit);
          setAdminMessage("Puntos recalculados correctamente.");
          await loadData();
          fetchDebugLogs();
          setTimeout(() => setAdminMessage(null), 5000);
      } catch(e) {
          setAdminMessage("Error al recalcular.");
          setTimeout(() => setAdminMessage(null), 5000);
      } finally {
          setIsAdminSaving(false);
      }
  };

   const fetchDebugLogs = async () => {
       try {
           const q = query(collection(db, "debug_logs"), orderBy("timestamp", "desc"), limit(5));
           const snap = await getDocs(q);
           setDebugLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
       } catch (e: any) {
           console.error("Error fetching debug logs:", e);
           if (e.message?.includes("permission")) {
               setAdminMessage("Error de permisos: Asegúrate de desplegar firestore.rules (manualmente en tu consola Firebase) y que tu rol sea 'admin' en la BBDD. Tu email debe ser alvaroestradacabello@gmail.com y estar verificado.");
               setTimeout(() => setAdminMessage(""), 5000);
           }
       }
   };

    const handleMakeMeAdmin = async () => {
        if (!currentUserId) return;
        setIsAdminSaving(true);
        setAdminMessage("Otorgando permisos de admin...");
        try {
            const { doc, setDoc } = await import("firebase/firestore");
            await setDoc(doc(db, "users", currentUserId), { role: 'admin' }, { merge: true });
            setAdminMessage("¡Ahora eres Admin! Recarga la página.");
            setTimeout(() => setAdminMessage(""), 5000);
        } catch (e: any) {
            console.error("Error setting admin role:", e);
            setAdminMessage("Error al otorgar permisos: " + e.message);
            setTimeout(() => setAdminMessage(""), 5000);
        } finally {
            setIsAdminSaving(false);
        }
    };

  useEffect(() => {
      if (isAdmin) fetchDebugLogs();
  }, [isAdmin]);

  const handleChangeActiveRound = (newRound: number) => {
      if (!isAdmin) return;
      setPendingRoundChange(newRound);
  };

  const executeRoundChange = async () => {
      if (pendingRoundChange === null) return;
      const newRound = pendingRoundChange;
      setPendingRoundChange(null); 

      setIsAdminSaving(true);
      try {
        await dataService.processRoundTransition(newRound, selectedSplit);
        setActiveConfigRound(newRound);
        setViewRoundId(newRound);
        setRoundLocked(false);
        await loadData();
      } catch (error) {
        console.error("Error updating active round", error);
        setAdminMessage("Error al cambiar de jornada.");
      } finally {
        setIsAdminSaving(false);
      }
  };

  const { totalCost, totalPoints } = useMemo(() => {
    let cost = 0;
    let points = 0;
    
    (Object.values(myTeam) as FantasySlot[]).forEach(slot => {
        if (slot.playerId) {
            cost += getEffectiveCost(slot);
            
            const player = players.find(p => p.id === slot.playerId);
            if (player) {
                const isCap = slot.playerId === myCaptain;
                points += player.averagePoints * (isCap ? 1.5 : 1);
            }
        }
    });
    return { totalCost: cost, totalPoints: points };
  }, [myTeam, players, myCaptain]);

  const remainingBudget = MAX_BUDGET - totalCost;
  const isOverBudget = remainingBudget < 0;
  
  const getOpponentsForPlayer = (playerId: string | null): Team[] => {
      if (!playerId) return [];
      const player = players.find(p => p.id === playerId);
      if (!player) return [];

      const currentRoundConfig = getFantasySchedule(selectedSplit).find(r => r.id === viewRoundId);
      if (!currentRoundConfig) return [];

      const roundMatches = allMatches.filter(m => 
          (currentRoundConfig.stage === Stage.GROUPS ? m.stage === Stage.GROUPS : m.stage !== Stage.GROUPS) &&
          currentRoundConfig.matchdays.includes(m.day || 0) &&
          (m.teamA?.id === player.teamId || m.teamB?.id === player.teamId)
      );

      return roundMatches.map(m => {
          const oppId = m.teamA?.id === player.teamId ? m.teamB?.id : m.teamA?.id;
          return teams[oppId];
      }).filter(Boolean);
  };

  const totalLeaderboard = useMemo(() => {
      return [...allUsers]
          .sort((a, b) => (b.scoreBreakdown.fantasy || 0) - (a.scoreBreakdown.fantasy || 0))
          .map((u, i) => ({ ...u, rank: i + 1 }));
  }, [allUsers]);

  const roundLeaderboard = useMemo(() => {
      return allUsers.map(user => {
          const roundData = user.fantasyHistory?.[viewRoundId - 1];
          return {
              ...user,
              roundScore: roundData ? roundData.points : 0
          };
      })
      .sort((a, b) => b.roundScore - a.roundScore)
      .map((u, i) => ({ ...u, roundRank: i + 1 }));
  }, [allUsers, viewRoundId]);

  if (isLoadingData || isTeamLoading) return <div className="p-20 text-center text-[#0ac8b9]"><Loader2 className="w-10 h-10 animate-spin mx-auto"/></div>;

  const isOwnTeam = viewingUserId === currentUserId;
  const isViewLocked = roundLocked || viewRoundId !== activeConfigRound || !isOwnTeam;
  const viewingUser = allUsers.find(u => u.id === viewingUserId);
  const isRoundStartedOrPast = viewRoundId < activeConfigRound || (viewRoundId === activeConfigRound && roundLocked);
  const canViewTeam = isOwnTeam || isRoundStartedOrPast;
  
  // Flag to indicate we are viewing a past round (where prices should be historical)
  const isHistoricalView = viewRoundId < activeConfigRound;

  // Determine correct round label
  const currentRoundConfig = getFantasySchedule(selectedSplit).find(r => r.id === viewRoundId);
  const dynamicRoundLabel = currentRoundConfig 
      ? (currentRoundConfig.stage === Stage.GROUPS ? `Puntos J${currentRoundConfig.matchdays.join('-')}` : `Puntos ${currentRoundConfig.label}`) 
      : `Puntos R${viewRoundId}`;

  const breakdownPlayer = breakdownPlayerId ? players.find(p => p.id === breakdownPlayerId) || null : null;

  return (
    <div className="w-[98%] max-w-[2400px] mx-auto animate-in fade-in pb-20 pt-4 relative">
        
      {/* RULES MODAL RENDER */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} selectedSplit={selectedSplit} />}

      {/* POINTS BREAKDOWN MODAL */}
      {breakdownPlayerId && breakdownPlayer && (
          <PointsBreakdownModal
              player={breakdownPlayer}
              matches={roundMatches}
              isCaptain={myCaptain === breakdownPlayerId}
              onClose={() => setBreakdownPlayerId(null)}
              roundLabel={dynamicRoundLabel}
              teams={teams}
          />
      )}

      {/* HEADER BAR */}
      <div className="flex flex-col gap-6 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-[#0ac8b9]/10 border border-[#0ac8b9]/30">
                    <UserIcon className="w-6 h-6 text-[#0ac8b9]" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white uppercase leading-none">Fantasy League</h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mt-1">
                        Jornada Activa: <span className="text-[#0ac8b9]">#{activeConfigRound}</span> {roundLocked ? '(Bloqueada)' : '(Abierta)'}
                    </p>
                </div>
            </div>

            {/* ADMIN CONTROLS */}
            {isAdmin && (
                <div className="flex flex-wrap gap-2 items-center bg-[#0f1d36] p-2 rounded-lg border border-gray-700">
                    <span className="text-[10px] uppercase font-bold text-red-400 mr-2">Admin:</span>
                    
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <select 
                                value={pendingRoundChange ?? activeConfigRound}
                                onChange={(e) => handleChangeActiveRound(parseInt(e.target.value))}
                                className="bg-black border border-gray-600 text-white text-xs rounded px-2 py-1 pr-6 cursor-pointer hover:border-white focus:outline-none focus:border-red-500 transition-colors"
                                disabled={isAdminSaving}
                            >
                                {getFantasySchedule(selectedSplit).map(r => (
                                    <option key={r.id} value={r.id}>Activa: {r.label}</option>
                                ))}
                            </select>
                            {isAdminSaving && <div className="absolute right-1 top-1.5"><Loader2 className="w-3 h-3 animate-spin text-white"/></div>}
                        </div>

                        {/* Confirmation Actions */}
                        {pendingRoundChange !== null && pendingRoundChange !== activeConfigRound && (
                            <>
                                <button 
                                    onClick={executeRoundChange}
                                    className="bg-green-600 hover:bg-green-500 text-white p-1 rounded border border-green-400 shadow-lg animate-in zoom-in"
                                    title="Confirmar y Procesar cambio de jornada"
                                    disabled={isAdminSaving}
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => setPendingRoundChange(null)}
                                    className="bg-red-600 hover:bg-red-500 text-white p-1 rounded border border-red-400 shadow-lg animate-in zoom-in"
                                    title="Cancelar"
                                    disabled={isAdminSaving}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>

                    <button 
                        onClick={handleToggleLock}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase border transition-all ${roundLocked ? 'bg-red-900/50 border-red-500 text-red-200' : 'bg-green-900/50 border-green-500 text-green-200'}`}
                    >
                        {roundLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        {roundLocked ? 'Desbloquear' : 'Bloquear'}
                    </button>

                    <button 
                        onClick={handleForceRecalculate}
                        disabled={isAdminSaving}
                        className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase border bg-purple-900/50 border-purple-500 text-purple-300 hover:bg-purple-900/80 transition-colors disabled:opacity-50"
                        title="Recalcular puntuaciones"
                    >
                        <RefreshCcw className={`w-3 h-3 ${isAdminSaving ? 'animate-spin' : ''}`} /> Recalcular
                    </button>

                    {adminMessage && (
                        <div className="absolute top-full right-0 mt-2 p-2 bg-gray-900 border border-hextech-500 rounded text-[10px] text-hextech-400 z-50 whitespace-nowrap animate-in fade-in slide-in-from-top-1">
                            {adminMessage}
                        </div>
                    )}

                    <button 
                        onClick={() => setShowDebugLogs(!showDebugLogs)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase border bg-gray-900/50 border-gray-500 text-gray-300 hover:bg-gray-900/80 transition-colors"
                        title="Ver Logs de Depuración"
                    >
                        {showDebugLogs ? 'Ocultar Logs' : 'Ver Logs'}
                    </button>

                    {!isAdmin && currentUserId && (
                        <div className="flex flex-col gap-1">
                            <button 
                                onClick={handleMakeMeAdmin}
                                className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase border bg-red-900/50 border-red-500 text-red-300 hover:bg-red-900/80 transition-colors"
                                title="Hacerse Admin (Solo para el dueño)"
                            >
                                Hacerse Admin
                            </button>
                            {!emailVerified && (
                                <span className="text-[9px] text-yellow-500 font-bold uppercase text-center">
                                    Verifica tu email para activar permisos
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}
          </div>

          {/* DEBUG LOGS VIEWER */}
          {isAdmin && showDebugLogs && (
              <div className="mb-6 p-4 bg-black border border-red-500 rounded-lg overflow-auto max-h-[400px] font-mono text-[10px]">
                  <div className="flex justify-between items-center mb-2">
                      <h3 className="text-red-500 font-bold uppercase">Debug Logs (Admin Only)</h3>
                      <button onClick={fetchDebugLogs} className="text-[#0ac8b9] hover:underline">Refrescar</button>
                  </div>
                  {debugLogs.length === 0 && <p className="text-gray-500">No hay logs recientes.</p>}
                  {debugLogs.map(log => (
                      <div key={log.id} className="mb-4 border-b border-gray-800 pb-2">
                          <p className="text-gray-400">{log.timestamp} - Split: {log.splitId}</p>
                          <pre className="text-green-400 whitespace-pre-wrap mt-1">{log.log}</pre>
                      </div>
                  ))}
              </div>
          )}

          {/* VIEW CONTROLS & TABS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-700 pb-2">
              <div className="flex bg-[#0f1923] p-1 rounded-lg border border-gray-700 items-center">
                  <button 
                    onClick={() => setActiveTab('lineup')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase transition-all ${activeTab === 'lineup' ? 'bg-[#0ac8b9] text-[#0a1428]' : 'text-gray-400 hover:text-white'}`}
                  >
                      <Layout className="w-4 h-4" /> Alineación
                  </button>
                  <button 
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase transition-all ${activeTab === 'history' ? 'bg-[#0ac8b9] text-[#0a1428]' : 'text-gray-400 hover:text-white'}`}
                  >
                      <History className="w-4 h-4" /> Historial
                  </button>
                  <div className="w-px h-6 bg-gray-700 mx-1"></div>
                  <button onClick={() => setShowRules(true)} className="p-2 text-gray-400 hover:text-[#0ac8b9] transition-colors rounded-md hover:bg-[#0a1428]" title="Ver reglas de puntuación">
                    <Info className="w-4 h-4" />
                  </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                  {activeTab === 'lineup' && (
                      <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 uppercase font-bold hidden sm:block">Jornada:</span>
                          <select 
                              value={viewRoundId}
                              onChange={(e) => setViewRoundId(Number(e.target.value))}
                              className="bg-[#0f1923] text-white border border-gray-600 text-sm rounded-lg px-3 py-2 outline-none focus:border-[#0ac8b9]"
                          >
                              {getFantasySchedule(selectedSplit).map(r => (
                                  <option key={r.id} value={r.id}>{r.label} {r.id === activeConfigRound ? '(Actual)' : ''}</option>
                              ))}
                          </select>
                      </div>
                  )}
                  <div className="flex items-center gap-2 bg-[#0f1923] p-1 pr-3 rounded-lg border border-gray-700">
                      <div className="w-8 h-8 rounded bg-black flex items-center justify-center overflow-hidden border border-gray-600">
                          <img src={viewingUser?.avatar || `https://ui-avatars.com/api/?name=${viewingUser?.name || '?'}&background=random`} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col">
                          <span className="text-xs text-gray-500 uppercase font-bold leading-none">Viendo a:</span>
                          <span className="text-white font-bold leading-none">{viewingUser?.name}</span>
                      </div>
                      {!isOwnTeam && (
                          <button onClick={() => setViewingUserId(currentUserId)} className="ml-2 p-1 bg-red-900/50 hover:bg-red-900 text-red-200 rounded border border-red-500/30 transition-colors">
                              <LogOut className="w-3 h-3" />
                          </button>
                      )}
                  </div>
              </div>
          </div>
      </div>

      {!isOwnTeam && (
          <div className="mb-6 bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg flex items-center gap-3 animate-in slide-in-from-top-2">
              <Eye className="w-5 h-5 text-blue-400" />
              <div>
                  <p className="text-sm font-bold text-blue-200 uppercase">Modo Espectador</p>
                  <p className="text-xs text-blue-300/70">Estás viendo el equipo de <span className="font-bold text-white">{viewingUser?.name}</span>. No puedes hacer cambios.</p>
              </div>
          </div>
      )}

      {activeTab === 'lineup' ? (
          <>
            {!canViewTeam ? (
                <div className="flex flex-col items-center justify-center py-20 bg-[#091428]/50 border-2 border-dashed border-gray-700 rounded-xl animate-in fade-in">
                    <div className="p-4 bg-black/40 rounded-full mb-4 border border-gray-700">
                        <EyeOff className="w-12 h-12 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-2">Alineación Oculta</h3>
                    <p className="text-gray-400 text-sm max-w-md text-center">
                        La estrategia de <span className="text-[#0ac8b9] font-bold">{viewingUser?.name}</span> para la Jornada {viewRoundId} es secreta.
                    </p>
                </div>
            ) : (
                <>
                    <div className="bg-[#091428]/95 backdrop-blur-md border-y border-gray-700 shadow-xl mb-6 -mx-4 px-4 py-3 sm:rounded-xl sm:border sm:mx-0 transition-colors duration-500">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-5xl mx-auto">
                                <div className="flex-1 w-full sm:w-auto">
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-1.5">
                                        <span className="flex items-center gap-2 text-gray-300">
                                            <Coins className="w-4 h-4 text-[#0ac8b9]" />
                                            Presupuesto
                                        </span>
                                        <span className={`${isOverBudget ? 'text-red-500' : remainingBudget < 50 ? 'text-yellow-400' : 'text-[#0ac8b9]'}`}>
                                            {isOverBudget
                                                ? `−$${Math.abs(remainingBudget)} excedido`
                                                : `$${remainingBudget} restante`}
                                            <span className="text-gray-600 font-normal ml-1">· ${totalCost}/${MAX_BUDGET}</span>
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                                        <div className={`h-full transition-all duration-500 ${isOverBudget ? 'bg-red-500' : 'bg-gradient-to-r from-[#0a7e78] to-[#0ac8b9]'}`} style={{ width: `${Math.min((totalCost / MAX_BUDGET) * 100, 100)}%` }}></div>
                                    </div>
                                </div>
                                {isViewLocked ? (
                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold uppercase text-xs border ${
                                        !isOwnTeam
                                            ? 'bg-blue-900/20 border-blue-700/50 text-blue-300'
                                            : roundLocked
                                            ? 'bg-orange-900/20 border-orange-600/50 text-orange-300'
                                            : 'bg-gray-800/60 border-gray-700 text-gray-400'
                                    }`}>
                                        <Lock className="w-4 h-4" />
                                        {!isOwnTeam ? 'Solo lectura' : roundLocked ? 'Jornada bloqueada' : 'Jornada pasada'}
                                    </div>
                                ) : (
                                    viewRoundId < activeConfigRound && (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-[#0ac8b9]/20 border border-[#0ac8b9]/50 rounded-lg text-[#0ac8b9] font-bold uppercase text-xs">
                                            <CheckCircle2 className="w-4 h-4" /> Finalizado
                                        </div>
                                    )
                                )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                        {Object.values(Role).map((role) => (
                            <PlayerCard 
                                key={role} 
                                role={role} 
                                slot={myTeam[role]}
                                onSelect={handleSelect} 
                                onSetCaptain={handleSetCaptain}
                                isCaptain={myCaptain === myTeam[role].playerId}
                                players={players}
                                teams={teams}
                                opponents={getOpponentsForPlayer(myTeam[role].playerId)}
                                locked={isViewLocked}
                                roundPoints={myTeam[role].playerId ? (roundPointsMap[myTeam[role].playerId!] !== undefined ? parseFloat((roundPointsMap[myTeam[role].playerId!] * (myCaptain === myTeam[role].playerId ? 1.5 : 1)).toFixed(1)) : undefined) : undefined}
                                roundLabel={dynamicRoundLabel}
                                isHistorical={isHistoricalView}
                                roundMatches={roundMatches}
                                onShowBreakdown={setBreakdownPlayerId}
                            />
                        ))}
                    </div>

                    {!isViewLocked && (
                        <div className="mt-8 flex flex-col items-center gap-3">
                            {/* Inline hints before attempting save */}
                            {!myCaptain && (
                                <div className="bg-yellow-900/20 border border-yellow-600/40 text-yellow-300 px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-medium">
                                    <Crown className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                                    Elige un Capitán — su puntuación se multiplicará ×1.5
                                </div>
                            )}
                            {validationError && (
                                <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded-lg flex items-center gap-2 animate-in slide-in-from-bottom-2">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                    <span className="font-bold text-sm">{validationError}</span>
                                </div>
                            )}
                            {saveStatus === 'success' && (
                                <div className="bg-green-900/20 border border-green-600/40 text-green-300 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold animate-in slide-in-from-bottom-2">
                                    <CheckCircle2 className="w-4 h-4" /> ¡Alineación guardada correctamente!
                                </div>
                            )}

                            <button
                                onClick={handleSave}
                                disabled={isSaving || isOverBudget || !myCaptain}
                                className={`
                                    font-bold px-10 py-3 rounded-xl shadow-lg transition-all transform flex items-center gap-2 border
                                    ${isOverBudget
                                        ? 'bg-red-900/20 border-red-500 text-red-400 cursor-not-allowed'
                                        : !myCaptain
                                        ? 'bg-gray-800/60 border-gray-700 text-gray-500 cursor-not-allowed'
                                        : 'hover:scale-105 bg-gradient-to-r from-[#0ac8b9] to-[#0a7e78] text-black border-[#0ac8b9]'
                                    }
                                `}
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Guardar Alineación
                            </button>
                        </div>
                    )}

                    {/* Leaderboards... (Same as before) */}
                    <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-8">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <ListOrdered className="w-4 h-4 text-[#0ac8b9]" />
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Jornada {viewRoundId}</h2>
                                <span className="text-[10px] text-gray-500 font-bold ml-1">· Puntos de esta ronda</span>
                            </div>
                            <div className="bg-[#060f1e] border border-gray-800/60 rounded-xl overflow-hidden">
                                {roundLeaderboard.slice(0, 10).map((user) => (
                                    <RankingRow 
                                        key={user.id}
                                        user={user}
                                        rank={user.roundRank || 0}
                                        score={user.roundScore || 0}
                                        isMe={user.id === currentUserId}
                                        isViewing={user.id === viewingUserId}
                                        onClick={() => setViewingUserId(user.id)}
                                    />
                                ))}
                                {currentUserId && roundLeaderboard.findIndex(u => u.id === currentUserId) >= 10 && (
                                    <div className="border-t-2 border-gray-700 mt-1">
                                        {roundLeaderboard.filter(u => u.id === currentUserId).map(user => (
                                            <RankingRow 
                                                key={user.id}
                                                user={user}
                                                rank={user.roundRank || 0}
                                                score={user.roundScore || 0}
                                                isMe={true}
                                                isViewing={user.id === viewingUserId}
                                                onClick={() => setViewingUserId(user.id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Trophy className="w-4 h-4 text-[#c8aa6e]" />
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Clasificación General</h2>
                                <span className="text-[10px] text-gray-500 font-bold ml-1">· Puntos totales</span>
                            </div>
                            <div className="bg-[#060f1e] border border-gray-800/60 rounded-xl overflow-hidden">
                                {totalLeaderboard.slice(0, 10).map((user) => (
                                    <RankingRow 
                                        key={user.id}
                                        user={user}
                                        rank={user.rank}
                                        score={user.scoreBreakdown.fantasy}
                                        isMe={user.id === currentUserId}
                                        isViewing={user.id === viewingUserId}
                                        onClick={() => setViewingUserId(user.id)}
                                    />
                                ))}
                                {currentUserId && totalLeaderboard.findIndex(u => u.id === currentUserId) >= 10 && (
                                    <div className="border-t-2 border-gray-700 mt-1">
                                        {totalLeaderboard.filter(u => u.id === currentUserId).map(user => (
                                            <RankingRow 
                                                key={user.id}
                                                user={user}
                                                rank={user.rank}
                                                score={user.scoreBreakdown.fantasy}
                                                isMe={true}
                                                isViewing={user.id === viewingUserId}
                                                onClick={() => setViewingUserId(user.id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
          </>
      ) : (
          // History Tab (Unchanged)
          <div className="max-w-4xl mx-auto">
              <div className="bg-[#091428] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
                  <div className="p-4 bg-[#0f1d36] border-b border-gray-700 flex items-center gap-2">
                      <ListOrdered className="w-5 h-5 text-[#0ac8b9]" />
                      <h3 className="font-bold text-white uppercase tracking-wider">
                          Historial de Puntos ({viewingUser?.name})
                      </h3>
                  </div>
                  <div className="divide-y divide-gray-800">
                      {historyScores.map((roundData) => {
                          const config = getFantasySchedule(selectedSplit).find(f => f.id === roundData.round);
                          const isCurrent = roundData.round === activeConfigRound;
                          return (
                              <div key={roundData.round} className="p-4 flex items-center justify-between hover:bg-[#0f1923] transition-colors">
                                  <div className="flex items-center gap-4">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border ${isCurrent ? 'bg-[#0ac8b9] text-[#0a1428] border-[#0ac8b9]' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                                          {roundData.round}
                                      </div>
                                      <div>
                                          <div className="font-bold text-white text-sm">{config?.label}</div>
                                          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                                              Jornadas: {config?.matchdays.join(', ')}
                                          </div>
                                      </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-6">
                                      <div className="text-right">
                                          <div className="text-xs text-gray-500 uppercase font-bold">Puntos</div>
                                          <div className="text-xl font-bold text-[#0ac8b9]">{roundData.score.toFixed(2)}</div>
                                      </div>
                                      <button 
                                          onClick={() => {
                                              setViewRoundId(roundData.round);
                                              setActiveTab('lineup');
                                          }}
                                          className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                                          title="Ver Alineación"
                                      >
                                          <ArrowLeft className="w-5 h-5 rotate-180" />
                                      </button>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
                  <div className="p-4 bg-[#0f1d36] border-t border-gray-700 text-center">
                      <div className="text-xs text-gray-400 uppercase font-bold mb-1">Total Acumulado</div>
                      <div className="text-3xl font-bold text-white">
                          {historyScores.reduce((acc, curr) => acc + curr.score, 0).toFixed(2)}
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
