/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hazon: {
          darkGreen: '#09797a',
          terracotta: '#e07a5f',
          cream: '#f4f1de',
          gray: '#b4b4b4',
        }
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      }
    },
  },
  plugins: [],
}