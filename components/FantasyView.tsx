import React, { useState, useMemo, useEffect } from 'react';
import { ROLE_ICONS, WHITE_LOGO_TEAMS } from '../constants';
import { Role, Player, Team, User } from '../types';
import { Save, RefreshCw, X, Shield, Zap, Coins, TrendingUp, AlertTriangle, Swords, Search, ArrowLeft, User as UserIcon, Loader2, CheckCircle2, Settings, PenLine } from 'lucide-react';
import { SearchableSelect, Option } from './ui/SearchableSelect';
import { dataService } from '../services/dataService';

// Budget Constants
const MAX_BUDGET = 1500;

interface PlayerCardProps {
  role: Role;
  playerId: string | null;
  onSelect: (role: Role, playerId: string | null) => void;
  readOnly?: boolean;
  players: Player[];
  teams: Record<string, Team>;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ role, playerId, onSelect, readOnly = false, players, teams }) => {
  const player = players.find(p => p.id === playerId);
  const teamInfo = player ? teams[player.teamId] : null;
  const teamColor = teamInfo?.color || '#0ac8b9';
  const [imgError, setImgError] = useState(false);
  
  // Check if we need to force the logo to white
  const forceWhiteLogo = teamInfo && WHITE_LOGO_TEAMS.includes(teamInfo.id);

  // Reset error state when player changes
  React.useEffect(() => {
      setImgError(false);
  }, [playerId]);

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

  return (
    <div className="relative group perspective-1000 hover:z-50 h-full w-full">
      <div className={`
        relative rounded-2xl border-2 transition-all duration-500 min-h-[440px] flex flex-col h-full
        ${playerId 
          ? 'overflow-hidden border-transparent bg-[#0a1428] shadow-[0_0_20px_rgba(0,0,0,0.5)]' 
          : 'border-dashed border-gray-700 bg-[#091428]/50'
        }
        ${!readOnly && !playerId ? 'hover:border-[#0ac8b9]/50' : ''}
      `}
      style={playerId ? { borderColor: teamColor, boxShadow: `0 0 15px ${teamColor}40` } : {}}
      >
        {/* Header Icon (Always visible) */}
        <div className="absolute top-4 right-4 z-20">
           <img src={ROLE_ICONS[role]} alt={role} className="w-7 h-7 opacity-50 drop-shadow-md" />
        </div>

        {playerId && player && teamInfo ? (
          // --- STATE: PLAYER SELECTED ---
          <>
            {/* Background Glow */}
            <div 
              className="absolute inset-0 opacity-20 bg-gradient-to-b from-transparent to-black"
              style={{ backgroundColor: teamColor }} 
            />
            
            {/* Team Logo Background Watermark */}
            <div className="absolute -right-10 top-10 opacity-10 rotate-12 pointer-events-none">
               {teamInfo.logo ? (
                  <img 
                    src={teamInfo.logo} 
                    alt="" 
                    className={`w-48 h-48 opacity-30 ${forceWhiteLogo ? 'brightness-0 invert' : 'grayscale'}`}
                    onError={(e) => {
                       // Hide watermark if load fails to avoid ugly broken icon
                       (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
               ) : null}
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center flex-1 w-full px-3 pt-8 pb-3">
               <div className="relative mb-3 group-hover:scale-105 transition-transform duration-300">
                  <div className="absolute inset-0 rounded-full blur-md opacity-50" style={{ backgroundColor: teamColor }}></div>
                  
                  {/* Main Image with Fallback */}
                  <img 
                      key={player.id}
                      src={imgError ? ROLE_ICONS[role] : (player.photo || ROLE_ICONS[role])} 
                      alt={player.name}
                      onError={() => setImgError(true)}
                      className={`w-24 h-24 rounded-full border-4 shadow-xl relative z-10 object-cover bg-gray-900 ${!player.photo || imgError ? 'p-4 bg-black/50' : ''}`}
                      style={{ borderColor: teamColor }}
                  />
                  
                  <div className="absolute -bottom-2 -right-2 bg-black rounded-full p-1 border border-gray-600 z-20">
                      {teamInfo.logo ? (
                           <img 
                              src={teamInfo.logo} 
                              alt="" 
                              className={`w-6 h-6 rounded-full object-contain ${forceWhiteLogo ? 'brightness-0 invert' : ''}`}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${teamInfo.shortName}&background=${teamInfo.color.replace('#','')}&color=fff&size=32`;
                              }}
                           />
                      ) : (
                          <div className="w-6 h-6 rounded-full" style={{ backgroundColor: teamColor }}></div>
                      )}
                  </div>
               </div>

               <div className="flex flex-col items-center justify-center flex-grow w-full">
                   <h3 className="text-xl font-bold text-white mb-0.5 tracking-wide text-center leading-tight drop-shadow-md truncate max-w-full px-1">{player.name}</h3>
                   <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-0.5 rounded bg-black/60 text-gray-300 border border-gray-600/50 mb-4 backdrop-blur-sm">
                      {teamInfo.shortName}
                   </span>

                   {/* Stats Stack */}
                   <div className="w-full flex flex-col gap-2 mt-auto">
                      
                      {/* Cost Row */}
                      <div className="bg-[#0f1923] px-3 py-2 rounded border border-gray-600/50 shadow-inner flex items-center justify-between relative overflow-hidden group/stat w-full hover:border-[#0ac8b9]/50 transition-colors">
                          <div className="absolute inset-0 bg-[#0ac8b9]/5 opacity-0 group-hover/stat:opacity-100 transition-opacity"></div>
                          <div className="flex items-center gap-2 relative z-10">
                              <Coins className="w-4 h-4 text-[#0ac8b9] flex-shrink-0" />
                          </div>
                          <span className="font-bold text-lg text-white tracking-tight leading-none relative z-10">${player.cost}</span>
                      </div>

                      {/* Average Row */}
                      <div className="bg-[#0f1923] px-3 py-2 rounded border border-gray-600/50 shadow-inner flex items-center justify-between relative overflow-hidden group/stat w-full hover:border-[#c8aa6e]/50 transition-colors">
                          <div className="absolute inset-0 bg-[#c8aa6e]/5 opacity-0 group-hover/stat:opacity-100 transition-opacity"></div>
                          <div className="flex items-center gap-2 relative z-10">
                              <TrendingUp className="w-4 h-4 text-[#c8aa6e] flex-shrink-0" />
                          </div>
                          <span className="font-bold text-lg text-white tracking-tight leading-none relative z-10">{player.averagePoints}</span>
                      </div>

                      {/* KDA Row */}
                      <div className="bg-[#0f1923] px-3 py-2 rounded border border-gray-600/50 shadow-inner flex items-center justify-between relative overflow-hidden group/stat w-full hover:border-red-400/50 transition-colors">
                          <div className="absolute inset-0 bg-red-400/5 opacity-0 group-hover/stat:opacity-100 transition-opacity"></div>
                          <div className="flex items-center gap-2 relative z-10">
                              <Swords className="w-4 h-4 text-red-400 flex-shrink-0" />
                          </div>
                          <span className="font-bold text-lg text-white tracking-tight leading-none relative z-10">{player.kda.toFixed(2)}</span>
                      </div>

                   </div>
               </div>
            </div>

            {/* Remove Button (Only if NOT read-only) */}
            {!readOnly && (
              <button 
                onClick={() => onSelect(role, null)}
                className="absolute top-2 left-2 p-2 text-gray-400 hover:text-white hover:bg-red-500/20 rounded-full transition-colors z-30"
                title="Cambiar jugador"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </>
        ) : (
          // --- STATE: EMPTY SLOT ---
          <div className="flex-1 flex flex-col items-center justify-center p-4">
             <div className="w-16 h-16 rounded-full bg-[#0a1428] border border-gray-700 flex items-center justify-center mb-6 shadow-inner group-hover:border-[#0ac8b9] transition-colors">
               <Shield className="w-8 h-8 text-gray-700 group-hover:text-[#0ac8b9] transition-colors" />
             </div>
             <h4 className="text-[#0ac8b9] text-lg font-bold uppercase tracking-widest mb-1">{role}</h4>
             <p className="text-gray-500 text-xs text-center mb-6">
                {readOnly ? 'Sin selección' : 'Selecciona un jugador'}
             </p>
             
             {!readOnly && (
               <div className="w-full relative z-30">
                 <SearchableSelect 
                    label="" 
                    options={options}
                    value=""
                    onChange={(val) => onSelect(role, val)}
                    placeholder="Buscar..."
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

// --- USER SEARCH MODAL ---
interface UserSummary {
    id: string;
    name: string;
    avatar: string;
}

const UserSearchModal = ({ isOpen, onClose, onSelect }: { isOpen: boolean; onClose: () => void; onSelect: (user: UserSummary) => void }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState<UserSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchUsers = async () => {
                setIsLoading(true);
                try {
                    // Fetch real users from DB
                    const realUsers = await dataService.getAllUsers();
                    setUsers(realUsers.map(u => ({ id: u.id, name: u.name, avatar: u.avatar })));
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchUsers();
        }
    }, [isOpen]);
    
    // Filter users based on search
    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-lg bg-[#091428] border-2 border-[#0ac8b9] rounded-xl overflow-hidden shadow-[0_0_50px_rgba(10,200,185,0.2)] animate-in zoom-in-95">
                <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-[#0f1923]">
                    <h3 className="text-lg font-bold text-white uppercase flex items-center gap-2">
                        <Search className="w-5 h-5 text-[#0ac8b9]" />
                        Explorar Rivales
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-4 bg-[#0a1428]">
                    <div className="relative mb-4">
                        <input 
                            type="text" 
                            placeholder="Buscar invocador..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                            className="w-full bg-[#1e293b] text-white rounded-lg pl-10 pr-4 py-3 border border-gray-600 focus:border-[#0ac8b9] focus:outline-none"
                        />
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-[#0ac8b9]" />
                            </div>
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.map(user => (
                                <button 
                                    key={user.id} 
                                    onClick={() => onSelect(user)}
                                    className="w-full flex items-center justify-between p-3 rounded-lg bg-[#0f1923] border border-gray-700 hover:border-[#0ac8b9] hover:bg-[#162236] transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border border-gray-600 group-hover:border-[#0ac8b9]" />
                                        <div className="text-left">
                                            <div className="font-bold text-gray-200 group-hover:text-white">{user.name}</div>
                                        </div>
                                    </div>
                                    <ArrowLeft className="w-4 h-4 text-gray-600 group-hover:text-[#0ac8b9] rotate-180" />
                                </button>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No se encontraron usuarios
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- PLAYER EDITOR (ADMIN) ---
const PlayerEditor = ({ players, teams, onUpdate }: { players: Player[], teams: Record<string, Team>, onUpdate: () => void }) => {
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Player>>({});
    const [isSaving, setIsSaving] = useState(false);

    const filtered = players.filter(p => {
        const matchesRole = roleFilter === 'ALL' || p.role === roleFilter;
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        return matchesRole && matchesSearch;
    });

    const startEdit = (player: Player) => {
        setEditingId(player.id);
        setEditForm({
            cost: player.cost,
            averagePoints: player.averagePoints,
            kda: player.kda
        });
    };

    const saveEdit = async (playerId: string) => {
        setIsSaving(true);
        try {
            await dataService.updatePlayer(playerId, editForm);
            setEditingId(null);
            onUpdate(); // Refresh parent data
        } catch (e) {
            console.error(e);
            alert("Error al guardar");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-[#091428] border border-gray-700 rounded-xl overflow-hidden mt-6 animate-in slide-in-from-bottom-8">
            <div className="p-4 bg-red-900/20 border-b border-red-900/50 flex flex-col md:flex-row items-center justify-between gap-4">
                 <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-widest">
                    <Settings className="w-5 h-5" />
                    Editor de Jugadores (Admin)
                 </div>
                 
                 <div className="flex items-center gap-2 w-full md:w-auto">
                     <select 
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as Role | 'ALL')}
                        className="bg-[#050a14] text-white text-xs rounded border border-gray-700 p-2"
                     >
                         <option value="ALL">Todos los Roles</option>
                         {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                     </select>
                     <div className="relative flex-1">
                         <input 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar jugador..."
                            className="w-full bg-[#050a14] text-white text-xs rounded pl-8 pr-2 py-2 border border-gray-700"
                         />
                         <Search className="w-3 h-3 text-gray-500 absolute left-2.5 top-2.5" />
                     </div>
                 </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-[#0f1923] text-gray-500 uppercase font-bold text-xs sticky top-0 z-10">
                        <tr>
                            <th className="p-3">Jugador</th>
                            <th className="p-3">Coste ($)</th>
                            <th className="p-3">Media Pts</th>
                            <th className="p-3">KDA</th>
                            <th className="p-3 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {filtered.map(player => {
                            const isEditing = editingId === player.id;
                            const team = teams[player.teamId];

                            return (
                                <tr key={player.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <img src={player.photo || ROLE_ICONS[player.role]} alt="" className="w-8 h-8 rounded-full bg-gray-800 object-cover" />
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black border border-gray-600 flex items-center justify-center">
                                                    <img src={team?.logo} className="w-3 h-3 object-contain" />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">{player.name}</div>
                                                <div className="text-[10px] uppercase">{player.role}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        {isEditing ? (
                                            <input 
                                                type="number" 
                                                value={editForm.cost} 
                                                onChange={e => setEditForm({...editForm, cost: Number(e.target.value)})}
                                                className="w-16 bg-black border border-gray-600 rounded p-1 text-white"
                                            />
                                        ) : (
                                            <span className="text-[#0ac8b9] font-bold">${player.cost}</span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {isEditing ? (
                                            <input 
                                                type="number" 
                                                value={editForm.averagePoints} 
                                                onChange={e => setEditForm({...editForm, averagePoints: Number(e.target.value)})}
                                                className="w-16 bg-black border border-gray-600 rounded p-1 text-white"
                                            />
                                        ) : (
                                            <span className="text-[#c8aa6e] font-bold">{player.averagePoints}</span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {isEditing ? (
                                            <input 
                                                type="number" 
                                                value={editForm.kda} 
                                                onChange={e => setEditForm({...editForm, kda: Number(e.target.value)})}
                                                className="w-16 bg-black border border-gray-600 rounded p-1 text-white"
                                            />
                                        ) : (
                                            <span className="text-red-400 font-bold">{player.kda?.toFixed(2)}</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        {isEditing ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => saveEdit(player.id)} disabled={isSaving} className="text-green-400 hover:text-green-300">
                                                    <Save className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setEditingId(null)} className="text-red-400 hover:text-red-300">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button onClick={() => startEdit(player)} className="text-gray-500 hover:text-white transition-colors">
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
    );
};

interface FantasyViewProps {
    currentUserId?: string | null;
    isAdmin?: boolean;
}

export const FantasyView: React.FC<FantasyViewProps> = ({ currentUserId, isAdmin }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Admin Mode
  const [isEditMode, setIsEditMode] = useState(false);

  // Local state for "My Team"
  const [myTeam, setMyTeam] = useState<Record<Role, string | null>>({
    [Role.TOP]: null,
    [Role.JUNGLE]: null,
    [Role.MID]: null,
    [Role.ADC]: null,
    [Role.SUPPORT]: null,
  });

  // State for "Other User's Team" (loaded dynamically)
  const [otherTeam, setOtherTeam] = useState<Record<Role, string | null> | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load Players, Teams and Saved Fantasy Team on mount
  useEffect(() => {
    loadData();
  }, [currentUserId]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
        const [fetchedPlayers, fetchedTeams] = await Promise.all([
            dataService.getPlayers(),
            dataService.getTeams()
        ]);
        
        setPlayers(fetchedPlayers);
        setTeams(fetchedTeams);

        if (currentUserId) {
            const savedTeam = await dataService.getFantasyTeam(currentUserId);
            if (savedTeam) {
                setMyTeam(savedTeam);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        setIsLoadingData(false);
    }
  };

  // State for which user's team we are viewing (null = me)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<UserSummary | null>(null);
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isReadOnly = !!viewingUserId;

  // Effect: Load opponent's team when viewingUserId changes
  useEffect(() => {
    const loadOpponentTeam = async () => {
        if (viewingUserId) {
            setIsLoadingData(true);
            try {
                const team = await dataService.getFantasyTeam(viewingUserId);
                setOtherTeam(team || {
                    [Role.TOP]: null,
                    [Role.JUNGLE]: null,
                    [Role.MID]: null,
                    [Role.ADC]: null,
                    [Role.SUPPORT]: null,
                });
            } catch (e) {
                console.error("Error loading opponent team", e);
            } finally {
                setIsLoadingData(false);
            }
        } else {
            setOtherTeam(null);
        }
    };
    loadOpponentTeam();
  }, [viewingUserId]);

  const displayTeam = isReadOnly && otherTeam ? otherTeam : myTeam;

  const handleSelect = (role: Role, playerId: string | null) => {
    if (!isReadOnly && !isEditMode) {
        setMyTeam(prev => ({ ...prev, [role]: playerId }));
        setSaveStatus('idle'); 
    }
  };

  const handleSave = async () => {
    if (!currentUserId) return;
    setIsSaving(true);
    setSaveStatus('idle');
    try {
        await dataService.saveFantasyTeam(currentUserId, myTeam);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
        console.error(e);
        setSaveStatus('error');
    } finally {
        setIsSaving(false);
    }
  };

  // Calculate totals
  const { totalCost, totalPoints } = useMemo(() => {
    let cost = 0;
    let points = 0;
    
    // Safely iterate over displayTeam values, checking if it exists
    if (displayTeam) {
        Object.values(displayTeam).forEach(playerId => {
        if (playerId) {
            const player = players.find(p => p.id === playerId);
            if (player) {
            cost += player.cost;
            points += player.averagePoints;
            }
        }
        });
    }
    return { totalCost: cost, totalPoints: points };
  }, [displayTeam, players]);

  const remainingBudget = MAX_BUDGET - totalCost;
  const isOverBudget = remainingBudget < 0;
  const isFullTeam = displayTeam ? Object.values(displayTeam).every(v => v !== null) : false;

  if (isLoadingData && !isSearchOpen) {
      return (
          <div className="w-full h-[60vh] flex flex-col items-center justify-center text-[#0ac8b9]">
              <Loader2 className="w-12 h-12 animate-spin mb-4" />
              <p>Cargando datos...</p>
          </div>
      );
  }

  return (
    <div className="w-[98%] max-w-[2400px] mx-auto animate-in fade-in slide-in-from-bottom-4 pb-20 pt-4">
      
      {/* Top Navigation */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 px-2">
        <div className="w-full md:w-auto flex items-center gap-4">
            {isReadOnly && viewingUser ? (
                <div className="flex items-center gap-3 bg-[#0f1923] border border-[#c8aa6e]/50 p-2 pr-6 rounded-full animate-in slide-in-from-left-4">
                    <button 
                        onClick={() => {
                            setViewingUserId(null);
                            setViewingUser(null);
                        }}
                        className="w-10 h-10 rounded-full bg-[#0a1428] border border-gray-600 flex items-center justify-center hover:bg-gray-800 hover:text-[#c8aa6e] transition-colors"
                        title="Volver a mi equipo"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <img src={viewingUser.avatar} alt={viewingUser.name} className="w-10 h-10 rounded-full object-cover border border-[#c8aa6e]" />
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-[#c8aa6e] tracking-widest leading-none mb-0.5">Viendo a</span>
                        <span className="font-bold text-white text-lg leading-none">{viewingUser.name}</span>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3 p-2">
                     <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0ac8b9] to-[#0a7e78] flex items-center justify-center shadow-[0_0_15px_rgba(10,200,185,0.3)]">
                        <UserIcon className="w-6 h-6 text-[#0a1428]" />
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-[#0ac8b9] tracking-widest leading-none mb-0.5">Modo Edición</span>
                        <h1 className="font-bold text-2xl text-white leading-none">Tu Equipo</h1>
                     </div>
                </div>
            )}
        </div>

        <div className="flex items-center gap-2">
            {isAdmin && (
                <button 
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`
                        flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all
                        ${isEditMode 
                            ? 'bg-red-600 border-red-400 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' 
                            : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white hover:border-gray-400'
                        }
                    `}
                >
                    <Settings className={`w-4 h-4 ${isEditMode ? 'animate-spin-slow' : ''}`} />
                    {isEditMode ? 'Salir Admin' : 'Admin'}
                </button>
            )}

            <button 
                onClick={() => setIsSearchOpen(true)}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#1e293b] hover:bg-[#2d3b55] text-white px-6 py-2 rounded-xl border border-gray-600 hover:border-[#c8aa6e] transition-all shadow-lg group"
            >
                <Search className="w-5 h-5 text-gray-400 group-hover:text-[#c8aa6e] transition-colors" />
                <span className="font-bold text-sm tracking-wide">Explorar Rivales</span>
            </button>
        </div>
      </div>

      {isEditMode ? (
          <PlayerEditor players={players} teams={teams} onUpdate={loadData} />
      ) : (
          <>
            {/* Header Stats Bar */}
            <div className="sticky top-[70px] z-40 bg-[#091428]/95 backdrop-blur-md border-y border-gray-700 shadow-xl mb-6 -mx-4 px-4 py-3 sm:rounded-xl sm:border sm:mx-4 sm:top-4 transition-colors duration-500">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-5xl mx-auto">
                    <div className="hidden lg:flex items-center gap-3">
                        <span className={`text-sm font-bold uppercase tracking-widest ${isReadOnly ? 'text-[#c8aa6e]' : 'text-[#0ac8b9]'}`}>
                            {isReadOnly ? `Alineación de ${viewingUser?.name}` : 'Resumen de Alineación'}
                        </span>
                    </div>
                    <div className="flex-1 w-full sm:w-auto">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-1.5">
                            <span className="flex items-center gap-2 text-gray-300">
                                <Coins className="w-4 h-4 text-[#0ac8b9]" />
                                {isReadOnly ? 'Coste Total' : 'Presupuesto'}
                            </span>
                            <span className={`${isOverBudget ? 'text-red-500' : 'text-[#0ac8b9]'}`}>
                                ${totalCost} / ${MAX_BUDGET}
                            </span>
                        </div>
                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                            <div 
                                className={`h-full transition-all duration-500 ${isOverBudget ? 'bg-red-500' : 'bg-gradient-to-r from-[#0a7e78] to-[#0ac8b9]'}`}
                                style={{ width: `${Math.min((totalCost / MAX_BUDGET) * 100, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-black/30 px-4 py-2 rounded-lg border border-gray-700">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-[#c8aa6e]" />
                            <div className="flex flex-col leading-none">
                                <span className="text-xl font-bold text-white">{totalPoints.toFixed(1)}</span>
                                <span className="text-[10px] text-gray-500 uppercase">Puntos/Jornada</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 px-2">
                {Object.values(Role).map((role) => (
                <PlayerCard 
                    key={role} 
                    role={role} 
                    playerId={displayTeam ? displayTeam[role] : null} 
                    onSelect={handleSelect} 
                    readOnly={isReadOnly}
                    players={players}
                    teams={teams}
                />
                ))}
            </div>

            {/* Actions Footer */}
            {!isReadOnly && (
                <div className="mt-12 flex flex-col items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="space-y-2 text-center">
                        {isOverBudget && (
                            <div className="animate-in zoom-in bg-red-900/20 border border-red-500 text-red-400 px-6 py-2 rounded-full flex items-center gap-2 text-sm font-bold">
                                <AlertTriangle className="w-4 h-4" />
                                Presupuesto Excedido
                            </div>
                        )}
                        {isFullTeam && !isOverBudget && (
                            <div className="animate-in zoom-in duration-300 bg-[#0ac8b9]/10 border border-[#0ac8b9] px-6 py-2 rounded-full flex items-center gap-2">
                                <Zap className="w-4 h-4 text-[#0ac8b9] fill-current" />
                                <span className="text-[#0ac8b9] font-bold uppercase tracking-widest text-sm">Equipo Completo</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <button 
                            onClick={() => setMyTeam({ [Role.TOP]: null, [Role.JUNGLE]: null, [Role.MID]: null, [Role.ADC]: null, [Role.SUPPORT]: null })}
                            className="px-6 py-3 rounded-xl border border-gray-600 text-gray-400 hover:bg-gray-800 hover:text-white transition-all flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span className="hidden sm:inline">Reiniciar</span>
                        </button>
                        
                        <button 
                            onClick={handleSave}
                            disabled={isSaving || isOverBudget}
                            className={`
                            font-bold px-10 py-3 rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center gap-2
                            ${isFullTeam && !isOverBudget
                                ? 'bg-gradient-to-r from-[#0ac8b9] to-[#0a7e78] text-black shadow-[0_0_20px_rgba(10,200,185,0.4)]' 
                                : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                            }
                        `}>
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                        saveStatus === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
                        <Save className="w-5 h-5" />}
                        
                        {saveStatus === 'success' ? '¡Guardado!' : 'Guardar Alineación'}
                        </button>
                    </div>
                </div>
            )}
          </>
      )}

      {/* User Search Modal */}
      <UserSearchModal 
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)}
          onSelect={(user) => {
              setViewingUserId(user.id);
              setViewingUser(user);
              setIsSearchOpen(false);
          }}
      />
    </div>
  );
};