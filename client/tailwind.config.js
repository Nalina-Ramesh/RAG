/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui']
      },
      colors: {
        brand: {
          50: '#eef2ff',
          500: '#6366f1',
          600: '#4f46e5'
        }
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(99,102,241,.2), 0 10px 30px rgba(99,102,241,.35)'
      }
    }
  },
  plugins: []
};

