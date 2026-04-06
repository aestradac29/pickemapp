import React, { useState } from 'react';
import { RankingView } from './RankingView';
import { OfficialStandings } from './OfficialStandings';
import { ListOrdered, Table2 } from 'lucide-react';

interface RankingCombinedViewProps {
    currentUserId?: string | null;
    isAdmin?: boolean;
    selectedSplit?: string | null;
}

export const RankingCombinedView: React.FC<RankingCombinedViewProps> = ({
    currentUserId, isAdmin, selectedSplit,
}) => {
    const [activeTab, setActiveTab] = useState<'ranking' | 'official'>('ranking');

    const tabs = [
        { id: 'ranking'  as const, label: 'Mi Predicción',         icon: ListOrdered, desc: 'Tu orden de la tabla final' },
        { id: 'official' as const, label: 'Clasificación Oficial',  icon: Table2,      desc: 'Tabla real de la LEC' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Tab switcher */}
            <div className="flex gap-2">
                {tabs.map(tab => {
                    const active = activeTab === tab.id;
                    const Icon   = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex-1 flex flex-col items-start gap-1 px-4 py-3 rounded-xl border
                                transition-all duration-200 text-left relative overflow-hidden
                                ${active
                                    ? 'bg-[#c8aa6e]/10 border-[#c8aa6e]/50 shadow-[0_0_16px_rgba(200,170,110,0.1)]'
                                    : 'bg-[#060f1e] border-gray-800 hover:border-gray-700'}
                            `}
                        >
                            {/* Línea activa superior */}
                            {active && (
                                <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#c8aa6e] to-transparent" />
                            )}
                            <div className="flex items-center gap-2">
                                <Icon className={`w-4 h-4 ${active ? 'text-[#c8aa6e]' : 'text-gray-600'}`} />
                                <span className={`text-sm font-bold ${active ? 'text-[#f0e6d2]' : 'text-gray-400'}`}>
                                    {tab.label}
                                </span>
                            </div>
                            <span className={`text-[10px] ${active ? 'text-gray-400' : 'text-gray-600'}`}>
                                {tab.desc}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Contenido */}
            <div className="animate-in fade-in duration-200">
                {activeTab === 'ranking'
                    ? <RankingView currentUserId={currentUserId} isAdmin={isAdmin} selectedSplit={selectedSplit} />
                    : <OfficialStandings />
                }
            </div>
        </div>
    );
};
