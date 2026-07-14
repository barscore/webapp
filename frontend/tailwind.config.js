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
          // Score ≥ 7 ("ben valutato"). Was a hardcoded #57C08A in score.js,
          // which sits at 1.6:1 on the light theme's cream card.
          good: 'rgb(var(--ember-good) / <alpha-value>)',
          // The primary, tinted where needed so it clears WCAG AA (4.5:1) as
          // SMALL text. Use for primary-colored text under ~18px; the plain
          // `primary` is only guaranteed at large/bold sizes on some themes.
          ink: 'rgb(var(--ember-ink) / <alpha-value>)',
          // Error/destructive TEXT. `accent` stays the brand hue for fills, but
          // it drops to 1.78:1 as text on the light theme — use this instead.
          danger: 'rgb(var(--ember-danger) / <alpha-value>)',
          // Label sitting INSIDE a primary-colored fill. Not always `bg`:
          // midnight-red needs white, aperitif needs black.
          'on-primary': 'rgb(var(--ember-on-primary) / <alpha-value>)',
        },
        // Keep `brand` aliased to the primary for existing classes.
        brand: {
          DEFAULT: 'rgb(var(--ember-primary) / <alpha-value>)',
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
        // `rounded-lg` is used 110× on small controls and is stock-Tailwind 8px,
        // which is what makes the UI read as dated. Overriding the token softens
        // every one of those call sites without editing them.
        lg: 'var(--r-sm)', // 10px — chips, inputs, buttons
        card: 'var(--r-md)', // 14px — cards, list rows
        lg2: 'var(--r-lg)', // 20px — panels, dropdowns
        sheet: 'var(--r-xl)', // 28px — sheets, modals
      },
      boxShadow: {
        e1: 'var(--shadow-1)',
        e2: 'var(--shadow-2)',
        e3: 'var(--shadow-3)',
        glow: '0 4px 20px rgb(var(--ember-primary) / 0.35)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        spring: 'var(--ease-spring)',
      },
      transitionDuration: {
        1: 'var(--dur-1)',
        2: 'var(--dur-2)',
        3: 'var(--dur-3)',
      },
    },
  },
  plugins: [],
};
