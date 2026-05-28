import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { celo } from '@reown/appkit/networks';
import { createAppKit } from '@reown/appkit/react';

// TODO: replace with the CupMaster Reown project id before going to production.
const projectId =
  (import.meta.env.VITE_REOWN_PROJECT_ID as string | undefined) ??
  '46cc09a3d487a3c2587df736300bf903';

const metadata = {
  name: 'CupMaster',
  description: 'Play football games and earn rewards',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://cupmaster.app',
  icons: ['/favicon.svg'],
};

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [celo],
});

export const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks: [celo],
  projectId,
  metadata,
  enableWalletConnect: true,
  features: {
    email: false,
    socials: false,
    emailShowWallets: false,
  },
  allWallets: 'SHOW',
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
