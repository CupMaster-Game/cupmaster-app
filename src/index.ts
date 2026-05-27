import { flushIngameActions } from './db/game-plays.ts';
import { FETCH_FIXTURES_INTERVAL_MS, runFetchFixturesJob } from './jobs/fetch-fixtures.ts';
import {
  PROCESS_TOURNAMENT_INTERVAL_MS,
  runProcessTournamentJob,
} from './jobs/process-tournament.ts';
import { maintainAsyncJob } from './utils/index.ts';
import { startWebServer } from './webserver/index.ts';

maintainAsyncJob(flushIngameActions, 1_000).catch((err: unknown) => {
  console.error('flush ingame events error:', err);
  process.exit(1);
});

maintainAsyncJob(runProcessTournamentJob, PROCESS_TOURNAMENT_INTERVAL_MS).catch((err: unknown) => {
  console.error('Process tournament job error:', err);
  process.exit(1);
});

maintainAsyncJob(runFetchFixturesJob, FETCH_FIXTURES_INTERVAL_MS).catch((err: unknown) => {
  console.error('Fetch fixtures job error:', err);
  process.exit(1);
});

startWebServer().catch((err: unknown) => {
  console.error('webserver error:', err);
  process.exit(1);
});
