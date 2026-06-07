/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary-color, #1677ff)',
        success: 'var(--success-color, #52c41a)',
        warning: 'var(--warning-color, #faad14)',
        error: 'var(--error-color, #ff4d4f)',
      }
    },
  },
  plugins: [],
}
