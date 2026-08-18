/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // M2P brand palette
        'brand-red': '#a00000',
        'brand-red-dark': '#700000',
        'brand-red-glow': 'rgba(160, 0, 0, 0.35)',
        // CSS custom property roles
        background: 'var(--m2p-background)',
        surface: 'var(--m2p-surface)',
        'surface-elevated': 'var(--m2p-surface-elevated)',
        'text-primary': 'var(--m2p-text-primary)',
        'text-secondary': 'var(--m2p-text-secondary)',
        accent: 'var(--m2p-accent)',
        'accent-bright': 'var(--m2p-accent-bright)',
        'accent-error': 'var(--m2p-accent-error)',
        'border-subtle': 'var(--m2p-border-subtle)',
        'border-strong': 'var(--m2p-border-strong)',
      },
      fontFamily: {
        sans: [
          'Chivo',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        display: ['Chivo', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace'],
      },
      fontSize: {
        'label-caps': ['10px', { lineHeight: '1.0', letterSpacing: '0.12em', fontWeight: '700' }],
        'data-mono': ['12px', { lineHeight: '1.4', letterSpacing: '0.05em', fontWeight: '400' }],
        'data-primary': ['16px', { lineHeight: '1.5', letterSpacing: '-0.01em', fontWeight: '500' }],
        'headline-lg': ['32px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '800' }],
        'display-lg': ['72px', { lineHeight: '72px', letterSpacing: '-0.04em', fontWeight: '900' }],
      },
    },
  },
  plugins: [],
}