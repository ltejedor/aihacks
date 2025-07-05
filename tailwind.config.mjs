/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'hacker': {
          'bg': '#0f172a',           // slate-900
          'bg-secondary': '#1e293b', // slate-800
          'bg-tertiary': '#334155',  // slate-700
          'green': '#10b981',        // emerald-500
          'green-dark': '#059669',   // emerald-600
          'cyan': '#06b6d4',         // cyan-500
          'cyan-dark': '#0891b2',    // cyan-600
          'red': '#ef4444',          // red-500
          'text': '#f1f5f9',         // slate-100
          'text-dim': '#94a3b8',     // slate-400
          'text-darker': '#64748b',  // slate-500
          'border': '#475569',       // slate-600
        }
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'monospace'],
        'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'hacker': ['JetBrains Mono', 'Monaco', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 2s infinite',
        'fade-in': 'fade-in 0.5s ease-in-out',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    }
  }
}
