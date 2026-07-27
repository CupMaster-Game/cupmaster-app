import type postgres from 'postgres';
import { sql } from './index.ts';

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export interface UnprocessedTournamentRow {
  tournament_id: string;
  tournament_start_date: string; // YYYY-MM-DD (UTC)
  tournament_end_date: string; // YYYY-MM-DD (UTC)
}

export interface RankedPlayerRow {
  user_id: string;
  address: string;
  total_score: number;
  rank: number;
}

export interface PreviousResultRow {
  revenue: string; // NUMERIC → string
  inherited_revenue: string;
  used_for_payout: string;
}

export interface PayoutInsert {
  user_id: string;
  action_id: string;
  amount: string;
  payment_token: number;
  signature: string;
}

// ---------------------------------------------------------------------------
// Queries — every function takes a `tx` (postgres.Sql) so the caller controls
// the transaction. The job runs the whole sequence inside one transaction
// guarded by an advisory lock keyed on the tournament id.
// ---------------------------------------------------------------------------

type Sql = postgres.Sql | postgres.ReservedSql | postgres.TransactionSql;

/**
 * Returns the oldest tournament that is finished (end date < now) but has not yet had its results processed
 */
export async function findOldestUnprocessedTournament(): Promise<UnprocessedTournamentRow | null> {
  const rows = await sql<UnprocessedTournamentRow[]>`
    SELECT t.tournament_id, t.tournament_start_date, t.tournament_end_date
    FROM   tournaments t
    WHERE  t.tournament_end_date < now()
      AND  NOT EXISTS (
        SELECT 1 FROM tournament_results tr
        WHERE  tr.tournament_id = t.tournament_id
      )
    ORDER BY t.tournament_start_date ASC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Computes per-user total scores for the tournament, ranks them with
 * RANK() and inserts into tournament_total_scores.
 * Excludes plays that never produced a result row, and excludes banned users
 * before ranking so the resulting ranks have no gaps and downstream payouts
 * never target a banned address.
 */
export async function insertTournamentTotalScores(tx: Sql, tournamentId: string): Promise<void> {
  // We assign tournament_score_id explicitly instead of relying on the
  // generate_id() column default. That default calls generate_id() once per row,
  // and every row of this bulk insert lands in the same millisecond, so they
  // share the 42-bit timestamp and differ only in 21 random bits — a birthday
  // collision on the PK becomes likely as the user count grows. Here we keep the
  // k-ordered timestamp in the high bits but fill the low 21 bits from a single
  // per-batch random base plus a ROW_NUMBER(), which is collision-free within the
  // batch (up to 2^21 users) and stays unique across batches via the random base.
  await tx`
    INSERT INTO tournament_total_scores (tournament_score_id, user_id, tournament_id, total_score, rank)
    SELECT (b.base_ms << 21)
           | ((b.base_rand + ROW_NUMBER() OVER (ORDER BY t.total_score DESC, t.user_id) - 1) & 2097151),
           t.user_id, ${tournamentId}, t.total_score, t.rank
    FROM (
      SELECT gp.user_id,
             SUM(gpr.score + play_bonus.points)::int AS total_score,
             RANK() OVER (ORDER BY SUM(gpr.score + play_bonus.points) DESC)::int AS rank
      FROM   game_plays gp
      JOIN   game_play_results gpr ON gpr.game_play_id = gp.game_play_id
      JOIN   users_with_data u ON u.user_id = gp.user_id
      CROSS JOIN LATERAL (
        SELECT CASE gp.game_type
                 WHEN 201 THEN 10
                 WHEN 202 THEN 350
                 WHEN 203 THEN 350
                 ELSE 0
               END AS points
      ) AS play_bonus
      WHERE  gp.tournament_id = ${tournamentId}
        AND  NOT u.is_banned
      GROUP BY gp.user_id
    ) t
    CROSS JOIN (
      SELECT (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint & x'3ffffffffff'::bigint AS base_ms,
             floor(random() * 2097152)::bigint AS base_rand
    ) b
  `;
}

/**
 * Top 25 ranked players for the given tournament date, joined with their
 * on-chain address. Order by rank ascending, ties broken by user_id for a
 * deterministic order.
 */
export async function fetchTopRankedPlayers(
  tx: Sql,
  tournamentId: string
): Promise<RankedPlayerRow[]> {
  return tx<RankedPlayerRow[]>`
    SELECT dts.user_id,
           u.address,
           dts.total_score,
           dts.rank
    FROM   tournament_total_scores dts
    JOIN   users u ON u.user_id = dts.user_id
    WHERE  dts.tournament_id = ${tournamentId}
      AND  dts.rank <= 25
    ORDER BY dts.rank, dts.user_id
  `;
}

/**
 * Sum of `revenue` from user_transactions with tx_time inside the tournament period.
 */
export async function fetchTournamentRevenue(tx: Sql, tournamentId: string): Promise<string> {
  const rows = await tx<{ revenue: string }[]>`
    SELECT COALESCE(SUM(revenue), 0)::text AS revenue
    FROM   user_transactions
    WHERE  tx_time >= (SELECT t.tournament_start_date FROM tournaments t WHERE t.tournament_id = ${tournamentId})
      AND  tx_time <  (SELECT t.tournament_end_date FROM tournaments t WHERE t.tournament_id = ${tournamentId})
  `;
  return rows[0]?.revenue ?? '0';
}

/**
 * Returns the most recent processed tournament strictly before the given tournament,
 * — looking up the latest prior result
 * Safe to use because the job drains tournaments oldest-first, so by the time
 */
export async function fetchPreviousTournamentResult(
  tx: Sql,
  tournamentId: string
): Promise<PreviousResultRow | null> {
  const rows = await tx<PreviousResultRow[]>`
    SELECT dtr.revenue::text         AS revenue,
           dtr.inherited_revenue::text AS inherited_revenue,
           dtr.used_for_payout::text AS used_for_payout
    FROM   tournaments dt
    JOIN   tournament_results dtr ON dtr.tournament_id = dt.tournament_id
    WHERE  dt.tournament_id < ${tournamentId}
    ORDER BY dt.tournament_start_date DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function insertUserPayouts(
  tx: Sql,
  tournamentId: string,
  payouts: PayoutInsert[]
): Promise<void> {
  if (payouts.length === 0) return;
  await tx`
    INSERT INTO user_payouts (user_id, payout_type, action_id, amount, payment_token, signature, tournament_id)
    SELECT t.user_id::bigint,
           'tournament_reward',
           t.action_id,
           t.amount::numeric,
           t.payment_token::smallint,
           t.signature,
           ${tournamentId}::bigint
    FROM UNNEST(
      ${payouts.map((p) => p.user_id)}::text[],
      ${payouts.map((p) => p.action_id)}::text[],
      ${payouts.map((p) => p.amount)}::text[],
      ${payouts.map((p) => p.payment_token)}::int[],
      ${payouts.map((p) => p.signature)}::text[]
    ) AS t(user_id, action_id, amount, payment_token, signature)
  `;
}

export async function insertTournamentResult(
  tx: Sql,
  tournamentId: string,
  revenue: string,
  inheritedRevenue: string,
  usedForPayout: string
): Promise<void> {
  await tx`
    INSERT INTO tournament_results
      (tournament_id, revenue, inherited_revenue, used_for_payout)
    VALUES
      (${tournamentId}, ${revenue}::numeric, ${inheritedRevenue}::numeric, ${usedForPayout}::numeric)
  `;
}
