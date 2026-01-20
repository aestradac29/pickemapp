
import React, { useState, useEffect, useRef } from 'react';
import { Player, Team, Role } from '../types';
import { dataService } from '../services/dataService';
import { Save, Loader2, Search, Settings, PenLine, X, Check, Database, Users, Shield } from 'lucide-react';
import { ROLE_ICONS } from '../constants';

export const DatabaseManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'players' | 'teams'>('players');
    
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
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                              p.id.toLowerCase().includes(search.toLowerCase());
        return matchesRole && matchesSearch;
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
            </div>

            {/* --- PLAYERS VIEW --- */}
            {activeTab === 'players' && (
                <div className="bg-[#091428] border border-gray-700 rounded-xl overflow-hidden shadow-xl">
                    {/* Filters */}
                    <div className="p-4 bg-[#0f1923] border-b border-gray-700 flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <select 
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value as Role | 'ALL')}
                                className="bg-[#050a14] text-white text-sm rounded border border-gray-600 p-2.5 outline-none focus:border-[#c8aa6e]"
                            >
                                <option value="ALL">Todos los Roles</option>
                                {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
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

        </div>
    );
};
