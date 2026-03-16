/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans:  ['Nunito', 'sans-serif'],
        mono:  ['Outfit', 'monospace'],
      },
      colors: {
        diefra: {
          bg:  '#021a0a',
          s1:  '#031f0d',
          s2:  '#04280f',
          s3:  '#073516',
        }
      }
    },
  },
  plugins: [],
};
