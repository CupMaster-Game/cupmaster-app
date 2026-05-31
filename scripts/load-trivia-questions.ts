/**
 * Loads football_trivia_500.csv into the football_trivia_questions table.
 *
 * Idempotent via ON CONFLICT (question_id) DO NOTHING — re-running won't
 * duplicate rows. Run after `docker compose up postgres` has initialised the
 * schema.
 *
 * Run:
 *   node --experimental-strip-types scripts/load-trivia-questions.ts
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import postgres from 'postgres';

loadDotenv();

const PROJECT_ROOT = resolve(import.meta.dirname, '..');
const CSV_PATH = resolve(PROJECT_ROOT, 'football_trivia_500.csv');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

interface Row {
  question_id: number;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
}

// Minimal RFC-4180 CSV parser — handles quoted fields, embedded commas,
// escaped quotes ("" -> "), and \r\n / \n line endings. Keeps the script
// dependency-free.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        rows.push(row);
        field = '';
        row = [];
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function assertDifficulty(v: string): 'Easy' | 'Medium' | 'Hard' {
  if (v === 'Easy' || v === 'Medium' || v === 'Hard') return v;
  throw new Error(`Invalid difficulty: ${v}`);
}

function assertAnswer(v: string): 'A' | 'B' | 'C' | 'D' {
  if (v === 'A' || v === 'B' || v === 'C' || v === 'D') return v;
  throw new Error(`Invalid correct_answer: ${v}`);
}

async function main(): Promise<void> {
  console.log(`[1/3] Reading ${CSV_PATH}...`);
  const text = await readFile(CSV_PATH, 'utf8');
  const grid = parseCsv(text).filter((r) => r.some((c) => c.length > 0));
  if (grid.length === 0) {
    throw new Error('CSV is empty');
  }
  const [header, ...dataRows] = grid;
  const expectedHeader = [
    'question_id',
    'category',
    'difficulty',
    'question',
    'option_a',
    'option_b',
    'option_c',
    'option_d',
    'correct_answer',
  ];
  if (header!.length !== expectedHeader.length || header!.some((h, i) => h !== expectedHeader[i])) {
    throw new Error(`Unexpected CSV header: ${JSON.stringify(header)}`);
  }

  const rows: Row[] = dataRows.map((cols, i) => {
    if (cols.length !== expectedHeader.length) {
      throw new Error(`Row ${(i + 2).toString()} has ${cols.length.toString()} columns, expected ${expectedHeader.length.toString()}`);
    }
    return {
      question_id: Number(cols[0]),
      category: cols[1]!,
      difficulty: assertDifficulty(cols[2]!),
      question: cols[3]!,
      option_a: cols[4]!,
      option_b: cols[5]!,
      option_c: cols[6]!,
      option_d: cols[7]!,
      correct_answer: assertAnswer(cols[8]!),
    };
  });
  console.log(`        -> parsed ${rows.length.toString()} rows`);

  console.log('[2/3] Connecting to database...');
  const sql = postgres(DATABASE_URL, { max: 4, idle_timeout: 5 });

  console.log('[3/3] Inserting rows...');
  try {
    const inserted = await sql`
      INSERT INTO football_trivia_questions
        (question_id, category, difficulty, question, option_a, option_b, option_c, option_d, correct_answer)
      SELECT * FROM UNNEST(
        ${rows.map((r) => r.question_id)}::int[],
        ${rows.map((r) => r.category)}::text[],
        ${rows.map((r) => r.difficulty)}::text[],
        ${rows.map((r) => r.question)}::text[],
        ${rows.map((r) => r.option_a)}::text[],
        ${rows.map((r) => r.option_b)}::text[],
        ${rows.map((r) => r.option_c)}::text[],
        ${rows.map((r) => r.option_d)}::text[],
        ${rows.map((r) => r.correct_answer)}::text[]
      )
      ON CONFLICT (question_id) DO NOTHING
      RETURNING question_id
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
