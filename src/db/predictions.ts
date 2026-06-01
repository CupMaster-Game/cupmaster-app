import { sql, withTransaction } from './index.ts';
import { createGamePlay, insertGameAction, getActiveTournament } from './game-plays.ts';

// Game type IDs for predictions
const GAME_TYPE_MATCH_PREDICTION = 201 as const;
const GAME_TYPE_GROUP_PREDICTION = 202 as const;
const GAME_TYPE_KNOCKOUT_PREDICTION = 203 as const;

export type MatchOutcome = 'team1' | 'team2' | 'draw';

export interface MatchPredictionData {
  match_number: number;
  result: MatchOutcome;
}

export interface GroupStanding {
  group_name: string;
  ordered_teams: string[];
}

export interface GroupPredictionData {
  standings: GroupStanding[];
}

export interface KnockoutMatchResult {
  match_number: number;
  winner_team_id: string;
}

export interface KnockoutPredictionData {
  match_results: KnockoutMatchResult[];
}

export type PredictionPayload =
  | { type: 'match_prediction'; data: MatchPredictionData }
  | { type: 'group_prediction'; data: GroupPredictionData }
  | { type: 'knockout_bracket_prediction'; data: KnockoutPredictionData };

export type SubmitPredictionError =
  | 'duplicate_prediction'
  | 'not_enough_energy'
  | 'no_existing_prediction';

export type SubmitPredictionOutcome =
  | { ok: true; game_play_id: string }
  | { ok: false; error: SubmitPredictionError };

function gameTypeFor(payload: PredictionPayload): 201 | 202 | 203 {
  switch (payload.type) {
    case 'match_prediction':
      return GAME_TYPE_MATCH_PREDICTION;
    case 'group_prediction':
      return GAME_TYPE_GROUP_PREDICTION;
    case 'knockout_bracket_prediction':
      return GAME_TYPE_KNOCKOUT_PREDICTION;
  }
}

/**
 * Finds an existing prediction game_play for a user. For match_prediction,
 * matchNumber must be provided and we look up by intval on the action row.
 * For group/knockout, there is at most one game_play per user.
 */
async function findExistingPredictionGamePlay(
  userId: string,
  gameType: 201 | 202 | 203,
  matchNumber: number | null
): Promise<string | null> {
  if (gameType === GAME_TYPE_MATCH_PREDICTION) {
    if (matchNumber === null) return null;
    const rows = await sql<{ game_play_id: string }[]>`
      SELECT gp.game_play_id
      FROM   game_plays gp
      JOIN   game_actions ga ON ga.game_play_id = gp.game_play_id
      WHERE  gp.user_id    = ${userId}
        AND  gp.game_type  = ${gameType}
        AND  ga.action_type = 'submit_prediction'
        AND  ga.intval     = ${matchNumber}
      ORDER BY gp.game_play_id DESC
      LIMIT 1
    `;
    return rows[0]?.game_play_id ?? null;
  }
  const rows = await sql<{ game_play_id: string }[]>`
    SELECT game_play_id
    FROM   game_plays
    WHERE  user_id   = ${userId}
      AND  game_type = ${gameType}
    ORDER BY game_play_id DESC
    LIMIT 1
  `;
  return rows[0]?.game_play_id ?? null;
}

/**
 * Submits a prediction by creating a new game_play (decrements energy when
 * game_type has a non-zero energy cost) and inserting the submit_prediction
 * game_action atomically. Errors if a prediction already exists for the same
 * scope.
 */
export async function submitPrediction(
  userId: string,
  payload: PredictionPayload,
  ipAddress: string | null
): Promise<SubmitPredictionOutcome> {
  const gameType = gameTypeFor(payload);
  const matchNumber =
    payload.type === 'match_prediction' ? payload.data.match_number : null;

  const existing = await findExistingPredictionGamePlay(userId, gameType, matchNumber);
  if (existing !== null) {
    return { ok: false, error: 'duplicate_prediction' };
  }

  const tournamentId = await getActiveTournament();

  const result = await withTransaction(async (tx) => {
    const created = await createGamePlay(tx, userId, gameType, tournamentId, ipAddress);
    if (!created) return null;

    await insertGameAction(
      tx,
      created.game_play_id,
      'submit_prediction',
      matchNumber,
      null,
      payload.data as unknown as Record<string, unknown>
    );

    return created;
  });

  if (!result) {
    return { ok: false, error: 'not_enough_energy' };
  }

  return { ok: true, game_play_id: result.game_play_id };
}

/**
 * Updates an existing prediction by appending a new submit_prediction
 * game_action to the existing game_play. No energy is consumed and no new
 * game_play is created. Errors if no existing prediction is found.
 */
export async function submitPredictionChange(
  userId: string,
  payload: PredictionPayload
): Promise<SubmitPredictionOutcome> {
  const gameType = gameTypeFor(payload);
  const matchNumber =
    payload.type === 'match_prediction' ? payload.data.match_number : null;

  const gamePlayId = await findExistingPredictionGamePlay(userId, gameType, matchNumber);
  if (gamePlayId === null) {
    return { ok: false, error: 'no_existing_prediction' };
  }

  await withTransaction(async (tx) => {
    await insertGameAction(
      tx,
      gamePlayId,
      'submit_prediction',
      matchNumber,
      null,
      payload.data as unknown as Record<string, unknown>
    );
  });

  return { ok: true, game_play_id: gamePlayId };
}

// ---------------------------------------------------------------------------
// Read path
// ---------------------------------------------------------------------------

export interface UserPredictionsResponse {
  match_predictions: { match_number: number; result: MatchOutcome; predicted_at: string }[];
  group_prediction: { standings: GroupStanding[]; predicted_at: string } | null;
  knockout_prediction: {
    match_results: KnockoutMatchResult[];
    predicted_at: string;
  } | null;
}

/**
 * Fetches all of a user's latest predictions. For match_prediction, returns
 * the latest action per match_number. For group/knockout, returns the single
 * latest action.
 */
export async function getUserPredictions(userId: string): Promise<UserPredictionsResponse> {
  const matchRows = await sql<
    { match_number: number; extra_data: { result: MatchOutcome }; action_time: Date }[]
  >`
    SELECT DISTINCT ON (ga.intval)
           ga.intval     AS match_number,
           ga.extra_data,
           ga.action_time
    FROM   game_plays gp
    JOIN   game_actions ga ON ga.game_play_id = gp.game_play_id
    WHERE  gp.user_id    = ${userId}
      AND  gp.game_type  = ${GAME_TYPE_MATCH_PREDICTION}
      AND  ga.action_type = 'submit_prediction'
      AND  ga.intval IS NOT NULL
    ORDER BY ga.intval, ga.game_action_id DESC
  `;

  const groupRows = await sql<
    { extra_data: { standings: GroupStanding[] }; action_time: Date }[]
  >`
    SELECT ga.extra_data, ga.action_time
    FROM   game_plays gp
    JOIN   game_actions ga ON ga.game_play_id = gp.game_play_id
    WHERE  gp.user_id    = ${userId}
      AND  gp.game_type  = ${GAME_TYPE_GROUP_PREDICTION}
      AND  ga.action_type = 'submit_prediction'
    ORDER BY ga.game_action_id DESC
    LIMIT 1
  `;

  const knockoutRows = await sql<
    { extra_data: { match_results: KnockoutMatchResult[] }; action_time: Date }[]
  >`
    SELECT ga.extra_data, ga.action_time
    FROM   game_plays gp
    JOIN   game_actions ga ON ga.game_play_id = gp.game_play_id
    WHERE  gp.user_id    = ${userId}
      AND  gp.game_type  = ${GAME_TYPE_KNOCKOUT_PREDICTION}
      AND  ga.action_type = 'submit_prediction'
    ORDER BY ga.game_action_id DESC
    LIMIT 1
  `;

  return {
    match_predictions: matchRows.map((r) => ({
      match_number: r.match_number,
      result: r.extra_data.result,
      predicted_at: r.action_time.toISOString(),
    })),
    group_prediction: groupRows[0]
      ? {
          standings: groupRows[0].extra_data.standings,
          predicted_at: groupRows[0].action_time.toISOString(),
        }
      : null,
    knockout_prediction: knockoutRows[0]
      ? {
          match_results: knockoutRows[0].extra_data.match_results,
          predicted_at: knockoutRows[0].action_time.toISOString(),
        }
      : null,
  };
}
