/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#141414',
        'ink-2': '#0b0b0b',
        surface: '#181818',
        'surface-2': '#2a2a2a',
        accent: '#e50914',
        'accent-hover': '#f6121d',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
        sans: ['"Helvetica Neue"', 'Roboto', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
