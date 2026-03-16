import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Match, Team } from '../types';
import { TEAMS } from '../constants';
import { X, Check } from 'lucide-react';

interface MatchConfirmationModalProps {
    matches: { teamAId: string; teamBId: string; startTime: string; bestOf?: number }[];
    onConfirm: (matches: { teamAId: string; teamBId: string; startTime: string; bestOf?: number }[]) => void;
    onCancel: () => void;
}

export const MatchConfirmationModal: React.FC<MatchConfirmationModalProps> = ({ matches, onConfirm, onCancel }) => {
    const [editableMatches, setEditableMatches] = useState(matches.map(m => ({ ...m, bestOf: m.bestOf || 1 })));

    const updateMatch = (index: number, field: string, value: any) => {
        const newMatches = [...editableMatches];
        newMatches[index] = { ...newMatches[index], [field]: value };
        setEditableMatches(newMatches);
    };

    const getTeamName = (teamId: string) => TEAMS[teamId]?.name || teamId;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-4xl flex flex-col shadow-2xl">
                <div className="bg-[#0a1428] border border-[#c8aa6e] rounded-2xl w-full flex flex-col">
                    <div className="flex justify-between items-center p-6 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-[#c8aa6e] uppercase tracking-widest">Confirmar Partidos Generados</h2>
                        <button onClick={onCancel} className="text-gray-400 hover:text-white"><X /></button>
                    </div>

                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        {editableMatches.map((match, index) => (
                            <div key={index} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center bg-gray-900 p-4 rounded-lg border border-gray-700">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] text-gray-400 uppercase">Equipo A</label>
                                    <select 
                                        value={match.teamAId} 
                                        onChange={(e) => updateMatch(index, 'teamAId', e.target.value)}
                                        className="bg-gray-800 text-white p-2 rounded text-sm w-full"
                                    >
                                        {Object.keys(TEAMS).map(id => <option key={id} value={id}>{getTeamName(id)}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] text-gray-400 uppercase">Equipo B</label>
                                    <select 
                                        value={match.teamBId} 
                                        onChange={(e) => updateMatch(index, 'teamBId', e.target.value)}
                                        className="bg-gray-800 text-white p-2 rounded text-sm w-full"
                                    >
                                        {Object.keys(TEAMS).map(id => <option key={id} value={id}>{getTeamName(id)}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] text-gray-400 uppercase">Hora Inicio</label>
                                    <input 
                                        type="datetime-local" 
                                        value={match.startTime.slice(0, 16)} 
                                        onChange={(e) => updateMatch(index, 'startTime', new Date(e.target.value).toISOString())}
                                        className="bg-gray-800 text-white p-2 rounded text-sm w-full"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] text-gray-400 uppercase">Formato</label>
                                    <select 
                                        value={match.bestOf} 
                                        onChange={(e) => updateMatch(index, 'bestOf', parseInt(e.target.value))}
                                        className="bg-gray-800 text-white p-2 rounded text-sm w-full"
                                    >
                                        <option value={1}>BO1</option>
                                        <option value={3}>BO3</option>
                                        <option value={5}>BO5</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 border-t border-gray-700 flex justify-end gap-4">
                        <button onClick={onCancel} className="px-6 py-2 rounded-full border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition-all">Cancelar</button>
                        <button onClick={() => onConfirm(editableMatches)} className="px-6 py-2 rounded-full bg-[#c8aa6e] text-[#0a1428] font-bold hover:bg-[#d6bb82] transition-all flex items-center gap-2">
                            <Check className="w-4 h-4" /> Confirmar y Crear
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
