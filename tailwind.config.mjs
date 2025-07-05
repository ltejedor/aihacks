/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'hacker': {
          'bg': '#0a0a0a',
          'bg-secondary': '#1a1a1a',
          'bg-tertiary': '#2a2a2a',
          'green': '#00ff41',
          'green-dark': '#00cc33',
          'cyan': '#00ffff',
          'cyan-dark': '#00cccc',
          'red': '#ff0040',
          'text': '#e0e0e0',
          'text-dim': '#a0a0a0',
          'text-darker': '#666666',
          'border': '#333333',
        }
      },
      fontFamily: {
        'mono': ['Fira Code', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'monospace'],
        'hacker': ['Courier New', 'Monaco', 'monospace'],
      },
      animation: {
        'glitch': 'glitch 2s infinite',
        'flicker': 'flicker 3s infinite',
        'pulse-green': 'pulse-green 2s infinite',
      },
      keyframes: {
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'pulse-green': {
          '0%, 100%': { boxShadow: '0 0 5px #00ff41' },
          '50%': { boxShadow: '0 0 20px #00ff41, 0 0 30px #00ff41' },
        }
      }
    }
  }
}
