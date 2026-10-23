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
          card: '#FFFFFF',          // Card background
          border: '#D9E0E8',        // Border
          text: '#243447',          // Primary text
          muted: '#64748B',         // Secondary text
          success: '#218653',       // Success green
          warning: '#B7791F',       // Warning amber
          danger: '#C0392B',        // Danger red
          info: '#2874A6',          // Informational blue
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
