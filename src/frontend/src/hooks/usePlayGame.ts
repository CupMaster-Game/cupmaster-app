import { useCallback, useState } from 'react';
import { UserRejectedRequestError } from 'viem';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import cupmasterGameAbi from '@backend/abis/cupmaster-game.abi';
import erc20Abi from '@backend/abis/erc20.abi';
import {
  CUPMASTER_GAME_ADDRESS,
  PAYMENT_TOKENS,
  type GameTypeId,
} from '@backend/constants';
import { getAuthedApi } from '@/lib/api';

// Mirrors the example app's flow: pick the user's best stablecoin balance as
// the payment token, approve if needed, call buy(itemTypeId, paymentToken),
// then submit the tx hash to the backend for verification + energy credit.

export type TxStatus =
  | null
  | 'awaiting_wallet'
  | 'confirming'
  | 'submitting'
  | 'rejected'
  | 'error'
  | 'success';

export type BuyError = null | 'no_wallet' | 'insufficient_balance' | 'submit_failed';

const EXTRA_BALANCE_USD = 0.01;
const GAME_ADDRESS = CUPMASTER_GAME_ADDRESS as `0x${string}`;

interface TokenInfo {
  address: `0x${string}`;
  decimals: number;
}
const TOKENS: readonly TokenInfo[] = [
  { address: PAYMENT_TOKENS[1].address as `0x${string}`, decimals: PAYMENT_TOKENS[1].decimals },
  { address: PAYMENT_TOKENS[2].address as `0x${string}`, decimals: PAYMENT_TOKENS[2].decimals },
  { address: PAYMENT_TOKENS[3].address as `0x${string}`, decimals: PAYMENT_TOKENS[3].decimals },
];

function get18DecimalsNormalized(amount: bigint, decimals: number): bigint {
  if (decimals === 18) return amount;
  if (decimals < 18) return amount * 10n ** BigInt(18 - decimals);
  return amount / 10n ** BigInt(decimals - 18);
}

export function usePlayGame() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [txStatus, setTxStatus] = useState<TxStatus>(null);
  const [buyError, setBuyError] = useState<BuyError>(null);

  const resetTxStatus = useCallback(() => {
    setTxStatus(null);
  }, []);
  const resetBuyError = useCallback(() => {
    setBuyError(null);
  }, []);

  const buyEnergy = useCallback(
    async (gameType: GameTypeId): Promise<boolean> => {
      if (!publicClient || !address) {
        setBuyError('no_wallet');
        return false;
      }

      setBuyError(null);
      setTxStatus('awaiting_wallet');

      try {
        // 1. Fetch balances for all three stablecoins.
        const balances = await Promise.all(
          TOKENS.map((t) =>
            publicClient.readContract({
              address: t.address,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [address],
            })
          )
        );

        // 2. Pick the token with the largest balance. Priority order in
        // `TOKENS` (USDT > USDC > USDm) breaks ties since we only swap on a
        // strict-greater normalized balance.
        let selected = TOKENS[0];
        if (!selected) throw new Error('No payment tokens configured');
        let selectedBalance = balances[0] ?? 0n;
        for (let i = 1; i < balances.length; i++) {
          const token = TOKENS[i];
          if (!token) continue;
          const candidate = balances[i] ?? 0n;
          const a = get18DecimalsNormalized(candidate, token.decimals);
          const b = get18DecimalsNormalized(selectedBalance, selected.decimals);
          if (a > b) {
            selected = token;
            selectedBalance = candidate;
          }
        }
        const selectedAddr = selected.address;
        const selectedDecimals = BigInt(selected.decimals);

        // 3. Get the price for this item + token.
        const price = await publicClient.readContract({
          address: GAME_ADDRESS,
          abi: cupmasterGameAbi,
          functionName: 'priceByItem',
          args: [BigInt(gameType), selectedAddr],
        });

        // 4. Need price + 1 cent (in selected token's units).
        const extraAmount =
          BigInt(Math.round(EXTRA_BALANCE_USD * 1000)) * 10n ** (selectedDecimals - 3n);
        if (selectedBalance < price + extraAmount) {
          setTxStatus(null);
          setBuyError('insufficient_balance');
          return false;
        }

        // 5. Approve if allowance < price.
        const allowance = await publicClient.readContract({
          address: selectedAddr,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, GAME_ADDRESS],
        });

        if (allowance < price) {
          // Approve a small spend buffer (5 units of the token) to avoid
          // re-approving every single buy.
          const approvalAmount = 5n * 10n ** selectedDecimals;
          const approveTxHash = await writeContractAsync({
            address: selectedAddr,
            abi: erc20Abi,
            functionName: 'approve',
            args: [GAME_ADDRESS, approvalAmount],
          });
          setTxStatus('confirming');
          const approveReceipt = await publicClient.waitForTransactionReceipt({
            hash: approveTxHash,
            confirmations: 1,
          });
          if (approveReceipt.status === 'reverted') {
            throw new Error('Approve transaction reverted');
          }
          setTxStatus('awaiting_wallet');
        }

        // 6. Call buy(itemTypeId, paymentToken).
        const buyTxHash = await writeContractAsync({
          address: GAME_ADDRESS,
          abi: cupmasterGameAbi,
          functionName: 'buy',
          args: [BigInt(gameType), selectedAddr],
        });
        setTxStatus('confirming');
        const buyReceipt = await publicClient.waitForTransactionReceipt({
          hash: buyTxHash,
          confirmations: 1,
        });
        if (buyReceipt.status === 'reverted') {
          throw new Error('Buy transaction reverted');
        }

        // 7. Submit tx hash to backend so it credits the energy.
        setTxStatus('submitting');
        const authed = getAuthedApi(address);
        if (!authed) {
          setBuyError('submit_failed');
          setTxStatus('error');
          return false;
        }
        const submitRes = await authed.purchase.submit.$post({
          json: { tx_hash: buyTxHash },
        });
        if (!submitRes.ok) {
          setBuyError('submit_failed');
          setTxStatus('error');
          return false;
        }

        setTxStatus('success');
        return true;
      } catch (err) {
        const e = err as { code?: number; message?: string; cause?: unknown };
        const lowered = e.message?.toLowerCase() ?? '';
        const isRejection =
          err instanceof UserRejectedRequestError ||
          e.cause instanceof UserRejectedRequestError ||
          e.code === 4001 ||
          lowered.includes('rejected') ||
          lowered.includes('denied by user');

        if (isRejection) {
          setTxStatus('rejected');
        } else {
          console.error('Purchase error', err);
          setTxStatus('error');
        }
        return false;
      }
    },
    [address, publicClient, writeContractAsync]
  );

  return { buyEnergy, txStatus, buyError, resetTxStatus, resetBuyError };
}
