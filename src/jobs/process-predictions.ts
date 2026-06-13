import { processFinishedMatchPredictions } from '../db/predictions.ts';
import { hasRecentlyFinishedMatch } from '../db/standings.ts';

// Run cadence — index.ts schedules this with maintainAsyncJob. Runs every 5
// minutes, but returns immediately (no work) unless a match finished within the
// last hour, so off-match-day cycles are nearly free.
export const PROCESS_PREDICTIONS_INTERVAL_MS = 5 * 60 * 1000;

// Only do work when something actually finished — i.e. a match finished
// recently. Slightly wider than the run interval so we never miss a result that
// landed between cycles.
const RECENTLY_FINISHED_INTERVAL = '1 hour';

/**
 * Resolves match predictions for matches that have finished. Skips entirely
 * unless a fixture finished in the last hour (nothing to resolve otherwise).
 * When it runs, it scores every unresolved match prediction whose match is now
 * final and updates the players' total scores.
 */
export async function runProcessPredictionsJob(): Promise<void> {
  if (!(await hasRecentlyFinishedMatch(RECENTLY_FINISHED_INTERVAL))) {
    return; // nothing finished recently → no predictions to resolve, skip
  }

  const processed = await processFinishedMatchPredictions();
  if (processed > 0) {
    console.log(`process-predictions: ${String(processed)} match predictions resolved`);
  }
}
