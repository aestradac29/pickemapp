import React, { useState, useEffect } from 'react';
import { TEAMS, PLAYERS, ROLE_ICONS, WHITE_LOGO_TEAMS } from '../constants';
import { Sparkles, RefreshCw } from 'lucide-react';
import { SearchableSelect, Option } from './ui/SearchableSelect';
import { getChampions } from '../services/riotService';

export const CrystalBall: React.FC = () => {
  // State for selections
  const [selections, setSelections] = useState<Record<string, string>>({});
  
  // State for API Data
  const [championOptions, setChampionOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Champions from Riot API on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const champs = await getChampions();
      // Sort alphabetically
      const sorted = champs.sort((a, b) => a.label.localeCompare(b.label));
      setChampionOptions(sorted);
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleSelectionChange = (key: string, value: string) => {
    setSelections(prev => ({ ...prev, [key]: value }));
  };

  // Convert Constants/Mocks to Option format
  const teamOptions: Option[] = Object.values(TEAMS).map(t => ({
    id: t.id,
    label: t.name,
    subLabel: t.region,
    image: t.logo, // Now using real logo URLs
    color: t.color,
    imageClassName: WHITE_LOGO_TEAMS.includes(t.id) ? 'brightness-0 invert' : ''
  }));

  const playerOptions: Option[] = PLAYERS.sort((a, b) => a.name.localeCompare(b.name)).map(p => {
    // Find team info
    const team = TEAMS[p.teamId];
    return {
        id: p.name, // Using name as ID for simplicity in mock environment
        label: p.name,
        subLabel: team ? team.name : 'Agente Libre',
        // Use real photo if available, otherwise fallback to the high-quality Role Icon.
        // This looks much better than random avatars.
        image: p.photo || ROLE_ICONS[p.role], 
        color: team?.color
    };
  });

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 mb-24">
      <div className="text-center mb-8">
        <div className="inline-block p-4 rounded-full bg-purple-900/20 mb-4 border border-purple-500/30 shadow-[0_0_30px_rgba(147,51,234,0.2)]">
            <Sparkles className="w-10 h-10 text-purple-400" />
        </div>
        <h2 className="text-3xl font-bold text-white uppercase tracking-wider mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-purple-600">
            Bola de Cristal
        </h2>
        <p className="text-purple-300/80 text-sm max-w-md mx-auto">
            Adivina los sucesos del futuro para obtener puntos extra. Las predicciones se cerrarán al inicio de la temporada.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        
        {/* Section: Equipos */}
        <div className="md:col-span-2 flex items-center gap-2 mb-2 mt-4">
            <div className="h-px bg-purple-500/30 flex-1"></div>
            <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Predicciones de Equipos</span>
            <div className="h-px bg-purple-500/30 flex-1"></div>
        </div>

        <SearchableSelect 
            label="Campeón de Invierno" 
            options={teamOptions} 
            value={selections['winter_champ']}
            onChange={(v) => handleSelectionChange('winter_champ', v)}
        />
        <SearchableSelect 
            label="Equipo Decepción" 
            options={teamOptions} 
            value={selections['flop_team']}
            onChange={(v) => handleSelectionChange('flop_team', v)}
        />

        {/* Section: Jugadores */}
        <div className="md:col-span-2 flex items-center gap-2 mb-2 mt-4">
            <div className="h-px bg-purple-500/30 flex-1"></div>
            <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Predicciones de Jugadores</span>
            <div className="h-px bg-purple-500/30 flex-1"></div>
        </div>

        <SearchableSelect 
            label="MVP de la Temporada" 
            options={playerOptions}
            placeholder="Busca un jugador..."
            value={selections['mvp']}
            onChange={(v) => handleSelectionChange('mvp', v)}
        />
        <SearchableSelect 
            label="Jugador con más Solokills" 
            options={playerOptions}
            placeholder="Busca un jugador..."
            value={selections['solokills']}
            onChange={(v) => handleSelectionChange('solokills', v)}
        />

        {/* Section: Campeones */}
        <div className="md:col-span-2 flex items-center gap-2 mb-2 mt-4">
            <div className="h-px bg-purple-500/30 flex-1"></div>
            <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Meta & Campeones (API Riot)</span>
            <div className="h-px bg-purple-500/30 flex-1"></div>
        </div>

        {loading ? (
           <div className="md:col-span-2 flex flex-col items-center justify-center p-8 text-purple-300/50">
              <RefreshCw className="w-8 h-8 animate-spin mb-2" />
              <span className="text-xs">Cargando datos de Riot Games...</span>
           </div>
        ) : (
          <>
            <SearchableSelect 
                label="Campeón con más Presencia (P/B)" 
                options={championOptions}
                placeholder="Busca un campeón..."
                value={selections['pickban']}
                onChange={(v) => handleSelectionChange('pickban', v)}
            />
            <SearchableSelect 
                label="Campeón con Winrate más alto (>5 games)" 
                options={championOptions}
                placeholder="Busca un campeón..."
                value={selections['winrate']}
                onChange={(v) => handleSelectionChange('winrate', v)}
            />
          </>
        )}
      </div>
      
      <div className="mt-12 text-center pb-8">
        <button className="bg-gradient-to-r from-purple-700 to-purple-900 hover:from-purple-600 hover:to-purple-800 text-white font-bold py-4 px-10 rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all transform hover:scale-105 border border-purple-500/50 flex items-center gap-3 mx-auto">
            <Sparkles className="w-5 h-5" />
            <span>Consultar al Destino (Guardar)</span>
        </button>
        <p className="mt-4 text-xs text-gray-500">
            {Object.keys(selections).length} predicciones realizadas
        </p>
      </div>
    </div>
  );
};