/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Palette Passworld Travel
        jungle: {
          50: '#f0f9f4',
          100: '#daf2e4',
          200: '#b8e5cc',
          300: '#88d4ab',
          400: '#54bd84',
          500: '#2fa465',
          600: '#208751',
          700: '#1a6c42',
          800: '#175636',
          900: '#14472d',
        },
        sand: {
          50: '#fdfcfb',
          100: '#faf8f5',
          200: '#f5f1ea',
          300: '#ede6db',
          400: '#e3d7c6',
          500: '#d4c4ad',
          600: '#c0ab8e',
          700: '#a68f72',
          800: '#8a765f',
          900: '#72614f',
        },
        ocean: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#b9e6fe',
          300: '#7cd4fd',
          400: '#36bffa',
          500: '#0ba5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 40px -10px rgba(0, 0, 0, 0.1), 0 20px 50px -15px rgba(0, 0, 0, 0.08)',
        'soft-xl': '0 20px 60px -15px rgba(0, 0, 0, 0.15), 0 30px 70px -20px rgba(0, 0, 0, 0.12)',
        'float': '0 8px 30px -5px rgba(0, 0, 0, 0.08), 0 15px 40px -10px rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'scale-in': 'scaleIn 0.4s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
