
import React, { useState, useMemo } from 'react';
import { User } from '../types';
import { Trophy, Medal, TrendingUp, Swords, ListOrdered, Sparkles, UserPlus, Globe } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip, CartesianGrid } from 'recharts';
import { FRAME_STYLES, BANNER_STYLES, BADGE_DEFINITIONS, TEAMS, WHITE_LOGO_TEAMS } from '../constants';

interface LeaderboardProps {
  users: User[];
}

type LeaderboardCategory = 'global' | 'matchday' | 'ranking' | 'playoffs' | 'crystalBall' | 'fantasy';

export const Leaderboard: React.FC<LeaderboardProps> = ({ users }) => {
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

  // Calculate Ranks with Logic:
  // - Shared Position (1, 1, 3...) for all ties.
  // - Global specifically requires BOTH total score AND matchday score to match for a tie.
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
                  // For Global, strictly tied only if secondary stat matches too
                  isTie = scorePrev === scoreCurr && prev.scoreBreakdown.matchday === curr.scoreBreakdown.matchday;
              } else {
                  // For others, tie if main score matches
                  isTie = scorePrev === scoreCurr;
              }

              if (isTie) {
                  r[i] = r[i-1]; // Share rank
              } else {
                  r[i] = i + 1; // Actual position (skip numbers)
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
    { id: 'crystalBall', label: 'Bola de Cristal', icon: Sparkles },
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

  // Prepare data for FANTASY chart (12 rounds)
  const fantasyChartData = users[0].fantasyHistory ? users[0].fantasyHistory.map((h, index) => {
      const point: any = { name: h.day };
      users.forEach(user => {
          if (user.fantasyHistory && user.fantasyHistory[index]) {
              point[user.name] = user.fantasyHistory[index].points;
          }
      });
      return point;
  }) : [];

  const colors = ['#c8aa6e', '#0ac8b9', '#f0e6d2', '#e4002b', '#a855f7', '#3b82f6'];

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
      {(activeCategory === 'fantasy' || activeCategory === 'crystalBall') && (
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
            const rank = ranks[idx]; // Use pre-calculated rank

            // --- VISUAL STYLING LOGIC ---
            
            // 1. BANNER: Priority to User Banner, else Rank 1 Special, else Default
            const userBanner = user.banner && BANNER_STYLES[user.banner] ? BANNER_STYLES[user.banner] : null;
            const rowClass = userBanner 
                ? `${userBanner} border-gray-600 shadow-md` 
                : rank === 1 
                    ? 'bg-gradient-to-r from-[#c8aa6e]/20 to-transparent border-[#c8aa6e]/50 shadow-[0_0_10px_rgba(200,170,110,0.1)]' 
                    : 'bg-[#0f1d36] border-gray-800 hover:border-gray-600';

            // 2. FRAME: Priority to User Frame, else Rank 1 Special, else Default Border
            const userFrame = user.frame && FRAME_STYLES[user.frame] ? FRAME_STYLES[user.frame] : null;
            // Simplify frame styles for smaller list items if needed, or use as is
            const frameClass = userFrame || (rank === 1 ? 'border-[#c8aa6e] shadow-[0_0_10px_rgba(200,170,110,0.3)]' : 'border-gray-600');

            // 3. BADGES: Only show EQUIPPED badges. No auto-fallback.
            const badgesToShow = user.equippedBadges || [];

            // 4. LOGO LOGIC
            let bannerTeamLogo: string | undefined;
            let isWhiteLogo = false;
            if (user.banner && user.banner.startsWith('banner_')) {
                const teamId = user.banner.replace('banner_', '');
                const team = Object.values(TEAMS).find(t => t.id === teamId);
                if (team) {
                    bannerTeamLogo = team.logo;
                    isWhiteLogo = WHITE_LOGO_TEAMS.includes(team.id);
                }
            }

            return (
                <div 
                key={user.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 relative overflow-hidden ${rowClass}`}
                >
                {/* Banner Overlay for consistency (darken slightly) */}
                {userBanner && <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>}
                
                {/* Team Logo Watermark - Position Adjusted to Left of Score */}
                {bannerTeamLogo && (
                    <div className="absolute right-16 top-1/2 -translate-y-1/2 opacity-25 pointer-events-none transform rotate-12 scale-150">
                        <img 
                            src={bannerTeamLogo} 
                            alt="" 
                            className={`w-24 h-24 object-contain ${isWhiteLogo ? 'brightness-0 invert' : ''}`} 
                        />
                    </div>
                )}

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
                            <p className={`font-bold text-lg drop-shadow-md ${userBanner ? 'text-white' : rank === 1 ? 'text-[#c8aa6e]' : 'text-gray-200'}`}>
                                {user.name}
                            </p>
                            {badgesToShow.map(b => {
                                const def = BADGE_DEFINITIONS[b];
                                if (!def) return null;
                                const Icon = def.icon;
                                return (
                                    <div key={b} className={`p-0.5 rounded-full ${def.color.split(' ')[2]} border ${def.color.split(' ')[1]}`} title={def.label}>
                                        <Icon className={`w-3 h-3 ${def.color.split(' ')[0]}`} />
                                    </div>
                                );
                            })}
                        </div>
                        <p className={`text-xs font-medium truncate max-w-[150px] sm:max-w-xs ${userBanner ? 'text-gray-300' : 'text-gray-500'}`}>
                            {user.title ? (
                                <span className={`${userBanner ? 'text-[#c8aa6e]' : 'text-[#c8aa6e]'} italic`}>{user.title}</span>
                            ) : (
                                <span>{activeCategory === 'fantasy' ? 'Manager' : 'Aspirante'}</span>
                            )}
                        </p>
                        
                        {/* Show Matchday hits in Global tab to explain tie-breaker */}
                        {activeCategory === 'global' && (
                            <p className="text-[9px] text-gray-500/80 uppercase tracking-tight">
                                Jornadas acertadas: {user.scoreBreakdown.matchday}
                            </p>
                        )}
                    </div>
                </div>
                
                <div className="text-right relative z-10">
                    <p className={`text-2xl font-bold leading-none drop-shadow-md ${userBanner ? 'text-white' : rank === 1 ? 'text-white' : 'text-gray-300'}`}>
                        {getScore(user)}
                    </p>
                    <p className={`text-[10px] uppercase font-bold tracking-wider mt-1 ${userBanner ? 'text-gray-400' : 'text-gray-500'}`}>Puntos</p>
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
            <div className="h-64 w-full">
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

      {/* Stats Chart - Fantasy Tab (12 Rounds) */}
      {activeCategory === 'fantasy' && users[0]?.fantasyHistory && (
        <div className="bg-[#091428]/80 backdrop-blur-sm rounded-xl border border-gray-800 p-6 shadow-xl animate-in slide-in-from-bottom-4">
            <h3 className="text-lg font-bold text-[#0ac8b9] mb-4 flex items-center gap-2 uppercase tracking-wide">
                <TrendingUp className="w-5 h-5" />
                Liga Fantasy
            </h3>
            <div className="h-64 w-full">
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
                            interval={0} // Show all ticks
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f3f4f6', borderRadius: '0.5rem' }}
                            itemStyle={{ color: '#f3f4f6' }}
                            cursor={{ stroke: '#334155', strokeWidth: 1 }}
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
