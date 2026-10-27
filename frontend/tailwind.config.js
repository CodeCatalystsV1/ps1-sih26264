/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        royal: {
          DEFAULT: '#2563EB',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB', // Royal Blue
          700: '#1D4ED8',
          800: '#1E40AF', // Deep Blue
          900: '#1E3A8A',
          950: '#172554', // Midnight Navy
        },
        navy: {
          midnight: '#172554',
          deep: '#1E40AF',
          dark: '#0F172A',
        },
        gov: {
          primary: '#2563EB',       // Royal Blue
          dark: '#172554',          // Midnight Navy
          deep: '#1E40AF',          // Deep Blue
          slate: '#0F172A',         // Dark Slate
          secondary: '#1E40AF',     // Deep Blue
          teal: '#0E7C86',          // Teal accent
          bg: '#F8FAFC',            // Main background
          ice: '#EFF6FF',           // Ice Blue
          faded: '#DBEAFE',         // Faded Blue
          surface: '#FFFFFF',       // Surface card background
          card: '#FFFFFF',          // Card background
          border: '#E2E8F0',        // Clean slate border
          'border-subtle': '#F1F5F9',
          'border-focus': '#93C5FD',
          text: '#1E293B',          // Primary text
          muted: '#64748B',         // Secondary text
          light: '#94A3B8',         // Muted caption text
          success: '#059669',       // Success emerald
          warning: '#F59E0B',       // Warning amber
          danger: '#DC2626',        // Danger red
          info: '#2563EB',          // Royal Blue
          saffron: '#FF9933',       // India Saffron subtle ribbon
          green: '#138808',         // India Green subtle ribbon
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'soft': '0 4px 18px rgba(15, 23, 42, 0.05), 0 1px 4px rgba(15, 23, 42, 0.03)',
        'elevated': '0 12px 30px rgba(37, 99, 235, 0.08), 0 4px 10px rgba(15, 23, 42, 0.04)',
        'floating': '0 18px 45px rgba(37, 99, 235, 0.13), 0 6px 16px rgba(15, 23, 42, 0.05)',
        'modal': '0 24px 60px rgba(15, 23, 42, 0.22), 0 8px 24px rgba(15, 23, 42, 0.12)',
        'gov-sm': '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        'gov-card': '0 4px 18px rgba(15, 23, 42, 0.05), 0 1px 4px rgba(15, 23, 42, 0.03)',
        'gov-elevated': '0 12px 30px rgba(37, 99, 235, 0.08), 0 4px 10px rgba(15, 23, 42, 0.04)',
        'gov-modal': '0 24px 60px rgba(15, 23, 42, 0.22), 0 8px 24px rgba(15, 23, 42, 0.12)',
      },
      keyframes: {
        gentleFloat: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      animation: {
        'gentle-float': 'gentleFloat 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
