import { LegalDocument } from '@/components/legal/LegalDocument';

const INTRO = [
  'CupMaster ("we", "our", or "us") respects your privacy. This Privacy Policy explains how we collect, use, and protect information when you use the CupMaster game and related services (collectively, the "Service"). By using the Service, you accept the terms of this Policy and our Terms of Service.',
  'Because CupMaster does not require account registration or login, and access is granted solely through your blockchain wallet, the personal information we collect is minimal by design.',
];

const SECTIONS = [
  {
    heading: '1. Information We Collect',
    blocks: [
      { type: 'sub' as const, text: '1.1 Blockchain & Wallet Data' },
      {
        type: 'p' as const,
        text: 'When you connect your wallet and interact with CupMaster smart contracts on the Celo network, the following information is inherently public on-chain and is accessible to us: your wallet address, transaction hashes for game start, and on-chain purchase records. This data is publicly visible on the Celo blockchain and is not considered private by the nature of blockchain technology.',
      },
      { type: 'sub' as const, text: '1.2 Game Session Data' },
      {
        type: 'p' as const,
        text: 'CupMaster collects data about your in-game activity, specifically the decisions you make during each game session and the timing of those decisions. This data is collected for the following purposes:',
      },
      {
        type: 'list' as const,
        items: [
          'Security and integrity: to detect and investigate cheating, exploits, or anomalies in gameplay. This data may be reviewed if a security or fairness incident is suspected.',
          'Leaderboard and tournaments: to accurately calculate scores, rankings, and prize eligibility.',
          'Service improvement: to improve game mechanics, performance, and reliability.',
        ],
      },
      { type: 'sub' as const, text: '1.3 Usage & Technical Data' },
      {
        type: 'p' as const,
        text: 'We may automatically collect technical information about how you interact with the Service, such as pages visited, features used, and general usage patterns. This information is collected in aggregate and is used to improve the Service.',
      },
      { type: 'sub' as const, text: '1.4 Support Communications' },
      {
        type: 'p' as const,
        text: 'If you contact us for support through our website or social media, we collect the information you provide in order to respond to your inquiry. We do not retain personally identifiable information beyond what is necessary to address your request.',
      },
    ],
  },
  {
    heading: '2. Information We Will Never Collect',
    blocks: [
      {
        type: 'p' as const,
        text: 'CupMaster will never ask for and does not collect your wallet private keys, seed phrases, or passwords. We do not require you to create an account, and we do not collect your name, email address, or any other traditional personal identifiers as part of normal Service use.',
      },
      {
        type: 'p' as const,
        text: 'Never trust anyone or any website claiming to be CupMaster that asks for your private key or seed phrase.',
      },
    ],
  },
  {
    heading: '3. How We Use Your Information',
    blocks: [
      {
        type: 'p' as const,
        text: 'We use the information we collect for the following purposes:',
      },
      {
        type: 'list' as const,
        items: [
          'To operate and provide the Service, including processing game sessions.',
          'To maintain the leaderboard and administer tournaments and giveaways.',
          'To detect and investigate security issues, exploits, or unfair gameplay.',
          'To analyze and improve the performance and features of the Service.',
          'To respond to support inquiries.',
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
        text: 'CupMaster does not sell, rent, or trade your information to third parties. We may share information only in the following limited circumstances:',
      },
      { type: 'sub' as const, text: '4.1 Legal Requirements' },
      {
        type: 'p' as const,
        text: 'We may disclose information to law enforcement, governmental agencies, or other legal authorities if required by law, court order, or to protect our legal rights and comply with applicable regulations.',
      },
      { type: 'sub' as const, text: '4.2 Public Blockchain Data' },
      {
        type: 'p' as const,
        text: 'Data recorded on the Celo blockchain — including wallet addresses and transaction history — is inherently public and visible to anyone. CupMaster has no ability to make this data private.',
      },
      { type: 'sub' as const, text: '4.3 Service Providers' },
      {
        type: 'p' as const,
        text: 'We may engage trusted third-party service providers (such as analytics tools) to help operate the Service. These providers are contractually obligated to handle data securely and only for the purposes we specify.',
      },
    ],
  },
  {
    heading: '5. Cookies & Tracking Technologies',
    blocks: [
      {
        type: 'p' as const,
        text: 'Our website may use cookies — small text files stored on your device — to track how you use the site, remember preferences, and analyze site usage. You can control or disable cookies through your browser settings. Note that disabling cookies may affect certain features of the website.',
      },
      {
        type: 'p' as const,
        text: 'We may use analytics tools such as Google Analytics to help us understand usage patterns and improve the Service. These tools may collect anonymized data about site visits and interactions.',
      },
    ],
  },
  {
    heading: '6. Data Retention',
    blocks: [
      {
        type: 'p' as const,
        text: 'We retain game session and usage data for as long as necessary to fulfill the purposes described in this Policy, including security monitoring, leaderboard integrity, and legal compliance. When data is no longer needed for these purposes, we delete or anonymize it.',
      },
      {
        type: 'p' as const,
        text: 'Blockchain transaction data is permanently recorded on the Celo network and cannot be deleted by CupMaster or anyone else — this is an inherent property of public blockchains.',
      },
    ],
  },
  {
    heading: '7. Security',
    blocks: [
      {
        type: 'p' as const,
        text: 'We implement industry-standard security measures to protect information collected through the Service. However, no internet-based system is perfectly secure, and we cannot guarantee the absolute security of data transmitted over the internet.',
      },
      {
        type: 'p' as const,
        text: 'You are responsible for maintaining the security of your own wallet, including safeguarding your private keys and seed phrases. CupMaster is not liable for any loss resulting from unauthorized access to your wallet.',
      },
    ],
  },
  {
    heading: '8. Third-Party Services',
    blocks: [
      {
        type: 'p' as const,
        text: 'CupMaster integrates with third-party platforms including Farcaster, MetaMask, Phantom, and MiniPay. Your use of these platforms is governed by their own privacy policies, which we encourage you to review. CupMaster is not responsible for the privacy practices of third-party services.',
      },
    ],
  },
  {
    heading: "9. Children's Privacy",
    blocks: [
      {
        type: 'p' as const,
        text: 'CupMaster is not directed at children under the age of 13 (or the applicable age of digital consent in your jurisdiction). We do not knowingly collect information from children. If you believe a child has provided information to us, please contact us and we will promptly remove it.',
      },
    ],
  },
  {
    heading: '10. Changes to This Policy',
    blocks: [
      {
        type: 'p' as const,
        text: 'We may update this Privacy Policy from time to time. When we do, we will update the "Last Updated" date at the top of this document. We encourage you to review this Policy periodically. Your continued use of the Service after any changes constitutes your acceptance of the updated Policy.',
      },
    ],
  },
  {
    heading: '11. Compliance',
    blocks: [
      {
        type: 'p' as const,
        text: 'This Privacy Policy is designed to comply with applicable privacy laws. If you believe this Policy does not meet the legal requirements of your jurisdiction, you may choose not to use the Service.',
      },
    ],
  },
  {
    heading: '12. Contact',
    blocks: [
      {
        type: 'p' as const,
        text: 'If you have questions, concerns, or requests regarding this Privacy Policy, please reach out to the CupMaster team through our official channel or website.',
      },
    ],
  },
];

export function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      lastUpdated="Last Updated: June 2026"
      intro={INTRO}
      sections={SECTIONS}
    />
  );
}
