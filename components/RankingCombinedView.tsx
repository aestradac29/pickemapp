import React, { useState } from 'react';
import { RankingView } from './RankingView';
import { OfficialStandings } from './OfficialStandings';

interface RankingCombinedViewProps {
    currentUserId?: string | null;
    isAdmin?: boolean;
    selectedSplit?: string | null;
}

export const RankingCombinedView: React.FC<RankingCombinedViewProps> = ({ currentUserId, isAdmin, selectedSplit }) => {
    const [activeTab, setActiveTab] = useState<'ranking' | 'official'>('ranking');

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex bg-[#091428] rounded-lg p-1 border border-gray-700">
                <button
                    onClick={() => setActiveTab('ranking')}
                    className={`flex-1 py-2 text-sm font-bold uppercase tracking-widest rounded-md transition-all ${
                        activeTab === 'ranking' 
                        ? 'bg-[#c8aa6e] text-[#0a1428]' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                >
                    Mi Ranking
                </button>
                <button
                    onClick={() => setActiveTab('official')}
                    className={`flex-1 py-2 text-sm font-bold uppercase tracking-widest rounded-md transition-all ${
                        activeTab === 'official' 
                        ? 'bg-[#c8aa6e] text-[#0a1428]' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                >
                    Clasificación Oficial
                </button>
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in duration-300">
                {activeTab === 'ranking' ? (
                    <RankingView currentUserId={currentUserId} isAdmin={isAdmin} selectedSplit={selectedSplit} />
                ) : (
                    <OfficialStandings />
                )}
            </div>
        </div>
    );
};
