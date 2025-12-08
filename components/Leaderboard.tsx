import React, { useState } from 'react';
import { User } from '../types';
import { Trophy, Medal, TrendingUp, Swords, ListOrdered, Sparkles, UserPlus, Globe } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip, CartesianGrid } from 'recharts';

interface LeaderboardProps {
  users: User[];
}

type LeaderboardCategory = 'global' | 'matchday' | 'ranking' | 'playoffs' | 'crystalBall' | 'fantasy';

export const Leaderboard: React.FC<LeaderboardProps> = ({ users }) => {
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>('global');

  // Helper to get score based on active category
  const getScore = (user: User) => {
    if (activeCategory === 'global') return user.score;
    return user.scoreBreakdown[activeCategory];
  };

  // Sort users based on selected category score
  const sortedUsers = [...users].sort((a, b) => getScore(b) - getScore(a));

  // Tabs configuration
  const tabs: { id: LeaderboardCategory; label: string; icon: React.ElementType }[] = [
    { id: 'global', label: 'Global', icon: Globe },
    { id: 'matchday', label: 'Jornada', icon: Swords },
    { id: 'ranking', label: 'Ranking', icon: ListOrdered },
    { id: 'playoffs', label: 'Playoffs', icon: Trophy },
    { id: 'crystalBall', label: 'Bola de Cristal', icon: Sparkles },
    { id: 'fantasy', label: 'Fantasy', icon: UserPlus },
  ];

  // Prepare data for the chart (Only relevant for Global view currently)
  const chartData = users[0].pointsHistory.map((h, index) => {
    const point: any = { name: h.day };
    users.forEach(user => {
        point[user.name] = user.pointsHistory[index].points;
    });
    return point;
  });

  const colors = ['#c8aa6e', '#0ac8b9', '#f0e6d2', '#e4002b'];

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

      {/* Leaderboard List */}
      <div className="bg-[#091428]/80 backdrop-blur-sm rounded-xl border border-gray-800 p-6 shadow-xl animate-in fade-in duration-300">
        <h3 className="text-xl font-bold text-[#c8aa6e] mb-6 flex items-center gap-2 uppercase tracking-wide">
          <Medal className="w-6 h-6" />
          Clasificación: {tabs.find(t => t.id === activeCategory)?.label}
        </h3>
        
        <div className="space-y-3">
          {sortedUsers.map((user, idx) => (
            <div 
              key={user.id}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                idx === 0 
                  ? 'bg-gradient-to-r from-[#c8aa6e]/20 to-transparent border-[#c8aa6e]/50 shadow-[0_0_10px_rgba(200,170,110,0.1)]' 
                  : 'bg-[#0f1d36] border-gray-800 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-8 flex justify-center font-bold text-xl">
                  {idx === 0 ? <span className="text-yellow-400 drop-shadow-lg">1º</span> : 
                   idx === 1 ? <span className="text-gray-300 drop-shadow-md">2º</span> :
                   idx === 2 ? <span className="text-amber-700 drop-shadow-md">3º</span> :
                   <span className="text-gray-600">{idx + 1}º</span>}
                </div>
                <div className="relative">
                    <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className={`w-12 h-12 rounded-full border-2 object-cover ${idx === 0 ? 'border-[#c8aa6e]' : 'border-gray-600'}`} 
                    />
                    {idx === 0 && (
                        <div className="absolute -top-2 -right-1 bg-[#c8aa6e] rounded-full p-0.5 border border-[#0a1428]">
                            <Trophy className="w-3 h-3 text-[#0a1428]" />
                        </div>
                    )}
                </div>
                <div>
                  <p className={`font-bold text-lg ${idx === 0 ? 'text-[#c8aa6e]' : 'text-gray-200'}`}>
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">
                      {activeCategory === 'global' ? 'Maestro de la Grieta' : 'Aspirante'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold leading-none ${idx === 0 ? 'text-white' : 'text-gray-300'}`}>
                    {getScore(user)}
                </p>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-1">Puntos</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Chart - Only Visible on Global Tab */}
      {activeCategory === 'global' && (
        <div className="bg-[#091428]/80 backdrop-blur-sm rounded-xl border border-gray-800 p-6 shadow-xl animate-in slide-in-from-bottom-4">
            <h3 className="text-lg font-bold text-gray-300 mb-4 flex items-center gap-2 uppercase tracking-wide">
                <TrendingUp className="w-5 h-5 text-[#0ac8b9]" />
                Progreso de la Temporada
            </h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis 
                            dataKey="name" 
                            stroke="#64748b" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false}
                            tickMargin={10}
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
    </div>
  );
};