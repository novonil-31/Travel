/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        uber: {
          black: '#000000',
          dark: '#141414',
          gray50: '#f6f6f6',
          gray100: '#eeeeee',
          gray200: '#e2e2e2',
          gray300: '#cbcbcb',
          gray500: '#757575',
          gray700: '#333333',
          green: '#06c167',
          blue: '#276ef1',
          red: '#e11900',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'uber-card': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'uber-elevated': '0 8px 30px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
}
