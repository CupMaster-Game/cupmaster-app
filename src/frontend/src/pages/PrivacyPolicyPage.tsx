import { LegalDocument } from '@/components/legal/LegalDocument';

const INTRO = [
  'CupMaster ("we", "our", or "us") respects your privacy. This Privacy Policy explains how we collect, use, and protect information when you use the CupMaster game and related services (collectively, the "Service"). By using the Service, you accept the terms of this Policy and our Terms of Service.',
  'Because CupMaster does not require traditional account registration, and access is granted solely through your blockchain wallet, the personal information we collect is minimal by design.',
];

const SECTIONS = [
  {
    heading: '1. Information We Collect',
    blocks: [
      { type: 'sub' as const, text: '1.1 Blockchain & Wallet Data' },
      {
        type: 'p' as const,
        text: 'When you connect your wallet and interact with CupMaster smart contracts, the following information is inherently public on-chain and accessible to us: your wallet address, transaction hashes, and on-chain purchase records.',
      },
      { type: 'sub' as const, text: '1.2 Predictions & Game Data' },
      {
        type: 'p' as const,
        text: 'CupMaster collects the predictions you submit, the games you play, and the timing of your interactions. This data is used to maintain the leaderboard, award points, detect anomalies, and improve the service.',
      },
      { type: 'sub' as const, text: '1.3 Usage & Technical Data' },
      {
        type: 'p' as const,
        text: 'We may automatically collect technical information about how you interact with the Service, such as pages visited and general usage patterns. This information is collected in aggregate to improve the Service.',
      },
    ],
  },
  {
    heading: '2. Information We Will Never Collect',
    blocks: [
      {
        type: 'p' as const,
        text: 'CupMaster will never ask for and does not collect your wallet private keys, seed phrases, or passwords. Never trust anyone claiming to be CupMaster who asks for your private key or seed phrase.',
      },
    ],
  },
  {
    heading: '3. How We Use Your Information',
    blocks: [
      {
        type: 'list' as const,
        items: [
          'To operate and provide the Service, including recording predictions and game sessions.',
          'To maintain the leaderboard and administer tournaments and rewards.',
          'To detect and investigate security issues, exploits, or unfair gameplay.',
          'To analyze and improve the performance and features of the Service.',
          'To comply with applicable legal obligations.',
        ],
      },
    ],
  },
  {
    heading: '4. Sharing & Disclosure',
    blocks: [
      {
        type: 'p' as const,
        text: 'CupMaster does not sell, rent, or trade your information to third parties. We may disclose information to law enforcement if required by law, and any data recorded on the blockchain is inherently public.',
      },
    ],
  },
  {
    heading: '5. Data Retention',
    blocks: [
      {
        type: 'p' as const,
        text: 'We retain prediction and usage data for as long as necessary to fulfil the purposes described in this Policy, including leaderboard integrity and legal compliance. Blockchain transaction data is permanently recorded and cannot be deleted.',
      },
    ],
  },
  {
    heading: '6. Security',
    blocks: [
      {
        type: 'p' as const,
        text: 'We implement industry-standard security measures to protect information collected through the Service. You are responsible for the security of your own wallet, including safeguarding private keys and seed phrases.',
      },
    ],
  },
  {
    heading: "7. Children's Privacy",
    blocks: [
      {
        type: 'p' as const,
        text: 'CupMaster is not directed at children under the age of 13 (or the applicable age of digital consent in your jurisdiction). We do not knowingly collect information from children.',
      },
    ],
  },
  {
    heading: '8. Changes to This Policy',
    blocks: [
      {
        type: 'p' as const,
        text: 'We may update this Privacy Policy from time to time. When we do, we will update the "Last Updated" date at the top of this document. Your continued use of the Service after any changes constitutes your acceptance of the updated Policy.',
      },
    ],
  },
  {
    heading: '9. Contact',
    blocks: [
      {
        type: 'p' as const,
        text: 'If you have questions or concerns regarding this Privacy Policy, please reach out to the CupMaster team through our official channels.',
      },
    ],
  },
];

export function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      lastUpdated="Last Updated: May 2026"
      intro={INTRO}
      sections={SECTIONS}
    />
  );
}
