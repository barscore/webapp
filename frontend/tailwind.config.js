/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // EMBER NIGHT palette
      colors: {
        ember: {
          bg: '#1D1D1E',
          card: '#2D2D27',
          primary: '#E07B1A',
          accent: '#FF4F30',
          cream: '#F5EDD8',
          muted: '#8A857A',
        },
        // Keep `brand` aliased to the primary amber for existing classes.
        brand: {
          DEFAULT: '#E07B1A',
          dark: '#b45309',
        },
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        // amber → red rating fill
        'rating-fill': 'linear-gradient(90deg, #E07B1A 0%, #FF4F30 100%)',
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [],
};
