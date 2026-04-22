/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8fafc',
        surface: '#ffffff',
        primary: '#3B82F6',
        secondary: '#10B981',
        border: '#e2e8f0',
        textMain: '#0f172a',
        textMuted: '#64748b'
      }
    },
  },
  plugins: [],
}
