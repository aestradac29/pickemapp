
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Team, Stage } from '../types';
import { dataService } from '../services/dataService';
import { getChampions } from '../services/riotService';
import { SearchableSelect, Option } from './ui/SearchableSelect';
import { PenLine, Save, Loader2, CheckCircle2, User as UserIcon, Trophy, Sparkles, Swords, Medal, AlertCircle, Link, Image as ImageIcon, Gift, Lock, Star, Crown, CircleDashed, LayoutTemplate, Share2, Copy, Download, Camera, Zap, Eye, BarChart2, Award, ChevronRight } from 'lucide-react';
import { FRAME_STYLES, BANNER_STYLES, BADGE_DEFINITIONS, normalizeSplitId } from '../constants';
import html2canvas from 'html2canvas';

interface ProfileViewProps {
    viewingUserId: string | null;
    sessionUserId: string | null;
}

const XP_MULTIPLIER = 3;
const XP_PER_LEVEL  = 50;

const REWARD_TITLES = [
    "Iniciado","Novato","Aprendiz","Recluta","Escudero",
    "Explorador","Guerrero","Veterano","Centinela","Guardián",
    "Caballero","Paladín","Campeón","Héroe","Vengador",
    "Conquistador","Señor","Comandante","General","Mariscal",
    "Sabio","Erudito","Mago","Hechicero","Archimago",
    "Brujo","Invocador","Gran Invocador","Maestro","Gran Maestro",
    "Leyenda","Mito","Semidiós","Divinidad","Titán",
    "Coloso","Inmortal","Eterno","Infinito","Omnipotente",
    "Destructor","Creador","Soberano","Emperador","Dios",
    "Ascendido","Primigenio","Omnisciente","Absoluto",
];

const LEVEL_REWARDS = Array.from({ length: 50 }, (_, i) => {
    const level = i + 1;
    let reward: any = { level };
    if (level === 2)  { reward = { ...reward, id:'frame_bronze',      label:'Marco Bronce',        type:'frame',  icon:ImageIcon }; }
    else if (level === 8)  { reward = { ...reward, id:'banner_freljord',   label:'Estandarte Helado',   type:'banner', icon:LayoutTemplate }; }
    else if (level === 10) { reward = { ...reward, id:'frame_silver',      label:'Marco Plata',         type:'frame',  icon:ImageIcon }; }
    else if (level === 15) { reward = { ...reward, id:'banner_bilgewater',  label:'Estandarte Corsario', type:'banner', icon:LayoutTemplate }; }
    else if (level === 18) { reward = { ...reward, id:'banner_zaun',        label:'Estandarte Químico',  type:'banner', icon:LayoutTemplate }; }
    else if (level === 20) { reward = { ...reward, id:'frame_gold',         label:'Marco Oro',           type:'frame',  icon:ImageIcon }; }
    else if (level === 25) { reward = { ...reward, id:'banner_ionia',       label:'Estandarte Espiritual',type:'banner',icon:LayoutTemplate }; }
    else if (level === 28) { reward = { ...reward, id:'banner_shurima',     label:'Estandarte Solar',    type:'banner', icon:LayoutTemplate }; }
    else if (level === 30) { reward = { ...reward, id:'frame_platinum',     label:'Marco Platino',       type:'frame',  icon:ImageIcon }; }
    else if (level === 35) { reward = { ...reward, id:'banner_shadow_isles',label:'Estandarte Espectral',type:'banner',icon:LayoutTemplate }; }
    else if (level === 38) { reward = { ...reward, id:'banner_noxus',       label:'Estandarte Imperial', type:'banner', icon:LayoutTemplate }; }
    else if (level === 40) { reward = { ...reward, id:'frame_master',       label:'Marco Maestro',       type:'frame',  icon:ImageIcon }; }
    else if (level === 45) { reward = { ...reward, id:'banner_targon',      label:'Estandarte Celestial',type:'banner', icon:LayoutTemplate }; }
    else if (level === 48) { reward = { ...reward, id:'banner_void',        label:'Estandarte del Vacío',type:'banner', icon:LayoutTemplate }; }
    else if (level === 50) { reward = { ...reward, id:'frame_diamond',      label:'Marco Diamante',      type:'frame',  icon:Trophy }; }
    else {
        reward = { ...reward, id:`title_lvl_${level}`, label:REWARD_TITLES[i % REWARD_TITLES.length], type:'title', icon:PenLine };
    }
    return reward;
});

const getBannerStyle = (bannerId: string | undefined, teams: Team[]) => {
    let style = {}, className = BANNER_STYLES['default'], teamData = null as Team | null;
    if (bannerId?.startsWith('banner_')) {
        const teamId = bannerId.replace('banner_', '');
        teamData = teams.find(t => t.id === teamId) || null;
        if (teamData) {
            className = BANNER_STYLES[`banner_${teamId}`] || '';
            if (!className) style = { backgroundColor: teamData.color };
        } else {
            className = BANNER_STYLES[bannerId] || BANNER_STYLES['default'];
        }
    } else if (bannerId && BANNER_STYLES[bannerId]) {
        className = BANNER_STYLES[bannerId];
    }
    return { style, className, teamData };
};

// ── ShareModal ────────────────────────────────────────────────────────────────
const ShareModal = ({ user, teams, onClose }: { user: User; teams: Team[]; onClose: () => void }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const level = Math.floor(((user.totalScore || user.score) * XP_MULTIPLIER) / XP_PER_LEVEL) + 1;

    const handleCopy = () => {
        navigator.clipboard.writeText(`🏆 Pick'em Pro\n👤 ${user.name}\n🏅 Rank #${user.rank}\n✨ ${user.totalScore || user.score} Puntos\n🔗 pickemapp.vercel.app`);
        setCopied(true); setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadImage = async () => {
        if (!cardRef.current) return;
        setIsGenerating(true);
        try {
            const canvas = await html2canvas(cardRef.current, { backgroundColor: '#091428', scale: 2, useCORS: true, logging: false });
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `PickemPro-${user.name}.png`;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
        } catch { console.error('Error generating image'); }
        finally { setIsGenerating(false); }
    };

    const { style: bannerStyle, className: bannerClass } = getBannerStyle(user.banner, teams);
    const frameClass = user.frame && FRAME_STYLES[user.frame] ? FRAME_STYLES[user.frame] : FRAME_STYLES['default'];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-sm bg-[#091428] rounded-2xl overflow-hidden shadow-2xl border border-gray-700 relative">
                <button onClick={onClose} className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white z-50">
                    <CheckCircle2 className="w-5 h-5 text-gray-400" />
                </button>
                <div ref={cardRef} className="relative pb-6 bg-[#091428]">
                    <div className={`h-32 relative ${bannerClass}`} style={bannerStyle}>
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                            <div className={`w-24 h-24 rounded-full border-4 shadow-xl overflow-hidden bg-[#0a1428] ${frameClass}`}>
                                <img src={user.avatar} className="w-full h-full object-cover" alt="" crossOrigin="anonymous" />
                            </div>
                        </div>
                    </div>
                    <div className="pt-12 px-6 text-center">
                        <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                        <div className="text-[#c8aa6e] text-xs font-bold uppercase tracking-widest mb-4">{user.title || 'Invocador'}</div>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {[['#' + user.rank, 'Ranking'], [String(user.score), 'Puntos'], [String(level), 'Nivel']].map(([v, l]) => (
                                <div key={l} className="bg-[#0f1d36] p-2 rounded border border-gray-700">
                                    <div className="text-xl font-bold text-white">{v}</div>
                                    <div className="text-[9px] text-gray-500 uppercase">{l}</div>
                                </div>
                            ))}
                        </div>
                        <div className="text-[10px] text-gray-600 font-mono">pickemapp.vercel.app</div>
                    </div>
                </div>
                <div className="p-4 bg-[#050a14] border-t border-gray-800 flex gap-3">
                    <button onClick={handleDownloadImage} disabled={isGenerating}
                        className="flex-1 bg-[#0ac8b9]/10 hover:bg-[#0ac8b9]/20 border border-[#0ac8b9]/50 text-[#0ac8b9] font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                        <span className="text-xs uppercase">Imagen</span>
                    </button>
                    <button onClick={handleCopy}
                        className="flex-1 bg-[#c8aa6e] hover:bg-[#d6bb82] text-[#0a1428] font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors">
                        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span className="text-xs uppercase">{copied ? 'Copiado' : 'Copiar'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── ProfileView ───────────────────────────────────────────────────────────────
export const ProfileView: React.FC<ProfileViewProps> = ({ viewingUserId, sessionUserId }) => {
    const [selectedSplit] = useState(() => normalizeSplitId(localStorage.getItem('selectedSplit')));
    const [user, setUser]     = useState<User | null>(null);
    const [teams, setTeams]   = useState<Team[]>([]);
    const [isLoading, setIsLoading]  = useState(true);
    const [isEditing, setIsEditing]  = useState(false);
    const [championOptions, setChampionOptions] = useState<Option[]>([]);
    const [showShareModal, setShowShareModal]   = useState(false);
    const [activeTab, setActiveTab] = useState<'stats' | 'rewards' | 'badges'>('stats');
    const [maxScores, setMaxScores]  = useState({ matchday: 0, ranking: 0, playoffs: 0 });
    const [editForm, setEditForm]    = useState({ title: '', avatar: '', banner: '', championId: '' });
    const [equippingId, setEquippingId]  = useState<string | null>(null);
    const [isSaving, setIsSaving]        = useState(false);
    const [saveStatus, setSaveStatus]    = useState<'idle' | 'success' | 'error'>('idle');
    const [toastMsg, setToastMsg]        = useState<string | null>(null);

    const isOwnProfile = viewingUserId === sessionUserId;

    const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3500); };

    useEffect(() => { loadData(); }, [viewingUserId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [champs, teamsMap, users, allMatches] = await Promise.all([
                getChampions(), dataService.getTeams(), dataService.getAllUsers(), dataService.getMatches(),
            ]);
            setChampionOptions(champs.sort((a, b) => a.label.localeCompare(b.label)));
            setTeams(Object.values(teamsMap));

            const isSpring = selectedSplit.toLowerCase().includes('spring');
            const matchdayCount = allMatches.filter(m => m.stage === Stage.GROUPS).length;
            setMaxScores({
                matchday: isSpring ? matchdayCount * 1.5 : matchdayCount,
                ranking:  isSpring ? Object.keys(teamsMap).length * 6.75 : Object.keys(teamsMap).length * 6,
                playoffs: isSpring ? 68 : 66,
            });

            if (viewingUserId) {
                const found = users.find(u => u.id === viewingUserId);
                if (found) {
                    setUser(found);
                    setEditForm({ title: found.title || '', avatar: found.avatar || '', banner: found.banner || '', championId: '' });
                }
            }
        } catch (e) { console.error('Error loading profile', e); }
        finally { setIsLoading(false); }
    };

    const handleSave = async () => {
        if (!isOwnProfile || !sessionUserId) return;
        setIsSaving(true); setSaveStatus('idle');
        try {
            await dataService.updateUserProfile(sessionUserId, { title: editForm.title, avatar_url: editForm.avatar, banner: editForm.banner });
            setSaveStatus('success');
            setIsEditing(false);
            setUser(prev => prev ? { ...prev, title: editForm.title, avatar: editForm.avatar, banner: editForm.banner } : null);
        } catch { setSaveStatus('error'); }
        finally { setIsSaving(false); }
    };

    const handleEquipReward = async (reward: typeof LEVEL_REWARDS[0]) => {
        if (!isOwnProfile || !sessionUserId || !user) return;
        const currentLevel = Math.floor(((user.totalScore || user.score) * XP_MULTIPLIER) / XP_PER_LEVEL) + 1;
        if (currentLevel < reward.level) return;
        setEquippingId(reward.id);
        const updates: any = {};
        if (reward.type === 'title')  { updates.title  = reward.label; setUser(p => p ? { ...p, title:  reward.label } : null); }
        if (reward.type === 'frame')  { updates.frame  = reward.id;    setUser(p => p ? { ...p, frame:  reward.id }   : null); }
        if (reward.type === 'banner') { updates.banner = reward.id;    setUser(p => p ? { ...p, banner: reward.id }   : null); }
        try { await dataService.updateUserProfile(sessionUserId, updates); }
        catch (e) { console.error('Error equipping reward', e); }
        finally { setEquippingId(null); }
    };

    const toggleBadgeEquip = async (badgeId: string) => {
        if (!isOwnProfile || !user || !sessionUserId) return;
        const current = user.equippedBadges || [];
        let next = current.includes(badgeId) ? current.filter(id => id !== badgeId) : [...current, badgeId];
        if (next.length > 3 && !current.includes(badgeId)) {
            showToast('Máximo 3 insignias equipadas a la vez.');
            return;
        }
        setUser(p => p ? { ...p, equippedBadges: next } : null);
        try { await dataService.updateUserProfile(sessionUserId, { equippedBadges: next } as any); }
        catch (e) { console.error('Error saving badges', e); }
    };

    const titleOptions: Option[] = useMemo(() => championOptions.map(c => ({
        id: c.subLabel || c.label, label: c.subLabel || 'Campeón',
        subLabel: `Título de ${c.label}`, image: c.image, color: c.color,
    })).sort((a, b) => a.label.localeCompare(b.label)), [championOptions]);

    const bannerOptions: Option[] = useMemo(() => teams.map(t => ({
        id: `banner_${t.id}`, label: `Estandarte ${t.shortName}`, subLabel: t.name, image: t.logo, color: t.color,
    })), [teams]);

    const handleAvatarChange = (champId: string) => {
        const sel = championOptions.find(c => c.id === champId);
        if (sel?.image) setEditForm(p => ({ ...p, avatar: sel.image!, championId: champId }));
    };

    if (isLoading) return <div className="min-h-[500px] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-[#c8aa6e]" /></div>;
    if (!user)     return <div className="min-h-[300px] flex flex-col items-center justify-center text-gray-500"><AlertCircle className="w-10 h-10 mb-2 opacity-50" /><p>Perfil no encontrado.</p></div>;

    // ── Derived values ──────────────────────────────────────────────────────
    const totalXp          = (user.totalScore || user.score) * XP_MULTIPLIER;
    const level            = Math.floor(totalXp / XP_PER_LEVEL) + 1;
    const xpInLevel        = totalXp % XP_PER_LEVEL;
    const progressPct      = (xpInLevel / XP_PER_LEVEL) * 100;
    const size = 144, sw = 3, r = size / 2 - sw * 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (progressPct / 100) * circ;

    const activeBannerId = isEditing ? editForm.banner : user.banner;
    const currentFrameClass = FRAME_STYLES[user.frame || ''] || FRAME_STYLES['default'];
    const { style: bannerStyle, className: bannerClass, teamData: activeTeamData } = getBannerStyle(activeBannerId, teams);
    const currentAvatarChampId = championOptions.find(c => c.image === editForm.avatar)?.id;

    const TABS = [
        { id: 'stats'   as const, label: 'Estadísticas', icon: BarChart2 },
        { id: 'rewards' as const, label: 'Senda',        icon: Gift },
        { id: 'badges'  as const, label: 'Trofeos',      icon: Award },
    ];

    return (
        <div className="max-w-2xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4">

            {/* Toast */}
            {toastMsg && (
                <div className="fixed top-20 right-4 z-[200] bg-yellow-900/90 border border-yellow-500/50 text-yellow-200 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-in slide-in-from-right-4">
                    {toastMsg}
                </div>
            )}

            {showShareModal && user && <ShareModal user={user} teams={teams} onClose={() => setShowShareModal(false)} />}

            {/* Spectator Banner */}
            {!isOwnProfile && (
                <div className="mb-6 bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg flex items-center gap-3">
                    <Eye className="w-5 h-5 text-blue-400" />
                    <p className="text-sm text-blue-200">Viendo el perfil de <span className="font-bold text-white">{user.name}</span></p>
                </div>
            )}

            {/* ── Banner + Avatar ── */}
            <div className={`relative mb-6 rounded-2xl border border-gray-700 shadow-xl overflow-hidden ${isEditing ? 'overflow-visible' : ''}`}>
                {/* Banner background */}
                <div className={`absolute inset-0 rounded-2xl overflow-hidden ${bannerClass}`} style={bannerStyle}>
                    {activeTeamData?.logo && (
                        <div className="absolute -right-12 -top-12 opacity-40 pointer-events-none rotate-12 scale-150">
                            <img src={activeTeamData.logo} alt="" className="w-96 h-96 object-contain" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/25 pointer-events-none" />
                </div>

                <div className="relative z-10 p-5 flex flex-col sm:flex-row items-start gap-6">
                    {/* Avatar + level ring */}
                    <div className="relative flex-shrink-0 mx-auto sm:mx-0 w-36 h-36 flex items-center justify-center">
                        <div className={`w-28 h-28 rounded-full border-4 shadow-lg overflow-hidden bg-[#0a1428] ${currentFrameClass}`}>
                            <img src={editForm.avatar || user.avatar} alt={user.name} className="w-full h-full object-cover"
                                onError={e => (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${user.name}&background=random`} />
                        </div>
                        {!isEditing && (
                            <>
                                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                                    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={sw} />
                                    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#c8aa6e" strokeWidth={sw}
                                        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out" />
                                </svg>
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                    <span className="bg-[#0a1428] border-2 border-[#c8aa6e] text-[#c8aa6e] text-[10px] font-bold px-3 py-0.5 rounded-full shadow-lg tracking-wider">
                                        LVL {level}
                                    </span>
                                    <span className="text-[9px] text-gray-500 font-mono mt-0.5 bg-black/60 px-1.5 rounded border border-gray-800">
                                        {xpInLevel}/{XP_PER_LEVEL} XP
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 pt-1">
                        {isEditing ? (
                            <div className="space-y-3">
                                <div className="relative z-50 bg-[#091428]/95 backdrop-blur p-3 rounded-xl border border-gray-700 shadow-xl">
                                    <SearchableSelect label="Avatar (Campeón)" options={championOptions} value={currentAvatarChampId} onChange={handleAvatarChange} placeholder="Buscar campeón..." />
                                </div>
                                <div className="relative z-40 bg-[#091428]/95 backdrop-blur p-3 rounded-xl border border-gray-700 shadow-xl">
                                    <SearchableSelect label="Título" options={titleOptions} value={editForm.title} onChange={val => setEditForm(p => ({ ...p, title: val }))} placeholder="Buscar título..." />
                                </div>
                                <div className="relative z-30 bg-[#091428]/95 backdrop-blur p-3 rounded-xl border border-gray-700 shadow-xl">
                                    <SearchableSelect label="Estandarte" options={bannerOptions} value={editForm.banner} onChange={val => setEditForm(p => ({ ...p, banner: val }))} placeholder="Buscar equipo..." />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h1 className="text-2xl font-bold text-white drop-shadow-lg tracking-tight">{user.name}</h1>
                                {user.title ? (
                                    <span className="inline-block bg-gradient-to-r from-[#c8aa6e]/20 to-transparent text-[#c8aa6e] border-l-2 border-[#c8aa6e] pl-3 pr-2 py-0.5 text-xs font-bold uppercase tracking-wider mt-1 mb-3">
                                        {user.title}
                                    </span>
                                ) : <span className="text-gray-500 text-xs italic mb-3 block mt-1">Sin título</span>}

                                {/* Badges row */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {(user.equippedBadges || []).map(bid => {
                                        const b = BADGE_DEFINITIONS[bid]; if (!b) return null;
                                        const Icon = b.icon;
                                        return (
                                            <span key={bid} className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${b.color} backdrop-blur-sm`} title={b.description}>
                                                <Icon className="w-3 h-3" />{b.label}
                                            </span>
                                        );
                                    })}
                                    {!(user.equippedBadges?.length) && <span className="text-[10px] text-gray-600 italic">Sin insignias equipadas</span>}
                                </div>

                                {/* Rank + Share */}
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-white/10 backdrop-blur-md">
                                        <Medal className="w-4 h-4 text-yellow-400" />
                                        <div>
                                            <span className="text-[9px] uppercase font-bold text-gray-500 block leading-none">Ranking</span>
                                            <span className="text-white font-bold text-sm leading-none">#{user.rank}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowShareModal(true)}
                                        className="flex items-center gap-2 bg-[#c8aa6e]/10 hover:bg-[#c8aa6e]/20 px-3 py-2 rounded-lg border border-[#c8aa6e]/30 transition-colors">
                                        <Share2 className="w-4 h-4 text-[#c8aa6e]" />
                                        <span className="text-[#c8aa6e] font-bold text-xs uppercase">Compartir</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Edit button */}
                    {isOwnProfile && (
                        <div className="absolute top-4 right-4 sm:static sm:ml-auto">
                            {isEditing ? (
                                <div className="flex gap-2">
                                    <button onClick={() => { setIsEditing(false); setEditForm({ title: user.title||'', avatar: user.avatar||'', championId:'', banner: user.banner||'' }); }}
                                        className="px-3 py-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white text-xs font-bold">Cancelar</button>
                                    <button onClick={handleSave} disabled={isSaving}
                                        className="px-4 py-2 rounded-lg bg-[#c8aa6e] text-[#0a1428] font-bold hover:bg-[#e0c285] flex items-center gap-2 text-xs">
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Guardar
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => setIsEditing(true)}
                                    className="p-2 rounded-full bg-[#0a1428]/40 border border-white/10 text-gray-300 hover:text-white hover:border-[#c8aa6e] transition-all backdrop-blur-sm">
                                    <PenLine className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Score summary strip ── */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                    { label: 'Total', value: user.score, color: 'text-[#c8aa6e]', bg: 'bg-[#c8aa6e]/8 border-[#c8aa6e]/20' },
                    { label: 'Jornadas', value: user.scoreBreakdown.matchday, color: 'text-blue-400', bg: 'bg-blue-900/10 border-blue-500/20' },
                    { label: 'Fantasy', value: user.scoreBreakdown.fantasy, color: 'text-[#0ac8b9]', bg: 'bg-[#0ac8b9]/8 border-[#0ac8b9]/20' },
                ].map(s => (
                    <div key={s.label} className={`${s.bg} border rounded-xl p-3 text-center`}>
                        <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* ── Tab navigation ── */}
            <div className="flex gap-1 mb-6 bg-[#060f1e] p-1 rounded-xl border border-gray-800">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all
                                ${active ? 'bg-[#c8aa6e] text-[#050d1a] shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
                            <Icon className="w-3.5 h-3.5" />{tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ── STATS TAB ── */}
            {activeTab === 'stats' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="bg-[#060f1e] rounded-xl border border-gray-800 p-5">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <div className="w-1 h-4 bg-[#c8aa6e] rounded-full" /> Desglose de Puntuación
                        </h3>
                        {[
                            { label: 'Predicciones Jornada', sub: `${user.scoreBreakdown.matchdayCount} aciertos`, value: user.scoreBreakdown.matchday, max: maxScores.matchday, color: 'bg-blue-500' },
                            { label: 'Ranking Final', sub: '', value: user.scoreBreakdown.ranking, max: maxScores.ranking, color: 'bg-green-500' },
                            { label: 'Playoffs', sub: '', value: user.scoreBreakdown.playoffs, max: maxScores.playoffs, color: 'bg-red-500' },
                        ].map(b => (
                            <div key={b.label} className="mb-5">
                                <div className="flex justify-between text-xs font-bold mb-1.5">
                                    <div>
                                        <span className="text-gray-300">{b.label}</span>
                                        {b.sub && <span className="text-gray-600 font-normal ml-2">· {b.sub}</span>}
                                    </div>
                                    <span className="text-white">{b.value} <span className="text-gray-600">/ {Math.round(b.max)}</span></span>
                                </div>
                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-1000 ${b.color}`}
                                        style={{ width: `${Math.min((b.value / (b.max || 1)) * 100, 100)}%` }} />
                                </div>
                            </div>
                        ))}

                        <div className="mt-5 pt-4 border-t border-gray-800 flex items-center justify-between">
                            <div>
                                <span className="text-xs text-gray-500 uppercase font-bold">Liga Fantasy</span>
                                {user.scoreBreakdown.matchdayCount > 0 && (
                                    <span className="ml-2 text-[10px] text-gray-600">
                                        · {((user.scoreBreakdown.matchday / (user.scoreBreakdown.matchdayCount || 1))).toFixed(1)} pts/jornada
                                    </span>
                                )}
                            </div>
                            <span className="text-[#0ac8b9] font-black text-xl">{user.scoreBreakdown.fantasy} <span className="text-sm text-[#0ac8b9]/50">pts</span></span>
                        </div>
                    </div>

                    {/* Points history — SVG line chart (barras % no funcionan en flex sin altura px fija) */}
                    {user.pointsHistory && user.pointsHistory.length > 0 && (
                        <div className="bg-[#060f1e] rounded-xl border border-gray-800 p-5">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <div className="w-1 h-4 bg-blue-500 rounded-full" /> Progresión por Jornada
                            </h3>
                            {(() => {
                                const pts = user.pointsHistory;
                                const maxPts = Math.max(...pts.map(p => p.points), 1);
                                const minPts = Math.min(...pts.map(p => p.points), 0);
                                const range = maxPts - minPts || 1;
                                const W = 300, H = 140, padX = 6, padY = 18;
                                const n = pts.length;
                                const xs = pts.map((_, i) => padX + (i / Math.max(n - 1, 1)) * (W - padX * 2));
                                const ys = pts.map(p => H - padY - ((p.points - minPts) / range) * (H - padY * 2));
                                const polyline = xs.map((x, i) => x.toFixed(2) + "," + ys[i].toFixed(2)).join(" ");
                                const areaPoints = xs[0].toFixed(2) + "," + H + " " + polyline + " " + xs[n-1].toFixed(2) + "," + H;
                                return (
                                    <svg viewBox={"0 0 " + W + " " + H} className="w-full" style={{ height: 160 }} overflow="visible">
                                        <defs>
                                            <linearGradient id="phGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#3b82f6" />
                                                <stop offset="100%" stopColor="#0ac8b9" />
                                            </linearGradient>
                                            <linearGradient id="phFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
                                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        {/* Grid lines */}
                                        {[0, 0.5, 1].map((t, i) => {
                                            const y = (padY + t * (H - padY * 2)).toFixed(1);
                                            return <line key={i} x1={padX} y1={y} x2={W - padX} y2={y} stroke="#1e2d45" strokeWidth="1" />;
                                        })}
                                        {/* Area fill */}
                                        <polygon points={areaPoints} fill="url(#phFill)" />
                                        {/* Line */}
                                        <polyline points={polyline} fill="none" stroke="url(#phGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                                        {/* Dots + labels */}
                                        {pts.map((p, i) => (
                                            <g key={i}>
                                                <circle cx={xs[i]} cy={ys[i]} r="4" fill="#0ac8b9" />
                                                <text x={xs[i]} y={H - 1} textAnchor="middle" fontSize="9" fill="#4b5563">{p.day}</text>
                                                {/* Value tooltip on last point */}
                                                {i === n - 1 && (
                                                    <text x={xs[i] + 4} y={ys[i] - 5} fontSize="9" fill="#0ac8b9" fontWeight="bold">{p.points}</text>
                                                )}
                                            </g>
                                        ))}
                                    </svg>
                                );
                            })()}
                        </div>
                    )}

                    {/* Fantasy history — SVG bar chart por ronda */}
                    {user.fantasyHistory && user.fantasyHistory.length > 0 && (
                        <div className="bg-[#060f1e] rounded-xl border border-gray-800 p-5">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <div className="w-1 h-4 bg-[#0ac8b9] rounded-full" /> Fantasy por Ronda
                            </h3>
                            {(() => {
                                const pts = user.fantasyHistory;
                                const maxPts = Math.max(...pts.map(p => p.points), 1);
                                const W = 300, H = 130, padX = 6, padY = 16;
                                const barW = Math.max(8, (W - padX * 2) / pts.length - 4);
                                const gap = (W - padX * 2 - barW * pts.length) / Math.max(pts.length - 1, 1);
                                return (
                                    <svg viewBox={"0 0 " + W + " " + H} className="w-full" style={{ height: 150 }} overflow="visible">
                                        <defs>
                                            <linearGradient id="fhGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#0ac8b9" stopOpacity="0.9" />
                                                <stop offset="100%" stopColor="#0ac8b9" stopOpacity="0.3" />
                                            </linearGradient>
                                        </defs>
                                        {pts.map((p, i) => {
                                            const bH = Math.max(1.5, (p.points / maxPts) * (H - padY * 2));
                                            const x = padX + i * (barW + gap);
                                            const y = H - padY - bH;
                                            const isTop = p.points === maxPts;
                                            return (
                                                <g key={i}>
                                                    <rect x={x} y={y} width={barW} height={bH}
                                                        rx="2.5" fill={isTop ? "#0ac8b9" : "url(#fhGrad)"} />
                                                    {p.points > 0 && (
                                                        <text x={x + barW / 2} y={y - 4} textAnchor="middle"
                                                            fontSize="9" fill={isTop ? "#0ac8b9" : "#6b7280"} fontWeight={isTop ? "bold" : "normal"}>
                                                            {p.points}
                                                        </text>
                                                    )}
                                                    <text x={x + barW / 2} y={H - 1} textAnchor="middle" fontSize="9" fill="#4b5563">{p.day}</text>
                                                </g>
                                            );
                                        })}
                                    </svg>
                                );
                            })()}
                        </div>
                    )}
                </div>
            )}

            {/* ── REWARDS TAB ── */}
            {activeTab === 'rewards' && (
                <div className="animate-in fade-in duration-200">
                    <div className="bg-[#060f1e] rounded-xl border border-gray-800 overflow-hidden">
                        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Gift className="w-4 h-4 text-[#c8aa6e]" /> Senda de Leyenda
                            </h3>
                            <div className="flex items-center gap-2">
                                <Zap className="w-3 h-3 text-yellow-400" />
                                <span className="text-[10px] text-yellow-400 font-bold">XP x{XP_MULTIPLIER}</span>
                                <span className="text-gray-700 mx-1">·</span>
                                <span className="text-[10px] text-[#c8aa6e] font-bold">{level}/50</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto p-6">
                            <div className="flex items-center min-w-max gap-0">
                                {LEVEL_REWARDS.map((reward, idx) => {
                                    const isUnlocked = level >= reward.level;
                                    const isMajor    = reward.type === 'frame' || reward.type === 'banner';
                                    const isEquipped = (reward.type==='frame' && user.frame===reward.id) ||
                                                       (reward.type==='title' && user.title===reward.label) ||
                                                       (reward.type==='banner' && user.banner===reward.id);
                                    const Icon = reward.icon;
                                    const cardStyle = reward.type === 'banner' ? getBannerStyle(reward.id, teams) : null;

                                    return (
                                        <React.Fragment key={reward.id}>
                                            {idx > 0 && (
                                                <div className={`h-0.5 w-6 sm:w-10 flex-shrink-0 rounded-full mx-0.5 ${level >= reward.level ? 'bg-[#c8aa6e]/50' : 'bg-gray-800'}`} />
                                            )}
                                            <div className={`relative flex flex-col items-center ${isMajor ? '-my-3' : ''}`}>
                                                <div className={`
                                                    text-[7px] font-bold px-1.5 py-0.5 rounded border mb-1 whitespace-nowrap
                                                    ${isUnlocked ? 'bg-[#060f1e] border-[#c8aa6e]/40 text-[#c8aa6e]' : 'bg-[#050a14] border-gray-800 text-gray-700'}
                                                `}>LVL {reward.level}</div>

                                                <div className={`
                                                    relative flex flex-col items-center justify-center overflow-hidden transition-all duration-200
                                                    ${isMajor ? 'h-28 w-20 rounded-xl border-2 shadow-lg' : 'h-10 w-10 rounded-full border-2'}
                                                    ${isEquipped ? 'border-[#c8aa6e] shadow-[0_0_12px_rgba(200,170,110,0.3)] scale-105' : isUnlocked ? 'border-blue-500/40' : 'border-gray-800 opacity-60'}
                                                    ${isMajor && reward.type==='banner' ? (cardStyle?.className||'bg-[#050a14]') : 'bg-[#050a14]'}
                                                `} style={isMajor && reward.type==='banner' ? cardStyle?.style : {}}>
                                                    {isMajor && reward.type==='frame' ? (
                                                        <div className={`w-10 h-10 rounded-full border-2 ${FRAME_STYLES[reward.id]} overflow-hidden`}>
                                                            <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                                                        </div>
                                                    ) : (
                                                        <Icon className={`w-5 h-5 ${isUnlocked ? 'text-white' : 'text-gray-700'} drop-shadow`} />
                                                    )}
                                                    {isMajor && (
                                                        <div className="absolute bottom-0 inset-x-0 bg-black/60 py-0.5">
                                                            <span className="text-[6px] font-bold uppercase text-center block text-gray-200 truncate px-1">
                                                                {reward.label.replace('Estandarte ','').replace('Marco ','')}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {!isMajor && (
                                                    <div className="text-[7px] text-gray-600 mt-0.5 max-w-[48px] text-center truncate">{reward.label}</div>
                                                )}

                                                {isOwnProfile && isUnlocked && (
                                                    <button onClick={() => handleEquipReward(reward)} disabled={isEquipped || !!equippingId}
                                                        className={`mt-1 px-1.5 py-0.5 rounded text-[7px] font-bold uppercase border whitespace-nowrap transition-all
                                                            ${isEquipped ? 'bg-[#c8aa6e] text-[#050d1a] border-[#c8aa6e] cursor-default' : 'bg-blue-900/60 text-blue-300 border-blue-500/40 hover:bg-blue-600 hover:text-white'}`}>
                                                        {isEquipped ? 'Equipado' : 'Equipar'}
                                                    </button>
                                                )}
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── BADGES TAB ── */}
            {activeTab === 'badges' && (
                <div className="animate-in fade-in duration-200">
                    <div className="bg-[#060f1e] rounded-xl border border-gray-800 p-5">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Award className="w-4 h-4 text-[#c8aa6e]" /> Salón de Trofeos
                            </h3>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${user.equippedBadges?.length === 3 ? 'text-green-400 border-green-500/30 bg-green-900/20' : 'text-gray-500 border-gray-700'}`}>
                                {user.equippedBadges?.length || 0}/3 equipados
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Object.entries(BADGE_DEFINITIONS).map(([id, def]) => {
                                const isUnlocked = user.badges?.includes(id);
                                const isEquipped = user.equippedBadges?.includes(id);
                                const progress   = user.badgeProgress?.[id];
                                const showProg   = !isUnlocked && progress && progress.target > 0;
                                const pct        = showProg ? Math.min((progress.current / progress.target) * 100, 100) : 0;
                                const Icon       = def.icon;
                                const [colorCls] = def.color.split(' ');

                                return (
                                    <button key={id}
                                        onClick={() => isOwnProfile && isUnlocked && toggleBadgeEquip(id)}
                                        disabled={!isUnlocked || !isOwnProfile}
                                        className={`
                                            flex items-start gap-3 p-3 rounded-xl border text-left transition-all relative group
                                            ${isEquipped ? 'bg-[#0f1d36] border-[#c8aa6e]/50 shadow-[0_0_12px_rgba(200,170,110,0.1)]'
                                                : isUnlocked ? 'bg-[#0a1428] border-gray-700 hover:border-gray-500'
                                                : 'bg-[#050a14] border-gray-800/50 opacity-60 cursor-not-allowed'}
                                        `}>
                                        <div className={`p-2 rounded-full flex-shrink-0 ${isUnlocked ? 'bg-black/40 border border-white/5' : 'bg-gray-900 border border-gray-800'}`}>
                                            <Icon className={`w-4 h-4 ${isUnlocked ? (isEquipped ? 'text-[#c8aa6e]' : colorCls) : 'text-gray-600'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-xs font-bold uppercase tracking-wide leading-tight ${isEquipped ? 'text-[#c8aa6e]' : isUnlocked ? 'text-white' : 'text-gray-600'}`}>
                                                {def.label}
                                            </div>
                                            <div className="text-[10px] text-gray-500 mt-0.5 leading-snug">{def.description}</div>
                                            {showProg && (
                                                <div className="mt-1.5">
                                                    <div className="flex justify-between text-[9px] text-gray-600 mb-0.5">
                                                        <span>Progreso</span><span>{progress.current}/{progress.target}</span>
                                                    </div>
                                                    <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gray-500 transition-all" style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {isEquipped && (
                                            <span className="text-[8px] font-bold bg-[#c8aa6e] text-[#050d1a] px-1.5 py-0.5 rounded flex-shrink-0">✓</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
