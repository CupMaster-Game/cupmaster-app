import type { Chain, GetTransactionReceiptReturnType } from 'viem';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { celo } from 'viem/chains';
import cupmasterGameAbi from '../abis/cupmaster-game.abi.ts';
import { CUPMASTER_GAME_ADDRESS, rpcUrls } from '../constants.ts';

const clients = rpcUrls.map((url: string) =>
  createPublicClient({ chain: celo, transport: http(url) })
);

const ITEM_BOUGHT_EVENT = parseAbiItem(
  'event ItemBought(uint256 indexed itemTypeId, address indexed buyer, address paymentToken, uint256 price)'
);

export async function getTransactionReceipt(
  hash: `0x${string}`
): Promise<GetTransactionReceiptReturnType<Chain>> {
  for (const client of clients) {
    try {
      return await client.getTransactionReceipt({ hash });
    } catch {
      /* try next RPC */
    }
  }
  throw new Error('All RPC URLs failed for getTransactionReceipt');
}

export async function getBlock(blockNumber: bigint) {
  for (const client of clients) {
    try {
      return await client.getBlock({ blockNumber });
    } catch {
      /* try next RPC */
    }
  }
  throw new Error('All RPC URLs failed for getBlock');
}

export async function getBlockNumber(): Promise<bigint> {
  for (const client of clients) {
    try {
      return await client.getBlockNumber();
    } catch {
      /* try next RPC */
    }
  }
  throw new Error('All RPC URLs failed for getBlockNumber');
}

// Fetches ItemBought events emitted by the CupMasterGame contract in the
// [fromBlock, toBlock] range (both inclusive). Returns logs with decoded args
// (itemTypeId, buyer, paymentToken, price) plus transactionHash / blockNumber.
export async function getItemBoughtLogs(fromBlock: bigint, toBlock: bigint) {
  for (const client of clients) {
    try {
      return await client.getLogs({
        address: CUPMASTER_GAME_ADDRESS,
        event: ITEM_BOUGHT_EVENT,
        fromBlock,
        toBlock,
        strict: true,
      });
    } catch {
      /* try next RPC */
    }
  }
  throw new Error('All RPC URLs failed for getLogs ItemBought');
}

let cachedSeed: `0x${string}` | null = null;

// SEED is an immutable bytes32 set at contract deploy time, so it's safe to
// fetch once and cache for the process lifetime.
export async function getCupmasterSeed(): Promise<`0x${string}`> {
  if (cachedSeed) return cachedSeed;
  for (const client of clients) {
    try {
      const seed = await client.readContract({
        address: CUPMASTER_GAME_ADDRESS,
        abi: cupmasterGameAbi,
        functionName: 'SEED',
      });
      cachedSeed = seed;
      return seed;
    } catch {
      /* try next RPC */
    }
  }
  throw new Error('All RPC URLs failed for SEED');
}
