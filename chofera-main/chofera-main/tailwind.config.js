/** @type {import('tailwindcss').Config} */
const nativewindPreset = require('nativewind/preset');

module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [nativewindPreset],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {},
    },
  },
  plugins: [],
};
