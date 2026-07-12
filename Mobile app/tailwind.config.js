/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        bg: '#030508',
        'bg-secondary': '#070B12',
        surface: '#0B111C',
        'surface-2': '#101828',
        border: '#1B2536',
        // Energies
        energy: '#3B82F6', // Electric Blue (primary)
        'energy-bright': '#60A5FA',
        violet: '#8B5CF6', // Deep Violet (secondary)
        'violet-bright': '#A78BFA',
        cyan: '#22D3EE', // Focus Energy
        crimson: '#E23A4E', // Controlled Warning
        gold: '#F5C542', // Legendary
        // Text
        text: '#E8EEF6', // Cold White
        'text-secondary': '#7D8DA6', // Blue Grey
        'text-dim': '#4A5568',
        // Rarities
        'r-common': '#7D8DA6',
        'r-rare': '#3B82F6',
        'r-epic': '#8B5CF6',
        'r-legendary': '#F5C542',
        'r-mythic': '#E23A4E',
      },
      fontFamily: {
        mono: ['SpaceMono', 'monospace'],
      },
    },
  },
  plugins: [],
};
