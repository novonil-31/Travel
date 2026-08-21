/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        uber: {
          black: '#000000',
          dark: '#121212',
          gray: '#333333',
          lightGray: '#f6f6f6',
          border: '#e2e2e2',
          green: '#0e8345',
          amber: '#f38b00',
          red: '#e11900',
          blue: '#276ef1',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'uber': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'uber-elevated': '0 4px 20px rgba(0, 0, 0, 0.12)',
        'uber-modal': '0 8px 30px rgba(0, 0, 0, 0.18)',
      },
    },
  },
  plugins: [],
}
