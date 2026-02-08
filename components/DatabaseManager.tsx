
import React, { useState, useEffect, useRef } from 'react';
import { Player, Team, Role } from '../types';
import { dataService } from '../services/dataService';
import { Save, Loader2, Search, Settings, PenLine, X, Check, Database, Users, Shield, Flag, Calculator, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { ROLE_ICONS, COUNTRIES } from '../constants';

export const DatabaseManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'players' | 'teams' | 'calibrator'>('players');
    
    // Data State
    const [players, setPlayers] = useState<Player[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editFormPlayer, setEditFormPlayer] = useState<Partial<Player>>({});
    const [editFormTeam, setEditFormTeam] = useState<Partial<Team>>({});
    
    // Filter State
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
    const [teamFilter, setTeamFilter] = useState<string>('ALL');

    // Calibrator State
    const [calculatedData, setCalculatedData] = useState<any[]>([]);
    const [isCalibrating, setIsCalibrating] = useState(false);

    // Action State
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [p, tMap] = await Promise.all([
                dataService.getPlayers(),
                dataService.getTeams()
            ]);
            setPlayers(p);
            setTeams(Object.values(tMap));
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    // --- PLAYERS LOGIC ---
    const filteredPlayers = players.filter(p => {
        const matchesRole = roleFilter === 'ALL' || p.role === roleFilter;
        const matchesTeam = teamFilter === 'ALL' || p.teamId === teamFilter;
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                              p.id.toLowerCase().includes(search.toLowerCase());
        return matchesRole && matchesTeam && matchesSearch;
    });

    const startEditPlayer = (player: Player) => {
        setEditingId(player.id);
        setEditFormPlayer({ ...player });
    };

    const saveEditPlayer = async () => {
        if (!editingId) return;
        setIsSaving(true);
        try {
            await dataService.updatePlayer(editingId, editFormPlayer);
            setEditingId(null);
            await loadData();
        } catch (e) {
            alert("Error al guardar jugador");
        } finally {
            setIsSaving(false);
        }
    };

    // --- TEAMS LOGIC ---
    const startEditTeam = (team: Team) => {
        setEditingId(team.id);
        setEditFormTeam({ ...team });
    };

    const saveEditTeam = async () => {
        if (!editingId) return;
        setIsSaving(true);
        try {
            await dataService.updateTeam(editingId, editFormTeam);
            setEditingId(null);
            await loadData();
        } catch (e) {
            alert("Error al guardar equipo");
        } finally {
            setIsSaving(false);
        }
    };

    // --- CALIBRATOR LOGIC ---
    const runCalibration = async () => {
        setIsCalibrating(true);
        try {
            const [currentPlayers, allMatches] = await Promise.all([
                dataService.getPlayers(),
                dataService.getMatches()
            ]);

            const results = currentPlayers.map(p => {
                // 1. Recalculate Stats from Match History
                let totalPoints = 0;
                let gamesPlayed = 0;
                
                // Only completed matches
                const playedMatches = allMatches.filter(m => m.isCompleted && m.stats && m.stats[p.id]);
                
                playedMatches.forEach(m => {
                    if (m.stats && m.stats[p.id]) {
                        totalPoints += m.stats[p.id].totalPoints;
                        gamesPlayed++;
                    }
                });

                const newAverage = gamesPlayed > 0 ? totalPoints / gamesPlayed : (p.averagePoints || 0);
                
                // 2. Calculate Price (Same logic as dataService.processRoundTransition)
                const currentCost = p.cost || 250;
                const targetPrice = newAverage * 18; // Formula base
                let change = 0;

                // Solo aplicar cambios si ha jugado o tiene puntos
                if (gamesPlayed > 0 || totalPoints > 0) {
                    if (targetPrice > currentCost) {
                        // Subida: 20% de la diferencia, max 50
                        change = Math.min(50, Math.ceil((targetPrice - currentCost) * 0.2)); 
                    } else if (targetPrice < currentCost) {
                        // Bajada: 10% de la diferencia, max 50
                        change = Math.max(-50, Math.floor((targetPrice - currentCost) * 0.1)); 
                    }
                }

                // Hard Limits
                let newCost = Math.round(currentCost + change);
                newCost = Math.max(150, Math.min(550, newCost));

                return {
                    id: p.id,
                    name: p.name,
                    role: p.role,
                    currentCost,
                    newCost,
                    priceChange: change, // Update trend
                    currentAvg: p.averagePoints,
                    newAvg: parseFloat(newAverage.toFixed(1)),
                    totalPoints: parseFloat(totalPoints.toFixed(1))
                };
            });

            // Sort by biggest absolute change
            setCalculatedData(results.sort((a, b) => Math.abs(b.newCost - b.currentCost) - Math.abs(a.newCost - a.currentCost)));

        } catch (e) {
            console.error(e);
            alert("Error calculando precios");
        } finally {
            setIsCalibrating(false);
        }
    };

    const applyCalibration = async () => {
        if (!calculatedData.length) return;
        if (!window.confirm(`¿Estás seguro de actualizar ${calculatedData.length} jugadores? Esto sobrescribirá precios y medias.`)) return;

        setIsSaving(true);
        try {
            // Batch updates are not supported natively in this mocked dataService structure easily without loop
            // We'll simulate batch by looping updates. In a real Firestore, use a Batch write.
            
            const updates = calculatedData.map(d => 
                dataService.updatePlayer(d.id, {
                    cost: d.newCost,
                    priceChange: d.priceChange, // Store the trend!
                    averagePoints: d.newAvg,
                    totalPoints: d.totalPoints
                })
            );

            await Promise.all(updates);
            
            alert("¡Base de datos actualizada con éxito!");
            setCalculatedData([]);
            await loadData(); // Refresh main view
            setActiveTab('players');

        } catch (e) {
            console.error(e);
            alert("Hubo errores al guardar algunos registros.");
        } finally {
            setIsSaving(false);
        }
    };

    // Helper para renderizar la bandera
    const renderFlag = (countryCode?: string) => {
        if (!countryCode) return <span className="text-gray-600">-</span>;
        const country = COUNTRIES.find(c => c.code === countryCode);
        return (
            <div className="flex items-center gap-2 justify-center" title={country?.name || countryCode}>
                <img 
                    src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`} 
                    srcSet={`https://flagcdn.com/w80/${countryCode.toLowerCase()}.png 2x`}
                    width="24" 
                    height="16" // Aspect ratio approx for flags
                    alt={countryCode} 
                    className="rounded-sm shadow-sm object-cover"
                />
                <span className="text-[10px] font-mono text-gray-400">{countryCode}</span>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-[#c8aa6e]">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p>Cargando base de datos...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto pb-20 animate-in fade-in">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
                <Database className="w-8 h-8 text-[#c8aa6e]" />
                <div>
                    <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Gestión de Base de Datos</h1>
                    <p className="text-gray-400 text-xs">Edición directa de registros en Firebase</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-4 mb-6">
                <button 
                    onClick={() => setActiveTab('players')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all border ${activeTab === 'players' ? 'bg-[#c8aa6e] text-[#0a1428] border-[#c8aa6e]' : 'bg-[#0f1923] text-gray-400 border-gray-700 hover:text-white'}`}
                >
                    <Users className="w-4 h-4" />
                    Jugadores ({players.length})
                </button>
                <button 
                    onClick={() => setActiveTab('teams')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all border ${activeTab === 'teams' ? 'bg-[#c8aa6e] text-[#0a1428] border-[#c8aa6e]' : 'bg-[#0f1923] text-gray-400 border-gray-700 hover:text-white'}`}
                >
                    <Shield className="w-4 h-4" />
                    Equipos ({teams.length})
                </button>
                <button 
                    onClick={() => setActiveTab('calibrator')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all border ${activeTab === 'calibrator' ? 'bg-purple-600 text-white border-purple-500' : 'bg-[#0f1923] text-gray-400 border-gray-700 hover:text-white'}`}
                >
                    <Calculator className="w-4 h-4" />
                    Calibrador de Precios
                </button>
            </div>

            {/* --- PLAYERS VIEW --- */}
            {activeTab === 'players' && (
                <div className="bg-[#091428] border border-gray-700 rounded-xl overflow-hidden shadow-xl">
                    {/* Filters */}
                    <div className="p-4 bg-[#0f1923] border-b border-gray-700 flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            <select 
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value as Role | 'ALL')}
                                className="bg-[#050a14] text-white text-sm rounded border border-gray-600 p-2.5 outline-none focus:border-[#c8aa6e]"
                            >
                                <option value="ALL">Todos los Roles</option>
                                {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                            </select>

                            <select 
                                value={teamFilter}
                                onChange={(e) => setTeamFilter(e.target.value)}
                                className="bg-[#050a14] text-white text-sm rounded border border-gray-600 p-2.5 outline-none focus:border-[#c8aa6e] max-w-[150px]"
                            >
                                <option value="ALL">Todos los Equipos</option>
                                {teams.sort((a,b) => a.name.localeCompare(b.name)).map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>

                            <div className="relative flex-1 md:w-64">
                                <input 
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Buscar por nombre..."
                                    className="w-full bg-[#050a14] text-white text-sm rounded pl-9 pr-3 py-2.5 border border-gray-600 outline-none focus:border-[#c8aa6e]"
                                />
                                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                            </div>
                        </div>
                        <div className="text-gray-500 text-xs">
                            Mostrando {filteredPlayers.length} resultados
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-300">
                            <thead className="bg-[#1a2c4e] text-gray-400 uppercase font-bold text-xs">
                                <tr>
                                    <th className="p-4">Jugador</th>
                                    <th className="p-4 text-center">País</th>
                                    <th className="p-4">Equipo</th>
                                    <th className="p-4">Rol</th>
                                    <th className="p-4">Coste ($)</th>
                                    <th className="p-4">Pts Totales</th>
                                    <th className="p-4">Pts Media</th>
                                    <th className="p-4">KDA</th>
                                    <th className="p-4">Foto URL</th>
                                    <th className="p-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {filteredPlayers.map(player => {
                                    const isEditing = editingId === player.id;
                                    const team = teams.find(t => t.id === player.teamId);
                                    
                                    return (
                                        <tr key={player.id} className="hover:bg-white/5 transition-colors">
                                            {/* NAME */}
                                            <td className="p-4 font-bold text-white">
                                                {isEditing ? (
                                                    <input 
                                                        value={editFormPlayer.name}
                                                        onChange={e => setEditFormPlayer({...editFormPlayer, name: e.target.value})}
                                                        className="bg-black border border-gray-600 rounded p-1 w-32"
                                                    />
                                                ) : player.name}
                                            </td>

                                            {/* COUNTRY (SELECTOR) */}
                                            <td className="p-4 text-center">
                                                {isEditing ? (
                                                    <select 
                                                        value={editFormPlayer.country || ''}
                                                        onChange={e => setEditFormPlayer({...editFormPlayer, country: e.target.value})}
                                                        className="bg-black border border-gray-600 rounded p-1 text-xs w-20 text-center"
                                                    >
                                                        <option value="">-</option>
                                                        {COUNTRIES.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                                                            <option key={c.code} value={c.code}>
                                                                {c.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    renderFlag(player.country)
                                                )}
                                            </td>

                                            {/* TEAM */}
                                            <td className="p-4">
                                                {isEditing ? (
                                                    <select 
                                                        value={editFormPlayer.teamId}
                                                        onChange={e => setEditFormPlayer({...editFormPlayer, teamId: e.target.value})}
                                                        className="bg-black border border-gray-600 rounded p-1 text-xs w-24"
                                                    >
                                                        {teams.map(t => <option key={t.id} value={t.id}>{t.shortName}</option>)}
                                                    </select>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        {team?.logo && <img src={team.logo} className="w-4 h-4 object-contain" />}
                                                        <span>{team?.shortName || player.teamId}</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* ROLE */}
                                            <td className="p-4">
                                                {isEditing ? (
                                                     <select 
                                                        value={editFormPlayer.role}
                                                        onChange={e => setEditFormPlayer({...editFormPlayer, role: e.target.value as Role})}
                                                        className="bg-black border border-gray-600 rounded p-1 text-xs"
                                                    >
                                                        {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                                                    </select>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <img src={ROLE_ICONS[player.role]} className="w-4 h-4" />
                                                        <span className="text-xs uppercase">{player.role}</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* COST */}
                                            <td className="p-4 text-[#0ac8b9]">
                                                {isEditing ? (
                                                     <input 
                                                        type="number"
                                                        value={editFormPlayer.cost}
                                                        onChange={e => setEditFormPlayer({...editFormPlayer, cost: Number(e.target.value)})}
                                                        className="bg-black border border-gray-600 rounded p-1 w-16"
                                                    />
                                                ) : `$${player.cost}`}
                                            </td>

                                            {/* TOTAL POINTS (NEW) */}
                                            <td className="p-4 text-purple-400 font-bold">
                                                {isEditing ? (
                                                     <input 
                                                        type="number"
                                                        value={editFormPlayer.totalPoints}
                                                        onChange={e => setEditFormPlayer({...editFormPlayer, totalPoints: Number(e.target.value)})}
                                                        className="bg-black border border-gray-600 rounded p-1 w-16"
                                                    />
                                                ) : player.totalPoints?.toFixed(1) || '0.0'}
                                            </td>

                                            {/* AVG POINTS */}
                                            <td className="p-4 text-[#c8aa6e]">
                                                {isEditing ? (
                                                     <input 
                                                        type="number"
                                                        value={editFormPlayer.averagePoints}
                                                        onChange={e => setEditFormPlayer({...editFormPlayer, averagePoints: Number(e.target.value)})}
                                                        className="bg-black border border-gray-600 rounded p-1 w-16"
                                                    />
                                                ) : player.averagePoints}
                                            </td>

                                            {/* KDA */}
                                            <td className="p-4">
                                                {isEditing ? (
                                                     <input 
                                                        type="number"
                                                        value={editFormPlayer.kda}
                                                        onChange={e => setEditFormPlayer({...editFormPlayer, kda: Number(e.target.value)})}
                                                        className="bg-black border border-gray-600 rounded p-1 w-16"
                                                    />
                                                ) : player.kda?.toFixed(1)}
                                            </td>

                                            {/* PHOTO URL */}
                                            <td className="p-4 max-w-[150px] truncate text-xs text-gray-500">
                                                {isEditing ? (
                                                     <input 
                                                        type="text"
                                                        value={editFormPlayer.photo || ''}
                                                        onChange={e => setEditFormPlayer({...editFormPlayer, photo: e.target.value})}
                                                        className="bg-black border border-gray-600 rounded p-1 w-full"
                                                        placeholder="https://..."
                                                    />
                                                ) : (
                                                    <a href={player.photo} target="_blank" className="hover:text-[#c8aa6e] underline truncate block">
                                                        {player.photo || '-'}
                                                    </a>
                                                )}
                                            </td>

                                            {/* ACTIONS */}
                                            <td className="p-4 text-right">
                                                {isEditing ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={saveEditPlayer} disabled={isSaving} className="p-1 bg-green-900/50 border border-green-500 rounded text-green-400 hover:bg-green-900">
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => setEditingId(null)} className="p-1 bg-red-900/50 border border-red-500 rounded text-red-400 hover:bg-red-900">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => startEditPlayer(player)} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
                                                        <PenLine className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- TEAMS VIEW --- */}
            {activeTab === 'teams' && (
                <div className="bg-[#091428] border border-gray-700 rounded-xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-300">
                            <thead className="bg-[#1a2c4e] text-gray-400 uppercase font-bold text-xs">
                                <tr>
                                    <th className="p-4">Logo</th>
                                    <th className="p-4">ID</th>
                                    <th className="p-4">Nombre Completo</th>
                                    <th className="p-4">Tag (4 letras)</th>
                                    <th className="p-4">Región</th>
                                    <th className="p-4 text-center">País</th>
                                    <th className="p-4">Color (HEX)</th>
                                    <th className="p-4">Logo URL</th>
                                    <th className="p-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {teams.map(team => {
                                    const isEditing = editingId === team.id;
                                    
                                    return (
                                        <tr key={team.id} className="hover:bg-white/5 transition-colors">
                                            {/* PREVIEW */}
                                            <td className="p-4">
                                                <div className="w-10 h-10 bg-black/50 rounded flex items-center justify-center p-1 border border-gray-700">
                                                    {team.logo ? <img src={team.logo} className="w-full h-full object-contain" /> : team.shortName}
                                                </div>
                                            </td>

                                            {/* ID (Read Only) */}
                                            <td className="p-4 text-gray-500 font-mono text-xs">
                                                {team.id}
                                            </td>

                                            {/* NAME */}
                                            <td className="p-4 font-bold text-white">
                                                {isEditing ? (
                                                    <input 
                                                        value={editFormTeam.name}
                                                        onChange={e => setEditFormTeam({...editFormTeam, name: e.target.value})}
                                                        className="bg-black border border-gray-600 rounded p-1 w-32"
                                                    />
                                                ) : team.name}
                                            </td>

                                            {/* SHORT NAME */}
                                            <td className="p-4">
                                                {isEditing ? (
                                                    <input 
                                                        value={editFormTeam.shortName}
                                                        onChange={e => setEditFormTeam({...editFormTeam, shortName: e.target.value})}
                                                        className="bg-black border border-gray-600 rounded p-1 w-16 uppercase"
                                                        maxLength={4}
                                                    />
                                                ) : <span className="font-mono">{team.shortName}</span>}
                                            </td>

                                            {/* REGION */}
                                            <td className="p-4">
                                                 {isEditing ? (
                                                    <input 
                                                        value={editFormTeam.region}
                                                        onChange={e => setEditFormTeam({...editFormTeam, region: e.target.value as any})}
                                                        className="bg-black border border-gray-600 rounded p-1 w-20 uppercase"
                                                    />
                                                ) : <span className="text-xs bg-gray-800 px-2 py-1 rounded">{team.region}</span>}
                                            </td>

                                            {/* COUNTRY (SELECTOR) */}
                                            <td className="p-4 text-center">
                                                {isEditing ? (
                                                    <select 
                                                        value={editFormTeam.country || ''}
                                                        onChange={e => setEditFormTeam({...editFormTeam, country: e.target.value})}
                                                        className="bg-black border border-gray-600 rounded p-1 text-xs w-20 text-center"
                                                    >
                                                        <option value="">-</option>
                                                        {COUNTRIES.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                                                            <option key={c.code} value={c.code}>
                                                                {c.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    renderFlag(team.country)
                                                )}
                                            </td>

                                            {/* COLOR */}
                                            <td className="p-4">
                                                {isEditing ? (
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="color"
                                                            value={editFormTeam.color}
                                                            onChange={e => setEditFormTeam({...editFormTeam, color: e.target.value})}
                                                            className="bg-transparent w-8 h-8 cursor-pointer"
                                                        />
                                                        <input 
                                                            value={editFormTeam.color}
                                                            onChange={e => setEditFormTeam({...editFormTeam, color: e.target.value})}
                                                            className="bg-black border border-gray-600 rounded p-1 w-20 text-xs font-mono"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-4 h-4 rounded-full border border-gray-600" style={{ backgroundColor: team.color }}></div>
                                                        <span className="font-mono text-xs">{team.color}</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* LOGO URL */}
                                            <td className="p-4 max-w-[200px] truncate text-xs text-gray-500">
                                                {isEditing ? (
                                                     <input 
                                                        type="text"
                                                        value={editFormTeam.logo || ''}
                                                        onChange={e => setEditFormTeam({...editFormTeam, logo: e.target.value})}
                                                        className="bg-black border border-gray-600 rounded p-1 w-full"
                                                        placeholder="https://..."
                                                    />
                                                ) : (
                                                    <a href={team.logo} target="_blank" className="hover:text-[#c8aa6e] underline truncate block">
                                                        {team.logo || '-'}
                                                    </a>
                                                )}
                                            </td>

                                            {/* ACTIONS */}
                                            <td className="p-4 text-right">
                                                {isEditing ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={saveEditTeam} disabled={isSaving} className="p-1 bg-green-900/50 border border-green-500 rounded text-green-400 hover:bg-green-900">
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => setEditingId(null)} className="p-1 bg-red-900/50 border border-red-500 rounded text-red-400 hover:bg-red-900">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => startEditTeam(team)} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
                                                        <PenLine className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- CALIBRATOR VIEW (NEW) --- */}
            {activeTab === 'calibrator' && (
                <div className="bg-[#091428] border border-gray-700 rounded-xl overflow-hidden shadow-xl p-6">
                    <div className="flex flex-col items-center justify-center text-center mb-8">
                        <div className="p-3 bg-purple-900/30 rounded-full border border-purple-500/50 mb-3">
                            <Calculator className="w-8 h-8 text-purple-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Calibrador de Precios y Medias</h2>
                        <p className="text-gray-400 text-sm max-w-lg">
                            Esta herramienta recalculará los puntos totales, la media y el precio de mercado de TODOS los jugadores basándose en el historial de partidos actual. Úsala si los datos parecen inconsistentes.
                        </p>
                    </div>

                    <div className="flex justify-center mb-8">
                        {calculatedData.length === 0 ? (
                            <button 
                                onClick={runCalibration}
                                disabled={isCalibrating}
                                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-full shadow-lg flex items-center gap-3 transition-all transform hover:scale-105"
                            >
                                {isCalibrating ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                                {isCalibrating ? 'Calculando...' : 'Iniciar Escaneo y Cálculo'}
                            </button>
                        ) : (
                            <div className="flex flex-col items-center gap-4 animate-in fade-in">
                                <div className="flex items-center gap-4 bg-yellow-900/20 p-4 rounded-lg border border-yellow-500/30">
                                    <AlertTriangle className="w-6 h-6 text-yellow-500" />
                                    <div className="text-left">
                                        <p className="text-yellow-200 font-bold text-sm">Revisión Pendiente</p>
                                        <p className="text-yellow-400/80 text-xs">Se han detectado cambios para {calculatedData.filter(d => d.currentCost !== d.newCost).length} jugadores.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={applyCalibration}
                                        disabled={isSaving}
                                        className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-full shadow-lg flex items-center gap-3 transition-all transform hover:scale-105"
                                    >
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                        Aplicar Cambios a Base de Datos
                                    </button>
                                    <button 
                                        onClick={() => setCalculatedData([])}
                                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-all"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {calculatedData.length > 0 && (
                        <div className="overflow-x-auto max-h-[600px] border border-gray-700 rounded-lg">
                            <table className="w-full text-left text-sm text-gray-300">
                                <thead className="bg-[#1a2c4e] text-gray-400 uppercase font-bold text-xs sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3">Jugador</th>
                                        <th className="p-3 text-center">Media Actual</th>
                                        <th className="p-3 text-center text-green-400">Nueva Media</th>
                                        <th className="p-3 text-center">Coste Actual</th>
                                        <th className="p-3 text-center text-[#0ac8b9]">Nuevo Coste</th>
                                        <th className="p-3 text-right">Diferencia</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800 bg-[#0a1428]">
                                    {calculatedData.map(d => {
                                        const diff = d.newCost - d.currentCost;
                                        const hasChange = diff !== 0;
                                        return (
                                            <tr key={d.id} className={hasChange ? 'bg-white/5' : ''}>
                                                <td className="p-3 font-bold text-white flex items-center gap-2">
                                                    <img src={ROLE_ICONS[d.role as Role]} className="w-4 h-4 opacity-70" />
                                                    {d.name}
                                                </td>
                                                <td className="p-3 text-center text-gray-500">{d.currentAvg || 0}</td>
                                                <td className="p-3 text-center font-bold text-white">{d.newAvg}</td>
                                                <td className="p-3 text-center text-gray-500">${d.currentCost}</td>
                                                <td className="p-3 text-center font-bold text-white">${d.newCost}</td>
                                                <td className={`p-3 text-right font-bold ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-gray-600'}`}>
                                                    {diff > 0 ? '+' : ''}{diff}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};
