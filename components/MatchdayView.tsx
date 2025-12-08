import React, { useState, useMemo, useRef, useEffect } from 'react';
import { getMatchesForDay } from '../constants';
import { MatchCard } from './MatchCard';
import { UserPrediction } from '../types';
import { CalendarCheck, Share2, ChevronLeft, ChevronRight } from 'lucide-react';

export const MatchdayView: React.FC = () => {
  const [currentDay, setCurrentDay] = useState(1);
  const [predictions, setPredictions] = useState<UserPrediction[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Generate matches for the selected day
  const matches = useMemo(() => getMatchesForDay(currentDay), [currentDay]);

  // Center selected day in scroll view
  useEffect(() => {
    if (scrollContainerRef.current) {
        const button = scrollContainerRef.current.children[currentDay - 1] as HTMLElement;
        if (button) {
            const scrollLeft = button.offsetLeft - (scrollContainerRef.current.clientWidth / 2) + (button.clientWidth / 2);
            scrollContainerRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
    }
  }, [currentDay]);

  const handleSelectWinner = (matchId: string, teamId: string) => {
    setPredictions(prev => {
      const existing = prev.find(p => p.matchId === matchId);
      if (existing) {
        return prev.map(p => p.matchId === matchId ? { ...p, predictedWinnerId: teamId } : p);
      }
      return [...prev, { matchId, predictedWinnerId: teamId }];
    });
  };

  const days = Array.from({ length: 11 }, (_, i) => i + 1);

  // Filter predictions for current day count
  const currentDayPredictionCount = predictions.filter(p => matches.some(m => m.id === p.matchId)).length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 pb-24">
      
      {/* Header with Day Selector */}
      <div className="sticky top-0 z-30 bg-[#0a1428]/95 backdrop-blur-md pt-4 pb-4 -mx-4 px-4 border-b border-gray-800 mb-6">
        <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-blue-900/20 border border-blue-500/30">
            <CalendarCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
            <h2 className="text-xl font-bold text-[#c8aa6e] uppercase tracking-wide">Fase Regular</h2>
            <p className="text-blue-300/60 text-[10px] uppercase tracking-widest leading-none">Winter 2026</p>
            </div>
        </div>

        <div className="relative max-w-sm mx-auto">
            {/* Left Shadow Gradient */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0a1428] to-transparent z-10 pointer-events-none"></div>
            
            <div 
                ref={scrollContainerRef}
                className="flex overflow-x-auto gap-2 py-2 px-8 no-scrollbar scroll-smooth snap-x"
            >
                {days.map((day) => (
                    <button
                        key={day}
                        onClick={() => setCurrentDay(day)}
                        className={`
                            flex-shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center border snap-center transition-all duration-300 relative
                            ${currentDay === day 
                                ? 'bg-[#c8aa6e] border-[#c8aa6e] text-[#0a1428] shadow-[0_0_15px_rgba(200,170,110,0.4)] scale-110 z-10' 
                                : 'bg-[#0f1d36] border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                            }
                        `}
                    >
                        <span className="text-[10px] uppercase font-bold tracking-tighter opacity-70">Day</span>
                        <span className="text-lg font-bold leading-none">{day}</span>
                        {/* Dot indicator if day has predictions */}
                        {predictions.some(p => p.matchId.startsWith(`d${day}-`)) && (
                            <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${currentDay === day ? 'bg-[#0a1428]' : 'bg-[#c8aa6e]'}`}></div>
                        )}
                    </button>
                ))}
            </div>

            {/* Right Shadow Gradient */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0a1428] to-transparent z-10 pointer-events-none"></div>
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-6 animate-in fade-in duration-500 key={currentDay}">
        {matches.map(match => (
          <MatchCard 
            key={match.id} 
            match={match}
            selectedWinnerId={predictions.find(p => p.matchId === match.id)?.predictedWinnerId}
            onSelectWinner={handleSelectWinner}
          />
        ))}
      </div>

      {/* Footer Action */}
      <div className="fixed bottom-8 left-0 right-0 px-4 flex justify-center pointer-events-none z-40">
        {currentDayPredictionCount > 0 && (
          <button className="pointer-events-auto shadow-2xl bg-blue-600 border border-blue-400 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-blue-500 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(37,99,235,0.5)]">
            <Share2 className="w-4 h-4" />
            Guardar Jornada {currentDay} ({currentDayPredictionCount}/6)
          </button>
        )}
      </div>
    </div>
  );
};