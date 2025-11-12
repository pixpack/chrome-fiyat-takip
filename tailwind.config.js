/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./settings.html",
    "./settings.js",
    "./popup.html",
    "./popup.js"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
      },
      fontFamily: {
        display: ['Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
