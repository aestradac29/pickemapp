import React, { useState } from 'react';
import { Match, Team } from '../types';
import { Swords, Brain, CheckCircle2 } from 'lucide-react';
import { analyzeMatchup } from '../services/geminiService';
import { WHITE_LOGO_TEAMS } from '../constants';

interface MatchCardProps {
  match: Match;
  selectedWinnerId?: string;
  onSelectWinner: (matchId: string, teamId: string) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, selectedWinnerId, onSelectWinner }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{ text: string, favored: string } | null>(null);

  const handleAnalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const result = await analyzeMatchup(match.teamA, match.teamB);
      setAnalysis({ text: result.analysis, favored: result.favoredTeam });
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const TeamButton = ({ team, isSelected }: { team: Team; isSelected: boolean }) => {
    const shouldInvert = WHITE_LOGO_TEAMS.includes(team.id);

    return (
      <button
        onClick={() => onSelectWinner(match.id, team.id)}
        className={`
          flex-1 flex flex-col items-center justify-center p-4 rounded-lg transition-all duration-200 border-2
          ${isSelected 
            ? 'bg-hextech-500/10 border-hextech-500 shadow-[0_0_15px_rgba(200,170,110,0.3)]' 
            : 'bg-hextech-800 border-gray-700 hover:border-gray-500 hover:bg-gray-800'
          }
        `}
      >
        <div className="mb-2 relative w-16 h-16 flex items-center justify-center">
            {team.logo ? (
                 <img 
                    src={team.logo} 
                    alt={team.name}
                    className={`w-14 h-14 object-contain drop-shadow-md ${shouldInvert ? 'brightness-0 invert' : ''}`}
                    onError={(e) => {
                         // Fallback if image fails
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                 />
            ) : null}
            
            {/* Fallback Initial (hidden by default if logo exists) */}
            <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-lg ${team.logo ? 'hidden' : ''}`}
                style={{ backgroundColor: team.color }}
            >
                {team.shortName[0]}
            </div>
        </div>
        
        <span className={`font-bold text-lg ${isSelected ? 'text-hextech-500' : 'text-gray-300'}`}>
          {team.shortName}
        </span>
        <span className="text-xs text-gray-500 uppercase tracking-wide">{team.region}</span>
        
        {isSelected && (
          <CheckCircle2 className="w-5 h-5 text-hextech-500 mt-2 animate-bounce" />
        )}
      </button>
    );
  };

  return (
    <div className="w-full bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden mb-4 shadow-xl">
      {/* Header */}
      <div className="bg-black/30 px-4 py-2 flex justify-between items-center text-xs text-gray-400">
        <span className="uppercase tracking-wider font-semibold">{match.stage}</span>
        <span>{new Date(match.startTime).toLocaleDateString()} - {new Date(match.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
      </div>

      {/* Teams Selection */}
      <div className="p-4">
        <div className="flex justify-between items-stretch gap-4">
          <TeamButton team={match.teamA} isSelected={selectedWinnerId === match.teamA.id} />
          
          <div className="flex flex-col items-center justify-center">
            <span className="text-gray-600 font-bold text-xl italic mb-2">VS</span>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="group flex flex-col items-center justify-center gap-1 text-hextech-300 hover:text-white transition-colors"
              title="Preguntar al Oráculo (IA)"
            >
              <div className={`p-2 rounded-full bg-hextech-300/10 group-hover:bg-hextech-300/20 ${isAnalyzing ? 'animate-pulse' : ''}`}>
                <Brain className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest">
                {isAnalyzing ? 'Pensando...' : 'Oráculo'}
              </span>
            </button>
          </div>

          <TeamButton team={match.teamB} isSelected={selectedWinnerId === match.teamB.id} />
        </div>

        {/* AI Analysis Result */}
        {analysis && (
          <div className="mt-4 p-3 bg-hextech-300/10 border border-hextech-300/30 rounded-lg text-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-1 text-hextech-300 font-bold">
              <Brain className="w-4 h-4" />
              <span>Análisis de Gemini</span>
            </div>
            <p className="text-gray-300 leading-relaxed mb-1">{analysis.text}</p>
            <p className="text-xs text-gray-500">
              Favorito: <span className="text-white font-semibold">{analysis.favored}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};