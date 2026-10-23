/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          primary: '#17365D',       // Primary navy
          dark: '#102A43',          // Dark navy
          secondary: '#245A81',     // Secondary blue
          teal: '#168C8C',          // Teal accent
          bg: '#F4F6F9',            // Page background
          surface: '#FFFFFF',       // Surface background
          card: '#FFFFFF',          // Card background
          border: '#D9E0E8',        // Border
          'border-subtle': '#E9EFF5',
          text: '#243447',          // Primary text
          muted: '#64748B',         // Secondary text
          success: '#218653',       // Success green
          warning: '#B7791F',       // Warning amber
          danger: '#C0392B',        // Danger red
          info: '#2874A6',          // Informational blue
          saffron: '#FF9933',       // India Saffron for subtle institutional ribbon
          green: '#138808',         // India Green for subtle institutional ribbon
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'gov-sm': '0 1px 2px 0 rgba(16, 42, 67, 0.05)',
        'gov-card': '0 1px 3px 0 rgba(16, 42, 67, 0.06), 0 1px 2px -1px rgba(16, 42, 67, 0.04)',
        'gov-elevated': '0 4px 6px -1px rgba(16, 42, 67, 0.08), 0 2px 4px -2px rgba(16, 42, 67, 0.05)',
        'gov-modal': '0 20px 25px -5px rgba(16, 42, 67, 0.15), 0 8px 10px -6px rgba(16, 42, 67, 0.1)',
      }
    },
  },
  plugins: [],
}
