import { dateFromId } from '../utils/index.ts';
import { sql, withTransaction } from './index.ts';
import { type GameTypeId } from '../constants.ts';

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

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Starts a game play session. Transactionally:
 * 1. Checks that user has energy > 0
 * 2. Decrements energy by 1
 * 3. Inserts a new game_plays row
 *
 * Returns the new game play row, or null if energy is 0.
 */
export async function startGamePlay(
  userId: string,
  tournamentId: string,
  gameType: GameTypeId,
  ipAddress: string | null
): Promise<GamePlayRow | null> {
  return withTransaction(async (tx) => {
    // Decrement energy and increment games_played atomically;
    // the WHERE energy > 0 prevents going below zero.
    const updated = await tx<{ energy: number }[]>`
      UPDATE user_numbers
      SET    energy = energy - 1,
             games_played = games_played + 1,
             updated_at = now()
      WHERE  user_id = ${userId}
        AND  game_type = ${gameType}
        AND  energy > 0
      RETURNING energy
    `;

    if (updated.length === 0) {
      return null;
    }

    const inserted = await tx<GamePlayRow[]>`
      INSERT INTO game_plays (user_id, game_type, tournament_id, ip_address)
      VALUES (${userId}, ${gameType}, ${tournamentId}, ${ipAddress})
      RETURNING game_play_id, user_id, game_type, tournament_id
    `;

    return inserted[0] ?? null;
  });
}

export type EndGamePlayError =
  | 'invalid_session' // not found, wrong user, or already ended
  | 'session_expired' // active play time exceeded 30-min cap

export type EndGamePlayOutcome =
  | { ok: true; result: GamePlayResultRow }
  | { ok: false; error: EndGamePlayError };

/**
 * Ends a game play session.
 * On success inserts a game_play_results row and updates user_numbers (total_score).
 */
export async function endGamePlay(
  gamePlayId: string,
  userId: string,
): Promise<EndGamePlayOutcome> {
  const startedAt = dateFromId(gamePlayId);
  await flushIngameEvents();
  const gameType = 101; // TODO: get the type from game_plays row

  // TODO: game_type-specific validation rules
  // Also score calculation should be server-side based on the events
  const score = 1; // placeholder until we implement server-side scoring

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
      SET
             total_score       = total_score + ${score},
             updated_at        = now()
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

interface BufferedIngameEvent {
  game_play_id: string;
  event_time: Date;
  event_type: string;
  intval: number | null;
  textval: string | null;
  extra_data_json: string | null;
}

let ingameEventBuffer: BufferedIngameEvent[] = [];
let flushInFlight: Promise<void> | null = null;

export function bufferIngameEvent(
  gamePlayId: string,
  eventType: string,
  intval: number | null,
  textval: string | null,
  extraData: unknown
): { event_time: Date } {
  const event_time = new Date();
  ingameEventBuffer.push({
    game_play_id: gamePlayId,
    event_time,
    event_type: eventType,
    intval,
    textval,
    extra_data_json:
      extraData === null || extraData === undefined ? null : JSON.stringify(extraData),
  });
  return { event_time };
}

async function doFlushIngameEvents(): Promise<void> {
  if (ingameEventBuffer.length === 0) return;
  const batch = ingameEventBuffer;
  ingameEventBuffer = [];

  try {
    await sql`
      INSERT INTO game_ingame_events (game_play_id, event_time, event_type, intval, textval, extra_data)
      SELECT t.game_play_id::bigint,
             t.event_time::timestamptz,
             t.event_type,
             t.intval::int,
             t.textval,
             t.extra_data::jsonb
      FROM   UNNEST(
               ${batch.map((e) => e.game_play_id)}::text[],
               ${sql.array(batch.map((e) => e.event_time))}::timestamptz[],
               ${batch.map((e) => e.event_type)}::text[],
               ${batch.map((e) => e.intval)}::int[],
               ${batch.map((e) => e.textval)}::text[],
               ${batch.map((e) => e.extra_data_json)}::text[]
             ) AS t(game_play_id, event_time, event_type, intval, textval, extra_data)
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
export function flushIngameEvents(): Promise<void> {
  if (flushInFlight) return flushInFlight;
  flushInFlight = doFlushIngameEvents().finally(() => {
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
    throw new Error("Failed to fetch active tournament");
  }

  return result[0].tournament_id;
}
