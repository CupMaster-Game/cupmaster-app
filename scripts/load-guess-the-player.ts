/**
 * Loads guess_the_player.json into the guess_the_player_data table.
 *
 * Idempotent via ON CONFLICT (player_id) DO NOTHING — re-running won't
 * duplicate rows. Run after `docker compose up postgres` has initialised the
 * schema.
 *
 * Run:
 *   node --experimental-strip-types scripts/load-guess-the-player.ts
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import postgres from 'postgres';

loadDotenv();

const PROJECT_ROOT = resolve(import.meta.dirname, '..');
const JSON_PATH = resolve(PROJECT_ROOT, 'guess_the_player.json');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

interface PlayerEntry {
  player: string;
  hints: string[];
}

interface Row {
  player_id: number;
  player: string;
  hint_1: string;
  hint_2: string;
  hint_3: string;
  hint_4: string;
  hint_5: string;
}

// The JSON file has a nested sub-array mixed into the top-level array
// (entries 31+ are wrapped in an inner [ ... ]). Flatten one level so the
// caller sees a uniform list of player entries.
function flatten(input: unknown): PlayerEntry[] {
  if (!Array.isArray(input)) {
    throw new Error('Top-level JSON must be an array');
  }
  const out: PlayerEntry[] = [];
  for (const item of input) {
    if (Array.isArray(item)) {
      for (const inner of item) out.push(assertEntry(inner));
    } else {
      out.push(assertEntry(item));
    }
  }
  return out;
}

function assertEntry(v: unknown): PlayerEntry {
  if (
    typeof v !== 'object' ||
    v === null ||
    typeof (v as PlayerEntry).player !== 'string' ||
    !Array.isArray((v as PlayerEntry).hints) ||
    (v as PlayerEntry).hints.length !== 5 ||
    !(v as PlayerEntry).hints.every((h) => typeof h === 'string')
  ) {
    throw new Error(`Invalid player entry: ${JSON.stringify(v)}`);
  }
  return v as PlayerEntry;
}

async function main(): Promise<void> {
  console.log(`[1/3] Reading ${JSON_PATH}...`);
  const text = await readFile(JSON_PATH, 'utf8');
  const entries = flatten(JSON.parse(text));
  const rows: Row[] = entries.map((entry, i) => ({
    player_id: i + 1,
    player: entry.player,
    hint_1: entry.hints[0]!,
    hint_2: entry.hints[1]!,
    hint_3: entry.hints[2]!,
    hint_4: entry.hints[3]!,
    hint_5: entry.hints[4]!,
  }));
  console.log(`        -> parsed ${rows.length.toString()} entries`);

  console.log('[2/3] Connecting to database...');
  const sql = postgres(DATABASE_URL, { max: 4, idle_timeout: 5 });

  console.log('[3/3] Inserting rows...');
  try {
    const inserted = await sql`
      INSERT INTO guess_the_player_data
        (player_id, player, hint_1, hint_2, hint_3, hint_4, hint_5)
      SELECT * FROM UNNEST(
        ${rows.map((r) => r.player_id)}::int[],
        ${rows.map((r) => r.player)}::text[],
        ${rows.map((r) => r.hint_1)}::text[],
        ${rows.map((r) => r.hint_2)}::text[],
        ${rows.map((r) => r.hint_3)}::text[],
        ${rows.map((r) => r.hint_4)}::text[],
        ${rows.map((r) => r.hint_5)}::text[]
      )
      ON CONFLICT (player_id) DO NOTHING
      RETURNING player_id
    `;
    console.log(`        -> inserted ${inserted.length.toString()} new rows (${(rows.length - inserted.length).toString()} already existed)`);
  } finally {
    await sql.end();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
