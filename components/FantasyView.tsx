import React, { useState, useMemo, useEffect } from 'react';
import { ROLE_ICONS, WHITE_LOGO_TEAMS, USERS } from '../constants';
import { Role, Player, Team } from '../types';
import { Save, RefreshCw, X, Shield, Zap, Coins, TrendingUp, AlertTriangle, Swords, Search, ArrowLeft, User as UserIcon, Loader2, CheckCircle2 } from 'lucide-react';
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

// ... UserSearchModal remains the same ...

interface FantasyViewProps {
    currentUserId?: string | null;
}

export const FantasyView: React.FC<FantasyViewProps> = ({ currentUserId }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Local state for "My Team"
  const [myTeam, setMyTeam] = useState<Record<Role, string | null>>({
    [Role.TOP]: null,
    [Role.JUNGLE]: null,
    [Role.MID]: null,
    [Role.ADC]: null,
    [Role.SUPPORT]: null,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load Players, Teams and Saved Fantasy Team on mount
  useEffect(() => {
    const fetchData = async () => {
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
    fetchData();
  }, [currentUserId]);

  // State for which user's team we are viewing (null = me)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const viewingUser = viewingUserId ? USERS.find(u => u.id === viewingUserId) : null;
  const displayTeam = viewingUser && viewingUser.fantasyTeam ? viewingUser.fantasyTeam : myTeam;
  const isReadOnly = !!viewingUserId;

  const handleSelect = (role: Role, playerId: string | null) => {
    if (!isReadOnly) {
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
    Object.values(displayTeam).forEach(playerId => {
      if (playerId) {
        const player = players.find(p => p.id === playerId);
        if (player) {
          cost += player.cost;
          points += player.averagePoints;
        }
      }
    });
    return { totalCost: cost, totalPoints: points };
  }, [displayTeam, players]);

  const remainingBudget = MAX_BUDGET - totalCost;
  const isOverBudget = remainingBudget < 0;
  const isFullTeam = Object.values(displayTeam).every(v => v !== null);

  if (isLoadingData) {
      return (
          <div className="w-full h-[60vh] flex flex-col items-center justify-center text-[#0ac8b9]">
              <Loader2 className="w-12 h-12 animate-spin mb-4" />
              <p>Cargando mercado de fichajes...</p>
          </div>
      );
  }

  return (
    <div className="w-[98%] max-w-[2400px] mx-auto animate-in fade-in slide-in-from-bottom-4 pb-20 pt-4">
      
      {/* Top Navigation */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 px-2">
        <div className="w-full md:w-auto flex items-center gap-4">
            {isReadOnly ? (
                <div className="flex items-center gap-3 bg-[#0f1923] border border-[#c8aa6e]/50 p-2 pr-6 rounded-full animate-in slide-in-from-left-4">
                    <button 
                        onClick={() => setViewingUserId(null)}
                        className="w-10 h-10 rounded-full bg-[#0a1428] border border-gray-600 flex items-center justify-center hover:bg-gray-800 hover:text-[#c8aa6e] transition-colors"
                        title="Volver a mi equipo"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <img src={viewingUser?.avatar} alt={viewingUser?.name} className="w-10 h-10 rounded-full object-cover border border-[#c8aa6e]" />
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-[#c8aa6e] tracking-widest leading-none mb-0.5">Viendo a</span>
                        <span className="font-bold text-white text-lg leading-none">{viewingUser?.name}</span>
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
        <button 
            onClick={() => setIsSearchOpen(true)}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#1e293b] hover:bg-[#2d3b55] text-white px-6 py-3 rounded-xl border border-gray-600 hover:border-[#c8aa6e] transition-all shadow-lg group"
        >
            <Search className="w-5 h-5 text-gray-400 group-hover:text-[#c8aa6e] transition-colors" />
            <span className="font-bold text-sm tracking-wide">Explorar Rivales</span>
        </button>
      </div>

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
            playerId={displayTeam[role]} 
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

      {/* User Search Modal (Using USERS constant for now as user search isn't in DB yet) */}
      {/* ... UserSearchModal Implementation would go here or imported ... */}
    </div>
  );
};