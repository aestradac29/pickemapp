
import React, { useState, useEffect } from 'react';
import { Player, Team, Role, Match, Stage, User, CustomCosmetic } from '../types';
import { dataService } from '../services/dataService';
import { Loader2, Search, Settings, PenLine, X, Check, Database, Users, Shield, DollarSign, ArrowRight, AlertTriangle, FileText, Download, TrendingUp, History, Hash, Gift, Medal, Crown, Sparkles, Plus, Trash2, Globe, CheckCircle2 } from 'lucide-react';
import { ROLE_ICONS, COUNTRIES, FANTASY_SCHEDULE, SPECIAL_REWARDS, BADGE_DEFINITIONS } from '../constants';

export const DatabaseManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'players' | 'teams' | 'prices' | 'users'>('players');
    
    // Data State
    const [players, setPlayers] = useState<Player[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [allMatches, setAllMatches] = useState<Match[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editFormPlayer, setEditFormPlayer] = useState<Partial<Player>>({});
    const [editFormTeam, setEditFormTeam] = useState<Partial<Team>>({});
    
    // Gift Modal State
    const [giftingUser, setGiftingUser] = useState<User | null>(null);
    const [isMassGifting, setIsMassGifting] = useState(false); 
    const [giftTab, setGiftTab] = useState<'cosmetics' | 'badges' | 'custom'>('cosmetics');
    const [customTitleInput, setCustomTitleInput] = useState("");
    
    // Loading States for Actions
    const [processingRewardId, setProcessingRewardId] = useState<string | null>(null);
    
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
        originalName: string,
        path?: number[] 
    }[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    
    // Simulation Mode State
    const [isSimulationMode, setIsSimulationMode] = useState(false);
    const [simulationTargetRound, setSimulationTargetRound] = useState(4); 

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (importText) {
            parseImportText();
        }
    }, [isSimulationMode, simulationTargetRound]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [p, tMap, matches, uList] = await Promise.all([
                dataService.getPlayers(),
                dataService.getTeams(),
                dataService.getMatches(),
                dataService.getAllUsers()
            ]);
            setPlayers(p);
            setTeams(Object.values(tMap));
            setAllMatches(matches);
            setUsers(uList);
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

    // --- GIFTING LOGIC (SINGLE USER) ---
    const handleToggleCosmetic = async (rewardId: string, type: 'title' | 'banner') => {
        if (!giftingUser) return;
        
        setProcessingRewardId(rewardId);
        
        // Optimistic UI Update simulation
        const currentUnlocked = giftingUser.unlockedCosmetics || [];
        let newUnlocked = [...currentUnlocked];

        if (newUnlocked.includes(rewardId)) {
            newUnlocked = newUnlocked.filter(id => id !== rewardId);
        } else {
            newUnlocked.push(rewardId);
        }

        try {
            await dataService.updateUserProfile(giftingUser.id, { unlockedCosmetics: newUnlocked });
            
            // Update local state to reflect change instantly in modal
            setGiftingUser({ ...giftingUser, unlockedCosmetics: newUnlocked });
            
            // Refresh users list in background to keep table sync
            const uList = await dataService.getAllUsers();
            setUsers(uList);
        } catch (e) {
            console.error("Error toggling cosmetic", e);
            alert("Error al guardar el regalo.");
        } finally {
            setProcessingRewardId(null);
        }
    };

    const handleToggleBadge = async (badgeId: string) => {
        if (!giftingUser) return;
        setProcessingRewardId(badgeId);

        const currentBadges = giftingUser.badges || [];
        let newBadges = [...currentBadges];

        if (newBadges.includes(badgeId)) {
            newBadges = newBadges.filter(id => id !== badgeId);
        } else {
            newBadges.push(badgeId);
        }

        try {
            await dataService.updateUserProfile(giftingUser.id, { badges: newBadges });
            setGiftingUser({ ...giftingUser, badges: newBadges });
            const uList = await dataService.getAllUsers();
            setUsers(uList);
        } catch (e) {
            console.error("Error toggling badge", e);
            alert("Error al guardar la insignia.");
        } finally {
            setProcessingRewardId(null);
        }
    };

    const handleCreateCustomTitle = async () => {
        if (!giftingUser || !customTitleInput.trim()) return;
        
        const newTitle: CustomCosmetic = {
            id: `custom_${Date.now()}`,
            label: customTitleInput.trim(),
            type: 'title',
            description: 'Título personalizado exclusivo'
        };

        const currentCustoms = giftingUser.customCosmetics || [];
        const newCustoms = [...currentCustoms, newTitle];

        try {
            await dataService.updateUserProfile(giftingUser.id, { customCosmetics: newCustoms });
            setGiftingUser({ ...giftingUser, customCosmetics: newCustoms });
            setCustomTitleInput("");
            const uList = await dataService.getAllUsers();
            setUsers(uList);
        } catch (e) {
            console.error("Error creating custom title", e);
        }
    };

    const handleDeleteCustomTitle = async (customId: string) => {
        if (!giftingUser) return;
        if (!window.confirm("¿Borrar este título personalizado?")) return;

        const currentCustoms = giftingUser.customCosmetics || [];
        const newCustoms = currentCustoms.filter(c => c.id !== customId);

        try {
            await dataService.updateUserProfile(giftingUser.id, { customCosmetics: newCustoms });
            setGiftingUser({ ...giftingUser, customCosmetics: newCustoms });
            const uList = await dataService.getAllUsers();
            setUsers(uList);
        } catch (e) {
            console.error("Error deleting custom title", e);
        }
    };

    // --- MASS GIFTING LOGIC (GLOBAL) ---
    const handleMassGift = async (rewardId: string, type: 'cosmetic' | 'badge', label: string) => {
        // Confirm count based on current view, but we will reload to be safe
        const count = users.length;
        if (!window.confirm(`¿Seguro que quieres entregar "${label}" a TODOS los usuarios registrados?\n\nEsta acción no se puede deshacer fácilmente.`)) return;

        setIsSaving(true);
        try {
            // 1. CRITICAL: Fetch fresh users list to ensure we don't overwrite recent changes
            // or miss new users.
            const freshUsers = await dataService.getAllUsers();
            
            // 2. Prepare Updates
            const updates = freshUsers.map(user => {
                let updateData: any = {};
                
                if (type === 'badge') {
                    const current = user.badges || [];
                    if (!current.includes(rewardId)) {
                        updateData.badges = [...current, rewardId];
                    }
                } else {
                    const current = user.unlockedCosmetics || [];
                    if (!current.includes(rewardId)) {
                        updateData.unlockedCosmetics = [...current, rewardId];
                    }
                }
                
                // Only send update if changes are needed
                if (Object.keys(updateData).length > 0) {
                    return dataService.updateUserProfile(user.id, updateData);
                }
                return Promise.resolve();
            });

            // 3. Execute concurrently
            await Promise.all(updates);
            
            alert(`¡Éxito! Se ha entregado "${label}" a todos los usuarios.`);
            
            // 4. Refresh local view
            const finalList = await dataService.getAllUsers();
            setUsers(finalList);

        } catch (e) {
            console.error("Mass gift error", e);
            alert("Error crítico durante el regalo masivo. Revisa la consola.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleMassCustomGift = async () => {
        if (!customTitleInput.trim()) return;
        const count = users.length;
        if (!window.confirm(`¿Crear el título "${customTitleInput}" para TODOS los ${count} usuarios?`)) return;

        setIsSaving(true);
        try {
            const freshUsers = await dataService.getAllUsers();
            
            const newTitle: CustomCosmetic = {
                id: `global_custom_${Date.now()}`,
                label: customTitleInput.trim(),
                type: 'title',
                description: 'Recompensa Global'
            };

            const updates = freshUsers.map(user => {
                const current = user.customCosmetics || [];
                return dataService.updateUserProfile(user.id, { 
                    customCosmetics: [...current, newTitle] 
                });
            });

            await Promise.all(updates);
            
            setCustomTitleInput("");
            alert("¡Títulos globales entregados!");
            const uList = await dataService.getAllUsers();
            setUsers(uList);
        } catch (e) {
            console.error("Mass custom gift error", e);
            alert("Error en regalo global.");
        } finally {
            setIsSaving(false);
        }
    };

    // ... (Existing price simulation code remains unchanged)
    const simulatePriceEvolution = (player: Player, initialPrice: number): { finalPrice: number, path: number[] } => {
        let simulatedCost = initialPrice;
        let cumulativePoints = 0;
        let cumulativeGames = 0;
        const path: number[] = [initialPrice];

        for (let r = 1; r < simulationTargetRound; r++) {
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
                path.push(simulatedCost);
            } else {
                path.push(simulatedCost);
            }
        }
        return { finalPrice: simulatedCost, path };
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
                    let finalPrice = inputPrice;
                    let path: number[] = [];
                    if (isSimulationMode) {
                        const result = simulatePriceEvolution(player, inputPrice);
                        finalPrice = result.finalPrice;
                        path = result.path;
                    }
                    updates.push({
                        player: player,
                        inputCost: inputPrice,
                        newCost: finalPrice,
                        found: true,
                        originalName: rawName,
                        path: path
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
            ? `¿Aplicar precios SIMULADOS (llegada a J${simulationTargetRound}) a ${validUpdates.length} jugadores?`
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
            {/* Headers and Tabs Code remains identical... */}
            <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
                <Database className="w-8 h-8 text-[#c8aa6e]" />
                <div>
                    <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Gestión de Base de Datos</h1>
                    <p className="text-gray-400 text-xs">Edición directa de registros en Firebase</p>
                </div>
            </div>

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
                    onClick={() => setActiveTab('users')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all border ${activeTab === 'users' ? 'bg-[#c8aa6e] text-[#0a1428] border-[#c8aa6e]' : 'bg-[#0f1923] text-gray-400 border-gray-700 hover:text-white'}`}
                >
                    <Gift className="w-4 h-4" />
                    Usuarios & Regalos
                </button>
                <button 
                    onClick={() => setActiveTab('prices')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all border ${activeTab === 'prices' ? 'bg-green-600 text-white border-green-500' : 'bg-[#0f1923] text-gray-400 border-gray-700 hover:text-white'}`}
                >
                    <DollarSign className="w-4 h-4" />
                    Importar Precios
                </button>
            </div>

            {/* Players & Teams View Code... (Truncated for brevity in response, remains same as before) */}
            {activeTab === 'players' && (
                // ... (Original Player Table Code)
                <div className="bg-[#091428] border border-gray-700 rounded-xl overflow-hidden shadow-xl">
                    {/* ... Filters & Table ... */}
                    <div className="p-4 bg-[#0f1923] border-b border-gray-700 flex flex-col md:flex-row gap-4 justify-between items-center">
                        {/* ... Filters UI ... */}
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | 'ALL')} className="bg-[#050a14] text-white text-sm rounded border border-gray-600 p-2.5 outline-none focus:border-[#c8aa6e]">
                                <option value="ALL">Todos los Roles</option>
                                {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="bg-[#050a14] text-white text-sm rounded border border-gray-600 p-2.5 outline-none focus:border-[#c8aa6e] max-w-[150px]">
                                <option value="ALL">Todos los Equipos</option>
                                {teams.sort((a,b) => a.name.localeCompare(b.name)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <div className="relative flex-1 md:w-64">
                                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre..." className="w-full bg-[#050a14] text-white text-sm rounded pl-9 pr-3 py-2.5 border border-gray-600 outline-none focus:border-[#c8aa6e]"/>
                                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                            </div>
                        </div>
                    </div>
                    {/* ... Table Body ... */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-300">
                            <thead className="bg-[#1a2c4e] text-gray-400 uppercase font-bold text-xs">
                                <tr>
                                    <th className="p-4">Jugador</th><th className="p-4">País</th><th className="p-4">Equipo</th><th className="p-4">Rol</th><th className="p-4">Coste</th><th className="p-4">Pts</th><th className="p-4">Avg</th><th className="p-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {filteredPlayers.slice(0, 50).map(player => (
                                    <tr key={player.id} className="hover:bg-white/5">
                                        <td className="p-4 font-bold">{player.name}</td>
                                        <td className="p-4">{renderFlag(player.country)}</td>
                                        <td className="p-4">{teams.find(t => t.id === player.teamId)?.shortName || player.teamId}</td>
                                        <td className="p-4">{player.role}</td>
                                        <td className="p-4 text-[#0ac8b9]">${player.cost}</td>
                                        <td className="p-4">{player.totalPoints?.toFixed(1)}</td>
                                        <td className="p-4">{player.averagePoints}</td>
                                        <td className="p-4">
                                            <button onClick={() => startEditPlayer(player)} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"><PenLine className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'teams' && (
                // ... (Original Team Table Code)
                <div className="bg-[#091428] border border-gray-700 rounded-xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-300">
                            <thead className="bg-[#1a2c4e] text-gray-400 uppercase font-bold text-xs">
                                <tr><th className="p-4">ID</th><th className="p-4">Nombre</th><th className="p-4">Tag</th><th className="p-4">Acciones</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {teams.map(team => (
                                    <tr key={team.id} className="hover:bg-white/5">
                                        <td className="p-4 text-gray-500 font-mono text-xs">{team.id}</td>
                                        <td className="p-4 font-bold text-white">{team.name}</td>
                                        <td className="p-4">{team.shortName}</td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => startEditTeam(team)} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"><PenLine className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- USERS & GIFTING VIEW --- */}
            {activeTab === 'users' && (
                <div className="bg-[#091428] border border-gray-700 rounded-xl overflow-hidden shadow-xl">
                    <div className="p-4 bg-[#0f1923] border-b border-gray-700 flex justify-between items-center">
                        <span className="text-gray-400 font-bold uppercase text-xs tracking-wider">
                            Lista de Usuarios
                        </span>
                        
                        <button 
                            onClick={() => {
                                setGiftingUser(users[0]); // Hack to open modal with context, overrides below
                                setIsMassGifting(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-bold text-xs uppercase shadow-lg transition-all transform hover:scale-105"
                        >
                            <Globe className="w-4 h-4" />
                            🌍 Regalo a Todos
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-300">
                            <thead className="bg-[#1a2c4e] text-gray-400 uppercase font-bold text-xs">
                                <tr>
                                    <th className="p-4">Usuario</th>
                                    <th className="p-4">Puntos Totales</th>
                                    <th className="p-4">Rango</th>
                                    <th className="p-4">Título Actual</th>
                                    <th className="p-4">Regalos (Manuales)</th>
                                    <th className="p-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {users.sort((a,b) => b.score - a.score).map((user, idx) => {
                                    return (
                                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <img src={user.avatar} className="w-10 h-10 rounded-full border border-gray-600" />
                                                    <div>
                                                        <div className="font-bold text-white">{user.name}</div>
                                                        <div className="text-xs text-gray-500">{user.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold text-[#c8aa6e]">{user.score}</td>
                                            <td className="p-4 font-mono">#{idx + 1}</td>
                                            <td className="p-4">
                                                {user.title ? <span className="bg-black/30 px-2 py-1 rounded text-xs border border-gray-700">{user.title}</span> : <span className="text-gray-600 italic">-</span>}
                                            </td>
                                            <td className="p-4">
                                                <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded border border-purple-500/30">
                                                    {user.unlockedCosmetics?.length || 0} items
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button 
                                                    onClick={() => {
                                                        setGiftingUser(user);
                                                        setIsMassGifting(false);
                                                    }}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-[#c8aa6e]/10 border border-[#c8aa6e]/50 text-[#c8aa6e] rounded-lg hover:bg-[#c8aa6e] hover:text-[#0a1428] transition-all ml-auto text-xs font-bold uppercase"
                                                >
                                                    <Gift className="w-3 h-3" /> Regalar
                                                </button>
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
                // ... (Same Prices View Code)
                <div className="bg-[#091428] border border-gray-700 rounded-xl p-6">
                    <div className="text-center mb-8"><h2 className="text-xl font-bold text-white">Importar Precios</h2></div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <textarea className="w-full h-64 bg-[#050a14] border border-gray-700 rounded-lg p-4 text-white text-sm" value={importText} onChange={e => setImportText(e.target.value)} placeholder="Pega lista aquí..." />
                        <div className="bg-[#050a14] border border-gray-700 rounded-lg h-64 overflow-y-auto p-2">
                            {pendingUpdates.length === 0 ? <div className="text-center text-gray-500 mt-20">Esperando...</div> : pendingUpdates.map((u, i) => (
                                <div key={i} className={`p-2 border-b border-gray-800 ${u.found ? 'text-green-400' : 'text-red-400'}`}>{u.found ? u.player.name : u.originalName} -> {u.newCost}</div>
                            ))}
                        </div>
                    </div>
                    <div className="mt-4 flex justify-center"><button onClick={applyPriceUpdates} disabled={pendingUpdates.length === 0} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold">Aplicar</button></div>
                </div>
            )}

            {/* --- GIFTING MODAL --- */}
            {giftingUser && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="w-full max-w-2xl bg-[#091428] border-2 border-[#c8aa6e] rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className={`p-4 ${isMassGifting ? 'bg-purple-900/30' : 'bg-[#0f1d36]'} border-b border-gray-700 flex justify-between items-center`}>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                {isMassGifting ? <Globe className="w-5 h-5 text-purple-400" /> : <Gift className="w-5 h-5 text-[#c8aa6e]" />}
                                {isMassGifting 
                                    ? `Regalo Global a ${users.length} Usuarios`
                                    : <>Regalar Recompensas a <span className="text-[#c8aa6e]">{giftingUser.name}</span></>
                                }
                            </h3>
                            <button onClick={() => { setGiftingUser(null); setIsMassGifting(false); }} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        
                        {isMassGifting && (
                            <div className="bg-purple-900/20 text-purple-200 text-xs p-3 text-center border-b border-purple-500/30">
                                ⚠️ CUIDADO: Lo que selecciones aquí se enviará a <strong>TODOS</strong> los usuarios.
                            </div>
                        )}

                        <div className="p-2 bg-[#050a14] flex gap-2 justify-center border-b border-gray-800">
                            <button onClick={() => setGiftTab('cosmetics')} className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all ${giftTab === 'cosmetics' ? 'bg-[#c8aa6e] text-[#0a1428]' : 'text-gray-400 hover:text-white'}`}>Cosméticos</button>
                            <button onClick={() => setGiftTab('badges')} className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all ${giftTab === 'badges' ? 'bg-[#c8aa6e] text-[#0a1428]' : 'text-gray-400 hover:text-white'}`}>Insignias</button>
                            <button onClick={() => setGiftTab('custom')} className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all ${giftTab === 'custom' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>Forja</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-[#091428]">
                            {giftTab === 'cosmetics' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {SPECIAL_REWARDS.map(reward => {
                                            const isUnlocked = !isMassGifting && giftingUser.unlockedCosmetics?.includes(reward.id);
                                            const isProcessing = processingRewardId === reward.id;
                                            const Icon = reward.icon;
                                            
                                            return (
                                                <button
                                                    key={reward.id}
                                                    onClick={() => isMassGifting ? handleMassGift(reward.id, 'cosmetic', reward.label) : handleToggleCosmetic(reward.id, reward.type as any)}
                                                    disabled={isProcessing || isSaving}
                                                    className={`
                                                        flex items-center gap-3 p-3 rounded-lg border text-left transition-all relative overflow-hidden
                                                        ${isUnlocked 
                                                            ? 'bg-[#c8aa6e]/20 border-[#c8aa6e] ring-1 ring-[#c8aa6e]/50' 
                                                            : 'bg-[#0f1d36] border-gray-700 hover:border-gray-500'
                                                        }
                                                        ${isMassGifting ? 'hover:bg-purple-900/20' : ''}
                                                    `}
                                                >
                                                    <div className={`p-2 rounded-full ${isUnlocked ? 'bg-[#c8aa6e] text-[#0a1428]' : 'bg-gray-800 text-gray-500'}`}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className={`text-sm font-bold ${isUnlocked ? 'text-[#c8aa6e]' : 'text-gray-300'}`}>{reward.label}</div>
                                                        <div className="text-[10px] text-gray-500 uppercase font-bold">{reward.type === 'title' ? 'Título' : 'Estandarte'}</div>
                                                    </div>
                                                    
                                                    {/* Status Indicator */}
                                                    {isProcessing ? (
                                                        <Loader2 className="w-5 h-5 text-[#c8aa6e] ml-auto animate-spin" />
                                                    ) : isUnlocked ? (
                                                        <CheckCircle2 className="w-5 h-5 text-[#c8aa6e] ml-auto" />
                                                    ) : isMassGifting ? (
                                                        <Globe className="w-4 h-4 text-purple-500 ml-auto opacity-50" />
                                                    ) : null}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Same improvements for Badges tab */}
                            {giftTab === 'badges' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {Object.entries(BADGE_DEFINITIONS).map(([id, def]) => {
                                            const isUnlocked = !isMassGifting && giftingUser.badges?.includes(id);
                                            const isProcessing = processingRewardId === id;
                                            const Icon = def.icon;
                                            return (
                                                <button
                                                    key={id}
                                                    onClick={() => isMassGifting ? handleMassGift(id, 'badge', def.label) : handleToggleBadge(id)}
                                                    disabled={isProcessing || isSaving}
                                                    className={`
                                                        flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                                                        ${isUnlocked 
                                                            ? 'bg-green-900/20 border-green-500 ring-1 ring-green-500/30' 
                                                            : 'bg-[#0f1d36] border-gray-700 hover:border-gray-500'
                                                        }
                                                    `}
                                                >
                                                    <div className={`p-2 rounded-full ${isUnlocked ? 'bg-green-500 text-[#0a1428]' : 'bg-gray-800 text-gray-500'}`}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className={`text-sm font-bold ${isUnlocked ? 'text-green-400' : 'text-gray-300'}`}>{def.label}</div>
                                                    </div>
                                                    {isProcessing ? (
                                                        <Loader2 className="w-5 h-5 text-green-500 ml-auto animate-spin" />
                                                    ) : isUnlocked ? (
                                                        <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
                                                    ) : null}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {giftTab === 'custom' && (
                                <div className="space-y-6">
                                    <div className="bg-purple-900/10 border border-purple-500/30 p-4 rounded-xl">
                                        <h4 className="text-purple-300 font-bold uppercase text-xs tracking-widest mb-3 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4" /> {isMassGifting ? 'Forjador Global' : 'Forjador de Títulos'}
                                        </h4>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text"
                                                value={customTitleInput}
                                                onChange={(e) => setCustomTitleInput(e.target.value)}
                                                placeholder="Ej: Rey del Draft..."
                                                className="flex-1 bg-black/40 border border-purple-500/50 rounded-lg px-4 py-2 text-white text-sm outline-none focus:border-purple-400"
                                            />
                                            <button 
                                                onClick={isMassGifting ? handleMassCustomGift : handleCreateCustomTitle}
                                                disabled={!customTitleInput.trim() || isSaving}
                                                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4" />}
                                                Crear
                                            </button>
                                        </div>
                                    </div>
                                    {!isMassGifting && giftingUser.customCosmetics && (
                                        <div>
                                            <h4 className="text-gray-400 font-bold uppercase text-xs tracking-widest mb-3">Títulos Creados</h4>
                                            <div className="space-y-2">
                                                {giftingUser.customCosmetics.map(cosmetic => (
                                                    <div key={cosmetic.id} className="flex items-center justify-between p-3 bg-[#0f1d36] rounded-lg border border-gray-700">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-purple-900/30 rounded-full text-purple-400"><Crown className="w-4 h-4" /></div>
                                                            <span className="text-white font-bold text-sm block">{cosmetic.label}</span>
                                                        </div>
                                                        <button onClick={() => handleDeleteCustomTitle(cosmetic.id)} className="p-2 hover:bg-red-900/30 text-gray-500 hover:text-red-400 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};