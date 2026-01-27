
import { Team, Player, Match, Role, Stage, User, PlayerGameStats, FantasyTeamState, FantasySlot, MatchGame } from '../types';
import { TEAMS, PLAYERS, MATCHES, getMatchesForDay, FANTASY_SCHEDULE } from '../constants';
import { fantasyService } from './fantasyService';
import { supabase } from '../lib/supabase';

// Helper para limpiar undefined (Supabase prefiere null)
const cleanPayload = (data: any): any => {
    return JSON.parse(JSON.stringify(data, (k, v) => v === undefined ? null : v));
};

export const dataService = {
    // --- CONFIGURATION ---
    async getDaysConfig(): Promise<{ 
        visibleDays: number[], 
        closedDays: number[], 
        playoffVisibleDays: number[], 
        playoffClosedDays: number[],
        playoffRounds?: number, 
        playoffsAccessible?: boolean,
        fantasyRound?: number, 
        fantasyLocked?: boolean
    }> {
        try {
            const { data, error } = await supabase.from('config').select('*').single();
            
            // Valores por defecto
            let config = {
                visibleDays: [1], closedDays: [], 
                playoffVisibleDays: [1], playoffClosedDays: [],
                playoffRounds: 5, playoffsAccessible: false,
                fantasyRound: 1, fantasyLocked: false
            };

            if (data && !error) {
                config = {
                    visibleDays: data.active_days || [1],
                    closedDays: data.closed_days || [],
                    playoffVisibleDays: data.playoff_visible_days || [1],
                    playoffClosedDays: data.playoff_closed_days || [],
                    playoffRounds: data.playoff_rounds || 5, 
                    playoffsAccessible: data.playoffs_accessible || false,
                    fantasyRound: data.fantasy_round || 1,
                    fantasyLocked: data.fantasy_locked || false
                };
            }

            // Auto-Lock Logic based on time
            if (!config.fantasyLocked) {
                const currentRoundDef = FANTASY_SCHEDULE.find(r => r.id === config.fantasyRound);
                if (currentRoundDef) {
                    const matches = await this.getMatches();
                    const roundMatches = matches.filter(m => 
                        (currentRoundDef.stage === Stage.GROUPS ? m.stage === Stage.GROUPS : m.stage !== Stage.GROUPS) &&
                        currentRoundDef.matchdays.includes(m.day || 0)
                    );
                    
                    if (roundMatches.length > 0) {
                        const sorted = roundMatches.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                        const firstMatchTime = new Date(sorted[0].startTime);
                        if (new Date() >= firstMatchTime) {
                            config.fantasyLocked = true;
                        }
                    }
                }
            }

            return config;
        } catch (e) {
            console.error("Error loading config", e);
            return { visibleDays: [1], closedDays: [], playoffVisibleDays: [1], playoffClosedDays: [], playoffRounds: 5, playoffsAccessible: false, fantasyRound: 1, fantasyLocked: false };
        }
    },

    async updateGlobalConfig(config: any) {
        // Mapeo de camelCase a snake_case para la DB
        const dbConfig: any = {};
        if (config.visibleDays) dbConfig.active_days = config.visibleDays;
        if (config.closedDays) dbConfig.closed_days = config.closedDays;
        if (config.playoffVisibleDays) dbConfig.playoff_visible_days = config.playoffVisibleDays;
        if (config.playoffClosedDays) dbConfig.playoff_closed_days = config.playoffClosedDays;
        if (config.playoffRounds) dbConfig.playoff_rounds = config.playoffRounds;
        if (config.playoffsAccessible !== undefined) dbConfig.playoffs_accessible = config.playoffsAccessible;
        if (config.fantasyRound) dbConfig.fantasy_round = config.fantasyRound;
        if (config.fantasyLocked !== undefined) dbConfig.fantasy_locked = config.fantasyLocked;

        // Asumimos que solo hay 1 fila de config, ID=1
        await supabase.from('config').update(dbConfig).eq('id', 1);
    },

    async processRoundTransition(newRound: number) {
        const currentPlayers = await this.getPlayers();
        
        const updatedPlayers = currentPlayers.map(p => {
            const avg = p.averagePoints || 0;
            const targetPrice = avg * 18; 
            let change = 0;
            const currentCost = p.cost || 250;

            if ((p.totalPoints || 0) > 0) {
                if (targetPrice > currentCost) {
                    change = Math.min(50, Math.ceil((targetPrice - currentCost) * 0.2));
                } else if (targetPrice < currentCost) {
                    change = Math.max(-50, Math.floor((targetPrice - currentCost) * 0.1));
                }
            }

            let newCost = Math.round(currentCost + change);
            newCost = Math.max(150, Math.min(550, newCost));

            return { ...p, cost: newCost, priceChange: change };
        });

        // Bulk update players
        const updates = updatedPlayers.map(p => 
            supabase.from('players').update({ 
                cost: p.cost, 
                price_change: p.priceChange 
            }).eq('id', p.id)
        );
        await Promise.all(updates);

        await this.updateGlobalConfig({ 
            fantasyRound: newRound,
            fantasyLocked: false 
        });
    },

    async getSplits() {
        // Mock estático o DB
        return [
            { id: 'winter_2026', name: 'Winter 2026', status: 'active' },
            { id: 'spring_2026', name: 'Spring 2026', status: 'upcoming' },
            { id: 'summer_2026', name: 'Summer 2026', status: 'upcoming' }
        ];
    },

    // --- TEAMS ---
    async getTeams(): Promise<Record<string, Team>> {
        const { data, error } = await supabase.from('teams').select('*');
        if (error || !data || data.length === 0) {
            // Seed si está vacío
            const teamsList = Object.values(TEAMS);
            await supabase.from('teams').upsert(
                teamsList.map(t => ({
                    id: t.id,
                    name: t.name,
                    short_name: t.shortName,
                    region: t.region,
                    color: t.color,
                    logo: t.logo
                }))
            );
            return TEAMS;
        }

        const teamsMap: Record<string, Team> = {};
        data.forEach((row: any) => {
            teamsMap[row.id] = {
                id: row.id,
                name: row.name,
                shortName: row.short_name,
                region: row.region,
                color: row.color,
                logo: row.logo,
                country: row.country
            };
        });
        return teamsMap;
    },

    async updateTeam(teamId: string, updates: Partial<Team>) {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.shortName) dbUpdates.short_name = updates.shortName;
        if (updates.region) dbUpdates.region = updates.region;
        if (updates.color) dbUpdates.color = updates.color;
        if (updates.logo) dbUpdates.logo = updates.logo;
        if (updates.country) dbUpdates.country = updates.country;

        await supabase.from('teams').update(dbUpdates).eq('id', teamId);
    },

    // --- PLAYERS ---
    async getPlayers(): Promise<Player[]> {
        const { data: playersData } = await supabase.from('players').select('*');
        let playersList: Player[] = [];

        if (!playersData || playersData.length === 0) {
            // Seed
            const seed = PLAYERS.map(p => ({
                id: p.id,
                name: p.name,
                role: p.role,
                team_id: p.teamId,
                cost: p.cost,
                photo: p.photo,
                country: p.country
            }));
            await supabase.from('players').upsert(seed);
            playersList = PLAYERS;
        } else {
            playersList = playersData.map((p: any) => ({
                id: p.id,
                name: p.name,
                role: p.role,
                teamId: p.team_id,
                cost: p.cost,
                photo: p.photo,
                country: p.country,
                averagePoints: 0, 
                totalPoints: 0,
                kda: 0,
                priceChange: p.price_change || 0
            }));
        }

        const matches = await this.getMatches();
        
        // Calcular estadísticas al vuelo (igual que antes)
        const updatedPlayers = playersList.map(player => {
            let totalKills = 0, totalDeaths = 0, totalAssists = 0, totalPoints = 0, gamesPlayed = 0;
            let highlight: string | undefined = undefined;
            let lastMatchPoints: number | undefined = undefined;

            const sortedMatches = matches.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

            for (const match of sortedMatches) {
                if (!match.isCompleted) continue;
                if (match.stats && match.stats[player.id]) {
                    const s = match.stats[player.id];
                    totalKills += s.kills;
                    totalDeaths += s.deaths;
                    totalAssists += s.assists;
                    totalPoints += s.totalPoints;
                    if (lastMatchPoints === undefined) lastMatchPoints = s.totalPoints;
                    gamesPlayed++;

                    if (!highlight) {
                        if (s.pentaKills > 0) highlight = "PENTAKILL";
                        else if (s.quadraKills > 0) highlight = "QUADRA KILL";
                        else if (s.isMvp) highlight = "MVP";
                        else if (s.kills >= 10) highlight = "High Kills";
                    }
                }
            }

            const kda = totalDeaths === 0 ? (totalKills + totalAssists) : (totalKills + totalAssists) / totalDeaths;
            const averagePoints = gamesPlayed > 0 ? (totalPoints / gamesPlayed) : (player.averagePoints || 0);

            let isHot = false;
            if (gamesPlayed > 0 && matches.length > 0) {
                 const lastGameStats = matches[0].stats?.[player.id];
                 if (lastGameStats && lastGameStats.totalPoints > averagePoints) isHot = true;
            }

            return {
                ...player,
                kda: parseFloat(kda.toFixed(2)),
                averagePoints: parseFloat(averagePoints.toFixed(1)),
                totalPoints: parseFloat(totalPoints.toFixed(1)),
                lastMatchPoints: lastMatchPoints,
                highlight: highlight,
                isHot: isHot
            };
        });

        return updatedPlayers;
    },

    async updatePlayer(playerId: string, updates: Partial<Player>) {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.role) dbUpdates.role = updates.role;
        if (updates.teamId) dbUpdates.team_id = updates.teamId;
        if (updates.cost) dbUpdates.cost = updates.cost;
        if (updates.photo) dbUpdates.photo = updates.photo;
        if (updates.country) dbUpdates.country = updates.country;

        await supabase.from('players').update(dbUpdates).eq('id', playerId);
    },

    // --- MATCHES ---
    async getMatches(day?: number): Promise<Match[]> {
        const { data: matchesData, error } = await supabase.from('matches').select('*');
        if (error) return [];

        const teamsMap = await this.getTeams();
        let matches: Match[] = [];

        if (!matchesData || matchesData.length === 0) {
            // Seed
            const seed = MATCHES.map(m => ({
                id: m.id,
                team_a_id: m.teamA.id,
                team_b_id: m.teamB.id,
                start_time: m.startTime,
                stage: m.stage,
                is_completed: m.isCompleted,
                day: m.day,
                winner_id: m.winnerId,
                best_of: m.bestOf,
                bracket_stage: m.bracketStage,
                stats: m.stats,
                games: m.games
            }));
            // Insert in chunks/manually via Supabase would be better, but we assume empty DB
            // We skip auto-seed for matches to avoid massive writes on client load in this migration example
            // unless strictly necessary.
        } else {
            matches = matchesData.map((m: any) => ({
                id: m.id,
                teamA: teamsMap[m.team_a_id] || { id: m.team_a_id, name: 'Unknown' },
                teamB: teamsMap[m.team_b_id] || { id: m.team_b_id, name: 'Unknown' },
                startTime: m.start_time,
                stage: m.stage,
                isCompleted: m.is_completed,
                day: m.day,
                winnerId: m.winner_id,
                bestOf: m.best_of,
                bracketStage: m.bracket_stage,
                stats: m.stats || {},
                games: m.games || []
            })) as Match[];
        }

        if (day) {
            return matches.filter(m => m.day === day);
        }
        return matches;
    },

    async updateMatch(matchId: string, updates: any) {
        const dbUpdates: any = {};
        if (updates.team_a_id) dbUpdates.team_a_id = updates.team_a_id;
        if (updates.team_b_id) dbUpdates.team_b_id = updates.team_b_id;
        if (updates.start_time) dbUpdates.start_time = updates.start_time;
        if (updates.status !== undefined) dbUpdates.is_completed = updates.status === 'finished';
        if (updates.winner_id !== undefined) dbUpdates.winner_id = updates.winner_id;
        if (updates.day) dbUpdates.day = updates.day;
        if (updates.bestOf) dbUpdates.best_of = updates.bestOf;
        if (updates.bracketStage) dbUpdates.bracket_stage = updates.bracketStage;
        if (updates.stats) dbUpdates.stats = updates.stats;
        if (updates.games) dbUpdates.games = updates.games;

        await supabase.from('matches').update(dbUpdates).eq('id', matchId);
    },

    async createMatch(matchData: any) {
        await supabase.from('matches').insert({
            id: `custom-${Date.now()}`,
            team_a_id: matchData.team_a_id,
            team_b_id: matchData.team_b_id,
            start_time: matchData.start_time,
            stage: matchData.stage || Stage.GROUPS,
            is_completed: matchData.status === 'finished',
            day: matchData.day,
            best_of: matchData.bestOf || 1,
            bracket_stage: matchData.bracketStage
        });
    },

    async deleteMatch(matchId: string) {
        await supabase.from('matches').delete().eq('id', matchId);
    },

    // --- FANTASY ---
    async saveFantasyTeam(userId: string, team: Record<Role, FantasySlot>, captain: string | null, round: number) {
        // Upsert fantasy_teams
        await supabase.from('fantasy_teams').upsert({
            user_id: userId,
            round: round,
            team: team,
            captain: captain,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,round' });
    },

    async getFantasyTeam(userId: string, round: number): Promise<FantasyTeamState | null> {
        const { data } = await supabase.from('fantasy_teams')
            .select('*')
            .eq('user_id', userId)
            .eq('round', round)
            .single();

        if (data) {
            return {
                team: data.team,
                captain: data.captain,
                score: data.score || 0
            };
        } else if (round > 1) {
            // Inheritance logic
            const { data: prevData } = await supabase.from('fantasy_teams')
                .select('*')
                .eq('user_id', userId)
                .eq('round', round - 1)
                .single();
            
            if (prevData) {
                // Logic to keep purchaseCost...
                return {
                    team: prevData.team, // We trust the JSON structure has the costs
                    captain: prevData.captain,
                    score: 0
                };
            }
        }
        return null;
    },

    async saveMatchStatsAndCalculate(matchId: string, games: MatchGame[]) {
        // 1. Fetch Players & Match
        const players = await this.getPlayers();
        const { data: matchData } = await supabase.from('matches').select('*').eq('id', matchId).single();
        if (!matchData) throw new Error("Match not found");

        const match = { 
            ...matchData, 
            teamA: { id: matchData.team_a_id }, 
            teamB: { id: matchData.team_b_id } 
        } as Match; // Partial match obj for logic

        // 2. Aggregate Stats (Reuse logic)
        const aggregatedStats: Record<string, PlayerGameStats> = {};
        const playersInvolved = players.filter(p => p.teamId === match.teamA.id || p.teamId === match.teamB.id);

        playersInvolved.forEach(player => {
            let totalScore = 0;
            let gamesPlayed = 0;
            const summedStats: any = { 
                playerId: player.id, kills:0, deaths:0, assists:0, cs:0,
                isMvp: false, firstBlood: false, 
                doubleKills:0, tripleKills:0, quadraKills:0, pentaKills:0,
                teamDamagePercentage:0, dragonsKilled:0, baronsKilled:0, damagePerMinute:0, visionScore:0, firstDragon:false,
                totalPoints: 0
            };

            games.forEach(game => {
                const pStats = game.stats[player.id];
                if (pStats) {
                    gamesPlayed++;
                    summedStats.kills += pStats.kills;
                    summedStats.deaths += pStats.deaths;
                    summedStats.assists += pStats.assists;
                    summedStats.cs += pStats.cs;
                    summedStats.doubleKills += pStats.doubleKills;
                    summedStats.tripleKills += pStats.tripleKills;
                    summedStats.quadraKills += pStats.quadraKills;
                    summedStats.pentaKills += pStats.pentaKills;
                    
                    if (pStats.isMvp) summedStats.isMvp = true;
                    if (pStats.firstBlood) summedStats.firstBlood = true;
                    if (pStats.firstDragon) summedStats.firstDragon = true;

                    summedStats.dragonsKilled += pStats.dragonsKilled;
                    summedStats.baronsKilled += pStats.baronsKilled;
                    summedStats.teamDamagePercentage += pStats.teamDamagePercentage;
                    summedStats.damagePerMinute += pStats.damagePerMinute;
                    summedStats.visionScore += pStats.visionScore;

                    const isGameWinner = game.winnerId === player.teamId;
                    const gameScore = fantasyService.calculatePoints(
                        { ...pStats, win: isGameWinner } as any,
                        player.role,
                        false,
                        match.bracketStage,
                        match.stage
                    );
                    totalScore += gameScore;
                }
            });

            if (gamesPlayed > 0) {
                summedStats.teamDamagePercentage /= gamesPlayed;
                summedStats.damagePerMinute /= gamesPlayed;
                summedStats.totalPoints = parseFloat((totalScore / gamesPlayed).toFixed(2));
                aggregatedStats[player.id] = summedStats;
            }
        });

        const winsA = games.filter(g => g.winnerId === match.teamA.id).length;
        const winsB = games.filter(g => g.winnerId === match.teamB.id).length;
        const seriesWinnerId = winsA > winsB ? match.teamA.id : (winsB > winsA ? match.teamB.id : null);

        // 3. Update Match
        await supabase.from('matches').update({
            games: games,
            stats: aggregatedStats,
            winner_id: seriesWinnerId,
            is_completed: true
        }).eq('id', matchId);

        // 4. Recalculate
        const allMatches = await this.getMatches(); // Refresh all to include this update
        await this.recalculateAllFantasyScores(allMatches);
    },

    async recalculateAllFantasyScores(allMatches: Match[]) {
        const { data: users } = await supabase.from('profiles').select('id');
        if (!users) return;

        // Map stats
        const matchStatsMap: Record<string, Record<string, number>> = {};
        allMatches.forEach(m => {
            if (m.stats) {
                matchStatsMap[m.id] = {};
                Object.values(m.stats).forEach(s => {
                    matchStatsMap[m.id][s.playerId] = s.totalPoints;
                });
            }
        });

        // Process each user
        const updates = users.map(async (user) => {
            let totalFantasyScore = 0;
            const { data: fantasyRounds } = await supabase.from('fantasy_teams').select('*').eq('user_id', user.id);
            
            if (fantasyRounds) {
                for (const roundData of fantasyRounds) {
                    const roundConfig = FANTASY_SCHEDULE.find(r => r.id === roundData.round);
                    if (!roundConfig) continue;

                    const relevantMatches = allMatches.filter(m => {
                        if (roundConfig.stage === Stage.GROUPS) {
                            return m.stage === Stage.GROUPS && roundConfig.matchdays.includes(m.day || 0);
                        } else {
                            return m.stage !== Stage.GROUPS && roundConfig.matchdays.includes(m.day || 0);
                        }
                    });

                    let roundScore = 0;
                    Object.values(roundData.team).forEach((slot: any) => {
                        const pid = slot?.playerId || (typeof slot === 'string' ? slot : null);
                        if (pid) {
                            let playerRoundPoints = 0;
                            relevantMatches.forEach(m => {
                                const points = matchStatsMap[m.id]?.[pid] || 0;
                                playerRoundPoints += points;
                            });
                            if (pid === roundData.captain) playerRoundPoints *= 1.5;
                            roundScore += playerRoundPoints;
                        }
                    });

                    await supabase.from('fantasy_teams').update({ score: parseFloat(roundScore.toFixed(2)) }).eq('id', roundData.id);
                    totalFantasyScore += roundScore;
                }
            }
            
            // Update profile fantasy score cache
            await supabase.from('profiles').update({ 
                score_fantasy: parseFloat(totalFantasyScore.toFixed(2)) 
            }).eq('id', user.id);
        });

        await Promise.all(updates);
    },

    async forceRecalculateAll() {
        const matches = await this.getMatches();
        await this.recalculateAllFantasyScores(matches);
    },

    // --- USER PREDICTIONS & RANKINGS ---
    async getAllUsers(): Promise<User[]> {
        const [
            allMatches,
            { data: adminRankingData },
            { data: adminCrystalData },
            { data: profiles },
            { data: allPicks },
            { data: allRankings },
            { data: allCrystal },
            { data: allFantasy }
        ] = await Promise.all([
            this.getMatches(),
            supabase.from('results').select('ranking').eq('id', 'winter_2026').single(),
            supabase.from('results').select('crystal_ball').eq('id', 'winter_2026').single(),
            supabase.from('profiles').select('*'),
            supabase.from('predictions').select('*'),
            supabase.from('user_rankings').select('*'),
            supabase.from('user_crystal_ball').select('*'),
            supabase.from('fantasy_teams').select('*')
        ]);

        const adminRanking = adminRankingData?.ranking || [];
        const adminCrystalBall = adminCrystalData?.crystal_ball || {};

        if (!profiles) return [];

        return profiles.map(profile => {
            // Filter user data from bulk fetches
            const userPicks = allPicks?.filter(p => p.user_id === profile.id) || [];
            const userRankingObj = allRankings?.find(r => r.user_id === profile.id);
            const userRanking = userRankingObj?.ranking || [];
            const userCrystalObj = allCrystal?.find(c => c.user_id === profile.id);
            const userCrystalBall = userCrystalObj?.selections || {};
            const userFantasyRounds = allFantasy?.filter(f => f.user_id === profile.id) || [];

            // Calculate Scores (Logic identical to previous dataService)
            let matchdayScore = 0;
            let playoffsScore = 0;
            const pointsPerRound: Record<number, number> = { 1: 3, 2: 4, 3: 6, 4: 8, 5: 10 };

            allMatches.forEach(m => {
                if (!m.winnerId) return;
                const pick = userPicks.find(p => p.match_id === m.id);
                if (pick && pick.predicted_winner_id === m.winnerId) {
                    if (m.stage === Stage.GROUPS) matchdayScore += 1;
                    else playoffsScore += (pointsPerRound[m.day || 1] || 3);
                }
            });

            let rankingScore = 0;
            if (adminRanking.length > 0 && userRanking.length > 0) {
                userRanking.forEach((teamId: string, index: number) => {
                    const actualIndex = adminRanking.indexOf(teamId);
                    if (actualIndex !== -1) {
                        const diff = Math.abs(index - actualIndex);
                        if (diff === 0) rankingScore += 6;
                        else if (diff === 1) rankingScore += 3;
                    }
                });
            }

            let crystalScore = 0;
            // (Reusing crystal ball logic keys from previous code)
            const singles = ['winter_champ', 'mvp', 'rookie', 'best_top', 'best_jng', 'best_mid', 'best_adc', 'best_sup', 'total_pentakills'];
            singles.forEach(key => {
                if (userCrystalBall[key] && userCrystalBall[key] === adminCrystalBall[key]) {
                    crystalScore += (['winter_champ', 'mvp', 'rookie'].includes(key) ? 10 : 5);
                }
            });
            const rankedCats = ['fastest_win_team', 'longest_win_team', 'highest_kda', 'most_picked', 'most_banned', 'highest_wr', 'lowest_wr', 'most_kills'];
            rankedCats.forEach(cat => {
                const userVal = userCrystalBall[cat];
                if (userVal) {
                    if (userVal === adminCrystalBall[`${cat}_1`]) crystalScore += 5;
                    else if (userVal === adminCrystalBall[`${cat}_2`]) crystalScore += 3;
                    else if (userVal === adminCrystalBall[`${cat}_3`]) crystalScore += 1;
                }
            });

            const fantasyTotal = userFantasyRounds.reduce((acc, r) => acc + (r.score || 0), 0);
            
            // Build Histories (Simplified for brevity in XML)
            const pointsHistory: any[] = []; // ... logic for history
            const fantasyHistory: any[] = []; // ... logic for history

            return {
                id: profile.id,
                name: profile.username,
                avatar: profile.avatar_url,
                title: profile.title,
                frame: profile.frame,
                banner: profile.banner,
                badges: profile.badges || [],
                badgeProgress: profile.badge_progress || {},
                equippedBadges: profile.equipped_badges || [],
                score: matchdayScore + rankingScore + playoffsScore,
                scoreBreakdown: {
                    matchday: matchdayScore,
                    ranking: rankingScore,
                    playoffs: playoffsScore,
                    crystalBall: crystalScore,
                    fantasy: parseFloat(fantasyTotal.toFixed(2))
                },
                rank: 0,
                pointsHistory,
                fantasyHistory
            };
        });
    },

    async getUserPredictions(userId: string) {
        const { data } = await supabase.from('predictions').select('*').eq('user_id', userId);
        return (data || []).map(p => ({ matchId: p.match_id, predictedWinnerId: p.predicted_winner_id }));
    },

    async savePredictions(predictions: any[]) {
        const upserts = predictions.map(p => ({
            user_id: p.user_id,
            match_id: p.match_id,
            predicted_winner_id: p.predicted_winner_id
        }));
        // Supabase Upsert needs conflict target (composite key user_id + match_id)
        await supabase.from('predictions').upsert(upserts, { onConflict: 'user_id,match_id' });
    },

    async getUserRanking(userId: string) {
        const { data } = await supabase.from('user_rankings').select('ranking').eq('user_id', userId).single();
        return data?.ranking || [];
    },

    async saveUserRanking(userId: string, teamIds: string[]) {
        await supabase.from('user_rankings').upsert({ user_id: userId, ranking: teamIds }, { onConflict: 'user_id' });
    },

    async getAdminRanking() {
        const { data } = await supabase.from('results').select('ranking').eq('id', 'winter_2026').single();
        return data?.ranking || [];
    },

    async saveAdminRanking(teamIds: string[]) {
        await supabase.from('results').upsert({ id: 'winter_2026', ranking: teamIds }, { onConflict: 'id' });
    },

    async getCrystalBall(userId: string) {
        const { data } = await supabase.from('user_crystal_ball').select('selections').eq('user_id', userId).single();
        return data?.selections || {};
    },

    async saveCrystalBall(userId: string, selections: any) {
        await supabase.from('user_crystal_ball').upsert({ user_id: userId, selections }, { onConflict: 'user_id' });
    },

    async getAdminCrystalBallResults() {
        const { data } = await supabase.from('results').select('crystal_ball').eq('id', 'winter_2026').single();
        return data?.crystal_ball || {};
    },

    async saveAdminCrystalBallResults(selections: any) {
        await supabase.from('results').upsert({ id: 'winter_2026', crystal_ball: selections }, { onConflict: 'id' });
    },

    async updateUserProfile(userId: string, updates: any) {
        const dbUpdates: any = {};
        if (updates.title) dbUpdates.title = updates.title;
        if (updates.avatar_url) dbUpdates.avatar_url = updates.avatar_url;
        if (updates.banner) dbUpdates.banner = updates.banner;
        if (updates.frame) dbUpdates.frame = updates.frame;
        if (updates.badges) dbUpdates.badges = updates.badges;
        if (updates.equippedBadges) dbUpdates.equipped_badges = updates.equippedBadges;

        await supabase.from('profiles').update(dbUpdates).eq('id', userId);
    }
};
