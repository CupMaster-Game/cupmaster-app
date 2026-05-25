export const chainId = 42220;
export const rpcUrls = [
  'https://forno.celo.org',
  'https://rpc.ankr.com/celo',
  'https://celo-json-rpc.stakely.io',
  'https://rpc.celocolombia.org',
];

// ---------------------------------------------------------------------------
// Game Types
// - 101: football_trivia
// - 102: guess_the_player
// - 103: match_the_flag
// - 201: match_prediction
// - 202: group_prediction
// - 203: knockout_bracket_prediction
// ---------------------------------------------------------------------------

export const GAME_TYPE_IDS = [101, 102, 103, 201, 202, 203] as const;
export type GameTypeId = (typeof GAME_TYPE_IDS)[number];
const GAME_TYPE_NAMES: Record<GameTypeId, string> = {
  101: 'football_trivia',
  102: 'guess_the_player',
  103: 'match_the_flag',
  201: 'match_prediction',
  202: 'group_prediction',
  203: 'knockout_bracket_prediction',
};
export function getGameTypeName(gameTypeId: GameTypeId): string {
  return GAME_TYPE_NAMES[gameTypeId];
}

export const SIGNUP_ENERGIES = {
  101: 1,
  102: 1,
  103: 1,
  201: 1000,
  202: 1,
  203: 1,
};

// ---------------------------------------------------------------------------

export const CUPMASTER_GAME_ADDRESS = '0x6f874c978f406b4752cEac1F4b9936845E4902Af';
export const USDT_ADDRESS = '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e';
export const USDC_ADDRESS = '0xcebA9300f2b948710d2653dD7B07f33A8B32118C';
export const USDm_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a';

export const PAYMENT_TOKENS = {
  1: { address: USDT_ADDRESS, symbol: 'USDT', decimals: 6 },
  2: { address: USDC_ADDRESS, symbol: 'USDC', decimals: 6 },
  3: { address: USDm_ADDRESS, symbol: 'USDm', decimals: 18 },
};

// ---------------------------------------------------------------------------
// Tournament payouts
// ---------------------------------------------------------------------------

// Token used for tournament reward payouts. Matches keys in PAYMENT_TOKENS.
export const TOURNAMENT_PAYOUT_TOKEN_ID = 1 as const; // USDT

// Minimum total revenue (revenue + inherited_revenue), in human-readable
// USDT, required to trigger a payout. If total is below this, the tournament's
// revenue rolls over to the next tournament's inherited_revenue.
export const MIN_PAYOUT_THRESHOLD_USDT = '2';
