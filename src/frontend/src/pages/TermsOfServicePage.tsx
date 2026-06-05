import { LegalDocument } from '@/components/legal/LegalDocument';

const INTRO = [
  'Please read these Terms of Service ("Terms") carefully before using CupMaster. By connecting your wallet and using the Service, you agree to be bound by these Terms.',
];

const SECTIONS = [
  {
    heading: '1. About CupMaster',
    blocks: [
      {
        type: 'p' as const,
        text: 'CupMaster is a blockchain-based mini game built on the Celo network, accessible through web browsers and MiniPay. Players connect their crypto wallets to participate in gameplay sessions and earn points. CupMaster does not require account registration or login — access is granted through wallet connection only.',
      },
    ],
  },
  {
    heading: '2. Acceptance of Terms',
    blocks: [
      {
        type: 'p' as const,
        text: 'By accessing or using CupMaster — including by connecting a wallet, initiating a game session, or interacting with CupMaster smart contracts — you accept and agree to these Terms in full. If you do not agree, you must not use the Service.',
      },
      {
        type: 'p' as const,
        text: 'CupMaster reserves the right to modify these Terms at any time. The most current version will always be available on our site. Continued use of the Service after any changes constitutes your acceptance of the updated Terms.',
      },
    ],
  },
  {
    heading: '3. Eligibility',
    blocks: [
      {
        type: 'p' as const,
        text: 'By using CupMaster, you represent and warrant that:',
      },
      {
        type: 'list' as const,
        items: [
          'You are of legal age in your jurisdiction to enter into binding agreements and to own and transact with cryptographic tokens.',
          'You are legally permitted to use blockchain-based applications and to hold digital assets in your jurisdiction.',
          'You are solely responsible for ensuring your use of the Service complies with all applicable local laws and regulations. CupMaster is not liable for your compliance or non-compliance with such laws.',
        ],
      },
    ],
  },
  {
    heading: '4. Wallet Connection & Security',
    blocks: [
      {
        type: 'p' as const,
        text: 'CupMaster does not operate its own wallet and does not store, custody, or manage private keys or seed phrases. To use the Service, you connect a third-party wallet — such as MetaMask, Phantom, MiniPay, or a Farcaster-integrated wallet.',
      },
      {
        type: 'p' as const,
        text: "You are solely responsible for the security of your connected wallet. CupMaster is not liable for any loss of funds or assets resulting from unauthorized access to your wallet, loss of credentials, or other security failures on the wallet provider's side.",
      },
      {
        type: 'p' as const,
        text: "You should never share your wallet's private key, seed phrase, or passwords with anyone — including CupMaster.",
      },
    ],
  },
  {
    heading: '5. How the Game Works',
    blocks: [
      {
        type: 'p' as const,
        text: 'CupMaster is a skill-based prediction and mini game played on the Celo blockchain. To begin a game session, players make a small on-chain transaction (approximately $0.01 USD) by calling a CupMaster smart contract function. This transaction starts the game session.',
      },
      {
        type: 'p' as const,
        text: "CupMaster periodically hosts tournaments and giveaways where prizes may be distributed to top-ranking players. Prize eligibility and distribution are at CupMaster's sole discretion.",
      },
    ],
  },
  {
    heading: '6. Data Collection & Use',
    blocks: [
      {
        type: 'p' as const,
        text: 'CupMaster collects game session data, including in-game decisions and the timing of those decisions. This data is collected for the following purposes:',
      },
      {
        type: 'list' as const,
        items: [
          'Security and integrity: To detect and investigate anomalies, potential exploits, cheating, or system leaks in gameplay.',
          'Leaderboard and rankings: To accurately calculate and display player rankings for tournaments and the public leaderboard.',
          'Service improvement: To improve game mechanics, performance, and reliability.',
        ],
      },
      {
        type: 'p' as const,
        text: 'CupMaster does not collect personally identifiable information beyond your blockchain wallet address, which is inherently public on-chain. By using the Service, you consent to this data collection.',
      },
    ],
  },
  {
    heading: '7. Blockchain & Smart Contract Risks',
    blocks: [
      { type: 'sub' as const, text: '7.1 Inherent Blockchain Risks' },
      {
        type: 'p' as const,
        text: 'Blockchain transactions are irreversible. Once a transaction is submitted to the Celo network, it cannot be undone. You assume all risk associated with initiating transactions, including the risk of errors, lost funds, or failed transactions.',
      },
      { type: 'sub' as const, text: '7.2 Smart Contract Risk' },
      {
        type: 'p' as const,
        text: "CupMaster's gameplay operates via smart contracts. While CupMaster endeavors to maintain secure and accurate smart contracts, all code may contain bugs or vulnerabilities. You acknowledge and accept the inherent risks of interacting with smart contracts, and that CupMaster is not liable for losses arising from smart contract flaws.",
      },
      { type: 'sub' as const, text: '7.3 Network & Gas Fees' },
      {
        type: 'p' as const,
        text: 'Using CupMaster requires paying Celo network transaction fees ("gas"). These fees are variable and beyond CupMaster\'s control. CupMaster is not responsible for any costs incurred due to failed or pending transactions.',
      },
      { type: 'sub' as const, text: '7.4 Cryptography Risks' },
      {
        type: 'p' as const,
        text: 'You understand that advances in technology, including quantum computing, may in the future present risks to cryptographic systems. CupMaster will endeavor to update its protocols to address such risks, but cannot guarantee the security of any system against all future threats.',
      },
    ],
  },
  {
    heading: '8. Disclaimers',
    blocks: [
      {
        type: 'p' as const,
        text: 'The Service is provided on an "AS IS" and "as available" basis, without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement.',
      },
      {
        type: 'p' as const,
        text: 'CupMaster makes no warranty that the Service will be uninterrupted, error-free, or free from viruses or other harmful components. CupMaster does not warrant the accuracy or completeness of any content or data provided through the Service.',
      },
    ],
  },
  {
    heading: '9. Limitation of Liability',
    blocks: [
      {
        type: 'p' as const,
        text: 'TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, CUPMASTER AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES — INCLUDING LOSS OF TOKENS, PROFITS, DATA, OR GOODWILL — ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE, EVEN IF CUPMASTER HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.',
      },
      {
        type: 'p' as const,
        text: "CupMaster's total aggregate liability to you for any claims arising from the Service shall not exceed the total transaction fees you have paid to initiate game sessions in the thirty (30) days preceding the claim.",
      },
      {
        type: 'p' as const,
        text: "Some jurisdictions do not allow the exclusion or limitation of certain liabilities. In such jurisdictions, CupMaster's liability is limited to the maximum extent permitted by law.",
      },
    ],
  },
  {
    heading: '10. Indemnification',
    blocks: [
      {
        type: 'p' as const,
        text: 'You agree to indemnify, defend, and hold harmless CupMaster and its affiliates, officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising from: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any applicable law or regulation; or (d) any transactions you initiate through your connected wallet.',
      },
    ],
  },
  {
    heading: '11. Intellectual Property',
    blocks: [
      {
        type: 'p' as const,
        text: 'All content, design, code, branding, and materials comprising CupMaster — including the game logic, smart contracts authored by CupMaster, and associated creative assets — are the property of CupMaster or its licensors and are protected by applicable intellectual property laws.',
      },
      {
        type: 'p' as const,
        text: 'You may not copy, modify, distribute, reproduce, or create derivative works from any CupMaster content or materials without prior written permission.',
      },
    ],
  },
  {
    heading: '12. Third-Party Services',
    blocks: [
      {
        type: 'p' as const,
        text: 'CupMaster integrates with third-party platforms and wallet providers including MetaMask, Phantom, and MiniPay. Your use of these third-party services is governed by their respective terms and policies. CupMaster has no control over and accepts no liability for third-party services, platforms, or wallet providers.',
      },
    ],
  },
  {
    heading: '13. Changes to the Service',
    blocks: [
      {
        type: 'p' as const,
        text: 'CupMaster reserves the right to modify, suspend, or discontinue the Service or any feature thereof at any time, with or without notice. CupMaster is not liable to you or any third party for any such modification, suspension, or discontinuation.',
      },
    ],
  },
  {
    heading: '14. Governing Law & Disputes',
    blocks: [
      {
        type: 'p' as const,
        text: 'These Terms shall be governed by and construed in accordance with applicable law. Any disputes arising out of or relating to these Terms or the Service shall be resolved through binding arbitration, except where prohibited by law. You waive any right to participate in a class action lawsuit or class-wide arbitration.',
      },
      {
        type: 'p' as const,
        text: 'Any claim or cause of action arising from the use of the Service must be filed within one (1) year after such claim arose, or it will be permanently barred.',
      },
    ],
  },
  {
    heading: '15. Miscellaneous',
    blocks: [
      {
        type: 'p' as const,
        text: 'These Terms constitute the entire agreement between you and CupMaster regarding the Service and supersede all prior agreements on the subject matter.',
      },
      {
        type: 'p' as const,
        text: 'If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will remain in full force and effect.',
      },
      {
        type: 'p' as const,
        text: "CupMaster's failure to enforce any right or provision of these Terms shall not constitute a waiver of that right or provision.",
      },
    ],
  },
  {
    heading: '16. Contact',
    blocks: [
      {
        type: 'p' as const,
        text: 'For questions or concerns regarding these Terms, please reach out to the CupMaster team through our official channel or website.',
      },
    ],
  },
];

export function TermsOfServicePage() {
  return (
    <LegalDocument
      title="Terms of Service"
      lastUpdated="Last Updated: June 2026"
      intro={INTRO}
      sections={SECTIONS}
    />
  );
}
