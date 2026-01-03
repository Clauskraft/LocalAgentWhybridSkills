/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'tdc-magenta': '#E20074',
        'tdc-magenta-dark': '#B8005D',
        'tdc-magenta-light': '#FF3399',
        'tdc-blue': '#00A0D2',
        'tdc-blue-dark': '#0080A8',
        'tdc-blue-light': '#33B5DE',
        'tdc-purple': '#6B3FA0',
        'tdc-purple-dark': '#562F80',
        'tdc-purple-light': '#8C5FB8',
        'bg-primary': '#0D0D12',
        'bg-secondary': '#13131A',
        'bg-tertiary': '#1A1A24',
        'bg-elevated': '#22222E',
        'bg-hover': '#2A2A38',
        'bg-active': '#32324A',
        'text-primary': '#F5F5F7',
        'text-secondary': '#A1A1AA',
        'text-muted': '#71717A',
        'text-disabled': '#52525B',
        'border-primary': '#27272A',
        'border-secondary': '#3F3F46',
        // App accent color used across UI (buttons, focus rings, active states)
        'accent': '#E20074',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Fira Code', 'Consolas', 'Monaco', 'monospace'],
      },
    },
  },
  plugins: [],
};
