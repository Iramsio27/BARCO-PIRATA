import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Barco Pirata brand palette – nautical & pirate theme
        brand: {
          50:  '#fef9f0',
          100: '#fdefd9',
          200: '#fad9a8',
          300: '#f6be6d',
          400: '#f19b33',
          500: '#e97d11',  // primary orange-gold
          600: '#d4600c',
          700: '#b04610',
          800: '#8f3714',
          900: '#752f13',
          950: '#40150a',
        },
        navy: {
          50:  '#eff5ff',
          100: '#dce9fe',
          200: '#bdd6fd',
          300: '#90b8fb',
          400: '#5b91f6',
          500: '#366bf0',
          600: '#224de5',
          700: '#1a3ad2',
          800: '#1c32aa',
          900: '#1c2f86',
          950: '#151f52',  // deep navy
        },
        ocean: {
          50:  '#effefb',
          100: '#c7fef5',
          200: '#90fdec',
          300: '#51f5e1',
          400: '#1de3cf',
          500: '#05c7b6',
          600: '#009f96',  // teal
          700: '#057e78',
          800: '#096361',
          900: '#0b524f',
          950: '#023132',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      borderRadius: {
        lg: '0.625rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      boxShadow: {
        card: '0 2px 12px 0 rgba(0,0,0,0.08)',
        'card-lg': '0 8px 32px 0 rgba(0,0,0,0.12)',
        modal: '0 20px 60px 0 rgba(0,0,0,0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        wave: 'wave 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        wave: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
