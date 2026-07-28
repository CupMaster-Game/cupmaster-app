import { toDataSuffix } from '@celo/attribution-tags';

// Celo attribution tag issued to CupMaster on MiniPay. Appended to the calldata
// of every write transaction (ERC-8021 suffix) so on-chain activity driven by
// this app is attributed to us. The suffix is discarded by the EVM, so it never
// changes what a transaction does or costs.
//
// The code is private, so it is read from an env var (VITE_CELO_ATTRIBUTION_CODE)
// rather than committed to source. Set it in src/frontend/.env (gitignored) for
// local dev, and in the deploy/build environment for production. If it is unset,
// ATTRIBUTION_SUFFIX is undefined and transactions are simply sent untagged.
//
// Pass ATTRIBUTION_SUFFIX as `dataSuffix` to wagmi's writeContract / writeContractAsync.
export const ATTRIBUTION_CODE = import.meta.env.VITE_CELO_ATTRIBUTION_CODE as string | undefined;

export const ATTRIBUTION_SUFFIX = ATTRIBUTION_CODE ? toDataSuffix(ATTRIBUTION_CODE) : undefined;
