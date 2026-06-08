/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      fontFamily: { sans: ['Plus Jakarta Sans', 'sans-serif'] },
      colors: {
        primary: {
          50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0',
          300: '#6ee7b7', 400: '#34d399', 500: '#10b981',
          600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b',
        },
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      backgroundImage: {
        'gray-750': '#1f2937',
      }
    },
  },
  plugins: [],
};
