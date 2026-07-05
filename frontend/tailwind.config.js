/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Theme palettes live in src/index.css as CSS variables (RGB triplets)
      // switched via [data-theme] on <html>: "rabar" (default, EMBER NIGHT),
      // "midnight-red", "gold-rush". The `ember-` prefix is kept as the legacy
      // token name so existing classes keep working across all themes.
      colors: {
        ember: {
          bg: 'rgb(var(--ember-bg) / <alpha-value>)',
          card: 'rgb(var(--ember-card) / <alpha-value>)',
          sheet: 'rgb(var(--ember-sheet) / <alpha-value>)',
          primary: 'rgb(var(--ember-primary) / <alpha-value>)',
          accent: 'rgb(var(--ember-accent) / <alpha-value>)',
          cream: 'rgb(var(--ember-cream) / <alpha-value>)',
          muted: 'rgb(var(--ember-muted) / <alpha-value>)',
          // Hairlines / hover tints: white on dark themes, espresso on the
          // light "aperitif" theme. Always used with an opacity modifier.
          line: 'rgb(var(--ember-line) / <alpha-value>)',
        },
        // Keep `brand` aliased to the primary for existing classes.
        brand: {
          DEFAULT: 'rgb(var(--ember-primary) / <alpha-value>)',
          dark: '#b45309',
        },
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
      },
      backgroundImage: {
        // primary → accent rating fill
        'rating-fill':
          'linear-gradient(90deg, rgb(var(--ember-primary)) 0%, rgb(var(--ember-accent)) 100%)',
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [],
};
