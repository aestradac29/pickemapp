
import React, { useState, useEffect } from 'react';
import { Player, Team, Role, Match, Stage } from '../types';
import { dataService } from '../services/dataService';
import { Loader2, Search, Settings, PenLine, X, Check, Database, Users, Shield, DollarSign, ArrowRight, AlertTriangle, FileText, Download, TrendingUp, History } from 'lucide-react';
import { ROLE_ICONS, COUNTRIES, FANTASY_SCHEDULE } from '../constants';

export const DatabaseManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'players' | 'teams' | 'prices'>('players');
    
    // Data State
    const [players, setPlayers] = useState<Player[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [allMatches, setAllMatches] = useState<Match[]>([]); // Necesario para la simulación
    const [isLoading, setIsLoading] = useState(true);

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editFormPlayer, setEditFormPlayer] = useState<Partial<Player>>({});
    const [editFormTeam, setEditFormTeam] = useState<Partial<Team>>({});
    
    // Filter State
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
    const [teamFilter, setTeamFilter] = useState<string>('ALL');

    // Price Import State
    const [importText, setImportText] = useState("");
    const [pendingUpdates, setPendingUpdates] = useState<{ 
        player: Player, 
        newCost: number, 
        inputCost: number,
        found: boolean, 
        originalName: string 
    }[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    
    // Simulation Mode State
    const [isSimulationMode, setIsSimulationMode] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [p, tMap, matches] = await Promise.all([
                dataService.getPlayers(),
                dataService.getTeams(),
                dataService.getMatches() // Cargar partidos para la simulación
            ]);
            setPlayers(p);
            setTeams(Object.values(tMap));
            setAllMatches(matches);
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

    // --- PRICE IMPORT & SIMULATION LOGIC ---
    
    // Función auxiliar para simular la evolución del precio de J1 a J4
    const simulatePriceToRound4 = (player: Player, initialPrice: number) => {
        let simulatedCost = initialPrice;
        let cumulativePoints = 0;
        let cumulativeGames = 0;

        // Iterar Rondas 1, 2 y 3 (para obtener el precio de inicio de J4)
        for (let r = 1; r < 4; r++) {
            const roundConfig = FANTASY_SCHEDULE.find(sch => sch.id === r);
            if (!roundConfig) continue;

            const roundMatches = allMatches.filter(m => 
                m.isCompleted && 
                m.stats && 
                m.stats[player.id] &&
                (roundConfig.stage === Stage.GROUPS ? m.stage === Stage.GROUPS : m.stage !== Stage.GROUPS) &&
                roundConfig.matchdays.includes(m.day || 0)
            );

            let pointsInRound = 0;
            let gamesInRound = 0;

            roundMatches.forEach(m => {
                if (m.stats && m.stats[player.id]) {
                    pointsInRound += m.stats[player.id].totalPoints;
                    gamesInRound++;
                }
            });

            if (gamesInRound > 0) {
                cumulativePoints += pointsInRound;
                cumulativeGames += gamesInRound;

                const currentTotalAvg = cumulativePoints / cumulativeGames;
                const targetPrice = currentTotalAvg * 18;

                let change = 0;
                if (targetPrice > simulatedCost) {
                    change = Math.min(50, Math.ceil((targetPrice - simulatedCost) * 0.2)); 
                } else if (targetPrice < simulatedCost) {
                    change = Math.max(-50, Math.floor((targetPrice - simulatedCost) * 0.1)); 
                }

                simulatedCost = Math.round(simulatedCost + change);
                simulatedCost = Math.max(150, Math.min(550, simulatedCost));
            }
        }
        return simulatedCost;
    };

    const parseImportText = () => {
        if (!importText.trim()) return;

        const lines = importText.split('\n');
        const updates: any[] = [];

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;
            
            const match = trimmed.match(/^(.*?)[ \t:;]+(\d+)$/);
            
            if (match) {
                const rawName = match[1].trim().replace(/[:;]/g, ''); 
                const inputPrice = parseInt(match[2]);

                const player = players.find(p => p.name.toLowerCase() === rawName.toLowerCase());

                if (player) {
                    // Si el modo simulación está activo, el precio de entrada es J1, y calculamos J4.
                    // Si no, el precio de entrada es el precio final directo.
                    const finalPrice = isSimulationMode 
                        ? simulatePriceToRound4(player, inputPrice) 
                        : inputPrice;

                    updates.push({
                        player: player,
                        inputCost: inputPrice, // Lo que escribió el usuario (Precio J1 o Directo)
                        newCost: finalPrice,   // Lo que se guardará (Precio J4 Calculado o Directo)
                        found: true,
                        originalName: rawName
                    });
                } else {
                    updates.push({
                        player: null,
                        inputCost: inputPrice,
                        newCost: inputPrice,
                        found: false,
                        originalName: rawName
                    });
                }
            }
        });

        setPendingUpdates(updates);
    };

    const applyPriceUpdates = async () => {
        const validUpdates = pendingUpdates.filter(u => u.found && u.player);
        if (validUpdates.length === 0) return;

        const confirmMsg = isSimulationMode 
            ? `¿Aplicar precios SIMULADOS para J4 a ${validUpdates.length} jugadores?`
            : `¿Aplicar precios manuales a ${validUpdates.length} jugadores?`;

        if (!window.confirm(confirmMsg)) return;

        setIsSaving(true);
        try {
            const bulkData = validUpdates.map(u => ({
                id: u.player.id,
                data: {
                    cost: u.newCost,
                    priceChange: u.player.cost ? u.newCost - u.player.cost : 0
                }
            }));

            await dataService.updatePlayersBulk(bulkData);
            
            alert("¡Precios actualizados correctamente!");
            setPendingUpdates([]);
            setImportText("");
            await loadData();
            setActiveTab('players');

        } catch (e) {
            console.error(e);
            alert("Error al actualizar precios.");
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
                    height="16" 
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
                    onClick={() => setActiveTab('prices')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all border ${activeTab === 'prices' ? 'bg-green-600 text-white border-green-500' : 'bg-[#0f1923] text-gray-400 border-gray-700 hover:text-white'}`}
                >
                    <DollarSign className="w-4 h-4" />
                    Importar Precios
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

            {/* --- PRICES IMPORT VIEW --- */}
            {activeTab === 'prices' && (
                <div className="bg-[#091428] border border-gray-700 rounded-xl overflow-hidden shadow-xl p-6">
                    <div className="flex flex-col items-center justify-center text-center mb-8">
                        <div className="p-3 bg-green-900/30 rounded-full border border-green-500/50 mb-3">
                            <DollarSign className="w-8 h-8 text-green-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Importar Precios Masivamente</h2>
                        <p className="text-gray-400 text-sm max-w-lg">
                            Pega aquí una lista de nombres y precios.
                        </p>
                        
                        {/* TOGGLE SIMULATION MODE */}
                        <div className="mt-4 flex items-center justify-center">
                            <label className={`
                                flex items-center gap-3 px-4 py-2 rounded-lg border cursor-pointer transition-all select-none
                                ${isSimulationMode 
                                    ? 'bg-purple-900/30 border-purple-500 text-purple-300' 
                                    : 'bg-gray-800 border-gray-700 text-gray-400'
                                }
                            `}>
                                <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={isSimulationMode}
                                    onChange={(e) => setIsSimulationMode(e.target.checked)}
                                />
                                {isSimulationMode ? <TrendingUp className="w-5 h-5 text-purple-400" /> : <History className="w-5 h-5" />}
                                <div className="text-left">
                                    <span className="block text-xs font-bold uppercase tracking-wider">
                                        {isSimulationMode ? 'Simular Evolución J1 -> J4' : 'Importación Directa'}
                                    </span>
                                    <span className="block text-[9px] opacity-70">
                                        {isSimulationMode 
                                            ? 'Input: Precio J1 => Output: Precio J4 Calculado' 
                                            : 'Input: Precio Final => Output: Precio Final'}
                                    </span>
                                </div>
                            </label>
                        </div>

                        <div className="mt-4 bg-black/40 p-2 rounded border border-gray-700 text-xs font-mono text-gray-400">
                            Ejemplo:<br/>
                            Hans Sama 300<br/>
                            Caps: 350
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* INPUT AREA */}
                        <div className="flex flex-col gap-4">
                            <textarea 
                                className="w-full h-64 bg-[#050a14] border border-gray-700 rounded-lg p-4 text-white text-sm font-mono focus:border-green-500 outline-none resize-none"
                                placeholder={`Pega tu lista aquí (${isSimulationMode ? 'Precios J1' : 'Precios Finales'})...`}
                                value={importText}
                                onChange={(e) => setImportText(e.target.value)}
                            />
                            <div className="flex justify-end gap-3">
                                <button 
                                    onClick={() => { setImportText(""); setPendingUpdates([]); }}
                                    className="px-4 py-2 rounded text-gray-400 hover:text-white hover:bg-white/5"
                                >
                                    Limpiar
                                </button>
                                <button 
                                    onClick={parseImportText}
                                    disabled={!importText.trim()}
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
                                >
                                    <FileText className="w-4 h-4" />
                                    Analizar Texto
                                </button>
                            </div>
                        </div>

                        {/* PREVIEW AREA */}
                        <div className="bg-[#050a14] border border-gray-700 rounded-lg overflow-hidden flex flex-col h-64 md:h-auto">
                            <div className="p-3 bg-[#0f1d36] border-b border-gray-700 font-bold text-xs uppercase text-gray-400 flex justify-between items-center">
                                <span>Vista Previa ({pendingUpdates.length})</span>
                                {pendingUpdates.length > 0 && (
                                    <span className="text-green-400">{pendingUpdates.filter(u => u.found).length} Encontrados</span>
                                )}
                            </div>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                {pendingUpdates.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                                        <ArrowRight className="w-6 h-6 opacity-30" />
                                        <span className="text-xs">Esperando análisis...</span>
                                    </div>
                                ) : (
                                    pendingUpdates.map((u, idx) => (
                                        <div key={idx} className={`flex items-center justify-between p-2 rounded border ${u.found ? 'bg-green-900/10 border-green-900/30' : 'bg-red-900/10 border-red-900/30'}`}>
                                            <div className="flex items-center gap-2">
                                                {u.found ? (
                                                    <Check className="w-3 h-3 text-green-500" />
                                                ) : (
                                                    <AlertTriangle className="w-3 h-3 text-red-500" />
                                                )}
                                                <div className="flex flex-col">
                                                    <span className={`text-xs font-bold ${u.found ? 'text-white' : 'text-red-400 line-through'}`}>
                                                        {u.found ? u.player?.name : u.originalName}
                                                    </span>
                                                    {!u.found && <span className="text-[9px] text-red-500">No encontrado</span>}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                {u.found && (
                                                    <span className="text-[10px] text-gray-500 line-through mr-1">${u.player.cost}</span>
                                                )}
                                                
                                                {isSimulationMode && (
                                                    <span className="text-xs text-purple-300 font-mono mr-1" title="Precio Inicial (Input)">
                                                        [${u.inputCost}]
                                                    </span>
                                                )}

                                                <div className="flex items-center gap-1">
                                                    <ArrowRight className="w-3 h-3 text-gray-600" />
                                                    <span className="text-sm font-bold text-green-400">${u.newCost}</span>
                                                </div>
                                                
                                                {u.found && u.player && (
                                                    <span className={`text-[10px] font-bold ${u.newCost > u.player.cost ? 'text-green-500' : u.newCost < u.player.cost ? 'text-red-500' : 'text-gray-500'}`}>
                                                        {u.newCost > u.player.cost ? '+' : ''}{u.newCost - u.player.cost}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ACTION FOOTER */}
                    {pendingUpdates.length > 0 && (
                        <div className="mt-6 flex justify-center border-t border-gray-700 pt-6">
                            <button 
                                onClick={applyPriceUpdates}
                                disabled={isSaving || pendingUpdates.filter(u => u.found).length === 0}
                                className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-10 rounded-full shadow-lg flex items-center gap-3 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                                Aplicar Cambios
                            </button>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};
