
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
  PLAYOFFS = 'PLAYOFFS', // Playoffs
  MATCHDAY = 'MATCHDAY', // Jornada (Regular Season)
  CRYSTAL_BALL = 'CRYSTAL_BALL', // Bola de cristal
  FANTASY = 'FANTASY', // Fantasy Team
  RESULTS = 'RESULTS', // Resultados jornada
  PROFILE = 'PROFILE' // New Profile View
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
  cost: number; // Fantasy cost
  averagePoints: number; // Average points per game
  kda: number; // Kill Death Assist Ratio
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
}

export interface UserPrediction {
  matchId: string;
  predictedWinnerId: string;
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
  fantasyHistory: { day: string; points: number }[]; // Fantasy History (12 rounds)
  fantasyTeam?: Record<Role, string | null>; // The user's saved lineup
}

export interface AiAnalysisResult {
  analysis: string;
  favoredTeamId: string;
  confidence: number;
}
