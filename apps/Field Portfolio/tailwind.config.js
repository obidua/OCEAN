/********************
 * Tailwind Config  *
 ********************/

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        'neon-green': '#00ff9d',
        'neon-orange': '#ff7a00'
      }
    }
  },
  plugins: []
}
