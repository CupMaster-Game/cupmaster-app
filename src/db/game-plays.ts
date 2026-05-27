import type postgres from 'postgres';
import { type GameTypeId } from '../constants.ts';
import { sql, withTransaction } from './index.ts';

type Sql = postgres.Sql | postgres.ReservedSql | postgres.TransactionSql;

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export interface GamePlayRow {
  game_play_id: string;
  user_id: string;
  game_type: GameTypeId;
  tournament_id: string;
}

export interface GamePlayResultRow {
  game_play_id: string;
  ended_at: Date;
  score: number;
}

export interface TriviaQuestionPublic {
  question_id: number;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Creates a game play row inside the provided transaction.
 *
 * 1. Decrements energy (succeeds only if user has energy > 0).
 * 2. Inserts a new game_plays row.
 *
 * Returns the new game_play_id, or null if the user is out of energy. The
 * caller controls transaction scope so additional rows (e.g. the initial
 * trivia_questions game_action) can be inserted atomically with the session.
 */
export async function createGamePlay(
  tx: Sql,
  userId: string,
  gameType: GameTypeId,
  tournamentId: string,
  ipAddress: string | null
): Promise<{ game_play_id: string } | null> {
  const updated = await tx<{ energy: number }[]>`
    UPDATE user_numbers
    SET    energy = energy - 1,
           games_played = games_played + 1
    WHERE  user_id = ${userId}
      AND  game_type = ${gameType}
      AND  energy > 0
    RETURNING energy
  `;

  if (updated.length === 0) {
    return null;
  }

  const inserted = await tx<{ game_play_id: string }[]>`
    INSERT INTO game_plays (user_id, game_type, tournament_id, ip_address)
    VALUES (${userId}, ${gameType}, ${tournamentId}, ${ipAddress})
    RETURNING game_play_id
  `;

  return inserted[0] ?? null;
}

/**
 * Inserts a single game_actions row inside the provided transaction. For
 * high-frequency in-game events use bufferIngameAction instead.
 */
export async function insertGameAction(
  tx: Sql,
  gamePlayId: string,
  actionType: string,
  intval: number | null,
  textval: string | null,
  extraData: unknown
): Promise<void> {
  const extraJson =
    extraData === null || extraData === undefined ? null : JSON.stringify(extraData);
  await tx`
    INSERT INTO game_actions (game_play_id, action_time, action_type, intval, textval, extra_data)
    VALUES (${gamePlayId}, now(), ${actionType}, ${intval}, ${textval}, ${extraJson}::jsonb)
  `;
}

/**
 * Picks a fresh set of trivia questions: 4 Easy, 3 Medium, 3 Hard, in that
 * order. Correct answers are never returned to the client.
 */
export async function selectTriviaQuestions(): Promise<TriviaQuestionPublic[]> {
  const [easy, medium, hard] = await Promise.all([
    sql<TriviaQuestionPublic[]>`
      SELECT question_id, category, difficulty, question,
             option_a, option_b, option_c, option_d
      FROM   football_trivia_questions
      WHERE  difficulty = 'Easy'
      ORDER BY random()
      LIMIT  4
    `,
    sql<TriviaQuestionPublic[]>`
      SELECT question_id, category, difficulty, question,
             option_a, option_b, option_c, option_d
      FROM   football_trivia_questions
      WHERE  difficulty = 'Medium'
      ORDER BY random()
      LIMIT  3
    `,
    sql<TriviaQuestionPublic[]>`
      SELECT question_id, category, difficulty, question,
             option_a, option_b, option_c, option_d
      FROM   football_trivia_questions
      WHERE  difficulty = 'Hard'
      ORDER BY random()
      LIMIT  3
    `,
  ]);
  return [...easy, ...medium, ...hard];
}

export type EndGamePlayError =
  | 'invalid_session' // not found, wrong user, or already ended
  | 'session_expired'; // active play time exceeded 30-min cap

export type EndGamePlayOutcome =
  | { ok: true; result: GamePlayResultRow }
  | { ok: false; error: EndGamePlayError };

/**
 * Computes a trivia game's final score: 10 points per correct answer to a
 * question that was selected at start. Answers for non-selected questions
 * and duplicate answers for the same question are ignored.
 */
async function computeTriviaScore(gamePlayId: string): Promise<number> {
  const rows = await sql<{ correct: number }[]>`
    WITH trivia_action AS (
      SELECT extra_data
      FROM   game_actions
      WHERE  game_play_id = ${gamePlayId}
        AND  action_type = 'trivia_questions'
      ORDER BY game_action_id ASC
      LIMIT  1
    ),
    selected_ids AS (
      SELECT (jsonb_array_elements_text(extra_data->'question_ids'))::int AS question_id
      FROM   trivia_action
    )
    SELECT COUNT(DISTINCT ga.intval)::int AS correct
    FROM   game_actions ga
    JOIN   selected_ids s            ON s.question_id = ga.intval
    JOIN   football_trivia_questions q ON q.question_id = ga.intval
    WHERE  ga.game_play_id = ${gamePlayId}
      AND  ga.action_type = 'trivia_answer'
      AND  ga.textval     = q.correct_answer
  `;
  return (rows[0]?.correct ?? 0) * 10;
}

/**
 * Ends a game play session.
 * On success inserts a game_play_results row and updates user_numbers (total_score).
 */
export async function endGamePlay(gamePlayId: string, userId: string): Promise<EndGamePlayOutcome> {
  await flushIngameActions();

  const gameTypeRows = await sql<{ game_type: GameTypeId }[]>`
    SELECT game_type
    FROM   game_plays
    WHERE  game_play_id = ${gamePlayId}
      AND  user_id = ${userId}
  `;
  const gameType = gameTypeRows[0]?.game_type;
  if (gameType === undefined) {
    return { ok: false, error: 'invalid_session' };
  }

  let score = 0;
  if (gameType === 101) {
    score = await computeTriviaScore(gamePlayId);
  }
  // Other game types have no scoring rules yet.

  const result = await withTransaction(async (tx) => {
    // Atomic insert: succeeds only if the game_play exists with the right
    // user and no result row exists yet. PK on game_play_results prevents
    // double-end races.
    const inserted = await tx<GamePlayResultRow[]>`
      INSERT INTO game_play_results (game_play_id, score)
      SELECT ${gamePlayId}, ${score}
      WHERE EXISTS (
        SELECT 1 FROM game_plays
        WHERE game_play_id = ${gamePlayId}
          AND user_id = ${userId}
      )
      ON CONFLICT (game_play_id) DO NOTHING
      RETURNING game_play_id, ended_at, score
    `;

    if (inserted.length === 0) {
      return null;
    }

    await tx`
      UPDATE user_numbers
      SET    total_score = total_score + ${score}
      FROM   game_plays gp
      WHERE  user_numbers.user_id = ${userId}
        AND  gp.game_play_id = ${gamePlayId}
        AND  gp.game_type = ${gameType}
    `;

    return inserted[0] ?? null;
  });

  if (!result) {
    return { ok: false, error: 'invalid_session' };
  }
  return { ok: true, result };
}

// ---------------------------------------------------------------------------
// In-game events: buffered batch insert
//
// The /game/event endpoint is high-frequency,
// so we don't write per-request. Events are pushed into an in-memory buffer
// and flushed by a 1s timer (see index.ts)
// ---------------------------------------------------------------------------

interface BufferedIngameAction {
  game_play_id: string;
  action_time: Date;
  action_type: string;
  intval: number | null;
  textval: string | null;
  extra_data_json: string | null;
}

let ingameActionBuffer: BufferedIngameAction[] = [];
let flushInFlight: Promise<void> | null = null;

export function bufferIngameAction(
  gamePlayId: string,
  actionType: string,
  intval: number | null,
  textval: string | null,
  extraData: unknown
): { action_time: Date } {
  const action_time = new Date();
  ingameActionBuffer.push({
    game_play_id: gamePlayId,
    action_time,
    action_type: actionType,
    intval,
    textval,
    extra_data_json:
      extraData === null || extraData === undefined ? null : JSON.stringify(extraData),
  });
  return { action_time };
}

async function doFlushIngameActions(): Promise<void> {
  if (ingameActionBuffer.length === 0) return;
  const batch = ingameActionBuffer;
  ingameActionBuffer = [];

  try {
    await sql`
      INSERT INTO game_actions (game_play_id, action_time, action_type, intval, textval, extra_data)
      SELECT t.game_play_id::bigint,
             t.action_time::timestamptz,
             t.action_type,
             t.intval::int,
             t.textval,
             t.extra_data::jsonb
      FROM   UNNEST(
               ${batch.map((e) => e.game_play_id)}::text[],
               ${sql.array(batch.map((e) => e.action_time))}::timestamptz[],
               ${batch.map((e) => e.action_type)}::text[],
               ${batch.map((e) => e.intval)}::int[],
               ${batch.map((e) => e.textval)}::text[],
               ${batch.map((e) => e.extra_data_json)}::text[]
             ) AS t(game_play_id, action_time, action_type, intval, textval, extra_data)
      WHERE  EXISTS (
               SELECT 1 FROM game_plays gp
               WHERE  gp.game_play_id = t.game_play_id::bigint
             )
        AND  NOT EXISTS (
               SELECT 1 FROM game_play_results gpr
               WHERE  gpr.game_play_id = t.game_play_id::bigint
             )
    `;
  } catch (err) {
    console.error('flush ingame events failed:', err);
  }
}

/**
 * Flushes the in-game event buffer. Concurrent calls share a single in-flight
 * flush so the bulk insert never overlaps itself.
 */
export function flushIngameActions(): Promise<void> {
  if (flushInFlight) return flushInFlight;
  flushInFlight = doFlushIngameActions().finally(() => {
    flushInFlight = null;
  });
  return flushInFlight;
}

/**
 * Gets the active tournament
 */
export async function getActiveTournament(): Promise<string> {
  const result = await sql<{ tournament_id: string }[]>`
    SELECT tournament_id
    FROM   tournaments
    WHERE  tournament_start_date <= now() AND tournament_end_date >= now()
  `;

  if (result[0] == null) {
    throw new Error('Failed to fetch active tournament');
  }

  return result[0].tournament_id;
}
