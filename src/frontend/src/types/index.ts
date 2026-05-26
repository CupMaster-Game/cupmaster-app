export type GroupId =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L';

export interface Team {
  id: string;
  name: string;
  code: string; // ISO 2-letter
  group: GroupId;
}

export type MatchStage =
  | 'group'
  | 'r32'
  | 'r16'
  | 'qf'
  | 'sf'
  | 'final'
  | 'third';

export type MatchOutcome = 'home' | 'draw' | 'away';

export type MatchStatus = 'scheduled' | 'live' | 'finished';

export interface Match {
  id: string;
  stage: MatchStage;
  group: GroupId | null;
  kickoff: string; // ISO string
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
}

export interface MatchPrediction {
  matchId: string;
  pick: MatchOutcome;
  predictedAt: string;
}

export interface GroupOrderPrediction {
  group: GroupId;
  // Ordered array of team ids (1st → 4th).
  order: [string, string, string, string];
}

export interface KnockoutPrediction {
  matchId: string;
  winnerTeamId: string;
}

export interface User {
  id: string;
  name: string;
  handle: string;
  countryCode: string;
  totalPoints: number;
  globalRank: number;
  gamesPlayed: number;
  predictionsMade: number;
  verified: boolean;
}

export type BadgeTier = 'bronze' | 'silver' | 'gold';

export type BadgeCategory =
  | 'predictions_made'
  | 'correct_predictions'
  | 'games_played'
  | 'daily_streak'
  | 'points_earned';

export interface BadgeProgress {
  category: BadgeCategory;
  label: string;
  current: number;
  thresholds: { bronze: number; silver: number; gold: number };
  unit?: string;
}

export type BadgeStatus = 'locked' | 'claimable' | 'claimed';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  countryCode: string;
  points: number;
  isYou?: boolean;
}

export type LeaderboardScope = 'tournament' | 'overall';

export type GameKind = 'trivia' | 'guess_player' | 'match_flag';

export interface GameSummary {
  kind: GameKind;
  title: string;
  description: string;
  playedCount: number;
  accent: 'purple' | 'green' | 'orange';
}

export interface TriviaQuestion {
  id: string;
  question: string;
  options: readonly string[];
  correctIndex: number;
}

export interface PlayerClue {
  id: string;
  name: string;
  clues: readonly string[];
  options: readonly string[];
}

export interface FlagMatchPair {
  countryName: string;
  countryCode: string;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  amount: number;
  unit: 'PTS' | 'NFT' | 'TOKEN';
}
