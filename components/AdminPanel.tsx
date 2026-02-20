import React, { useState, useEffect } from 'react';
import { Match, Team } from '../types';
import { dataService } from '../services/dataService';
import { Loader2, Save, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';

export const AdminPanel: React.FC = () => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedDay, setSelectedDay] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    // Editing State
    const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{
        teamA: string,
        teamB: string,
        winner: string,
        startTime: string,
        status: string
    } | null>(null);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const t = await dataService.getTeams();
            setTeams(Object.values(t));
            
            const m = await dataService.getMatches(selectedDay);
            setMatches(m);
        } catch (e) {
            console.error(e);
            setMessage({ type: 'error', text: 'Error cargando datos' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedDay]);

    const startEdit = (match: Match) => {
        setEditingMatchId(match.id);
        // Format date for datetime-local input
        const date = new Date(match.startTime);
        const isoString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

        setEditForm({
            teamA: match.teamA.id,
            teamB: match.teamB.id,
            winner: match.winnerId || '',
            startTime: isoString,
            status: match.isCompleted ? 'finished' : 'scheduled'
        });
    };

    const saveEdit = async () => {
        if (!editingMatchId || !editForm) return;
        
        try {
            const status = editForm.winner ? 'finished' : editForm.status; // Auto finish if winner selected
            
            await dataService.updateMatch(editingMatchId, {
                team_a_id: editForm.teamA,
                team_b_id: editForm.teamB,
                winner_id: editForm.winner || null,
                start_time: new Date(editForm.startTime).toISOString(),
                status: status as any
            });
            
            setMessage({ type: 'success', text: 'Partido actualizado correctamente' });
            setEditingMatchId(null);
            setEditForm(null);
            loadData();
        } catch (e: any) {
            setMessage({ type: 'error', text: 'Error guardando: ' + e.message });
        }
    };

    const days = Array.from({ length: 11 }, (_, i) => i + 1);

    return (
        <div className="min-h-screen pb-20 px-4 animate-in fade-in">
            <div className="max-w-6xl mx-auto py-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-red-400 uppercase tracking-widest border-b-4 border-red-900 pb-2">
                        Panel de Administración
                    </h1>
                    {/* Botón de Importación eliminado. Usar Importador de Supabase */}
                </div>

                {message && (
                    <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 border ${message.type === 'success' ? 'bg-green-900/30 border-green-500 text-green-200' : 'bg-red-900/30 border-red-500 text-red-200'}`}>
                        {message.type === 'success' ? <CheckCircle2 className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
                        {message.text}
                    </div>
                )}

                {/* Day Selector */}
                <div className="flex items-center gap-4 mb-6 bg-[#0f1923] p-4 rounded-xl border border-gray-700 overflow-x-auto">
                    <span className="font-bold text-gray-400 uppercase text-xs whitespace-nowrap">Seleccionar Jornada:</span>
                    {days.map(d => (
                        <button
                            key={d}
                            onClick={() => setSelectedDay(d)}
                            className={`w-10 h-10 rounded-lg font-bold flex-shrink-0 transition-all ${
                                selectedDay === d 
                                ? 'bg-red-600 text-white shadow-lg scale-110' 
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            {d}
                        </button>
                    ))}
                </div>

                {/* Matches Table */}
                <div className="bg-[#091428] rounded-xl border border-gray-700 overflow-hidden shadow-xl">
                    <div className="grid grid-cols-12 bg-[#0f1923] p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700">
                        <div className="col-span-1">ID</div>
                        <div className="col-span-3">Fecha & Hora</div>
                        <div className="col-span-3 text-center">Enfrentamiento</div>
                        <div className="col-span-2 text-center">Ganador</div>
                        <div className="col-span-2 text-center">Estado</div>
                        <div className="col-span-1 text-right">Acciones</div>
                    </div>

                    {isLoading ? (
                        <div className="p-12 flex justify-center text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin"/>
                        </div>
                    ) : (
                        matches.map(match => {
                            const isEditing = editingMatchId === match.id;

                            return (
                                <div key={match.id} className={`grid grid-cols-12 p-4 items-center border-b border-gray-800 hover:bg-white/5 transition-colors ${isEditing ? 'bg-blue-900/20' : ''}`}>
                                    {isEditing && editForm ? (
                                        // EDIT MODE
                                        <>
                                            <div className="col-span-1 text-xs text-gray-500 truncate">{match.id}</div>
                                            <div className="col-span-3">
                                                <input 
                                                    type="datetime-local" 
                                                    value={editForm.startTime}
                                                    onChange={e => setEditForm({...editForm, startTime: e.target.value})}
                                                    className="w-full bg-[#050a14] border border-gray-600 rounded p-1 text-xs text-white"
                                                />
                                            </div>
                                            <div className="col-span-3 flex items-center justify-center gap-2">
                                                <select 
                                                    value={editForm.teamA}
                                                    onChange={e => setEditForm({...editForm, teamA: e.target.value})}
                                                    className="w-16 bg-[#050a14] border border-gray-600 rounded text-xs text-white"
                                                >
                                                    {teams.map(t => <option key={t.id} value={t.id}>{t.shortName}</option>)}
                                                </select>
                                                <span className="text-gray-500 text-xs">VS</span>
                                                <select 
                                                    value={editForm.teamB}
                                                    onChange={e => setEditForm({...editForm, teamB: e.target.value})}
                                                    className="w-16 bg-[#050a14] border border-gray-600 rounded text-xs text-white"
                                                >
                                                    {teams.map(t => <option key={t.id} value={t.id}>{t.shortName}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-2 flex justify-center">
                                                <select 
                                                    value={editForm.winner}
                                                    onChange={e => setEditForm({...editForm, winner: e.target.value})}
                                                    className="w-24 bg-[#050a14] border border-gray-600 rounded text-xs text-white"
                                                >
                                                    <option value="">Pendiente</option>
                                                    <option value={editForm.teamA}>{teams.find(t => t.id === editForm.teamA)?.shortName}</option>
                                                    <option value={editForm.teamB}>{teams.find(t => t.id === editForm.teamB)?.shortName}</option>
                                                </select>
                                            </div>
                                            <div className="col-span-2 flex justify-center">
                                                <select 
                                                    value={editForm.status}
                                                    onChange={e => setEditForm({...editForm, status: e.target.value})}
                                                    className="w-24 bg-[#050a14] border border-gray-600 rounded text-xs text-white uppercase"
                                                >
                                                    <option value="scheduled">Programado</option>
                                                    <option value="live">En Vivo</option>
                                                    <option value="finished">Finalizado</option>
                                                </select>
                                            </div>
                                            <div className="col-span-1 flex justify-end gap-2">
                                                <button onClick={saveEdit} className="text-green-400 hover:text-green-300"><Save className="w-5 h-5"/></button>
                                                <button onClick={() => setEditingMatchId(null)} className="text-red-400 hover:text-red-300"><XIcon className="w-5 h-5"/></button>
                                            </div>
                                        </>
                                    ) : (
                                        // VIEW MODE
                                        <>
                                            <div className="col-span-1 text-xs text-gray-500 truncate" title={match.id}>{match.id.substring(0,6)}...</div>
                                            <div className="col-span-3 text-sm text-gray-300 flex items-center gap-2">
                                                <Calendar className="w-3 h-3 text-gray-500"/>
                                                {new Date(match.startTime).toLocaleString()}
                                            </div>
                                            <div className="col-span-3 flex items-center justify-center gap-3">
                                                <span className={`font-bold ${match.winnerId === match.teamA.id ? 'text-green-400' : 'text-gray-400'}`}>{match.teamA.shortName}</span>
                                                <span className="text-gray-600 text-xs">VS</span>
                                                <span className={`font-bold ${match.winnerId === match.teamB.id ? 'text-green-400' : 'text-gray-400'}`}>{match.teamB.shortName}</span>
                                            </div>
                                            <div className="col-span-2 text-center">
                                                {match.winnerId ? (
                                                    <span className="bg-green-900/30 text-green-400 border border-green-900 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                                        {teams.find(t => t.id === match.winnerId)?.shortName} Win
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-600 text-xs">-</span>
                                                )}
                                            </div>
                                            <div className="col-span-2 text-center">
                                                 <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                                                     match.isCompleted ? 'bg-gray-800 border-gray-600 text-gray-400' : 'bg-blue-900/30 border-blue-800 text-blue-300'
                                                 }`}>
                                                    {match.isCompleted ? 'Finalizado' : 'Pendiente'}
                                                 </span>
                                            </div>
                                            <div className="col-span-1 text-right">
                                                <button 
                                                    onClick={() => startEdit(match)}
                                                    className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1 rounded text-xs font-bold border border-gray-600"
                                                >
                                                    Editar
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })
                    )}
                    
                    {!isLoading && matches.length === 0 && (
                        <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                            <AlertCircle className="w-8 h-8 mb-2 opacity-50"/>
                            <p>No hay partidos para esta jornada en la base de datos.</p>
                            <p className="text-xs mt-2">Importa los datos manualmente a Supabase.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const XIcon = ({className}: {className?: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);