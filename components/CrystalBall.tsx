import React, { useState, useEffect } from 'react';
import { TEAMS, PLAYERS, ROLE_ICONS, WHITE_LOGO_TEAMS } from '../constants';
import { Sparkles, RefreshCw, Trophy, User, Sword, Shield, Hash } from 'lucide-react';
import { SearchableSelect, Option } from './ui/SearchableSelect';
import { getChampions } from '../services/riotService';
import { Role } from '../types';

export const CrystalBall: React.FC = () => {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [championOptions, setChampionOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [pentakills, setPentakills] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const champs = await getChampions();
        const sorted = champs.sort((a, b) => a.label.localeCompare(b.label));
        setChampionOptions(sorted);
      } catch (error) {
        console.error("Failed to load champions", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSelectionChange = (key: string, value: string) => {
    setSelections(prev => ({ ...prev, [key]: value }));
  };

  const mapToOption = (p: any): Option => {
    const team = TEAMS[p.teamId];
    return {
        id: p.name,
        label: p.name,
        subLabel: team ? team.name : 'Agente Libre',
        image: p.photo || ROLE_ICONS[p.role as Role], 
        color: team?.color
    };
  };

  const teamOptions: Option[] = Object.values(TEAMS).map(t => ({
    id: t.id,
    label: t.name,
    subLabel: t.region,
    image: t.logo,
    color: t.color,
    imageClassName: WHITE_LOGO_TEAMS.includes(t.id) ? 'brightness-0 invert' : ''
  }));

  const allPlayerOptions: Option[] = PLAYERS
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(mapToOption);

  const getPlayerOptionsByRole = (role: Role): Option[] => {
    return PLAYERS
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

  return (
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 mb-24">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-block p-4 rounded-full bg-purple-900/20 mb-4 border border-purple-500/30 shadow-[0_0_30px_rgba(147,51,234,0.2)]">
              <Sparkles className="w-10 h-10 text-purple-400" />
          </div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-wider mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-purple-600">
              Bola de Cristal
          </h2>
          <p className="text-purple-300/80 text-sm max-w-md mx-auto">
              Predice el futuro del Split. Las selecciones se bloquearán al inicio de la primera jornada.
          </p>
        </div>

        <div className="space-y-12">
          
          {/* SECTION 1: TEAMS - Now 3 columns in one row */}
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
              {loading ? (
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
                    value={pentakills}
                    onChange={(v: string) => setPentakills(v)}
                />
            </div>
          </section>

        </div>
        
        <div className="mt-12 text-center pb-8">
          <button className="bg-gradient-to-r from-purple-700 to-purple-900 hover:from-purple-600 hover:to-purple-800 text-white font-bold py-4 px-10 rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all transform hover:scale-105 border border-purple-500/50 flex items-center gap-3 mx-auto">
              <Sparkles className="w-5 h-5" />
              <span>Consultar al Destino (Guardar)</span>
          </button>
          <p className="mt-4 text-xs text-gray-500">
              {Object.keys(selections).length + (pentakills !== '' ? 1 : 0)} predicciones realizadas
          </p>
        </div>
      </div>
  );
};