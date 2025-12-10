import React, { useState, useEffect } from 'react';
import { ROLE_ICONS, WHITE_LOGO_TEAMS } from '../constants';
import { Sparkles, RefreshCw, Trophy, User, Sword, Shield, Hash, Loader2, Save, CheckCircle2, AlertCircle, Settings } from 'lucide-react';
import { SearchableSelect, Option } from './ui/SearchableSelect';
import { getChampions } from '../services/riotService';
import { dataService } from '../services/dataService';
import { Role, Player, Team } from '../types';

interface CrystalBallProps {
    currentUserId?: string | null;
    isAdmin?: boolean;
}

const REQUIRED_KEYS = [
    'winter_champ', 'fastest_win_team', 'longest_win_team',
    'mvp', 'rookie', 'highest_kda',
    'best_top', 'best_jng', 'best_mid', 'best_adc', 'best_sup',
    'most_picked', 'most_banned', 'highest_wr', 'lowest_wr', 'most_kills',
    'total_pentakills'
];

export const CrystalBall: React.FC<CrystalBallProps> = ({ currentUserId, isAdmin }) => {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [championOptions, setChampionOptions] = useState<Option[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  
  const [loadingChamps, setLoadingChamps] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  
  // Saving State
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Admin Mode
  const [mode, setMode] = useState<'prediction' | 'official_result'>('prediction');

  // Load App Data (Players & Teams)
  useEffect(() => {
    const loadData = async () => {
        setLoadingData(true);
        try {
            const [playersList, teamsMap] = await Promise.all([
                dataService.getPlayers(),
                dataService.getTeams()
            ]);
            setPlayers(playersList);
            setTeams(Object.values(teamsMap));
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingData(false);
        }
    };
    loadData();
  }, []);

  // Load User/Admin Selections
  useEffect(() => {
    const loadSelections = async () => {
        if (!currentUserId && !isAdmin) return;
        
        try {
            let loadedSelections = {};
            if (isAdmin && mode === 'official_result') {
                 loadedSelections = await dataService.getAdminCrystalBallResults();
            } else if (currentUserId) {
                 loadedSelections = await dataService.getCrystalBall(currentUserId);
            }
            setSelections(loadedSelections || {});
        } catch (e) {
            console.error("Error loading selections", e);
        }
    };
    loadSelections();
  }, [currentUserId, mode, isAdmin]);

  // Load Riot Data (Champions)
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
    setSelections(prev => ({ ...prev, [key]: value }));
    setSaveStatus('idle'); // Reset save status on change
  };

  const handleSave = async () => {
      if (!currentUserId && !isAdmin) {
          alert("Debes iniciar sesión.");
          return;
      }

      setIsSaving(true);
      setSaveStatus('idle');
      setErrorMessage(null);

      try {
          if (isAdmin && mode === 'official_result') {
              await dataService.saveAdminCrystalBallResults(selections);
          } else if (currentUserId) {
              await dataService.saveCrystalBall(currentUserId, selections);
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
      const missing = REQUIRED_KEYS.filter(key => !selections[key]);
      return missing.length === 0;
  };

  const isFormComplete = checkCompletion();

  const mapToOption = (p: Player): Option => {
    const team = teams.find(t => t.id === p.teamId);
    return {
        id: p.name, // Logic uses name for uniqueness in crystal ball usually
        label: p.name,
        subLabel: team ? team.name : 'Agente Libre',
        image: p.photo || ROLE_ICONS[p.role as Role], 
        color: team?.color
    };
  };

  const teamOptions: Option[] = teams.map(t => ({
    id: t.id,
    label: t.name,
    subLabel: t.region,
    image: t.logo,
    color: t.color,
    imageClassName: WHITE_LOGO_TEAMS.includes(t.id) ? 'brightness-0 invert' : ''
  }));

  const allPlayerOptions: Option[] = players
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(mapToOption);

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

  return (
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 mb-24">
        
        {/* Admin Mode Toggle */}
        {isAdmin && (
            <div className="flex justify-end mb-4">
                <div className="bg-[#0f1d36] border border-gray-700 p-1 rounded-lg flex items-center gap-1">
                    <button 
                        onClick={() => setMode('prediction')}
                        className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors ${mode === 'prediction' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        Mis Predicciones
                    </button>
                    <button 
                        onClick={() => setMode('official_result')}
                        className={`px-3 py-1.5 rounded text-xs font-bold uppercase flex items-center gap-2 transition-colors ${mode === 'official_result' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Settings className="w-3 h-3" />
                        Resultado Oficial
                    </button>
                </div>
            </div>
        )}

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-block p-4 rounded-full bg-purple-900/20 mb-4 border border-purple-500/30 shadow-[0_0_30px_rgba(147,51,234,0.2)]">
              <Sparkles className="w-10 h-10 text-purple-400" />
          </div>
          <h2 className={`text-3xl font-bold uppercase tracking-wider mb-2 text-transparent bg-clip-text ${mode === 'official_result' ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-purple-300 to-purple-600'}`}>
              {mode === 'official_result' ? 'ADMIN: RESULTADOS' : 'Bola de Cristal'}
          </h2>
          <p className="text-purple-300/80 text-sm max-w-md mx-auto">
              {mode === 'official_result' 
                ? 'Introduce los resultados oficiales para calcular puntuaciones.' 
                : 'Predice el futuro del Split. Las selecciones se bloquearán al inicio de la primera jornada.'}
          </p>
        </div>

        <div className={`space-y-12 transition-all ${mode === 'official_result' ? 'border-l-4 border-red-500 pl-4 bg-red-950/10 py-4 rounded-r-xl' : ''}`}>
          
          {/* SECTION 1: TEAMS */}
          <section>
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
                 <Trophy className="w-5 h-5 text-purple-400" />
               </div>
               <h3 className="text-xl font-bold text-white uppercase tracking-wide">Equipos</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-[#0f1923]/50 rounded-xl border border-gray-800">
                <SearchableSelect 
                    label="Campeón del Split" 
                    options={teamOptions} 
                    value={selections['winter_champ']}
                    onChange={(v: string) => handleSelectionChange('winter_champ', v)}
                />
                <SearchableSelect 
                    label="Partida más Rápida (Win)" 
                    options={teamOptions} 
                    value={selections['fastest_win_team']}
                    onChange={(v: string) => handleSelectionChange('fastest_win_team', v)}
                />
                <SearchableSelect 
                    label="Partida más Larga (Win)" 
                    options={teamOptions} 
                    value={selections['longest_win_team']}
                    onChange={(v: string) => handleSelectionChange('longest_win_team', v)}
                />
            </div>
          </section>

          {/* SECTION 2: INDIVIDUAL AWARDS */}
          <section>
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                 <User className="w-5 h-5 text-yellow-400" />
               </div>
               <h3 className="text-xl font-bold text-white uppercase tracking-wide">Premios Individuales</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-[#0f1923]/50 rounded-xl border border-gray-800">
                <SearchableSelect 
                    label="MVP del Split" 
                    options={allPlayerOptions}
                    placeholder="Buscar jugador..."
                    value={selections['mvp']}
                    onChange={(v: string) => handleSelectionChange('mvp', v)}
                />
                <SearchableSelect 
                    label="Rookie del Split" 
                    options={allPlayerOptions}
                    placeholder="Buscar jugador..."
                    value={selections['rookie']}
                    onChange={(v: string) => handleSelectionChange('rookie', v)}
                />
                <SearchableSelect 
                    label="Jugador con KDA más Alto" 
                    options={allPlayerOptions}
                    placeholder="Buscar jugador..."
                    value={selections['highest_kda']}
                    onChange={(v: string) => handleSelectionChange('highest_kda', v)}
                />
            </div>
          </section>

          {/* SECTION 3: TEAM OF THE SPLIT (BY POSITION) */}
          <section>
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/30">
                 <Shield className="w-5 h-5 text-blue-400" />
               </div>
               <h3 className="text-xl font-bold text-white uppercase tracking-wide">Mejor Jugador por Posición</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-6 bg-[#0f1923]/50 rounded-xl border border-gray-800">
                <SearchableSelect 
                    label="Top Laner" 
                    options={getPlayerOptionsByRole(Role.TOP)}
                    placeholder="Top..."
                    value={selections['best_top']}
                    onChange={(v: string) => handleSelectionChange('best_top', v)}
                />
                <SearchableSelect 
                    label="Jungler" 
                    options={getPlayerOptionsByRole(Role.JUNGLE)}
                    placeholder="Jungle..."
                    value={selections['best_jng']}
                    onChange={(v: string) => handleSelectionChange('best_jng', v)}
                />
                <SearchableSelect 
                    label="Mid Laner" 
                    options={getPlayerOptionsByRole(Role.MID)}
                    placeholder="Mid..."
                    value={selections['best_mid']}
                    onChange={(v: string) => handleSelectionChange('best_mid', v)}
                />
                <SearchableSelect 
                    label="ADC" 
                    options={getPlayerOptionsByRole(Role.ADC)}
                    placeholder="ADC..."
                    value={selections['best_adc']}
                    onChange={(v: string) => handleSelectionChange('best_adc', v)}
                />
                <SearchableSelect 
                    label="Support" 
                    options={getPlayerOptionsByRole(Role.SUPPORT)}
                    placeholder="Supp..."
                    value={selections['best_sup']}
                    onChange={(v: string) => handleSelectionChange('best_sup', v)}
                />
            </div>
          </section>

          {/* SECTION 4: META & CHAMPIONS */}
          <section>
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/30">
                 <Sword className="w-5 h-5 text-red-400" />
               </div>
               <h3 className="text-xl font-bold text-white uppercase tracking-wide">Meta & Campeones (Riot API)</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-[#0f1923]/50 rounded-xl border border-gray-800">
              {loadingChamps ? (
                 <div className="md:col-span-3 flex flex-col items-center justify-center p-8 text-purple-300/50">
                    <RefreshCw className="w-8 h-8 animate-spin mb-2" />
                    <span className="text-xs">Cargando datos de Riot Games...</span>
                 </div>
              ) : (
                <>
                  <SearchableSelect 
                      label="Campeón más Pickeado" 
                      options={championOptions}
                      placeholder="Buscar campeón..."
                      value={selections['most_picked']}
                      onChange={(v: string) => handleSelectionChange('most_picked', v)}
                  />
                  <SearchableSelect 
                      label="Campeón más Baneado" 
                      options={championOptions}
                      placeholder="Buscar campeón..."
                      value={selections['most_banned']}
                      onChange={(v: string) => handleSelectionChange('most_banned', v)}
                  />
                  <SearchableSelect 
                      label="Winrate más alto (>5 games)" 
                      options={championOptions}
                      placeholder="Buscar campeón..."
                      value={selections['highest_wr']}
                      onChange={(v: string) => handleSelectionChange('highest_wr', v)}
                  />
                  <SearchableSelect 
                      label="Winrate más bajo (>5 games)" 
                      options={championOptions}
                      placeholder="Buscar campeón..."
                      value={selections['lowest_wr']}
                      onChange={(v: string) => handleSelectionChange('lowest_wr', v)}
                  />
                  <SearchableSelect 
                      label="Campeón con más Asesinatos" 
                      options={championOptions}
                      placeholder="Buscar campeón..."
                      value={selections['most_kills']}
                      onChange={(v: string) => handleSelectionChange('most_kills', v)}
                  />
                </>
              )}
            </div>
          </section>

          {/* SECTION 5: EVENTS */}
          <section>
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/30">
                 <Hash className="w-5 h-5 text-green-400" />
               </div>
               <h3 className="text-xl font-bold text-white uppercase tracking-wide">Eventos del Split</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-[#0f1923]/50 rounded-xl border border-gray-800">
                <SearchableSelect 
                    label="Nº Total de Pentakills" 
                    options={pentakillOptions}
                    placeholder="Selecciona rango"
                    value={selections['total_pentakills']}
                    onChange={(v: string) => handleSelectionChange('total_pentakills', v)}
                />
            </div>
          </section>

        </div>
        
        <div className="mt-12 text-center pb-8 sticky bottom-8 z-30 pointer-events-none">
          <button 
             onClick={handleSave}
             disabled={isSaving || !isFormComplete}
             className={`
                pointer-events-auto bg-gradient-to-r text-white font-bold py-4 px-10 rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all transform border flex items-center gap-3 mx-auto
                ${!isFormComplete 
                    ? 'from-gray-700 to-gray-800 border-gray-600 opacity-80 cursor-not-allowed grayscale' 
                    : mode === 'official_result'
                        ? 'from-red-700 to-red-900 border-red-500/50 hover:scale-105'
                        : 'from-purple-700 to-purple-900 border-purple-500/50 hover:scale-105'
                }
             `}
             title={!isFormComplete ? 'Rellena todos los campos para guardar' : ''}
          >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 
               saveStatus === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
               saveStatus === 'error' ? <AlertCircle className="w-5 h-5" /> :
               <Save className="w-5 h-5" />
              }
              
              <span>
                  {saveStatus === 'success' 
                    ? '¡Guardado!' 
                    : saveStatus === 'error'
                        ? 'Error al guardar'
                        : !isFormComplete 
                            ? 'Completa todos los campos'
                            : (mode === 'official_result' ? 'PUBLICAR RESULTADOS OFICIALES' : 'GUARDAR PREDICCIONES')}
              </span>
          </button>
          
          <p className="mt-4 text-xs text-gray-500">
              {Object.keys(selections).filter(k => selections[k]).length} de {REQUIRED_KEYS.length} selecciones completadas
          </p>
        </div>
      </div>
  );
};