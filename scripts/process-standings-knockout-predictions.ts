/**
 * Manual resolver for group-standings and knockout-bracket predictions.
 *
 * Unlike single-match predictions (resolved automatically by the
 * process-predictions job), group (game_type 202) and knockout (game_type 203)
 * predictions are scored on demand by running this script:
 *   - group predictions after the group stage is complete (team_standings final),
 *   - knockout predictions once knockout results are in.
 *
 * Both underlying functions are idempotent (each game_play is scored at most
 * once), so re-running is safe — knockout can be re-run as more rounds finish.
 *
 * Run (after `dotenv` vars are set):
 *   node --experimental-strip-types scripts/process-standings-knockout-predictions.ts
 *
 * Requires env: DATABASE_URL (see src/config.ts).
 */

import { sql } from '../src/db/index.ts';
import { processGroupPredictions, processKnockoutPredictions } from '../src/db/predictions.ts';

async function main(): Promise<void> {
  try {
    const groups = await processGroupPredictions();
    console.log(`process-predictions: ${String(groups)} group prediction(s) resolved`);

    const knockouts = await processKnockoutPredictions();
    console.log(`process-predictions: ${String(knockouts)} knockout prediction(s) resolved`);
  } finally {
    await sql.end();
  }
}

main().catch((err: unknown) => {
  console.error('process-standings-knockout-predictions: failed', err);
  process.exit(1);
});
