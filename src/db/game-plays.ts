import type postgres from 'postgres';
import { type GameTypeId } from '../constants.ts';
import { sql, withTransaction } from './index.ts';

// Match-the-Flag deck sizes. Each level uses N unique team flags, with every
// flag appearing twice in the shuffled deck, so the deck has 2*N entries.
export const MATCH_THE_FLAG_PAIRS_PER_LEVEL = [8, 15, 24] as const;
const MATCH_THE_FLAG_MAX_PAIRS = Math.max(...MATCH_THE_FLAG_PAIRS_PER_LEVEL);
const MATCH_THE_FLAG_POINTS_PER_PAIR = 2;

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

export interface MatchTheFlagTeam {
  team_id: string;
  team_name: string;
  logo: string;
}

export interface MatchTheFlagDeck {
  level1: string[];
  level2: string[];
  level3: string[];
}

export interface MatchTheFlagStart {
  selected_flags: MatchTheFlagDeck;
  teams: MatchTheFlagTeam[];
}

function buildDeck(teamIds: readonly string[], pairs: number): string[] {
  const withKeys = [...teamIds.slice(0, pairs), ...teamIds.slice(0, pairs)].map(
    (id) => ({ id, k: Math.random() })
  );
  withKeys.sort((a, b) => a.k - b.k);
  return withKeys.map((e) => e.id);
}

/**
 * Picks a random set of teams to use as Match-the-Flag pairs and builds a
 * shuffled deck for each level. Each level's deck is `2 * pairs` entries,
 * with every team_id appearing exactly twice. The same team pool is reused
 * across levels (each level just takes a prefix).
 */
export async function buildMatchTheFlagStart(): Promise<MatchTheFlagStart> {
  const teams = await sql<MatchTheFlagTeam[]>`
    SELECT team_id, team_name, logo
    FROM   teams
    ORDER BY random()
    LIMIT  ${MATCH_THE_FLAG_MAX_PAIRS}
  `;
  if (teams.length < MATCH_THE_FLAG_MAX_PAIRS) {
    throw new Error(
      `Not enough teams for Match the Flag (need ${MATCH_THE_FLAG_MAX_PAIRS.toString()}, got ${teams.length.toString()})`
    );
  }
  const teamIds = teams.map((t) => t.team_id);
  const [pairs1, pairs2, pairs3] = MATCH_THE_FLAG_PAIRS_PER_LEVEL;
  return {
    selected_flags: {
      level1: buildDeck(teamIds, pairs1),
      level2: buildDeck(teamIds, pairs2),
      level3: buildDeck(teamIds, pairs3),
    },
    teams,
  };
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
 * Computes a Match-the-Flag game's final score: 2 points per validly matched
 * pair across all 3 levels. A "valid" match is a flag_match action whose two
 * indexes point at the same team_id within the level's deck stored in the
 * selected_flags action. Duplicate (same-pair) match actions are deduped so
 * they only score once.
 */
async function computeMatchTheFlagScore(gamePlayId: string): Promise<number> {
  const rows = await sql<{ action_type: string; extra_data: unknown }[]>`
    SELECT action_type, extra_data
    FROM   game_actions
    WHERE  game_play_id = ${gamePlayId}
      AND  action_type IN ('selected_flags', 'flag_match')
    ORDER BY game_action_id ASC
  `;

  let decks: Record<string, unknown[]> | null = null;
  // Dedupe matches by "level:minIdx:maxIdx" so the same pair only ever scores
  // once even if the client somehow sent it twice.
  const counted = new Set<string>();
  let pairs = 0;

  for (const row of rows) {
    if (row.action_type === 'selected_flags') {
      if (decks !== null) continue; // use the first selected_flags row only
      const data = row.extra_data;
      if (data && typeof data === 'object') {
        decks = data as Record<string, unknown[]>;
      }
      continue;
    }
    // flag_match
    if (!decks) continue;
    const data = row.extra_data;
    if (!data || typeof data !== 'object') continue;
    const { level, matching_indexes } = data as {
      level?: unknown;
      matching_indexes?: unknown;
    };
    if (typeof level !== 'number' || !Array.isArray(matching_indexes)) continue;
    const indexes = matching_indexes as unknown[];
    if (indexes.length < 2) continue;
    const rawA = indexes[0];
    const rawB = indexes[1];
    if (typeof rawA !== 'number' || typeof rawB !== 'number') continue;
    if (rawA === rawB) continue;
    const idxA = Math.min(rawA, rawB);
    const idxB = Math.max(rawA, rawB);
    const deck = decks['level' + level.toString()];
    if (!Array.isArray(deck)) continue;
    if (idxA < 0 || idxB >= deck.length) continue;
    const key = level.toString() + ':' + idxA.toString() + ':' + idxB.toString();
    if (counted.has(key)) continue;
    counted.add(key);
    if (deck[idxA] === deck[idxB]) {
      pairs += 1;
    }
  }

  return pairs * MATCH_THE_FLAG_POINTS_PER_PAIR;
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
  } else if (gameType === 103) {
    score = await computeMatchTheFlagScore(gamePlayId);
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
