
import React, { useState, useMemo } from 'react';
import { User, Team } from '../types';
import { Trophy, Medal, TrendingUp, Swords, ListOrdered, Sparkles, UserPlus, Globe, Eye } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { FRAME_STYLES, BANNER_STYLES, BADGE_DEFINITIONS, TEAMS, getFantasySchedule, normalizeSplitId } from '../constants';

interface LeaderboardProps {
  users: User[];
  onViewProfile?: (userId: string) => void;
}

type LeaderboardCategory = 'global' | 'matchday' | 'ranking' | 'playoffs' | 'fantasy';

export const Leaderboard: React.FC<LeaderboardProps> = ({ users, onViewProfile }) => {
  const [selectedSplit] = useState<string>(() => normalizeSplitId(localStorage.getItem('selectedSplit')));
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>('global');

  if (!users || users.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-[#091428]/50 rounded-xl border border-gray-800">
            <Globe className="w-12 h-12 mb-4 opacity-20" />
            <p>No hay datos de clasificación disponibles.</p>
        </div>
    );
  }

  // Helper to get score based on active category
  const getScore = (user: User) => {
    if (activeCategory === 'global') return user.score; 
    return user.scoreBreakdown[activeCategory];
  };

  // Sort users dynamically based on active category & specific tie-breaker rules
  const sortedUsers = useMemo(() => {
      return [...users].sort((a, b) => {
          const scoreA = getScore(a);
          const scoreB = getScore(b);

          if (scoreA !== scoreB) {
              return scoreB - scoreA;
          }

          // Global Tie-Breaker: Most correct matchday picks
          if (activeCategory === 'global') {
              return b.scoreBreakdown.matchday - a.scoreBreakdown.matchday;
          }

          // Other categories: No secondary sort (shared position)
          return 0;
      });
  }, [users, activeCategory]);

  // Calculate Ranks with Logic
  const ranks = useMemo(() => {
      const r = new Array(sortedUsers.length).fill(0);
      let currentRank = 1;
      
      for (let i = 0; i < sortedUsers.length; i++) {
          if (i > 0) {
              const prev = sortedUsers[i-1];
              const curr = sortedUsers[i];
              let isTie = false;

              const scorePrev = getScore(prev);
              const scoreCurr = getScore(curr);

              if (activeCategory === 'global') {
                  isTie = scorePrev === scoreCurr && prev.scoreBreakdown.matchday === curr.scoreBreakdown.matchday;
              } else {
                  isTie = scorePrev === scoreCurr;
              }

              if (isTie) {
                  r[i] = r[i-1];
              } else {
                  r[i] = i + 1;
              }
          } else {
              r[i] = 1;
          }
      }
      return r;
  }, [sortedUsers, activeCategory]);

  // Tabs configuration
  const tabs: { id: LeaderboardCategory; label: string; icon: React.ElementType }[] = [
    { id: 'global', label: 'Global', icon: Globe },
    { id: 'matchday', label: 'Jornada', icon: Swords },
    { id: 'ranking', label: 'Ranking', icon: ListOrdered },
    { id: 'playoffs', label: 'Playoffs', icon: Trophy },
    { id: 'fantasy', label: 'Fantasy', icon: UserPlus },
  ];

  // Prepare data for GLOBAL chart
  const globalChartData = users[0].pointsHistory.map((h, index) => {
    const point: any = { name: h.day };
    users.forEach(user => {
        if (user.pointsHistory && user.pointsHistory[index]) {
            point[user.name] = user.pointsHistory[index].points;
        }
    });
    return point;
  });

  // Prepare data for FANTASY chart (Use FANTASY_SCHEDULE labels)
  const fantasyChartData = getFantasySchedule(selectedSplit).map((round, index) => {
      const point: any = { name: `F${round.id}` }; // F1, F2...
      
      users.forEach(user => {
          // Assuming user.fantasyHistory has mapped correctly in dataService
          // We need cumulative sum for the chart usually, or per round?
          // Let's do cumulative sum for "Race Chart" effect
          let score = 0;
          if (user.fantasyHistory) {
              // Sum up to current index
              for (let i = 0; i <= index; i++) {
                  if (user.fantasyHistory[i]) {
                      score += user.fantasyHistory[i].points;
                  }
              }
          }
          point[user.name] = score;
      });
      return point;
  });

  // Expanded color palette
  const colors = [
    '#c8aa6e', // Gold
    '#0ac8b9', // Cyan
    '#f0e6d2', // Light
    '#e4002b', // Red
    '#a855f7', // Purple
    '#3b82f6', // Blue
    '#22c55e', // Green
    '#f97316', // Orange
    '#ec4899', // Pink
    '#6366f1', // Indigo
    '#14b8a6', // Teal
    '#d946ef', // Fuchsia
    '#84cc16', // Lime
    '#eab308', // Yellow
    '#94a3b8'  // Slate
  ];

  return (
    <div className="space-y-6 pb-20">
      
      {/* Category Tabs */}
      <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        {tabs.map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
                <button
                    key={tab.id}
                    onClick={() => setActiveCategory(tab.id)}
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 border
                        ${isActive 
                            ? 'bg-[#c8aa6e] text-[#0a1428] border-[#c8aa6e] font-bold shadow-[0_0_15px_rgba(200,170,110,0.4)]' 
                            : 'bg-[#091428] text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200'
                        }
                    `}
                >
                    <tab.icon className={`w-4 h-4 ${isActive ? 'text-[#0a1428]' : ''}`} />
                    <span className="text-sm">{tab.label}</span>
                </button>
            );
        })}
      </div>

      {/* Info Banner for Separation */}
      {activeCategory === 'global' && (
          <div className="text-center text-xs text-gray-400 bg-blue-900/10 border border-blue-900/30 p-2 rounded-lg">
              Puntuación Global = Jornadas + Ranking + Playoffs (Desempate: Aciertos Jornada)
          </div>
      )}
      {(activeCategory === 'fantasy') && (
          <div className="text-center text-xs text-[#c8aa6e] bg-[#c8aa6e]/10 border border-[#c8aa6e]/30 p-2 rounded-lg">
              Competición Independiente (Posición compartida en empates)
          </div>
      )}

      {/* Leaderboard List */}
      <div className="bg-[#091428]/80 backdrop-blur-sm rounded-xl border border-gray-800 p-6 shadow-xl animate-in fade-in duration-300">
        <h3 className="text-xl font-bold text-[#c8aa6e] mb-6 flex items-center gap-2 uppercase tracking-wide">
          <Medal className="w-6 h-6" />
          Clasificación: {tabs.find(t => t.id === activeCategory)?.label}
        </h3>
        
        <div className="space-y-3">
          {sortedUsers.map((user, idx) => {
            const rank = ranks[idx];

            // --- VISUAL STYLING LOGIC ---
            
            let rowClass = '';
            let rowStyle = {};
            let bannerTeamData: Team | undefined;
            const bannerId = user.banner;

            // 1. Check for specific banner definition (e.g. 'banner_shf' or 'banner_bds' mapped in constants)
            let specificBannerClass = bannerId && BANNER_STYLES[bannerId] ? BANNER_STYLES[bannerId] : null;

            // 2. Identify Team Data (even if specific class exists, we might need logo)
            if (bannerId && bannerId.startsWith('banner_')) {
                const teamId = bannerId.replace('banner_', '');
                bannerTeamData = Object.values(TEAMS).find(t => t.id === teamId);
                
                // Special handling for legacy/renamed teams (like bds -> shf) if not found directly
                if (!bannerTeamData && teamId === 'bds') {
                    bannerTeamData = TEAMS.shf;
                }

                // If no specific gradient defined, use team color
                if (!specificBannerClass && bannerTeamData) {
                    rowStyle = { backgroundColor: bannerTeamData.color };
                }
            }

            // 3. FINAL CLASS PRIORITY
            if (specificBannerClass) {
                rowClass = `${specificBannerClass} border-gray-600 shadow-md`;
            } else if (Object.keys(rowStyle).length > 0) {
                rowClass = 'shadow-md border-transparent';
            } else if (rank === 1) {
                rowClass = 'bg-gradient-to-r from-[#c8aa6e]/20 to-transparent border-[#c8aa6e]/50 shadow-[0_0_10px_rgba(200,170,110,0.1)]';
            } else {
                rowClass = 'bg-[#0f1d36] border-gray-800 hover:border-gray-600';
            }

            const hasCustomBanner = specificBannerClass || Object.keys(rowStyle).length > 0;

            // 4. FRAME
            const userFrame = user.frame && FRAME_STYLES[user.frame] ? FRAME_STYLES[user.frame] : null;
            const frameClass = userFrame || (rank === 1 ? 'border-[#c8aa6e] shadow-[0_0_10px_rgba(200,170,110,0.3)]' : 'border-gray-600');

            // 5. BADGES
            const badgesToShow = user.equippedBadges || [];

            // Text Colors based on Banner presence
            const nameColor = hasCustomBanner ? 'text-white' : rank === 1 ? 'text-[#c8aa6e]' : 'text-gray-200';
            const subtitleColor = hasCustomBanner ? 'text-gray-200' : 'text-gray-500';
            const scoreColor = hasCustomBanner ? 'text-white' : rank === 1 ? 'text-white' : 'text-gray-300';

            // Override logo for SK Watermark
            let watermarkLogo = bannerTeamData?.logo;
            if (bannerTeamData?.id === 'sk') {
                watermarkLogo = "https://static.lolesports.com/teams/1643979272144_SK_Monochrome.png";
            }

            return (
                <div 
                key={user.id}
                onClick={() => onViewProfile && onViewProfile(user.id)}
                className={`group cursor-pointer flex items-center justify-between p-4 rounded-xl border transition-all duration-300 relative overflow-hidden ${rowClass} hover:scale-[1.01]`}
                style={rowStyle}
                >
                {/* Dynamic Banner Visuals (Gradients + Watermark) */}
                {bannerTeamData && (
                    <>
                        {/* If using plain color (no gradient class), add overlays for texture */}
                        {!specificBannerClass && (
                            <>
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent opacity-40 pointer-events-none"></div>
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-black/60 to-transparent pointer-events-none"></div>
                            </>
                        )}
                        
                        {/* Team Logo Watermark - Adjusted for visibility without mix-blend-overlay */}
                        {watermarkLogo && (
                            <div className="absolute right-24 sm:right-1/3 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none transform rotate-12 scale-150 grayscale-[0.3] z-0">
                                <img 
                                    src={watermarkLogo} 
                                    alt="" 
                                    className="w-32 h-32 object-contain" 
                                />
                            </div>
                        )}
                    </>
                )}

                {/* Overlay to ensure text readability on bright banners */}
                {specificBannerClass && <div className="absolute inset-0 bg-black/10 pointer-events-none z-0"></div>}
                
                {/* Hover Reveal Effect - View Profile */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider transform translate-y-2 group-hover:translate-y-0 transition-transform">
                        <Eye className="w-5 h-5" />
                        Ver Perfil
                    </div>
                </div>

                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-8 flex justify-center font-bold text-xl">
                    {rank === 1 ? <span className="text-yellow-400 drop-shadow-lg">1º</span> : 
                    rank === 2 ? <span className="text-gray-300 drop-shadow-md">2º</span> :
                    rank === 3 ? <span className="text-amber-700 drop-shadow-md">3º</span> :
                    <span className="text-gray-600">{rank}º</span>}
                    </div>
                    
                    <div className="relative">
                        <div className={`w-12 h-12 rounded-full border-2 overflow-hidden bg-[#0a1428] ${frameClass}`}>
                            <img 
                                src={user.avatar} 
                                alt={user.name} 
                                className="w-full h-full object-cover" 
                            />
                        </div>
                        {rank === 1 && (
                            <div className="absolute -top-2 -right-1 bg-[#c8aa6e] rounded-full p-0.5 border border-[#0a1428] z-20">
                                <Trophy className="w-3 h-3 text-[#0a1428]" />
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <div className="flex items-center gap-2">
                            {/* USERNAME STYLE: Black Weight, Italic */}
                            <p className={`font-black italic text-xl sm:text-2xl tracking-tight drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)] ${nameColor}`}>
                                {user.name}
                            </p>
                            {badgesToShow.map(b => {
                                const def = BADGE_DEFINITIONS[b];
                                if (!def) return null;
                                const Icon = def.icon;
                                return (
                                    <div key={b} className={`p-0.5 rounded-full ${def.color.split(' ')[2]} border ${def.color.split(' ')[1]} bg-black/40`} title={def.label}>
                                        <Icon className={`w-3 h-3 ${def.color.split(' ')[0]}`} />
                                    </div>
                                );
                            })}
                        </div>
                        <p className={`text-xs font-medium truncate max-w-[150px] sm:max-w-xs ${subtitleColor}`}>
                            {user.title ? (
                                <span className="text-[#c8aa6e] font-bold italic drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{user.title}</span>
                            ) : (
                                <span>{activeCategory === 'fantasy' ? 'Manager' : 'Aspirante'}</span>
                            )}
                        </p>
                        
                        {/* Show Matchday hits in Global tab to explain tie-breaker */}
                        {activeCategory === 'global' && (
                            <p className="text-[9px] text-gray-400/80 uppercase tracking-tight">
                                Partidos acertados: {selectedSplit === 'spring_2026' ? Math.round(user.scoreBreakdown.matchday / 1.5) : user.scoreBreakdown.matchday}
                            </p>
                        )}
                    </div>
                </div>
                
                <div className="text-right relative z-10">
                    <p className={`text-2xl font-bold leading-none drop-shadow-md ${scoreColor}`}>
                        {getScore(user)}
                    </p>
                    <p className={`text-[10px] uppercase font-bold tracking-wider mt-1 ${hasCustomBanner ? 'text-gray-300' : 'text-gray-500'}`}>Puntos</p>
                </div>
                </div>
            );
          })}
        </div>
      </div>

      {/* Stats Chart - Global Tab */}
      {activeCategory === 'global' && users[0]?.pointsHistory && (
        <div className="bg-[#091428]/80 backdrop-blur-sm rounded-xl border border-gray-800 p-6 shadow-xl animate-in slide-in-from-bottom-4">
            <h3 className="text-lg font-bold text-gray-300 mb-4 flex items-center gap-2 uppercase tracking-wide">
                <TrendingUp className="w-5 h-5 text-[#0ac8b9]" />
                Progreso Global
            </h3>
            <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={globalChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis 
                            dataKey="name" 
                            stroke="#64748b" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            tickMargin={10}
                            interval={0} // Force show all ticks to match fantasy style
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f3f4f6', borderRadius: '0.5rem' }}
                            itemStyle={{ color: '#f3f4f6' }}
                            cursor={{ stroke: '#334155', strokeWidth: 1 }}
                        />
                        <Legend 
                            wrapperStyle={{ paddingTop: '10px' }}
                            formatter={(value) => <span style={{ color: '#cbd5e1', fontSize: '12px', fontWeight: 'bold' }}>{value}</span>}
                        />
                        {users.map((user, i) => (
                            <Line 
                                key={user.id}
                                type="monotone" 
                                dataKey={user.name} 
                                stroke={colors[i % colors.length]} 
                                strokeWidth={3}
                                dot={{ r: 4, fill: '#0a1428', strokeWidth: 2 }}
                                activeDot={{ r: 6, fill: colors[i % colors.length] }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
      )}

      {/* Stats Chart - Fantasy Tab */}
      {activeCategory === 'fantasy' && (
        <div className="bg-[#091428]/80 backdrop-blur-sm rounded-xl border border-gray-800 p-6 shadow-xl animate-in slide-in-from-bottom-4">
            <h3 className="text-lg font-bold text-[#0ac8b9] mb-4 flex items-center gap-2 uppercase tracking-wide">
                <TrendingUp className="w-5 h-5" />
                Liga Fantasy (Acumulado)
            </h3>
            <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={fantasyChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis 
                            dataKey="name" 
                            stroke="#64748b" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            tickMargin={10}
                            interval={0} 
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f3f4f6', borderRadius: '0.5rem' }}
                            itemStyle={{ color: '#f3f4f6' }}
                            cursor={{ stroke: '#334155', strokeWidth: 1 }}
                        />
                        <Legend 
                            wrapperStyle={{ paddingTop: '10px' }}
                            formatter={(value) => <span style={{ color: '#cbd5e1', fontSize: '12px', fontWeight: 'bold' }}>{value}</span>}
                        />
                        {users.map((user, i) => (
                            <Line 
                                key={user.id}
                                type="monotone" 
                                dataKey={user.name} 
                                stroke={colors[i % colors.length]} 
                                strokeWidth={2}
                                dot={{ r: 3, fill: '#0a1428', strokeWidth: 2 }}
                                activeDot={{ r: 5, fill: colors[i % colors.length] }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
      )}

    </div>
  );
};
