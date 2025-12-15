import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { dataService } from '../services/dataService';
import { getChampions } from '../services/riotService';
import { SearchableSelect, Option } from './ui/SearchableSelect';
import { PenLine, Save, Loader2, CheckCircle2, User as UserIcon, Trophy, Sparkles, Swords, Medal, AlertCircle, Link, Image as ImageIcon } from 'lucide-react';

interface ProfileViewProps {
    currentUserId: string | null;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUserId }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [championOptions, setChampionOptions] = useState<Option[]>([]);
    
    // Form State
    const [editForm, setEditForm] = useState({
        title: '',
        avatar: '',
        championId: '' // Helper to track selection in dropdown
    });
    
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        loadProfile();
        loadChampions();
    }, [currentUserId]);

    const loadChampions = async () => {
        try {
            const champs = await getChampions();
            setChampionOptions(champs.sort((a, b) => a.label.localeCompare(b.label)));
        } catch (e) {
            console.error("Error loading champions", e);
        }
    };

    const loadProfile = async () => {
        if (!currentUserId) return;
        setIsLoading(true);
        try {
            const users = await dataService.getAllUsers();
            const me = users.find(u => u.id === currentUserId);
            if (me) {
                setUser(me);
                setEditForm({
                    title: me.title || '',
                    avatar: me.avatar || '',
                    championId: '' // Will be resolved when rendering if avatar matches a champ image
                });
            }
        } catch (e) {
            console.error("Error loading profile", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentUserId) return;
        setIsSaving(true);
        setSaveStatus('idle');
        try {
            await dataService.updateUserProfile(currentUserId, {
                title: editForm.title,
                avatar_url: editForm.avatar
            });
            setSaveStatus('success');
            setIsEditing(false);
            loadProfile(); // Refresh
        } catch (e) {
            console.error(e);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    // Transform champions into Title Options
    // ID = Title String (to save directly)
    // Label = Title
    // SubLabel = Champion Name
    const titleOptions: Option[] = useMemo(() => {
        return championOptions.map(c => ({
            id: c.subLabel || c.label, // Value to save is the Title string
            label: c.subLabel || 'Campeón',
            subLabel: `Título de ${c.label}`,
            image: c.image,
            color: c.color
        })).sort((a, b) => a.label.localeCompare(b.label));
    }, [championOptions]);

    const handleAvatarChange = (champId: string) => {
        const selected = championOptions.find(c => c.id === champId);
        if (selected && selected.image) {
            setEditForm(prev => ({
                ...prev,
                avatar: selected.image || '',
                championId: champId
            }));
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[500px] flex items-center justify-center text-[#c8aa6e]">
                <Loader2 className="w-10 h-10 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-[300px] flex flex-col items-center justify-center text-gray-500">
                <AlertCircle className="w-10 h-10 mb-2 opacity-50" />
                <p>Perfil no encontrado.</p>
            </div>
        );
    }

    const StatCard = ({ icon: Icon, label, value, color }: any) => (
        <div className={`bg-[#0f1923] p-4 rounded-xl border border-gray-700 flex flex-col items-center justify-center relative overflow-hidden group hover:border-${color.split('-')[1]}`}>
            <div className={`absolute top-2 right-2 text-${color} opacity-20 group-hover:opacity-50 transition-opacity`}>
                <Icon className="w-8 h-8" />
            </div>
            <span className="text-3xl font-bold text-white mb-1 relative z-10">{value}</span>
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest relative z-10">{label}</span>
        </div>
    );

    const BreakdownBar = ({ label, value, max, color }: any) => (
        <div className="mb-4">
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-1.5">
                <span className="text-gray-400">{label}</span>
                <span className="text-white">{value} Pts</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-500 ${color}`}
                    style={{ width: `${Math.min((value / (max || 1)) * 100, 100)}%` }}
                ></div>
            </div>
        </div>
    );

    // Determine current champion ID based on avatar URL match (for the selector value)
    const currentAvatarChampId = championOptions.find(c => c.image === editForm.avatar)?.id;

    return (
        <div className="max-w-2xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Header / Identity - Added z-20 to stack above stats */}
            <div className="relative z-20 mb-8 rounded-2xl border border-gray-700 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
                {/* Background Layer (Clipped) */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0f1d36] to-[#0a1428] rounded-2xl overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c8aa6e] to-transparent opacity-50"></div>
                </div>
                
                {/* Content Layer (Visible) */}
                <div className="relative z-10 p-6 flex flex-col sm:flex-row items-start gap-6">
                    {/* Avatar Group */}
                    <div className="relative group flex-shrink-0 mx-auto sm:mx-0">
                        <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-[#c8aa6e] to-[#785a28] shadow-lg">
                            <img 
                                src={editForm.avatar || user.avatar} 
                                alt={user.name} 
                                className="w-full h-full rounded-full object-cover bg-[#0a1428]"
                                onError={(e) => (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                            />
                        </div>
                        {!isEditing && (
                            <div className="absolute -bottom-2 -right-2 bg-[#0a1428] border border-gray-600 p-1.5 rounded-full text-gray-400">
                                <span className="text-[10px] font-bold px-1">Lvl {Math.floor(user.score / 50) + 1}</span>
                            </div>
                        )}
                    </div>

                    {/* Info Group */}
                    <div className="flex-1 w-full min-w-0">
                        {isEditing ? (
                            <div className="space-y-4 pt-2">
                                <div className="relative z-50">
                                    <SearchableSelect 
                                        label="Elige tu Campeón (Avatar)"
                                        options={championOptions}
                                        value={currentAvatarChampId}
                                        onChange={handleAvatarChange}
                                        placeholder="Buscar campeón..."
                                    />
                                </div>
                                <div className="relative z-40">
                                    <SearchableSelect 
                                        label="Elige tu Título"
                                        options={titleOptions}
                                        value={editForm.title}
                                        onChange={(val) => setEditForm(prev => ({ ...prev, title: val }))}
                                        placeholder="Buscar título..."
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="text-center sm:text-left mt-2">
                                <h1 className="text-3xl font-bold text-white mb-1">{user.name}</h1>
                                {user.title ? (
                                    <span className="inline-block bg-[#c8aa6e]/10 text-[#c8aa6e] border border-[#c8aa6e]/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                                        {user.title}
                                    </span>
                                ) : (
                                    <span className="text-gray-500 text-xs italic mb-2 block">Sin título asignado</span>
                                )}
                                <div className="flex items-center justify-center sm:justify-start gap-4 mt-4">
                                    <div className="text-gray-400 text-sm flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-lg border border-gray-700">
                                        <Medal className="w-4 h-4 text-yellow-500" />
                                        Ranking Global: <span className="text-white font-bold">#{user.rank}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Edit Toggle */}
                    <div className="absolute top-4 right-4 sm:static sm:ml-auto">
                        {isEditing ? (
                            <div className="flex gap-2 mt-4 sm:mt-0 justify-end w-full">
                                <button 
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditForm({ title: user.title || '', avatar: user.avatar || '', championId: '' }); // Reset
                                    }}
                                    className="p-2 rounded bg-gray-800 text-gray-400 hover:text-white"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded bg-[#c8aa6e] text-[#0a1428] font-bold hover:bg-[#e0c285] flex items-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Guardar
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="p-2 rounded-full bg-[#0a1428] border border-gray-600 text-gray-400 hover:text-white hover:border-[#c8aa6e] transition-all m-4 sm:m-0"
                            >
                                <PenLine className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid - Relative z-0 ensures it's below header z-20 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 relative z-0">
                <StatCard icon={Trophy} label="Puntos Totales" value={user.score} color="text-yellow-400" />
                <StatCard icon={Swords} label="Fase Regular" value={user.scoreBreakdown.matchday} color="text-blue-400" />
                <StatCard icon={Sparkles} label="Bola Cristal" value={user.scoreBreakdown.crystalBall} color="text-purple-400" />
                <StatCard icon={UserIcon} label="Fantasy" value={user.scoreBreakdown.fantasy} color="text-[#0ac8b9]" />
            </div>

            {/* Score Breakdown */}
            <div className="bg-[#091428] rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-bold text-white uppercase tracking-wide mb-6 flex items-center gap-2">
                    <div className="w-1 h-6 bg-[#c8aa6e] rounded-full"></div>
                    Desglose de Puntuación
                </h3>
                
                <BreakdownBar 
                    label="Predicciones Jornada (Matchday)" 
                    value={user.scoreBreakdown.matchday} 
                    max={100} // Aproximado
                    color="bg-blue-500" 
                />
                <BreakdownBar 
                    label="Ranking Winter 2026" 
                    value={user.scoreBreakdown.ranking} 
                    max={100} 
                    color="bg-green-500" 
                />
                <BreakdownBar 
                    label="Playoffs" 
                    value={user.scoreBreakdown.playoffs} 
                    max={150} 
                    color="bg-red-500" 
                />
                
                <div className="mt-6 pt-6 border-t border-gray-800 grid grid-cols-2 gap-4">
                    <div className="bg-[#0a1428] p-3 rounded border border-gray-700">
                        <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Aciertos Bola de Cristal</div>
                        <div className="text-purple-400 font-bold text-xl">{user.scoreBreakdown.crystalBall} Pts</div>
                    </div>
                    <div className="bg-[#0a1428] p-3 rounded border border-gray-700">
                        <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Liga Fantasy</div>
                        <div className="text-[#0ac8b9] font-bold text-xl">{user.scoreBreakdown.fantasy} Pts</div>
                    </div>
                </div>
            </div>

        </div>
    );
};