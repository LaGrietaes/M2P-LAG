/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // M2P brand palette (§26): black/charcoal, white, red
        // Namespaced as brand-red* so it doesn't collide with Tailwind's
        // built-in red-50..950 scale (a flat `red:` key here would replace
        // that entire scale, silently breaking every red-{shade} utility).
        'brand-red': '#a00000',
        'brand-red-dark': '#700000',
        'brand-red-glow': 'rgba(160, 0, 0, 0.35)',
        charcoal: '#121212',
        'charcoal-light': '#bfbfbf',
        ink: '#e8e8e8',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
