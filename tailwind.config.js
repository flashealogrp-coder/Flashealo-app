/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Mismos valores que src/marca/tokens.css, para usarlos como bg-fl-lino, text-fl-grafito, etc.
      colors: {
        fl: {
          lino: '#F9F8F5',
          arena: '#EFECE6',
          texto: '#181816',
          grafito: '#5A5955',
          borde: '#E2DFD9',
          laton: '#C8B69E',
        },
      },
      fontFamily: {
        serif: ["'Cormorant Garamond'", 'Georgia', "'Times New Roman'", 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', "'Segoe UI'", 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
