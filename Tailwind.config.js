/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        jungle: {
          50: '#f0f9f4',
          100: '#dcf2e4',
          200: '#bce5cd',
          300: '#8dd2ad',
          400: '#5ab887',
          500: '#389e6a',
          600: '#2a8055',
          700: '#226646',
          800: '#1e5138',
          900: '#1a432f',
        },
        sand: {
          50: '#fdfbf7',
          100: '#f9f4ea',
          200: '#f3e8d5',
          300: '#ead5b5',
          400: '#ddbf8f',
          500: '#cfa76a',
          600: '#b8894f',
          700: '#9a6d41',
          800: '#7d5838',
          900: '#66472f',
        },
        ocean: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#b9e5fe',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        cream: {
          50: '#fdfcfb',
          100: '#faf8f5',
          200: '#f5f1eb',
          300: '#ebe5dc',
          400: '#ddd4c7',
          500: '#cbbfae',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
        'pill': '9999px',
      },
      boxShadow: {
        'soft': '0 2px 15px rgba(0, 0, 0, 0.05)',
        'soft-lg': '0 8px 30px rgba(0, 0, 0, 0.08)',
        'float': '0 10px 40px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
