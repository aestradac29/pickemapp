import React, { useState } from 'react';
import { JORNADA_MATCHES } from '../constants';
import { MatchCard } from './MatchCard';
import { UserPrediction } from '../types';
import { CalendarCheck, Share2 } from 'lucide-react';

export const MatchdayView: React.FC = () => {
  const [predictions, setPredictions] = useState<UserPrediction[]>([]);

  const handleSelectWinner = (matchId: string, teamId: string) => {
    setPredictions(prev => {
      const existing = prev.find(p => p.matchId === matchId);
      if (existing) {
        return prev.map(p => p.matchId === matchId ? { ...p, predictedWinnerId: teamId } : p);
      }
      return [...prev, { matchId, predictedWinnerId: teamId }];
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 pb-24">
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="p-3 rounded-full bg-blue-900/20 border border-blue-500/30">
          <CalendarCheck className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#c8aa6e] uppercase tracking-wide">Jornada 1</h2>
          <p className="text-blue-300/60 text-xs uppercase tracking-widest">Fase Regular • Winter 2026</p>
        </div>
      </div>

      <div className="space-y-6">
        {JORNADA_MATCHES.map(match => (
          <MatchCard 
            key={match.id} 
            match={match}
            selectedWinnerId={predictions.find(p => p.matchId === match.id)?.predictedWinnerId}
            onSelectWinner={handleSelectWinner}
          />
        ))}
      </div>

      <div className="fixed bottom-8 left-0 right-0 px-4 flex justify-center pointer-events-none">
        {predictions.length > 0 && (
          <button className="pointer-events-auto shadow-2xl bg-blue-600 border border-blue-400 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-blue-500 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(37,99,235,0.5)]">
            <Share2 className="w-4 h-4" />
            Guardar Predicciones ({predictions.length})
          </button>
        )}
      </div>
    </div>
  );
};