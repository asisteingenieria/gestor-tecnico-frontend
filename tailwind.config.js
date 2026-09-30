/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#F4F1EA',
        'paper-raised': '#EDE7DA',
        'paper-sunken': '#E5DECE',
        ink: '#26231F',
        'ink-muted': '#6B6558',
        clay: {
          DEFAULT: '#D97757',
          deep: '#B75B3D',
          soft: '#F0DACB',
        },
        moss: { DEFAULT: '#5F7A5E', soft: '#DFE6D8' },
        amber: { DEFAULT: '#B8863C', soft: '#EFE0C4' },
        brick: { DEFAULT: '#B54A3F', soft: '#EED6CF' },
      },
      fontFamily: {
        // Prefijadas "asistencia-*" a propósito: no pisar los defaults sans/mono de
        // Tailwind, que usan otros módulos (Incidentes, Inventario, etc.) vía font-mono.
        'asistencia-display': ['"Fraunces"', 'serif'],
        'asistencia-sans': ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        'asistencia-mono': ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}