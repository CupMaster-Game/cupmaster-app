import type postgres from 'postgres';
import { withTransaction } from '../db/index.ts';

type Sql = postgres.Sql | postgres.ReservedSql | postgres.TransactionSql;

export async function banSuspiciousUsers(tournamentId: string, tx?: Sql): Promise<string[]> {
  if (tx) {
    return runBan(tx, tournamentId);
  }
  return withTransaction((t) => runBan(t, tournamentId));
}

async function runBan(tx: Sql, tournamentId: string): Promise<string[]> {
  //TODO: To be implemented later
  return [];
}
