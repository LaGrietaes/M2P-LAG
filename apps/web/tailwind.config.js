/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // M2P brand palette (§26): black/charcoal, white, red
        red: '#a00000',
        'red-dark': '#700000',
        charcoal: '#121212',
        'charcoal-light': '#bfbfbf',
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
