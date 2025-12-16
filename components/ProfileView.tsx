
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User } from '../types';
import { dataService } from '../services/dataService';
import { getChampions } from '../services/riotService';
import { SearchableSelect, Option } from './ui/SearchableSelect';
import { PenLine, Save, Loader2, CheckCircle2, User as UserIcon, Trophy, Sparkles, Swords, Medal, AlertCircle, Link, Image as ImageIcon, Gift, Lock, Star, Crown, CircleDashed, LayoutTemplate, Share2, Copy, Download, Camera } from 'lucide-react';
import { FRAME_STYLES, BANNER_STYLES, BADGE_DEFINITIONS, TEAMS, WHITE_LOGO_TEAMS } from '../constants';
import html2canvas from 'html2canvas';

interface ProfileViewProps {
    currentUserId: string | null;
}

// Title Pool for Levels (Reduced pool as we have more banners now)
const REWARD_TITLES = [
    "Iniciado", "Novato", "Aprendiz", "Recluta", "Escudero", 
    "Explorador", "Guerrero", "Veterano", "Centinela", "Guardián",
    "Caballero", "Paladín", "Campeón", "Héroe", "Vengador",
    "Conquistador", "Señor", "Comandante", "General", "Mariscal",
    "Sabio", "Erudito", "Mago", "Hechicero", "Archimago",
    "Brujo", "Invocador", "Gran Invocador", "Maestro", "Gran Maestro",
    "Leyenda", "Mito", "Semidiós", "Divinidad", "Titán",
    "Coloso", "Inmortal", "Eterno", "Infinito", "Omnipotente",
    "Destructor", "Creador", "Soberano", "Emperador", "Dios"
];

// Generate 50 Levels of Rewards with new Banners
const LEVEL_REWARDS = Array.from({ length: 50 }, (_, i) => {
    const level = i + 1;
    let reward: any = { level };

    // Cosmetic Milestones
    if (level === 2) { reward.id = 'frame_bronze'; reward.label = 'Marco Bronce'; reward.type = 'frame'; reward.icon = ImageIcon; }
    else if (level === 8) { reward.id = 'banner_freljord'; reward.label = 'Estandarte Helado'; reward.type = 'banner'; reward.icon = LayoutTemplate; }
    else if (level === 10) { reward.id = 'frame_silver'; reward.label = 'Marco Plata'; reward.type = 'frame'; reward.icon = ImageIcon; }
    else if (level === 15) { reward.id = 'banner_bilgewater'; reward.label = 'Estandarte Corsario'; reward.type = 'banner'; reward.icon = LayoutTemplate; }
    else if (level === 18) { reward.id = 'banner_zaun'; reward.label = 'Estandarte Químico'; reward.type = 'banner'; reward.icon = LayoutTemplate; }
    else if (level === 20) { reward.id = 'frame_gold'; reward.label = 'Marco Oro'; reward.type = 'frame'; reward.icon = ImageIcon; }
    else if (level === 25) { reward.id = 'banner_ionia'; reward.label = 'Estandarte Espiritual'; reward.type = 'banner'; reward.icon = LayoutTemplate; }
    else if (level === 28) { reward.id = 'banner_shurima'; reward.label = 'Estandarte Solar'; reward.type = 'banner'; reward.icon = LayoutTemplate; }
    else if (level === 30) { reward.id = 'frame_platinum'; reward.label = 'Marco Platino'; reward.type = 'frame'; reward.icon = ImageIcon; }
    else if (level === 35) { reward.id = 'banner_shadow_isles'; reward.label = 'Estandarte Espectral'; reward.type = 'banner'; reward.icon = LayoutTemplate; }
    else if (level === 38) { reward.id = 'banner_noxus'; reward.label = 'Estandarte Imperial'; reward.type = 'banner'; reward.icon = LayoutTemplate; }
    else if (level === 40) { reward.id = 'frame_master'; reward.label = 'Marco Maestro'; reward.type = 'frame'; reward.icon = ImageIcon; }
    else if (level === 45) { reward.id = 'banner_targon'; reward.label = 'Estandarte Celestial'; reward.type = 'banner'; reward.icon = LayoutTemplate; }
    else if (level === 48) { reward.id = 'banner_void'; reward.label = 'Estandarte del Vacío'; reward.type = 'banner'; reward.icon = LayoutTemplate; }
    else if (level === 50) { reward.id = 'frame_diamond'; reward.label = 'Marco Diamante'; reward.type = 'frame'; reward.icon = Trophy; }
    else {
        // Titles for everything else, using modulo to cycle through reduced list
        const titleIndex = i % REWARD_TITLES.length;
        reward.id = `title_lvl_${level}`;
        reward.label = REWARD_TITLES[titleIndex];
        reward.type = 'title';
        // Unified Icon for Titles (PenLine)
        reward.icon = PenLine;
    }
    return reward;
});

// --- SHARE MODAL COMPONENT ---
const ShareModal = ({ user, onClose }: { user: User, onClose: () => void }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleCopy = () => {
        const text = `🏆 Pick'em Pro Profile\n👤 ${user.name}\n🏅 Rank #${user.rank}\n✨ ${user.score} Puntos\n🔗 Únete: app.pickempro.gg`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadImage = async () => {
        if (!cardRef.current) return;
        setIsGenerating(true);
        try {
            // Use html2canvas to capture the card
            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: '#091428', // Force background color
                scale: 2, // Higher resolution
                useCORS: true, // Attempt to handle cross-origin images (like avatars)
                logging: false
            });

            // Convert to data URL
            const image = canvas.toDataURL("image/png");

            // Trigger download
            const link = document.createElement('a');
            link.href = image;
            link.download = `PickemPro-${user.name}-Profile.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Error generating image", err);
            alert("No se pudo generar la imagen. Intenta copiando el texto.");
        } finally {
            setIsGenerating(false);
        }
    };

    const currentBannerClass = user.banner && BANNER_STYLES[user.banner] ? BANNER_STYLES[user.banner] : BANNER_STYLES['default'];
    const currentFrameClass = user.frame && FRAME_STYLES[user.frame] ? FRAME_STYLES[user.frame] : FRAME_STYLES['default'];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-sm bg-[#091428] rounded-2xl overflow-hidden shadow-2xl border border-gray-700 relative animate-in zoom-in-95">
                <button onClick={onClose} className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white z-50">
                    <CheckCircle2 className="w-5 h-5 text-gray-400 hover:text-white" />
                </button>

                {/* THE CARD (Capture Target) */}
                <div ref={cardRef} className="relative pb-6 bg-[#091428]">
                    {/* Banner Header */}
                    <div className={`h-32 ${currentBannerClass} relative`}>
                        <div className="absolute inset-0 bg-black/20"></div>
                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                             <div className={`w-24 h-24 rounded-full border-4 shadow-xl overflow-hidden bg-[#0a1428] ${currentFrameClass}`}>
                                <img src={user.avatar} className="w-full h-full object-cover" alt="" crossOrigin="anonymous" />
                             </div>
                        </div>
                    </div>

                    <div className="pt-12 px-6 text-center">
                        <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                        <div className="text-[#c8aa6e] text-xs font-bold uppercase tracking-widest mb-4">{user.title || 'Invocador'}</div>
                        
                        <div className="grid grid-cols-3 gap-2 mb-6">
                            <div className="bg-[#0f1d36] p-2 rounded border border-gray-700">
                                <div className="text-xl font-bold text-white">#{user.rank}</div>
                                <div className="text-[9px] text-gray-500 uppercase">Ranking</div>
                            </div>
                            <div className="bg-[#0f1d36] p-2 rounded border border-gray-700">
                                <div className="text-xl font-bold text-[#c8aa6e]">{user.score}</div>
                                <div className="text-[9px] text-gray-500 uppercase">Puntos</div>
                            </div>
                            <div className="bg-[#0f1d36] p-2 rounded border border-gray-700">
                                <div className="text-xl font-bold text-blue-400">{(user.score / 50).toFixed(0)}</div>
                                <div className="text-[9px] text-gray-500 uppercase">Nivel</div>
                            </div>
                        </div>

                        {/* Equipped Badges Row (Max 3) */}
                        {user.equippedBadges && user.equippedBadges.length > 0 && (
                            <div className="flex justify-center gap-2 mb-4">
                                {user.equippedBadges.slice(0,3).map(b => {
                                    const def = BADGE_DEFINITIONS[b];
                                    if(!def) return null;
                                    const Icon = def.icon;
                                    return (
                                        <div key={b} className={`p-1.5 rounded-full ${def.color.split(' ')[2]} border ${def.color.split(' ')[1]}`}>
                                            <Icon className={`w-4 h-4 ${def.color.split(' ')[0]}`} />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        
                        <div className="text-[10px] text-gray-600 font-mono">app.pickempro.gg</div>
                    </div>
                </div>

                {/* Action Footer */}
                <div className="p-4 bg-[#050a14] border-t border-gray-800 flex gap-3">
                    <button 
                        onClick={handleDownloadImage}
                        disabled={isGenerating}
                        className="flex-1 bg-[#0ac8b9]/10 hover:bg-[#0ac8b9]/20 border border-[#0ac8b9]/50 text-[#0ac8b9] font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                        <span className="text-xs uppercase">Guardar Imagen</span>
                    </button>
                    <button 
                        onClick={handleCopy}
                        className="flex-1 bg-[#c8aa6e] hover:bg-[#d6bb82] text-[#0a1428] font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span className="text-xs uppercase">{copied ? 'Copiado' : 'Copiar Texto'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUserId }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [championOptions, setChampionOptions] = useState<Option[]>([]);
    const [showShareModal, setShowShareModal] = useState(false);
    
    // Form State
    const [editForm, setEditForm] = useState({
        title: '',
        avatar: '',
        banner: '',
        championId: '' 
    });
    
    // Equip State (Instant feedback)
    const [equippingId, setEquippingId] = useState<string | null>(null);
    
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
                    banner: me.banner || '',
                    championId: '' 
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
                avatar_url: editForm.avatar,
                banner: editForm.banner
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

    const handleEquipReward = async (reward: typeof LEVEL_REWARDS[0]) => {
        if (!currentUserId || !user) return;
        
        // Prevent equipping locked items
        const level = Math.floor(user.score / 50) + 1;
        if (level < reward.level) return;

        setEquippingId(reward.id);
        const updates: any = {};
        
        if (reward.type === 'title') {
            updates.title = reward.label;
            setUser(prev => prev ? ({ ...prev, title: reward.label }) : null);
        } else if (reward.type === 'frame') {
            updates.frame = reward.id;
            setUser(prev => prev ? ({ ...prev, frame: reward.id }) : null);
        } else if (reward.type === 'banner') {
            updates.banner = reward.id;
            setUser(prev => prev ? ({ ...prev, banner: reward.id }) : null);
        }

        try {
            await dataService.updateUserProfile(currentUserId, updates);
        } catch (e) {
            console.error("Error equipping reward", e);
        } finally {
            setEquippingId(null);
        }
    };

    const toggleBadgeEquip = async (badgeId: string) => {
        if (!user || !currentUserId) return;
        
        const currentEquipped = user.equippedBadges || [];
        let newEquipped = [...currentEquipped];

        if (newEquipped.includes(badgeId)) {
            // Unequip
            newEquipped = newEquipped.filter(id => id !== badgeId);
        } else {
            // Equip (Check limit)
            if (newEquipped.length >= 3) {
                alert("Solo puedes equiparte 3 insignias a la vez.");
                return;
            }
            newEquipped.push(badgeId);
        }

        // Optimistic Update
        setUser(prev => prev ? ({ ...prev, equippedBadges: newEquipped }) : null);

        // Save
        try {
            await dataService.updateUserProfile(currentUserId, { equippedBadges: newEquipped } as any);
        } catch (e) {
            console.error("Error saving badges", e);
            // Revert on error could go here
        }
    };

    // Transform champions into Title Options
    const titleOptions: Option[] = useMemo(() => {
        return championOptions.map(c => ({
            id: c.subLabel || c.label, 
            label: c.subLabel || 'Campeón',
            subLabel: `Título de ${c.label}`,
            image: c.image,
            color: c.color
        })).sort((a, b) => a.label.localeCompare(b.label));
    }, [championOptions]);

    // Transform Teams into Banner Options
    const bannerOptions: Option[] = useMemo(() => {
        return Object.values(TEAMS).map(team => ({
            id: `banner_${team.id}`, // e.g. 'banner_g2', 'banner_fnc'
            label: `Estandarte ${team.shortName}`,
            subLabel: team.name,
            image: team.logo,
            color: team.color,
            imageClassName: WHITE_LOGO_TEAMS.includes(team.id) ? 'brightness-0 invert' : ''
        }));
    }, []);

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

    // Improved StatCard
    const StatCard = ({ icon: Icon, label, value, type }: { icon: any, label: string, value: number, type: 'gold' | 'blue' | 'purple' | 'cyan' }) => {
        const theme = {
            gold: { bg: 'bg-yellow-900/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: 'text-yellow-500', glow: 'shadow-[0_0_15px_rgba(234,179,8,0.1)]' },
            blue: { bg: 'bg-blue-900/10', border: 'border-blue-500/30', text: 'text-blue-400', icon: 'text-blue-500', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.1)]' },
            purple: { bg: 'bg-purple-900/10', border: 'border-purple-500/30', text: 'text-purple-400', icon: 'text-purple-500', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.1)]' },
            cyan: { bg: 'bg-[#0ac8b9]/10', border: 'border-[#0ac8b9]/30', text: 'text-[#0ac8b9]', icon: 'text-[#0ac8b9]', glow: 'shadow-[0_0_15px_rgba(10,200,185,0.1)]' }
        }[type];

        return (
            <div className={`relative p-4 rounded-xl border flex flex-col items-center justify-center overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:bg-opacity-80 ${theme.bg} ${theme.border} ${theme.glow}`}>
                <div className={`absolute -right-6 -bottom-6 opacity-10 ${theme.text}`}><Icon className="w-24 h-24 -rotate-12" /></div>
                <div className={`absolute top-2 right-2 opacity-60 ${theme.icon}`}><Icon className="w-5 h-5" /></div>
                <span className="text-3xl font-bold text-white mb-1 relative z-10 drop-shadow-sm">{value}</span>
                <span className={`text-[10px] uppercase font-bold tracking-widest relative z-10 ${theme.text} opacity-90`}>{label}</span>
            </div>
        );
    };

    const BreakdownBar = ({ label, value, max, color }: any) => (
        <div className="mb-4">
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-1.5">
                <span className="text-gray-400">{label}</span>
                <span className="text-white">{value} Pts</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-500 ${color}`} style={{ width: `${Math.min((value / (max || 1)) * 100, 100)}%` }}></div>
            </div>
        </div>
    );

    const currentAvatarChampId = championOptions.find(c => c.image === editForm.avatar)?.id;

    // --- LEVEL & PROGRESS CALCULATIONS ---
    const level = Math.floor(user.score / 50) + 1;
    const scoreInCurrentLevel = user.score % 50;
    const progressPercent = (scoreInCurrentLevel / 50) * 100;
    
    // SVG Dimensions for the ring
    const size = 144; 
    const strokeWidth = 3;
    const radius = (size / 2) - (strokeWidth * 2);
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

    // --- VISUAL CUSTOMIZATION (Live Preview during edit) ---
    const activeBannerId = isEditing ? editForm.banner : user.banner;
    const currentFrameClass = user.frame && FRAME_STYLES[user.frame] ? FRAME_STYLES[user.frame] : FRAME_STYLES['default'];
    // Logic: If active banner exists in styles, use it. If not, use default.
    const currentBannerClass = activeBannerId && BANNER_STYLES[activeBannerId] ? BANNER_STYLES[activeBannerId] : BANNER_STYLES['default'];

    // --- BANNER LOGO LOGIC ---
    let bannerTeamLogo: string | undefined;
    let isWhiteLogo = false;
    if (activeBannerId && activeBannerId.startsWith('banner_')) {
        const teamId = activeBannerId.replace('banner_', '');
        const team = Object.values(TEAMS).find(t => t.id === teamId);
        if (team) {
            bannerTeamLogo = team.logo;
            isWhiteLogo = WHITE_LOGO_TEAMS.includes(team.id);
        }
    }

    return (
        <div className="max-w-2xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4">
            
            {showShareModal && user && <ShareModal user={user} onClose={() => setShowShareModal(false)} />}

            {/* Header / Identity with Dynamic Banner */}
            <div className="relative z-[30] mb-8 rounded-2xl border border-gray-700 shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all duration-500">
                <div className={`absolute inset-0 rounded-2xl overflow-hidden ${currentBannerClass} transition-all duration-500`}>
                    <div className="absolute top-0 left-0 w-full h-full bg-black/20"></div>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c8aa6e] to-transparent opacity-50"></div>
                    
                    {/* Team Logo Watermark in Banner */}
                    {bannerTeamLogo && (
                        <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none transform rotate-12 scale-150">
                            <img 
                                src={bannerTeamLogo} 
                                alt="" 
                                className={`w-64 h-64 object-contain ${isWhiteLogo ? 'brightness-0 invert' : ''}`} 
                            />
                        </div>
                    )}
                </div>
                
                <div className="relative z-10 p-6 flex flex-col sm:flex-row items-start gap-8">
                    {/* Avatar Group with Progress Ring */}
                    <div className="relative group flex-shrink-0 mx-auto sm:mx-0 w-36 h-36 flex items-center justify-center">
                        
                        {/* Avatar Image with Dynamic Frame */}
                        <div className={`w-28 h-28 rounded-full border-4 shadow-lg relative z-10 overflow-hidden bg-[#0a1428] transition-all duration-300 ${currentFrameClass}`}>
                            <img 
                                src={editForm.avatar || user.avatar} 
                                alt={user.name} 
                                className="w-full h-full object-cover"
                                onError={(e) => (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                            />
                        </div>

                        {/* Progress Ring (SVG) */}
                        {!isEditing && (
                            <>
                                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-20" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                                    <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} />
                                    <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#c8aa6e" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                                </svg>

                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center min-w-[80px]">
                                    <div className="bg-[#0a1428] border-2 border-[#c8aa6e] text-[#c8aa6e] text-[10px] font-bold px-3 py-0.5 rounded-full shadow-[0_0_10px_rgba(200,170,110,0.3)] tracking-wider">
                                        LVL {level}
                                    </div>
                                    <span className="text-[9px] text-gray-500 font-mono mt-0.5 bg-black/60 px-1.5 rounded backdrop-blur-sm border border-gray-800">
                                        {scoreInCurrentLevel} / 50 XP
                                    </span>
                                </div>
                            </>
                        )}
                        
                        {isEditing && (
                            <div className="absolute inset-0 rounded-full border-2 border-dashed border-gray-600 animate-spin-slow opacity-50 pointer-events-none"></div>
                        )}
                    </div>

                    {/* Info Group */}
                    <div className="flex-1 w-full min-w-0 pt-2">
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
                                <div className="relative z-30">
                                    <SearchableSelect 
                                        label="Elige tu Estandarte"
                                        options={bannerOptions}
                                        value={editForm.banner}
                                        onChange={(val) => setEditForm(prev => ({ ...prev, banner: val }))}
                                        placeholder="Buscar equipo..."
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="text-center sm:text-left">
                                <h1 className="text-3xl font-bold text-white mb-1 drop-shadow-lg">{user.name}</h1>
                                {user.title ? (
                                    <span className="inline-block bg-gradient-to-r from-[#c8aa6e]/20 to-transparent text-[#c8aa6e] border-l-2 border-[#c8aa6e] pl-3 pr-2 py-0.5 text-xs font-bold uppercase tracking-wider mb-2">
                                        {user.title}
                                    </span>
                                ) : (
                                    <span className="text-gray-400 text-xs italic mb-2 block">Sin título asignado</span>
                                )}
                                
                                {/* Equipped Badges Section (Max 3) */}
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-4">
                                    {user.equippedBadges && user.equippedBadges.length > 0 ? (
                                        user.equippedBadges.map(badgeId => {
                                            const badge = BADGE_DEFINITIONS[badgeId];
                                            if(!badge) return null;
                                            const Icon = badge.icon;
                                            return (
                                                <div key={badgeId} className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-bold uppercase ${badge.color}`} title={badge.description}>
                                                    <Icon className="w-3 h-3" />
                                                    <span>{badge.label}</span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-[10px] text-gray-500 italic bg-black/20 px-2 py-1 rounded">
                                            Sin insignias equipadas
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-center sm:justify-start gap-4 mt-4">
                                    <div className="text-gray-300 text-sm flex items-center gap-2 bg-black/40 px-4 py-2 rounded-lg border border-white/10 backdrop-blur-md">
                                        <div className="p-1 bg-[#0a1428] rounded border border-gray-600">
                                            <Medal className="w-4 h-4 text-yellow-500" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold block leading-none text-gray-400">Ranking</span>
                                            <span className="text-white font-bold leading-none">#{user.rank}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Share Button */}
                                    <button 
                                        onClick={() => setShowShareModal(true)}
                                        className="text-gray-300 text-sm flex items-center gap-2 bg-[#c8aa6e]/10 hover:bg-[#c8aa6e]/20 px-4 py-2 rounded-lg border border-[#c8aa6e]/30 backdrop-blur-md transition-colors group"
                                    >
                                        <Share2 className="w-4 h-4 text-[#c8aa6e]" />
                                        <span className="text-[#c8aa6e] font-bold text-xs uppercase">Compartir</span>
                                    </button>
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
                                        setEditForm({ title: user.title || '', avatar: user.avatar || '', championId: '', banner: user.banner || '' }); 
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
                                className="p-2 rounded-full bg-[#0a1428]/50 border border-gray-400/30 text-gray-300 hover:text-white hover:border-[#c8aa6e] transition-all m-4 sm:m-0 backdrop-blur-sm"
                            >
                                <PenLine className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 relative z-0">
                <StatCard icon={Trophy} label="Puntos Totales" value={user.score} type="gold" />
                <StatCard icon={Swords} label="Fase Regular" value={user.scoreBreakdown.matchday} type="blue" />
                <StatCard icon={Sparkles} label="Bola Cristal" value={user.scoreBreakdown.crystalBall} type="purple" />
                <StatCard icon={UserIcon} label="Fantasy" value={user.scoreBreakdown.fantasy} type="cyan" />
            </div>

            {/* REWARDS TRACK */}
            <div className="bg-[#091428] rounded-xl border border-gray-800 overflow-hidden mb-8 relative">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #1e293b 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                
                {/* Header */}
                <div className="p-6 border-b border-gray-800 bg-[#0a1428]/80 backdrop-blur relative z-10 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white uppercase tracking-wide flex items-center gap-2">
                        <Gift className="w-5 h-5 text-[#c8aa6e]" />
                        Senda de Leyenda
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="text-xs font-bold text-gray-400 uppercase mr-2 hidden sm:block">Tu Progreso</div>
                        <div className="h-2 w-24 sm:w-32 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-[#c8aa6e]" style={{ width: `${Math.min((level / 50) * 100, 100)}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-[#c8aa6e] ml-1">{level}/50</span>
                    </div>
                </div>

                {/* Timeline Scroll Area */}
                <div className="relative p-8 pb-12 overflow-x-auto custom-scrollbar bg-[#050a14]/50">
                    <div className="flex items-center min-w-max px-4">
                        {LEVEL_REWARDS.map((reward, idx) => {
                            const isUnlocked = level >= reward.level;
                            const isMajor = reward.type === 'frame' || reward.type === 'banner';
                            
                            // Check if equipped
                            const isEquipped = (reward.type === 'frame' && user.frame === reward.id) || 
                                               (reward.type === 'title' && user.title === reward.label) ||
                                               (reward.type === 'banner' && user.banner === reward.id);
                            
                            const Icon = reward.icon;

                            // Determine styles for visual preview (Always apply style to show preview even if locked)
                            let cardStyle = "bg-[#0a1428]";
                            if (reward.type === 'banner') {
                                cardStyle = BANNER_STYLES[reward.id] || "bg-gradient-to-br from-gray-800 to-black";
                            }

                            return (
                                <React.Fragment key={reward.id}>
                                    {/* Connector Line */}
                                    {idx > 0 && (
                                        <div className={`h-1 w-8 sm:w-16 transition-colors duration-500 rounded-full mx-1 ${level >= reward.level ? 'bg-gradient-to-r from-[#c8aa6e]/50 to-[#c8aa6e]' : 'bg-gray-800'}`}></div>
                                    )}

                                    <div className={`relative flex flex-col items-center ${isMajor ? '-my-4' : ''}`}>
                                        {/* Card/Node */}
                                        <div className={`
                                            relative flex flex-col items-center justify-center transition-all duration-300 overflow-hidden
                                            ${isMajor 
                                                ? `h-32 w-24 rounded-lg border-2 shadow-lg ${isEquipped ? 'scale-105' : ''}` 
                                                : `h-12 w-12 rounded-full border-2 ${isEquipped ? 'scale-110' : ''}`
                                            }
                                            ${isEquipped 
                                                ? 'border-[#c8aa6e] shadow-[0_0_15px_rgba(200,170,110,0.4)]' 
                                                : isUnlocked 
                                                    ? 'border-blue-500/50 hover:border-blue-400' 
                                                    : 'border-gray-800 opacity-90'
                                            }
                                            ${isMajor ? cardStyle : 'bg-[#050a14]'}
                                        `}>
                                            {isMajor ? (
                                                /* MAJOR REWARD CONTENT */
                                                <div className="flex flex-col items-center justify-center h-full w-full relative z-10 p-2">
                                                    {/* Frame Preview Logic */}
                                                    {reward.type === 'frame' ? (
                                                        <div className={`w-12 h-12 rounded-full border-2 ${FRAME_STYLES[reward.id]} bg-[#0f1d36] mb-2 overflow-hidden`}>
                                                            <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                                                        </div>
                                                    ) : (
                                                        // Icon for Banners
                                                        <Icon className={`w-8 h-8 mb-2 drop-shadow-md ${isUnlocked ? 'text-white' : 'text-white/80'}`} />
                                                    )}
                                                    
                                                    <div className="text-center">
                                                        <div className={`text-[7px] font-bold uppercase tracking-wider mb-0.5 ${isUnlocked ? 'text-blue-200' : 'text-gray-400'}`}>
                                                            {reward.type === 'frame' ? 'Marco' : 'Estandarte'}
                                                        </div>
                                                        <div className={`text-[8px] font-bold leading-tight line-clamp-2 ${isEquipped ? 'text-[#c8aa6e]' : isUnlocked ? 'text-white' : 'text-gray-300'}`}>
                                                            {reward.label.replace(/Marco |Estandarte /g, '')}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* MINOR REWARD CONTENT */
                                                <div className="flex items-center justify-center h-full w-full">
                                                    {isEquipped ? (
                                                        <CheckCircle2 className="w-5 h-5 text-[#c8aa6e]" />
                                                    ) : (
                                                        // Show icon even if locked
                                                        <Icon className={`w-5 h-5 ${isUnlocked ? 'text-blue-400' : 'text-gray-500'}`} />
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Level Badge */}
                                        <div className={`
                                            absolute ${isMajor ? '-top-3' : '-top-5'} left-1/2 -translate-x-1/2 text-[8px] font-bold px-1.5 py-0.5 rounded border z-20 whitespace-nowrap
                                            ${isUnlocked 
                                                ? 'bg-[#0a1428] border-blue-500/50 text-blue-300' 
                                                : 'bg-[#050a14] border-gray-800 text-gray-600'
                                            }
                                        `}>
                                            LVL {reward.level}
                                        </div>

                                        {/* Unified Action Footer (Label + Equip/Blocked Button) */}
                                        <div className={`absolute ${isMajor ? '-bottom-7' : '-bottom-10'} left-1/2 -translate-x-1/2 w-28 text-center flex flex-col items-center`}>
                                            {/* Label only for Minor items (Major have internal label) */}
                                            {!isMajor && (
                                                <span className={`text-[8px] font-bold uppercase truncate w-full block mb-1 ${isUnlocked ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {reward.label}
                                                </span>
                                            )}
                                            
                                            {/* Action Button */}
                                            {isUnlocked ? (
                                                <button
                                                    onClick={() => handleEquipReward(reward)}
                                                    disabled={isEquipped}
                                                    className={`
                                                        px-2 py-0.5 rounded text-[7px] font-bold uppercase border transition-all shadow-lg scale-90 sm:scale-100 whitespace-nowrap
                                                        ${isEquipped 
                                                            ? 'bg-[#c8aa6e] text-[#0a1428] border-[#c8aa6e] cursor-default' 
                                                            : 'bg-blue-900/80 text-blue-300 border-blue-500 hover:bg-blue-600 hover:text-white'
                                                        }
                                                    `}
                                                >
                                                    {isEquipped ? 'EQUIPADO' : 'EQUIPAR'}
                                                </button>
                                            ) : (
                                                <div className="bg-black/50 text-red-400/80 text-[7px] font-bold px-2 py-0.5 rounded border border-red-900/30 uppercase whitespace-nowrap">
                                                    BLOQUEADO
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* NEW SECTION: BADGE GALLERY (INTERACTIVE) */}
            <div className="bg-[#091428] rounded-xl border border-gray-800 p-6 mb-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white uppercase tracking-wide flex items-center gap-2">
                        <Medal className="w-5 h-5 text-[#c8aa6e]" />
                        Salón de Trofeos
                    </h3>
                    <div className="text-xs font-bold bg-[#0f1d36] px-3 py-1 rounded border border-gray-700">
                        <span className="text-gray-400">EQUIPADOS: </span>
                        <span className={user.equippedBadges?.length === 3 ? 'text-green-400' : 'text-[#c8aa6e]'}>
                            {user.equippedBadges?.length || 0} / 3
                        </span>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {Object.entries(BADGE_DEFINITIONS).map(([id, def]) => {
                        const isUnlocked = user.badges?.includes(id);
                        const isEquipped = user.equippedBadges?.includes(id);
                        const Icon = def.icon;
                        
                        // Badge Progress Logic
                        const progress = user.badgeProgress?.[id];
                        const showProgress = !isUnlocked && progress && progress.target > 0;
                        const progressPct = showProgress ? Math.min((progress.current / progress.target) * 100, 100) : 0;

                        // Extract base color class for styling locked state
                        const baseColor = def.color.split(' ')[0]; // e.g., 'text-purple-400'

                        return (
                            <button
                                key={id} 
                                onClick={() => isUnlocked && toggleBadgeEquip(id)}
                                disabled={!isUnlocked}
                                className={`
                                    flex flex-col gap-2 p-3 rounded-xl border transition-all relative overflow-hidden group text-left h-full
                                    ${isEquipped 
                                        ? `bg-[#0f1d36] border-[#c8aa6e] ring-1 ring-[#c8aa6e]/50 shadow-[0_0_15px_rgba(200,170,110,0.15)]` 
                                        : isUnlocked 
                                            ? `bg-[#0f1d36] border-gray-700 hover:border-gray-500 hover:bg-[#1a2c4e]` 
                                            : 'bg-[#050a14] border-gray-800 opacity-70 grayscale-[0.8] cursor-not-allowed'
                                    }
                                `}
                            >
                                <div className="flex items-start gap-3 w-full">
                                    <div className={`p-2 rounded-full border flex-shrink-0 transition-transform mt-0.5 ${isUnlocked ? 'bg-black/40 border-white/10 group-hover:scale-110' : 'bg-gray-900 border-gray-700'}`}>
                                        <Icon className={`w-5 h-5 ${isUnlocked ? (isEquipped ? 'text-[#c8aa6e]' : baseColor) : 'text-gray-500'}`} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className={`text-xs font-bold uppercase tracking-wider mb-1 leading-tight ${isEquipped ? 'text-[#c8aa6e]' : isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                                            {def.label}
                                        </div>
                                        <div className="text-[10px] text-gray-500 leading-snug">
                                            {def.description}
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Bar for Locked Badges */}
                                {showProgress && (
                                    <div className="w-full mt-2">
                                        <div className="flex justify-between items-center text-[9px] text-gray-500 font-bold mb-1 uppercase tracking-wider">
                                            <span>Progreso</span>
                                            <span>{progress.current} / {progress.target}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-gray-500 transition-all duration-500" style={{ width: `${progressPct}%` }}></div>
                                        </div>
                                    </div>
                                )}

                                {isEquipped && (
                                    <div className="absolute top-2 right-2 flex items-center gap-1">
                                        <span className="text-[8px] font-bold uppercase bg-[#c8aa6e] text-[#0a1428] px-1.5 py-0.5 rounded">Equipado</span>
                                    </div>
                                )}
                                {!isEquipped && isUnlocked && (
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <CheckCircle2 className="w-3 h-3 text-gray-500" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Score Breakdown */}
            <div className="bg-[#091428] rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-bold text-white uppercase tracking-wide mb-6 flex items-center gap-2">
                    <div className="w-1 h-6 bg-[#c8aa6e] rounded-full"></div>
                    Desglose de Puntuación
                </h3>
                
                <BreakdownBar label="Predicciones Jornada (Matchday)" value={user.scoreBreakdown.matchday} max={100} color="bg-blue-500" />
                <BreakdownBar label="Ranking Winter 2026" value={user.scoreBreakdown.ranking} max={100} color="bg-green-500" />
                <BreakdownBar label="Playoffs" value={user.scoreBreakdown.playoffs} max={150} color="bg-red-500" />
                
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
