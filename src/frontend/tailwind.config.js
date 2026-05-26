/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surface scale (dark theme)
        bg: {
          base: '#06080d',
          subtle: '#0b0f17',
          surface: '#11161f',
          elevated: '#171d28',
          inset: '#1d2330',
        },
        border: {
          subtle: '#1f2733',
          default: '#2a3342',
          strong: '#384357',
        },
        text: {
          primary: '#f8fafc',
          secondary: '#cbd5e1',
          muted: '#94a3b8',
          faint: '#64748b',
        },
        // Brand & accent palette
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        accent: {
          blue: '#3b82f6',
          purple: '#a855f7',
          orange: '#f97316',
          red: '#ef4444',
          yellow: '#facc15',
          gold: '#fbbf24',
          silver: '#cbd5e1',
          bronze: '#cd7f32',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        glow: '0 0 24px -4px rgba(34, 197, 94, 0.45)',
        'glow-soft': '0 0 18px -6px rgba(34, 197, 94, 0.3)',
        card: '0 2px 12px rgba(0, 0, 0, 0.35)',
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #4ade80 100%)',
        'card-gradient':
          'linear-gradient(180deg, rgba(34,197,94,0.05) 0%, rgba(34,197,94,0) 100%)',
        'stadium-gradient':
          'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(11,15,23,0) 60%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};
