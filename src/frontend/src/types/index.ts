export type GroupId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

export interface Team {
  id: string;
  name: string;
  code: string; // ISO 2-letter
  group: GroupId;
}

export type MatchOutcome = 'team1' | 'draw' | 'team2';

export type MatchStatus = 'scheduled' | 'live' | 'finished';

export interface MatchPrediction {
  matchId: string;
  pick: MatchOutcome;
  predictedAt: string;
}

export interface ApiFixtureTeam {
  team_id: string;
  team_name: string;
  country_code: string;
  logo: string;
  group_name: string;
}

export interface ApiFixture {
  match_number: number;
  fixture_id: string | null;
  match_time: string;
  round_type: 'group' | 'knockout';
  round: string;
  venue_name: string;
  venue_city: string;
  status: MatchStatus;
  status_short: string | null;
  team1: ApiFixtureTeam | null;
  team2: ApiFixtureTeam | null;
  team1_score: number | null;
  team2_score: number | null;
  // Penalty-shootout score, present only for knockout matches decided on
  // penalties (status_short = 'PEN').
  team1_penalty: number | null;
  team2_penalty: number | null;
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

export type BadgeTier = 'bronze' | 'silver' | 'gold';

export type BadgeCategory =
  | 'predictions_made'
  | 'correct_predictions'
  | 'games_played'
  | 'trivia_master'
  | 'good_guesser'
  | 'matching_cards'
  | 'group_master'
  | 'bracket_master';

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
  user_id: string;
  name: string;
  address: string;
  flag: string;
  total_score: number;
  isYou?: boolean;
}

export type LeaderboardScope = 'tournament' | 'overall';

export type GameKind = 'trivia' | 'guess_player' | 'match_flag';

export interface GameSummary {
  kind: GameKind;
  /** Game type id used by the backend / Game contract (101, 102, 103). */
  gameType: 101 | 102 | 103;
  title: string;
  description: string;
  /** Display price for one energy, e.g. "0.01$". */
  priceLabel: string;
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
