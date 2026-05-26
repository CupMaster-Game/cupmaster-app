import { LegalDocument } from '@/components/legal/LegalDocument';

const INTRO = [
  'These Terms of Service ("Terms") govern your use of CupMaster (the "Service"). By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.',
];

const SECTIONS = [
  {
    heading: '1. Eligibility',
    blocks: [
      {
        type: 'p' as const,
        text: 'You must be at least 18 years old, or the age of majority in your jurisdiction, to use the Service. You are responsible for ensuring that your use of CupMaster complies with all laws applicable to you.',
      },
    ],
  },
  {
    heading: '2. Wallet & Account',
    blocks: [
      {
        type: 'p' as const,
        text: 'CupMaster does not host wallets. You are solely responsible for your wallet, your private keys, and any transactions you authorize. We do not have access to your funds and cannot reverse, refund, or otherwise modify blockchain transactions.',
      },
    ],
  },
  {
    heading: '3. Predictions, Games, and Rewards',
    blocks: [
      {
        type: 'p' as const,
        text: 'CupMaster offers prediction games and skill-based mini-games. Rewards, leaderboard standings, and prize eligibility are determined by the rules published on the Service and may change from time to time. We reserve the right to disqualify any user who engages in cheating, exploits, or abusive behaviour.',
      },
    ],
  },
  {
    heading: '4. Acceptable Use',
    blocks: [
      {
        type: 'list' as const,
        items: [
          'Do not attempt to interfere with, reverse engineer, or disrupt the Service.',
          'Do not use automation, bots, or scripts to gain an unfair advantage.',
          'Do not impersonate other users or create misleading accounts.',
          'Do not use the Service for any unlawful purpose.',
        ],
      },
    ],
  },
  {
    heading: '5. Intellectual Property',
    blocks: [
      {
        type: 'p' as const,
        text: 'All branding, designs, code, and content provided by CupMaster are owned by us or our licensors. You may not copy, modify, or redistribute any part of the Service without our prior written permission.',
      },
    ],
  },
  {
    heading: '6. Disclaimer of Warranties',
    blocks: [
      {
        type: 'p' as const,
        text: 'The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied. We do not warrant that the Service will be uninterrupted, error-free, or secure.',
      },
    ],
  },
  {
    heading: '7. Limitation of Liability',
    blocks: [
      {
        type: 'p' as const,
        text: 'To the maximum extent permitted by law, CupMaster and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of funds, profits, or data arising from your use of the Service.',
      },
    ],
  },
  {
    heading: '8. Changes to the Service',
    blocks: [
      {
        type: 'p' as const,
        text: 'We may modify or discontinue any part of the Service at any time. We will use reasonable efforts to notify users of material changes, but we are not obligated to do so.',
      },
    ],
  },
  {
    heading: '9. Changes to These Terms',
    blocks: [
      {
        type: 'p' as const,
        text: 'We may update these Terms from time to time. When we do, we will update the "Last Updated" date. Your continued use of the Service after any changes constitutes acceptance of the updated Terms.',
      },
    ],
  },
  {
    heading: '10. Contact',
    blocks: [
      {
        type: 'p' as const,
        text: 'For questions about these Terms, please reach out to the CupMaster team through our official channels.',
      },
    ],
  },
];

export function TermsOfServicePage() {
  return (
    <LegalDocument
      title="Terms of Service"
      lastUpdated="Last Updated: May 2026"
      intro={INTRO}
      sections={SECTIONS}
    />
  );
}
