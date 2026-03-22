
import React, { useState, useEffect } from 'react';
import { ROLE_ICONS, normalizeSplitId } from '../constants';
import { Sparkles, RefreshCw, Trophy, User, Sword, Shield, Hash, Loader2, Save, CheckCircle2, AlertCircle, Settings, Medal, Star, HelpCircle, XCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { SearchableSelect, Option } from './ui/SearchableSelect';
import { getChampions } from '../services/riotService';
import { dataService } from '../services/dataService';
import { Role, Player, Team, User as UserType } from '../types';

interface CrystalBallProps {
    currentUserId?: string | null;
    isAdmin?: boolean;
    selectedSplit?: string | null;
}

const RANKED_CATEGORIES = [
    'fastest_win_team', 'longest_win_team',
    'highest_kda',
    'most_picked', 'most_banned', 'highest_wr', 'lowest_wr', 'most_kills'
];

const SINGLE_CATEGORIES = [
    'winter_champ', 'mvp', 'rookie',
    'best_top', 'best_jng', 'best_mid', 'best_adc', 'best_sup',
    'total_pentakills'
];

const getRequiredKeys = (mode: 'prediction' | 'official_result') => {
    let keys = [...SINGLE_CATEGORIES];
    if (mode === 'official_result') {
        RANKED_CATEGORIES.forEach(cat => {
            keys.push(`${cat}_1`, `${cat}_2`, `${cat}_3`);
        });
    } else {
        keys = [...keys, ...RANKED_CATEGORIES];
    }
    return keys;
};

// Helper component for Score Badge
const ScoreBadge = ({ score, maxScore }: { score: number, maxScore: number }) => {
    if (score === maxScore) {
        return (
            <div className="flex-shrink-0 flex items-center gap-1 text-green-400 text-xs font-bold bg-green-950/50 px-2 py-1 rounded border border-green-500/30 animate-in zoom-in">
                <CheckCircle2 className="w-3 h-3" />
                <span>+{score} Pts</span>
            </div>
        );
    }
    if (score > 0) {
        return (
            <div className="flex-shrink-0 flex items-center gap-1 text-yellow-400 text-xs font-bold bg-yellow-950/50 px-2 py-1 rounded border border-yellow-500/30 animate-in zoom-in">
                <AlertCircle className="w-3 h-3" />
                <span>+{score} Pts</span>
            </div>
        );
    }
    return (
        <div className="flex-shrink-0 flex items-center gap-1 text-red-400 text-xs font-bold bg-red-950/50 px-2 py-1 rounded border border-red-500/30 animate-in zoom-in">
            <XCircle className="w-3 h-3" />
            <span>0 Pts</span>
        </div>
    );
};

// Helper for Ranked Selector feedback
const getRankedScore = (userValue: string, baseKey: string, officialResults: any) => {
    if (!userValue || !officialResults) return 0;
    if (userValue === officialResults[`${baseKey}_1`]) return 5;
    if (userValue === officialResults[`${baseKey}_2`]) return 3;
    if (userValue === officialResults[`${baseKey}_3`]) return 1;
    return 0;
};

// Sub-component for Ranked Selection
const RankedSelector = ({ label, options, baseKey, selections, onChange, placeholder, mode, officialResults, disabled }: any) => {
    
    if (mode === 'official_result') {
        // ADMIN VIEW
        return (
            <div className="bg-[#0f1923] p-4 rounded-xl border border-gray-700 shadow-lg relative group">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/30 group-hover:bg-blue-500 transition-colors"></div>
                <h4 className="text-sm font-bold text-[#c8aa6e] uppercase tracking-widest mb-4 pl-2 border-b border-gray-800 pb-2 truncate">{label}</h4>
                <div className="space-y-4">
                    {['1', '2', '3'].map((rank, idx) => (
                        <div key={rank} className="relative">
                            <div className={`absolute -left-2 top-1/2 -translate-y-1/2 z-10 shadow-lg`}>
                                <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs border ${
                                    rank === '1' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-[#0a1428] border-[#f0e6d2]' : 
                                    rank === '2' ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-[#0a1428] border-gray-200' :
                                    'bg-gradient-to-br from-orange-400 to-orange-700 text-white border-orange-300'
                                }`}>{rank}º</div>
                            </div>
                            <div className="pl-6">
                                <SearchableSelect
                                    label=""
                                    options={options}
                                    placeholder="Seleccionar..."
                                    value={selections[`${baseKey}_${rank}`]}
                                    onChange={(v) => onChange(`${baseKey}_${rank}`, v)}
                                    className="w-full"
                                    disabled={disabled}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // USER VIEW
    const score = officialResults ? getRankedScore(selections[baseKey], baseKey, officialResults) : null;
    const hasResult = officialResults && Object.keys(officialResults).length > 0;
    
    // Feedback Style
    let borderClass = 'border-gray-700 hover:border-blue-500/30';
    if (hasResult) {
        if (score === 5) borderClass = 'border-green-500/50 bg-green-900/10';
        else if (score === 3 || score === 1) borderClass = 'border-yellow-500/50 bg-yellow-900/10';
        else borderClass = 'border-red-500/30 bg-red-900/5';
    }

    // Get Official Text for tooltip if wrong
    const getOfficialText = () => {
        if (!hasResult || score === 5) return null;
        const opt1 = options.find((o: any) => o.id === officialResults[`${baseKey}_1`]);
        return opt1 ? `1º Real: ${opt1.label}` : '1º Real: Desconocido';
    };

    return (
        <div className={`bg-[#0f1923] p-4 rounded-xl border shadow-lg transition-all ${borderClass}`}>
            <div className="flex justify-between items-start mb-3 border-b border-gray-800 pb-2 gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                    <h4 className="text-sm font-bold text-[#c8aa6e] uppercase tracking-widest truncate">{label}</h4>
                    {!hasResult && (
                        <div className="flex items-center gap-1 text-[10px] text-blue-300">
                            <HelpCircle className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">Acierta 1º(5), 2º(3) o 3º(1).</span>
                        </div>
                    )}
                    {hasResult && score !== 5 && (
                        <span className="text-[10px] text-gray-400 truncate">{getOfficialText()}</span>
                    )}
                </div>
                {hasResult && <ScoreBadge score={score || 0} maxScore={5} />}
            </div>
            <SearchableSelect
                label=""
                options={options}
                placeholder={placeholder || "Seleccionar..."}
                value={selections[baseKey]}
                onChange={(v) => onChange(baseKey, v)}
                className="w-full"
                disabled={disabled}
            />
        </div>
    );
};

// Wrapper for Single Selectors with Feedback
const ScoredSelect = ({ label, options, categoryKey, selections, onChange, placeholder, officialResults, points = 5, mode, disabled }: any) => {
    const userVal = selections[categoryKey];
    
    // Only apply prediction logic if NOT in admin 'official_result' mode
    const isPredictionMode = mode !== 'official_result';
    
    const adminVal = isPredictionMode && officialResults ? officialResults[categoryKey] : null;
    const hasResult = isPredictionMode && officialResults && Object.keys(officialResults).length > 0;
    const isCorrect = hasResult && userVal === adminVal;
    
    let borderClass = 'border-gray-700 hover:border-gray-500';
    if (!isPredictionMode) {
        // Neutral styling for Admin Mode
        borderClass = 'border-gray-700 hover:border-gray-500';
    } else if (hasResult) {
        borderClass = isCorrect ? 'border-green-500/50 bg-green-900/10' : 'border-red-500/30 bg-red-900/5';
    }

    const officialOption = hasResult && !isCorrect ? options.find((o: any) => o.id === adminVal) : null;

    return (
        <div className={`bg-[#0f1923] p-3 rounded-xl border shadow-lg transition-all ${borderClass}`}>
            <div className="flex justify-between items-center mb-3 gap-2">
                <div className="flex flex-col min-w-0">
                    <h4 className="text-sm font-bold text-[#c8aa6e] uppercase tracking-widest truncate">{label}</h4>
                    {officialOption && <span className="text-[10px] text-gray-400 truncate">Real: {officialOption.label}</span>}
                </div>
                {/* ScoreBadge only in prediction mode with results */}
                {hasResult && <ScoreBadge score={isCorrect ? points : 0} maxScore={points} />}
            </div>
            <SearchableSelect 
                label="" 
                options={options} 
                value={userVal}
                placeholder={placeholder}
                onChange={(v) => onChange(categoryKey, v)}
                disabled={disabled}
            />
        </div>
    );
};

export const CrystalBall: React.FC<CrystalBallProps> = ({ currentUserId, isAdmin, selectedSplit: propSplit }) => {
  const selectedSplit = normalizeSplitId(propSplit || localStorage.getItem('selectedSplit'));
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [officialResults, setOfficialResults] = useState<Record<string, string> | null>(null);
  const [championOptions, setChampionOptions] = useState<Option[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  
  const [loadingChamps, setLoadingChamps] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [mode, setMode] = useState<'prediction' | 'official_result'>('prediction');
  const [isLocked, setIsLocked] = useState(false);
  
  // Viewing State (For checking other users)
  const [viewingUserId, setViewingUserId] = useState<string | null>(currentUserId || null);

  useEffect(() => {
    const loadData = async () => {
        setLoadingData(true);
        try {
            const [playersList, teamsMap, usersList] = await Promise.all([
                dataService.getPlayers(false, selectedSplit),
                dataService.getTeams(false, selectedSplit),
                dataService.getAllUsers(selectedSplit)
            ]);
            setPlayers(playersList);
            setTeams(Object.values(teamsMap));
            setAllUsers(usersList);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingData(false);
        }
    };
    loadData();
  }, [selectedSplit]);

  useEffect(() => {
      // Set initial viewing user
      if (currentUserId && !viewingUserId) {
          setViewingUserId(currentUserId);
      }
  }, [currentUserId]);

  useEffect(() => {
    const checkLockStatus = async () => {
        // Official result editing is never locked for admin
        if (mode === 'official_result') {
            setIsLocked(false);
            return;
        }

        try {
            // Check start time of Day 1 matches
            const matches = await dataService.getMatches(1);
            if (matches.length > 0) {
                const sortedMatches = matches.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                const firstMatchStart = new Date(sortedMatches[0].startTime);
                const now = new Date();
                
                if (now >= firstMatchStart) {
                    setIsLocked(true);
                } else {
                    setIsLocked(false);
                }
            }
        } catch (e) {
            console.error("Error checking lock status", e);
        }
    };
    checkLockStatus();
  }, [mode]); 

  // Load Selections whenever viewingUserId changes
  useEffect(() => {
    const loadSelections = async () => {
        try {
            const adminRes = await dataService.getAdminCrystalBallResults(selectedSplit);
            setOfficialResults(adminRes);

            if (isAdmin && mode === 'official_result') {
                 setSelections(adminRes || {});
            } else if (viewingUserId) {
                 const userRes = await dataService.getCrystalBall(viewingUserId, selectedSplit);
                 setSelections(userRes || {});
            }
        } catch (e) {
            console.error("Error loading selections", e);
        }
    };
    loadSelections();
  }, [viewingUserId, mode, isAdmin, selectedSplit]);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingChamps(true);
      try {
        const champs = await getChampions();
        const sorted = champs.sort((a, b) => a.label.localeCompare(b.label));
        setChampionOptions(sorted);
      } catch (error) {
        console.error("Failed to load champions", error);
      } finally {
        setLoadingChamps(false);
      }
    };
    fetchData();
  }, []);

  const handleSelectionChange = (key: string, value: string) => {
    if ((isLocked && mode === 'prediction') || viewingUserId !== currentUserId) return;
    setSelections(prev => ({ ...prev, [key]: value }));
    setSaveStatus('idle');
  };

  const handleSave = async () => {
      if ((isLocked && mode === 'prediction') || viewingUserId !== currentUserId) return;

      if (!currentUserId && !isAdmin) {
          alert("Debes iniciar sesión.");
          return;
      }
      setIsSaving(true);
      setSaveStatus('idle');
      try {
          if (isAdmin && mode === 'official_result') {
              await dataService.saveAdminCrystalBallResults(selections, selectedSplit);
              setOfficialResults(selections); // Update local feedback immediately
          } else if (currentUserId) {
              await dataService.saveCrystalBall(currentUserId, selections, selectedSplit);
          }
          setSaveStatus('success');
          setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (e: any) {
          console.error(e);
          setSaveStatus('error');
          setErrorMessage(e.message || "Error al guardar");
      } finally {
          setIsSaving(false);
      }
  };

  const checkCompletion = () => {
      if (mode === 'official_result') return true;
      const required = getRequiredKeys(mode);
      const missing = required.filter(key => !selections[key]);
      return missing.length === 0;
  };

  const isFormComplete = checkCompletion();

  const mapToOption = (p: Player): Option => {
    const team = teams.find(t => t.id === p.teamId);
    return {
        id: p.name,
        label: p.name,
        subLabel: team ? team.name : 'Agente Libre',
        image: p.photo || ROLE_ICONS[p.role as Role], 
        color: team?.color
    };
  };

  const teamOptions: Option[] = teams
    .filter(t => t.id !== 'tbd' && t.name !== 'TBD')
    .map(t => ({
    id: t.id,
    label: t.name,
    subLabel: t.region,
    image: t.logo,
    color: t.color,
    imageClassName: ''
  }));

  const allPlayerOptions: Option[] = players
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(mapToOption);

  // Filter Rookies
  const rookieNames = [
    "Empyros", "Lospa", "Tao", "Hazel", "Prime", "Baus", "Velja",
    "Fleshy", "Stend", "Serin", "Tracyn", "Jopa", "Maynter", "Rhilech",
  ];

  const rookieOptions: Option[] = allPlayerOptions.filter(p => 
    rookieNames.includes(p.label)
  );

  const getPlayerOptionsByRole = (role: Role): Option[] => {
    return players
      .filter(p => p.role === role)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(mapToOption);
  };

  const pentakillOptions: Option[] = [
    { id: '0', label: '0' },
    { id: '1', label: '1' },
    { id: '2', label: '2' },
    { id: '+3', label: '+3' }
  ];

  if (loadingData) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] text-purple-300">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
            <p>Consultando a los astros...</p>
        </div>
      );
  }

  // Calculate Total Score for display
  let totalUserScore = 0;
  if (mode === 'prediction' && officialResults) {
      SINGLE_CATEGORIES.forEach(k => {
          if (selections[k] && selections[k] === officialResults[k]) {
              totalUserScore += (['winter_champ', 'mvp', 'rookie'].includes(k) ? 10 : 5);
          }
      });
      RANKED_CATEGORIES.forEach(k => {
          totalUserScore += getRankedScore(selections[k], k, officialResults);
      });
  }

  // Determine if viewing another user
  const isViewingOther = viewingUserId !== currentUserId;
  const viewingUser = allUsers.find(u => u.id === viewingUserId);

  // Controls should be disabled if: locked AND prediction mode, OR viewing someone else
  const effectiveDisabled = (isLocked && mode === 'prediction') || isViewingOther;

  // Should we show the user selector? Yes if locked (season started) or admin
  const showUserSelector = (isLocked || isAdmin) && mode === 'prediction';

  return (
      <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 mb-24">
        
        {/* Header Area with Admin & User Select */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h2 className={`text-3xl font-bold uppercase tracking-wider mb-1 text-transparent bg-clip-text ${mode === 'official_result' ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-purple-300 to-purple-600'}`}>
                    {mode === 'official_result' ? 'ADMIN: RESULTADOS' : `Bola de Cristal ${normalizeSplitId(selectedSplit) === 'spring_2026' ? 'Spring 2026' : 'Winter 2026'}`}
                </h2>
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-300/80 text-sm">
                        {mode === 'official_result' 
                            ? 'Introduce los resultados oficiales.' 
                            : 'Predicciones del Split.'}
                    </span>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                {/* User Selector (Only visible if Locked/Started) */}
                {showUserSelector && (
                    <div className="flex items-center gap-2 bg-[#0f1923] p-1 pr-3 rounded-lg border border-gray-700">
                        <div className="w-8 h-8 rounded bg-black flex items-center justify-center overflow-hidden border border-gray-600">
                            <img 
                                src={viewingUser?.avatar || `https://ui-avatars.com/api/?name=${viewingUser?.name || '?'}&background=random`} 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <select 
                            value={viewingUserId || ''}
                            onChange={(e) => setViewingUserId(e.target.value)}
                            className="bg-transparent text-white text-sm outline-none font-bold min-w-[120px] max-w-[200px]"
                        >
                            <option value={currentUserId || ''} className="bg-black text-purple-400">Mis Predicciones</option>
                            {allUsers.filter(u => u.id !== currentUserId).map(u => (
                                <option key={u.id} value={u.id} className="bg-black">{u.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Admin Toggle */}
                {isAdmin && (
                    <div className="bg-[#0f1d36] border border-gray-700 p-1 rounded-lg flex items-center gap-1">
                        <button 
                            onClick={() => { setMode('prediction'); setViewingUserId(currentUserId); }}
                            className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors ${mode === 'prediction' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Ver
                        </button>
                        <button 
                            onClick={() => { setMode('official_result'); setViewingUserId(currentUserId); }}
                            className={`px-3 py-1.5 rounded text-xs font-bold uppercase flex items-center gap-2 transition-colors ${mode === 'official_result' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Settings className="w-3 h-3" />
                            Admin
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* View Other User Banner */}
        {isViewingOther && (
            <div className="mb-6 bg-purple-900/20 border border-purple-500/30 p-3 rounded-lg flex items-center gap-3 animate-in slide-in-from-top-2">
                <Eye className="w-5 h-5 text-purple-400" />
                <div>
                    <p className="text-sm font-bold text-purple-200 uppercase">Modo Espectador</p>
                    <p className="text-xs text-purple-300/70">Estás viendo la Bola de Cristal de <span className="font-bold text-white">{viewingUser?.name}</span>.</p>
                </div>
            </div>
        )}

        {totalUserScore > 0 && mode === 'prediction' && (
            <div className="mb-8 flex justify-center">
                <div className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-900/50 to-purple-600/20 border border-purple-500 rounded-full animate-in zoom-in shadow-[0_0_20px_rgba(147,51,234,0.3)]">
                    <Sparkles className="w-5 h-5 text-purple-300" />
                    <span className="text-white font-bold text-lg">Puntos: <span className="text-purple-300 text-xl">{totalUserScore}</span></span>
                </div>
            </div>
        )}

        {isLocked && mode === 'prediction' && !isViewingOther && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 flex items-center justify-center gap-2 text-red-300 mb-6 animate-in slide-in-from-top-2 font-bold uppercase tracking-widest text-sm max-w-lg mx-auto">
                <Lock className="w-4 h-4" />
                <span>Predicciones Cerradas (El Split ha comenzado)</span>
            </div>
        )}

        {/* SCORING LEGEND */}
        {!isViewingOther && (
            <div className="flex flex-wrap justify-center gap-4 mb-10 text-xs font-bold text-gray-400">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-900/20 border border-yellow-500/30 shadow-lg">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span>Campeón, MVP, Rookie: <span className="text-yellow-400 text-sm ml-1">10 Pts</span></span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/20 border border-blue-500/30 shadow-lg">
                    <Medal className="w-4 h-4 text-blue-400" />
                    <span>Rankings (1º/2º/3º): <span className="text-blue-300 text-sm ml-1">5 / 3 / 1 Pts</span></span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-900/20 border border-purple-500/30 shadow-lg">
                    <Star className="w-4 h-4 text-purple-400" />
                    <span>Team of Split / Pentas: <span className="text-purple-300 text-sm ml-1">5 Pts</span></span>
                </div>
            </div>
        )}

        <div className={`space-y-12 transition-all ${mode === 'official_result' ? 'border-l-4 border-red-500 pl-4 bg-red-950/10 py-4 rounded-r-xl' : ''}`}>
          
          {/* SECTION 1: TITLES (10 PTS) */}
          <section>
            <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                 <Trophy className="w-5 h-5 text-yellow-400" />
               </div>
               <h3 className="text-xl font-bold text-white uppercase tracking-wide">Títulos Mayores (10 Pts)</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <ScoredSelect label="Campeón del Split" categoryKey="winter_champ" options={teamOptions} selections={selections} onChange={handleSelectionChange} officialResults={officialResults} points={10} mode={mode} disabled={effectiveDisabled} />
                <ScoredSelect label="MVP del Split" categoryKey="mvp" options={allPlayerOptions} selections={selections} onChange={handleSelectionChange} placeholder="Buscar jugador..." officialResults={officialResults} points={10} mode={mode} disabled={effectiveDisabled} />
                <ScoredSelect label="Rookie del Split" categoryKey="rookie" options={rookieOptions} selections={selections} onChange={handleSelectionChange} placeholder="Buscar rookie..." officialResults={officialResults} points={10} mode={mode} disabled={effectiveDisabled} />
            </div>
          </section>

          {/* SECTION 2: TEAMS (RANKED) */}
          <section>
            <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/30">
                 <Shield className="w-5 h-5 text-blue-400" />
               </div>
               <h3 className="text-xl font-bold text-white uppercase tracking-wide">Estadísticas de Equipos (Ranking)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RankedSelector label="Partida Más Rápida (Win)" baseKey="fastest_win_team" options={teamOptions} selections={selections} onChange={handleSelectionChange} mode={mode} officialResults={officialResults} disabled={effectiveDisabled} />
                <RankedSelector label="Partida Más Larga (Win)" baseKey="longest_win_team" options={teamOptions} selections={selections} onChange={handleSelectionChange} mode={mode} officialResults={officialResults} disabled={effectiveDisabled} />
            </div>
          </section>

          {/* SECTION 3: PLAYERS (RANKED + EVENT) */}
          <section>
            <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
                 <User className="w-5 h-5 text-purple-400" />
               </div>
               <h3 className="text-xl font-bold text-white uppercase tracking-wide">Estadísticas de Jugadores</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RankedSelector label="Jugador con KDA más Alto" baseKey="highest_kda" options={allPlayerOptions} selections={selections} onChange={handleSelectionChange} placeholder="Buscar jugador..." mode={mode} officialResults={officialResults} disabled={effectiveDisabled} />
                <ScoredSelect label="Nº Total de Pentakills (Evento)" categoryKey="total_pentakills" options={pentakillOptions} selections={selections} onChange={handleSelectionChange} placeholder="Selecciona rango" officialResults={officialResults} mode={mode} disabled={effectiveDisabled} />
            </div>
          </section>

          {/* SECTION 4: TEAM OF THE SPLIT (5 PTS) */}
          <section>
            <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-gray-500/10 rounded-lg border border-gray-500/30">
                 <Star className="w-5 h-5 text-gray-400" />
               </div>
               <h3 className="text-xl font-bold text-white uppercase tracking-wide">Team of the Split (5 Pts c/u)</h3>
            </div>
            {/* FORCE MAX 3 COLUMNS TO PREVENT 5-COLUMN CRUNCHING AND TEXT HIDING */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-[#0f1923]/50 p-6 rounded-xl border border-gray-800">
                <ScoredSelect label="Top Laner" categoryKey="best_top" options={getPlayerOptionsByRole(Role.TOP)} selections={selections} onChange={handleSelectionChange} placeholder="Top..." officialResults={officialResults} mode={mode} disabled={effectiveDisabled} />
                <ScoredSelect label="Jungler" categoryKey="best_jng" options={getPlayerOptionsByRole(Role.JUNGLE)} selections={selections} onChange={handleSelectionChange} placeholder="Jungle..." officialResults={officialResults} mode={mode} disabled={effectiveDisabled} />
                <ScoredSelect label="Mid Laner" categoryKey="best_mid" options={getPlayerOptionsByRole(Role.MID)} selections={selections} onChange={handleSelectionChange} placeholder="Mid..." officialResults={officialResults} mode={mode} disabled={effectiveDisabled} />
                <ScoredSelect label="ADC" categoryKey="best_adc" options={getPlayerOptionsByRole(Role.ADC)} selections={selections} onChange={handleSelectionChange} placeholder="ADC..." officialResults={officialResults} mode={mode} disabled={effectiveDisabled} />
                <ScoredSelect label="Support" categoryKey="best_sup" options={getPlayerOptionsByRole(Role.SUPPORT)} selections={selections} onChange={handleSelectionChange} placeholder="Supp..." officialResults={officialResults} mode={mode} disabled={effectiveDisabled} />
            </div>
          </section>

          {/* SECTION 5: CHAMPIONS (RANKED) */}
          <section>
            <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/30">
                 <Sword className="w-5 h-5 text-red-400" />
               </div>
               <h3 className="text-xl font-bold text-white uppercase tracking-wide">Meta & Campeones (Ranking)</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loadingChamps ? (
                 <div className="col-span-full flex flex-col items-center justify-center p-12 text-purple-300/50 bg-[#0f1923] rounded-xl border border-gray-800">
                    <RefreshCw className="w-8 h-8 animate-spin mb-2" />
                    <span className="text-xs">Cargando datos de Riot Games...</span>
                 </div>
              ) : (
                <>
                  <RankedSelector label="Campeón Más Pickeado" baseKey="most_picked" options={championOptions} selections={selections} onChange={handleSelectionChange} placeholder="Buscar campeón..." mode={mode} officialResults={officialResults} disabled={effectiveDisabled} />
                  <RankedSelector label="Campeón Más Baneado" baseKey="most_banned" options={championOptions} selections={selections} onChange={handleSelectionChange} placeholder="Buscar campeón..." mode={mode} officialResults={officialResults} disabled={effectiveDisabled} />
                  <RankedSelector label="Campeón con Más Asesinatos" baseKey="most_kills" options={championOptions} selections={selections} onChange={handleSelectionChange} placeholder="Buscar campeón..." mode={mode} officialResults={officialResults} disabled={effectiveDisabled} />
                  <RankedSelector label="Winrate Más Alto (>5 games)" baseKey="highest_wr" options={championOptions} selections={selections} onChange={handleSelectionChange} placeholder="Buscar campeón..." mode={mode} officialResults={officialResults} disabled={effectiveDisabled} />
                  <RankedSelector label="Winrate Más Bajo (>5 games)" baseKey="lowest_wr" options={championOptions} selections={selections} onChange={handleSelectionChange} placeholder="Buscar campeón..." mode={mode} officialResults={officialResults} disabled={effectiveDisabled} />
                </>
              )}
            </div>
          </section>

        </div>
        
        {/* Footer Actions (Only show Save if current user and editable) */}
        {!isViewingOther && (
            <div className="mt-12 text-center pb-8 sticky bottom-8 z-30 pointer-events-none">
            <button 
                onClick={handleSave}
                disabled={isSaving || !isFormComplete || effectiveDisabled}
                className={`
                    pointer-events-auto bg-gradient-to-r text-white font-bold py-4 px-10 rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all transform border flex items-center gap-3 mx-auto
                    ${effectiveDisabled 
                        ? 'from-gray-700 to-gray-800 border-gray-600 opacity-80 cursor-not-allowed grayscale' 
                        : !isFormComplete
                            ? 'from-gray-700 to-gray-800 border-gray-600 opacity-80 cursor-not-allowed grayscale'
                            : mode === 'official_result'
                                ? 'from-red-700 to-red-900 border-red-500/50 hover:scale-105'
                                : 'from-purple-700 to-purple-900 border-purple-500/50 hover:scale-105'
                    }
                `}
                title={effectiveDisabled ? 'La Bola de Cristal está cerrada' : !isFormComplete ? 'Rellena todos los campos para guardar' : ''}
            >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                effectiveDisabled ? <Lock className="w-5 h-5" /> :
                saveStatus === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
                saveStatus === 'error' ? <AlertCircle className="w-5 h-5" /> :
                <Save className="w-5 h-5" />
                }
                
                <span>
                    {saveStatus === 'success' 
                        ? '¡Guardado!' 
                        : saveStatus === 'error'
                            ? 'Error al guardar'
                            : effectiveDisabled 
                                ? 'PREDICCIONES CERRADAS'
                                : !isFormComplete 
                                    ? 'Completa todos los campos'
                                    : (mode === 'official_result' ? 'PUBLICAR RESULTADOS OFICIALES' : 'GUARDAR PREDICCIONES')}
                </span>
            </button>
            
            <p className="mt-4 text-xs text-gray-500 bg-black/50 inline-block px-3 py-1 rounded-full border border-gray-800">
                {Object.keys(selections).filter(k => selections[k]).length} de {getRequiredKeys(mode).length} selecciones completadas
            </p>
            </div>
        )}
      </div>
  );
};
