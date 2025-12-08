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
  RANKING = 'RANKING', // Clasificación Winter 2026
  PLAYOFFS = 'PLAYOFFS', // Playoffs
  MATCHDAY = 'MATCHDAY', // Jornada (Regular Season)
  CRYSTAL_BALL = 'CRYSTAL_BALL', // Bola de cristal
  FANTASY = 'FANTASY', // Fantasy Team
  RESULTS = 'RESULTS' // Resultados jornada
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
  winnerId?: string; // If completed
}

export interface UserPrediction {
  matchId: string;
  predictedWinnerId: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  score: number; // Global Score
  scoreBreakdown: {
    matchday: number;
    ranking: number;
    playoffs: number;
    crystalBall: number;
    fantasy: number;
  };
  rank: number;
  pointsHistory: { day: string; points: number }[];
  fantasyTeam?: Record<Role, string | null>; // The user's saved lineup
}

export interface AiAnalysisResult {
  analysis: string;
  favoredTeamId: string;
  confidence: number;
}