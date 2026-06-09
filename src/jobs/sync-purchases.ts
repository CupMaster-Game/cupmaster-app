import fs from 'node:fs/promises';
import { formatUnits } from 'viem';
import { GAME_TYPE_IDS, PAYMENT_TOKENS } from '../constants.ts';
import { findExistingTxHashes, processPurchase } from '../db/purchases.ts';
import { findUserIdByAddress } from '../db/users.ts';
import { getBlock, getBlockNumber, getItemBoughtLogs } from '../utils/celo-rpc-reader.ts';

// Run cadence — index.ts schedules this with maintainAsyncJob.
export const SYNC_PURCHASES_INTERVAL_MS = 30 * 1000;

// File holding the next block to scan from. If it doesn't exist we start from
// START_BLOCK (the block around which the contract started being used).
const LAST_BLOCK_FILE = './data/sync-purchases-last-block.txt';
const START_BLOCK = 67814440n;
// Cap the per-run scan window so a single getLogs stays small and fast.
const MAX_BLOCKS = 2000n;

const VALID_ITEM_TYPES = new Set<number>(GAME_TYPE_IDS);

type ItemBoughtLog = Awaited<ReturnType<typeof getItemBoughtLogs>>[number];

async function readNextBlock(): Promise<bigint> {
  try {
    const content = await fs.readFile(LAST_BLOCK_FILE, 'utf8');
    return BigInt(content.trim());
  } catch {
    return START_BLOCK;
  }
}

async function writeNextBlock(block: bigint): Promise<void> {
  await fs.mkdir('./data', { recursive: true });
  await fs.writeFile(LAST_BLOCK_FILE, block.toString());
}

/**
 * Recovers purchases whose ItemBought transaction never made it into
 * user_transactions (e.g. the frontend's /purchase/submit call failed). Scans
 * up to MAX_BLOCKS blocks of ItemBought events per run, looks up which tx
 * hashes are already recorded in a single query, and processes the rest one by
 * one — mirroring the /purchase/submit endpoint.
 */
export async function runSyncPurchasesJob(): Promise<void> {
  const fromBlock = await readNextBlock();
  const latest = (await getBlockNumber()) - 5n;
  if (fromBlock > latest) return;

  const maxToBlock = fromBlock + MAX_BLOCKS - 1n;
  const toBlock = latest < maxToBlock ? latest : maxToBlock;

  console.log(`sync-purchases: scanning blocks [${fromBlock}, ${toBlock}]`);

  const logs = await getItemBoughtLogs(fromBlock, toBlock);

  if (logs.length > 0) {
    const txHashes = [...new Set(logs.map((l) => l.transactionHash))];
    const processed = await findExistingTxHashes(txHashes);

    for (const log of logs) {
      if (processed.has(log.transactionHash)) continue;
      await processMissingPurchase(log);
      // Guard against duplicate ItemBought logs within the same batch.
      processed.add(log.transactionHash);
    }
  }

  await writeNextBlock(toBlock + 1n);
}

async function processMissingPurchase(log: ItemBoughtLog): Promise<void> {
  const txHash = log.transactionHash;
  const itemTypeId = Number(log.args.itemTypeId);
  const buyer = log.args.buyer.toLowerCase();

  console.log(`sync-purchases: buyer ${buyer} tx ${txHash} (item ${String(itemTypeId)})`);

  if (!VALID_ITEM_TYPES.has(itemTypeId)) {
    console.warn(`sync-purchases: skipping ${txHash} — invalid item type ${String(itemTypeId)}`);
    return;
  }

  const userId = await findUserIdByAddress(buyer);
  if (!userId) {
    console.warn(`sync-purchases: skipping ${txHash} — no user for buyer ${buyer}`);
    return;
  }

  const block = await getBlock(log.blockNumber);
  const txTime = new Date(Number(block.timestamp) * 1000);

  const price = log.args.price.toString();
  const eventParams = {
    itemTypeId,
    buyer,
    paymentToken: log.args.paymentToken,
    price,
  };

  const paymentToken = Object.values(PAYMENT_TOKENS).find(
    (t) => t.address.toLowerCase() === log.args.paymentToken.toLowerCase()
  );
  const revenue = paymentToken ? formatUnits(log.args.price, paymentToken.decimals) : '0';

  const result = await processPurchase(userId, txHash, txTime, revenue, itemTypeId, eventParams);
  console.log(
    `sync-purchases: recovered purchase ${txHash} (item ${String(itemTypeId)}) -> tx ${result.transaction_id}`
  );
}
