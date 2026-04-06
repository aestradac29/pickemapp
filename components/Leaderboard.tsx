import React, { useState, useMemo } from 'react';
import { User, Team } from '../types';
import { Trophy, Medal, TrendingUp, Swords, ListOrdered, UserPlus, Globe, Eye } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { FRAME_STYLES, BANNER_STYLES, BADGE_DEFINITIONS, TEAMS, getFantasySchedule, normalizeSplitId } from '../constants';

interface LeaderboardProps {
  users: User[];
  onViewProfile?: (userId: string) => void;
}

type LeaderboardCategory = 'global' | 'matchday' | 'ranking' | 'playoffs' | 'fantasy';

const COLORS = [
  '#c8aa6e','#0ac8b9','#f0e6d2','#e4002b','#a855f7',
  '#3b82f6','#22c55e','#f97316','#ec4899','#6366f1',
  '#14b8a6','#d946ef','#84cc16','#eab308','#94a3b8',
];

// Icono de posición con medalla o número
const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 flex items-center justify-center shadow-[0_0_12px_rgba(234,179,8,0.4)]">
      <Trophy className="w-4 h-4 text-yellow-900" />
    </div>
  );
  if (rank === 2) return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center shadow-[0_0_8px_rgba(148,163,184,0.3)]">
      <Medal className="w-4 h-4 text-slate-800" />
    </div>
  );
  if (rank === 3) return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-[0_0_8px_rgba(180,83,9,0.3)]">
      <Medal className="w-4 h-4 text-amber-200" />
    </div>
  );
  return (
    <div className="w-8 h-8 flex items-center justify-center">
      <span className="text-gray-500 font-bold text-sm">{rank}</span>
    </div>
  );
};

export const Leaderboard: React.FC<LeaderboardProps> = ({ users, onViewProfile }) => {
  const [selectedSplit] = useState(() => normalizeSplitId(localStorage.getItem('selectedSplit')));
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>('global');

  if (!users || users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-600 bg-[#060f1e]/60 rounded-xl border border-gray-800">
        <Globe className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm">No hay datos de clasificación disponibles.</p>
      </div>
    );
  }

  const getScore = (user: User) =>
    activeCategory === 'global' ? user.score : user.scoreBreakdown[activeCategory];

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const sa = getScore(a), sb = getScore(b);
      if (sa !== sb) return sb - sa;
      if (activeCategory === 'global') return b.scoreBreakdown.matchday - a.scoreBreakdown.matchday;
      return 0;
    });
  }, [users, activeCategory]);

  const ranks = useMemo(() => {
    const r = new Array(sortedUsers.length).fill(0);
    for (let i = 0; i < sortedUsers.length; i++) {
      if (i === 0) { r[i] = 1; continue; }
      const prev = sortedUsers[i - 1], curr = sortedUsers[i];
      const tie = activeCategory === 'global'
        ? getScore(prev) === getScore(curr) && prev.scoreBreakdown.matchday === curr.scoreBreakdown.matchday
        : getScore(prev) === getScore(curr);
      r[i] = tie ? r[i - 1] : i + 1;
    }
    return r;
  }, [sortedUsers, activeCategory]);

  const tabs: { id: LeaderboardCategory; label: string; icon: React.ElementType; info: string }[] = [
    { id: 'global',   label: 'Global',   icon: Globe,       info: 'Suma de todas las categorías' },
    { id: 'matchday', label: 'Jornada',  icon: Swords,      info: 'Aciertos en fase regular' },
    { id: 'ranking',  label: 'Ranking',  icon: ListOrdered, info: 'Predicción de tabla final' },
    { id: 'playoffs', label: 'Playoffs', icon: Trophy,      info: 'Aciertos en playoffs' },
    { id: 'fantasy',  label: 'Fantasy',  icon: UserPlus,    info: 'Liga fantasy independiente' },
  ];

  const globalChartData = users[0]?.pointsHistory?.map((h, idx) => {
    const pt: any = { name: h.day };
    users.forEach(u => { if (u.pointsHistory?.[idx]) pt[u.name] = u.pointsHistory[idx].points; });
    return pt;
  }) ?? [];

  const fantasyChartData = getFantasySchedule(selectedSplit).map((round, idx) => {
    const pt: any = { name: `F${round.id}` };
    users.forEach(u => {
      let score = 0;
      for (let i = 0; i <= idx; i++) { if (u.fantasyHistory?.[i]) score += u.fantasyHistory[i].points; }
      pt[u.name] = score;
    });
    return pt;
  });

  const maxScore = Math.max(...sortedUsers.map(u => getScore(u) || 0)) || 1;

  return (
    <div className="space-y-5 pb-20">

      {/* ── Tabs ── */}
      <div className="flex overflow-x-auto gap-1.5 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        {tabs.map(tab => {
          const active = activeCategory === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveCategory(tab.id)}
              title={tab.info}
              className={`
                flex items-center gap-1.5 px-3.5 py-2 rounded-lg whitespace-nowrap
                transition-all duration-200 text-sm font-medium border
                ${active
                  ? 'bg-[#c8aa6e] text-[#050d1a] border-[#c8aa6e] font-bold shadow-[0_0_16px_rgba(200,170,110,0.3)]'
                  : 'bg-[#060f1e] text-gray-400 border-gray-800 hover:border-gray-600 hover:text-gray-200'}
              `}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Info strip ── */}
      <div className="text-[11px] text-gray-500 bg-[#060f1e] border border-gray-800/60 px-3 py-2 rounded-lg">
        {tabs.find(t => t.id === activeCategory)?.info}
        {activeCategory === 'global' && ' · Desempate por aciertos de jornada'}
      </div>

      {/* ── Lista ── */}
      <div className="space-y-2">
        {sortedUsers.map((user, idx) => {
          const rank        = ranks[idx];
          const score       = getScore(user);
          const pct         = Math.round((score / maxScore) * 100);

          // Banner
          const bannerId        = user.banner;
          const bannerClass     = bannerId && BANNER_STYLES[bannerId] ? BANNER_STYLES[bannerId] : null;
          const bannerTeamId    = bannerId?.startsWith('banner_') ? bannerId.replace('banner_', '') : null;
          const bannerTeam: Team | undefined = bannerTeamId
            ? (TEAMS[bannerTeamId] ?? (bannerTeamId === 'bds' ? TEAMS.shf : undefined))
            : undefined;

          const hasCustomBanner = !!bannerClass;
          const frameClass      = user.frame && FRAME_STYLES[user.frame]
            ? FRAME_STYLES[user.frame]
            : rank === 1
            ? 'border-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.35)]'
            : rank === 2
            ? 'border-slate-400'
            : rank === 3
            ? 'border-amber-600'
            : 'border-gray-700';

          const badges = user.equippedBadges || [];

          // Colores de texto adaptados al banner
          const nameColor  = hasCustomBanner ? 'text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]' : rank <= 3 ? 'text-[#f0e6d2]' : 'text-gray-300';
          const scoreColor = hasCustomBanner ? 'text-white' : rank === 1 ? 'text-[#c8aa6e]' : 'text-gray-200';

          return (
            <div
              key={user.id}
              onClick={() => onViewProfile?.(user.id)}
              className={`
                group relative flex items-center gap-3 px-4 py-3.5 rounded-xl border
                cursor-pointer overflow-hidden transition-all duration-200
                hover:scale-[1.01] hover:shadow-lg
                ${hasCustomBanner
                  ? `${bannerClass} border-transparent`
                  : rank === 1
                  ? 'bg-gradient-to-r from-[#c8aa6e]/12 to-[#060f1e] border-[#c8aa6e]/30'
                  : 'bg-[#060f1e] border-gray-800/60 hover:border-gray-700'}
              `}
            >
              {/* Watermark de equipo */}
              {bannerTeam?.logo && (
                <div className="absolute right-20 top-1/2 -translate-y-1/2 opacity-15 pointer-events-none rotate-12 scale-150 grayscale-[0.2]">
                  <img src={bannerTeam.logo} alt="" className="w-24 h-24 object-contain" />
                </div>
              )}

              {/* Overlay readability */}
              {hasCustomBanner && <div className="absolute inset-0 bg-black/20 pointer-events-none" />}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 backdrop-blur-sm rounded-xl">
                <div className="flex items-center gap-2 text-white font-bold text-sm uppercase tracking-wider">
                  <Eye className="w-4 h-4" /> Ver perfil
                </div>
              </div>

              {/* Rank */}
              <div className="relative z-10 flex-shrink-0">
                <RankBadge rank={rank} />
              </div>

              {/* Avatar */}
              <div className="relative z-10 flex-shrink-0">
                <div className={`w-11 h-11 rounded-full border-2 overflow-hidden bg-[#0a1428] ${frameClass}`}>
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                </div>
                {rank === 1 && (
                  <div className="absolute -top-1.5 -right-1 bg-yellow-400 rounded-full p-0.5 border-2 border-[#050d1a] z-30">
                    <Trophy className="w-2.5 h-2.5 text-yellow-900" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="relative z-10 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`font-black italic text-lg sm:text-xl tracking-tight leading-none ${nameColor}`}>
                    {user.name}
                  </span>
                  {badges.map(b => {
                    const def = BADGE_DEFINITIONS[b];
                    if (!def) return null;
                    const Icon = def.icon;
                    const [colorCls, borderCls, bgCls] = def.color.split(' ');
                    return (
                      <span key={b} className={`p-0.5 rounded-full ${bgCls} border ${borderCls} bg-black/30`} title={def.label}>
                        <Icon className={`w-2.5 h-2.5 ${colorCls}`} />
                      </span>
                    );
                  })}
                </div>

                {/* Título / categoría */}
                <p className="text-[10px] mt-0.5 truncate">
                  {user.title
                    ? <span className="text-[#c8aa6e] font-bold italic">{user.title}</span>
                    : <span className="text-gray-600">{activeCategory === 'fantasy' ? 'Manager' : 'Aspirante'}</span>
                  }
                </p>

                {/* Barra de progreso relativa al líder */}
                <div className="mt-1.5 h-0.5 rounded-full bg-gray-800/60 overflow-hidden w-full max-w-[160px]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: rank === 1
                        ? 'linear-gradient(90deg, #c8aa6e, #f0d08a)'
                        : hasCustomBanner
                        ? 'rgba(255,255,255,0.4)'
                        : 'rgba(200,170,110,0.4)',
                    }}
                  />
                </div>
                {activeCategory === 'global' && (
                  <p className="text-[9px] text-gray-600 mt-0.5">
                    {user.scoreBreakdown.matchdayCount} aciertos en jornada
                  </p>
                )}
              </div>

              {/* Puntuación */}
              <div className="relative z-10 text-right flex-shrink-0">
                <p className={`text-xl font-black leading-none ${scoreColor}`}>
                  {score ?? 0}
                </p>
                <p className="text-[9px] uppercase font-bold tracking-wider text-gray-600 mt-0.5">pts</p>
                {rank === 1 && activeCategory !== 'global' && (
                  <span className="text-[9px] text-[#c8aa6e] font-bold">LÍDER</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Gráfico de progreso global ── */}
      {activeCategory === 'global' && globalChartData.length > 0 && (
        <div className="bg-[#060f1e] rounded-xl border border-gray-800/60 p-5 animate-in slide-in-from-bottom-4">
          <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4 text-[#0ac8b9]" /> Progreso global
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={globalChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0f1d30" vertical={false} />
                <XAxis dataKey="name" stroke="#374151" fontSize={10} tickLine={false} axisLine={false} tickMargin={8} interval={0} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#060f1e', borderColor: '#1e3a5f', color: '#f3f4f6', borderRadius: '8px', fontSize: '12px' }}
                  cursor={{ stroke: '#1e3a5f', strokeWidth: 1 }}
                />
                <Legend wrapperStyle={{ paddingTop: '12px' }}
                  formatter={v => <span style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600 }}>{v}</span>} />
                {sortedUsers.map((user, i) => (
                  <Line key={user.id} type="monotone" dataKey={user.name}
                    stroke={COLORS[i % COLORS.length]} strokeWidth={2.5}
                    dot={{ r: 3, fill: '#060f1e', strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: COLORS[i % COLORS.length] }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Gráfico fantasy ── */}
      {activeCategory === 'fantasy' && (
        <div className="bg-[#060f1e] rounded-xl border border-gray-800/60 p-5 animate-in slide-in-from-bottom-4">
          <h3 className="text-sm font-bold text-[#0ac8b9] mb-4 flex items-center gap-2 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" /> Liga fantasy (acumulado)
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fantasyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0f1d30" vertical={false} />
                <XAxis dataKey="name" stroke="#374151" fontSize={10} tickLine={false} axisLine={false} tickMargin={8} interval={0} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#060f1e', borderColor: '#1e3a5f', color: '#f3f4f6', borderRadius: '8px', fontSize: '12px' }}
                  cursor={{ stroke: '#1e3a5f', strokeWidth: 1 }}
                />
                <Legend wrapperStyle={{ paddingTop: '12px' }}
                  formatter={v => <span style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600 }}>{v}</span>} />
                {sortedUsers.map((user, i) => (
                  <Line key={user.id} type="monotone" dataKey={user.name}
                    stroke={COLORS[i % COLORS.length]} strokeWidth={2}
                    dot={{ r: 2.5, fill: '#060f1e', strokeWidth: 2 }}
                    activeDot={{ r: 4.5, fill: COLORS[i % COLORS.length] }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
