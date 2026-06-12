import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  important: '#root',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#1565c0',
          600: '#1256a8',
          700: '#0d47a1',
          800: '#0a3a83',
          900: '#062c65',
        },
        secondary: {
          50: '#e8eaf6',
          100: '#c5cae9',
          200: '#9fa8da',
          300: '#7986cb',
          400: '#5c6bc0',
          500: '#3949ab',
          600: '#303f9f',
          700: '#283593',
          800: '#1a237e',
          900: '#0d1642',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'Sarabun',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
