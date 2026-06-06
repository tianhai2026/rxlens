/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#121212',
        foreground: '#ffffff',
        accent: '#00F0FF',
        accentDark: '#00B8C4',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 240, 255, 0.3)',
        'glow-sm': '0 0 10px rgba(0, 240, 255, 0.2)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 240, 255, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}
