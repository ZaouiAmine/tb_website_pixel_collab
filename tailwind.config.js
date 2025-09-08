/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pixel: {
          bg: '#1a1a1a',
          canvas: '#2d2d2d',
          border: '#404040',
          text: '#ffffff',
          accent: '#00ff88',
          warning: '#ff6b6b',
          info: '#4dabf7',
        }
      },
      fontFamily: {
        'pixel': ['Courier New', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
}
