import { createGamePlay, getActiveTournament, insertGameAction } from './game-plays.ts';
import { sql, withTransaction } from './index.ts';

// Game type IDs for predictions
const GAME_TYPE_MATCH_PREDICTION = 201 as const;
const GAME_TYPE_GROUP_PREDICTION = 202 as const;
const GAME_TYPE_KNOCKOUT_PREDICTION = 203 as const;

// Points awarded on submit for each prediction type.
const POINTS_BY_GAME_TYPE: Record<201 | 202 | 203, number> = {
  [GAME_TYPE_MATCH_PREDICTION]: 10,
  [GAME_TYPE_GROUP_PREDICTION]: 350,
  [GAME_TYPE_KNOCKOUT_PREDICTION]: 350,
};

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
  | 'no_existing_prediction'
  | 'match_started';

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
 * Returns true once a match's scheduled kickoff time has passed. Predictions
 * (and prediction changes) are locked from this point on. Unknown match numbers
 * are treated as started (fail closed) so we never accept a prediction for a
 * match we can't validate.
 */
async function hasMatchStarted(matchNumber: number): Promise<boolean> {
  const rows = await sql<{ started: boolean }[]>`
    SELECT match_time <= now() AS started
    FROM   match_schedules
    WHERE  match_number = ${matchNumber}
  `;
  return rows[0]?.started ?? true;
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
  const matchNumber = payload.type === 'match_prediction' ? payload.data.match_number : null;

  if (matchNumber !== null && (await hasMatchStarted(matchNumber))) {
    return { ok: false, error: 'match_started' };
  }

  const existing = await findExistingPredictionGamePlay(userId, gameType, matchNumber);
  if (existing !== null) {
    return { ok: false, error: 'duplicate_prediction' };
  }

  const tournamentId = await getActiveTournament();

  const points = POINTS_BY_GAME_TYPE[gameType];

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

    await tx`
      UPDATE user_numbers
      SET    total_score = total_score + ${points}
      WHERE  user_id   = ${userId}
        AND  game_type = ${gameType}
    `;

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
  const matchNumber = payload.type === 'match_prediction' ? payload.data.match_number : null;

  if (matchNumber !== null && (await hasMatchStarted(matchNumber))) {
    return { ok: false, error: 'match_started' };
  }

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
// Result processing (background job)
// ---------------------------------------------------------------------------

/**
 * Resolves match predictions whose match has finished. For every match_prediction
 * (game_type 201) game_play that has no result yet and whose predicted match now
 * has a fixture_results row, this:
 *   - derives the actual outcome (team1 / team2 / draw) from the final score,
 *   - inserts a game_play_results row scoring 30 for a correct prediction, 0 otherwise,
 *   - bumps the user's user_numbers.total_score by the awarded score.
 *
 * All of it runs in a single statement so the result insert and the score bump
 * stay atomic, and the ON CONFLICT guard keeps re-runs idempotent. Returns the
 * number of predictions newly resolved.
 */
export async function processFinishedMatchPredictions(): Promise<number> {
  const rows = await sql<{ processed: number }[]>`
    WITH finished AS (
      -- Finished matches and their actual outcome. A knockout match level after
      -- extra time is decided by its penalty shootout (team{1,2}_penalty).
      SELECT f.match_number,
             CASE
               WHEN fr.team1_score > fr.team2_score THEN 'team1'
               WHEN fr.team1_score < fr.team2_score THEN 'team2'
               WHEN fr.team1_penalty IS NOT NULL AND fr.team2_penalty IS NOT NULL
                    AND fr.team1_penalty > fr.team2_penalty THEN 'team1'
               WHEN fr.team1_penalty IS NOT NULL AND fr.team2_penalty IS NOT NULL
                    AND fr.team1_penalty < fr.team2_penalty THEN 'team2'
               ELSE 'draw'
             END AS actual
      FROM   fixture_results fr
      JOIN   fixtures f ON f.fixture_id = fr.fixture_id
    ),
    candidate AS (
      SELECT DISTINCT ON (gp.game_play_id)
             gp.game_play_id,
             gp.user_id,
             fin.actual,
             ga.extra_data->>'result' AS predicted
      FROM   finished fin
      JOIN   game_actions ga
             ON ga.intval = fin.match_number
            AND ga.action_type = 'submit_prediction'
      JOIN   game_plays gp
             ON gp.game_play_id = ga.game_play_id
            AND gp.game_type = ${GAME_TYPE_MATCH_PREDICTION}
      WHERE  NOT EXISTS (
               SELECT 1 FROM game_play_results r
               WHERE  r.game_play_id = gp.game_play_id
             )
      ORDER BY gp.game_play_id, ga.game_action_id DESC
    ),
    scored AS (
      SELECT game_play_id,
             user_id,
             CASE WHEN predicted = actual THEN 30 ELSE 0 END AS score
      FROM   candidate
    ),
    inserted AS (
      INSERT INTO game_play_results (game_play_id, score)
      SELECT game_play_id, score FROM scored
      ON CONFLICT (game_play_id) DO NOTHING
      RETURNING game_play_id, score
    ),
    agg AS (
      SELECT s.user_id, SUM(i.score)::bigint AS total
      FROM   inserted i
      JOIN   scored s ON s.game_play_id = i.game_play_id
      GROUP BY s.user_id
    ),
    updated AS (
      UPDATE user_numbers un
      SET    total_score = total_score + agg.total
      FROM   agg
      WHERE  un.user_id = agg.user_id
        AND  un.game_type = ${GAME_TYPE_MATCH_PREDICTION}
      RETURNING un.user_id
    )
    SELECT count(*)::int AS processed FROM inserted
  `;
  return rows[0]?.processed ?? 0;
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

  const groupRows = await sql<{ extra_data: { standings: GroupStanding[] }; action_time: Date }[]>`
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
