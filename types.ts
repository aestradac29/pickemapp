
export enum Stage {
  GROUPS = 'Fase Regular',
  PLAYOFFS = 'Playoffs',
  FINALS = 'Gran Final'
}

export enum Region {
  LEC = 'LEC',
  LCK = 'LCK',
  LPL = 'LPL',
  LCS = 'LCS'
}

export enum ViewState {
  LOGIN = 'LOGIN',
  SPLIT_SELECTION = 'SPLIT_SELECTION', // New View
  DASHBOARD = 'DASHBOARD',
  ADMIN = 'ADMIN', // New Admin View
  DB_MANAGER = 'DB_MANAGER', // New Database Editor View
  RANKING = 'RANKING', // Clasificación Winter 2026
  OFFICIAL_STANDINGS = 'OFFICIAL_STANDINGS', // NEW: Real LEC Standings
  PLAYOFFS = 'PLAYOFFS', // Playoffs
  MATCHDAY = 'MATCHDAY', // Jornada (Regular Season)
  CRYSTAL_BALL = 'CRYSTAL_BALL', // Bola de cristal
  FANTASY = 'FANTASY', // Fantasy Team
  RESULTS = 'RESULTS', // Resultados jornada
  PROFILE = 'PROFILE', // New Profile View
  TEAMS = 'TEAMS', // New Teams View
  HALL_OF_FAME = 'HALL_OF_FAME' // New Hall of Fame View
}

export enum Role {
  TOP = 'TOP',
  JUNGLE = 'JUNGLE',
  MID = 'MID',
  ADC = 'ADC',
  SUPPORT = 'SUPPORT'
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  region: Region;
  color: string;
  logo?: string;
}

export interface Player {
  id: string;
  name: string;
  role: Role;
  teamId: string;
  photo?: string; // Optional real photo URL
  cost: number; // Fantasy cost (CURRENT Market Value)
  averagePoints: number; // Average points per game
  totalPoints?: number; // New: Sum of all points
  kda: number; // Kill Death Assist Ratio (Season Cumulative)
  // New Fantasy Fields
  nextOpponentId?: string; // Calculated dynamically based on schedule
  priceChange?: number; // e.g. +20, -10 (Trend)
  isHot?: boolean; // If they are on a streak
  highlight?: string; // New: Statistical Highlight (e.g., "MVP", "Penta")
}

// Estructura de estadísticas para un jugador en un partido específico
export interface PlayerGameStats {
    playerId: string;
    kills: number;
    deaths: number;
    assists: number;
    cs: number;
    
    // General Bonuses
    isMvp: boolean;
    firstBlood: boolean; 
    
    // Multikills
    doubleKills: number;
    tripleKills: number;
    quadraKills: number;
    pentaKills: number;

    // Role Specific Inputs
    teamDamagePercentage: number; // 0-100 (Top/Mid)
    dragonsKilled: number;        // (Jungle)
    baronsKilled: number;         // (Jungle)
    damagePerMinute: number;      // (ADC)
    visionScore: number;          // (Support)
    firstDragon: boolean;         // (Support)

    totalPoints: number; // Calculated
}

export interface MatchGame {
    id: number; // 1, 2, 3, 4, 5
    winnerId: string | null;
    stats: Record<string, PlayerGameStats>;
}

export interface Match {
  id: string;
  teamA: Team;
  teamB: Team;
  startTime: string; // ISO String
  stage: Stage;
  isCompleted: boolean;
  winnerId?: string | null; // If completed
  day?: number | null; // Optional day number for filtering
  bestOf?: number; // BO1, BO3, BO5
  bracketStage?: 'winners' | 'losers'; // Nuevo campo para Playoffs
  stats?: Record<string, PlayerGameStats>; // Mapa playerId -> stats (AGGREGATED/AVERAGE for backward compatibility)
  games?: MatchGame[]; // DETAILED stats per game
}

export interface UserPrediction {
  matchId: string;
  predictedWinnerId: string;
}

export interface FantasySlot {
    playerId: string | null;
    purchaseCost?: number; // Coste al momento de compra (para reglas de presupuesto)
}

export interface FantasyTeamState {
    team: Record<Role, FantasySlot>;
    captain: string | null;
    score?: number; // Score for this specific round
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  title?: string; // New: Custom user title
  frame?: string; // New: Custom avatar frame ID
  banner?: string; // New: Custom profile banner ID
  badges?: string[]; // New: Unlocked Achievement Badges IDs
  badgeProgress?: Record<string, { current: number, target: number }>; // New: Progress for achievements
  equippedBadges?: string[]; // New: Currently equipped badges (Max 3)
  score: number; // Global Score (Matchday + Ranking + Playoffs)
  scoreBreakdown: {
    matchday: number;
    ranking: number;
    playoffs: number;
    crystalBall: number;
    fantasy: number;
  };
  rank: number;
  pointsHistory: { day: string; points: number }[]; // Global History
  fantasyHistory: { day: string; points: number }[]; // Fantasy History (7 Rounds)
  fantasyTeam?: Record<Role, string | null>; // LEGACY - The user's saved lineup (migration might be needed)
  fantasyCaptain?: string | null; // LEGACY
}

export interface AiAnalysisResult {
  analysis: string;
  favoredTeamId: string;
  confidence: number;
}