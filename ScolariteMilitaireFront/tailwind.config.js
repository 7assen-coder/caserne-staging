/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1B2A4A',
          50: '#F2F4F8',
          100: '#DCE1EA',
          200: '#B5BECF',
          300: '#7F8DAD',
          400: '#4F6088',
          500: '#304776',
          600: '#243864',
          700: '#1B2A4A',
          800: '#152039',
          900: '#0F1B33',
        },
        'dark-navy': '#0F1B33',
        steel: '#3A4F6F',
        gold: {
          DEFAULT: '#FDB913',
          100: '#FBF5E4',
          200: '#F1E3B5',
          300: '#E8D5A0',
          400: '#D8BC71',
          500: '#C8A54E',
          600: '#A88636',
          700: '#7E6527',
        },
        'gold-light': '#E8D5A0',
        'off-white': '#F7F8FA',
        'light-gray': '#E2E6EC',
        text: '#1E293B',
        'text-light': '#64748B',
        'text-muted': '#94A3B8',
        'brand-red': '#C53030',
        'brand-green': '#276749',
        /** ESP / Groupe Polytechnique (reconnaissance) */
        esp: {
          red: '#E31E24',
          green: '#009639',
          gold: '#FDB913',
        },
      },
      fontFamily: {
        /** Interface institutionnelle — une seule famille lisible (titres = même sans-serif) */
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.75rem', { lineHeight: '1rem' }],
        xs: ['0.8125rem', { lineHeight: '1.125rem' }],
        sm: ['0.9375rem', { lineHeight: '1.375rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.625rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.1' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,27,51,0.04), 0 2px 8px rgba(15,27,51,0.06)',
        'card-hover': '0 4px 12px rgba(15,27,51,0.08), 0 8px 24px rgba(15,27,51,0.08)',
        header: '0 1px 0 rgba(15,27,51,0.06), 0 2px 8px rgba(15,27,51,0.04)',
        pop: '0 16px 48px rgba(15,27,51,0.18), 0 4px 12px rgba(15,27,51,0.08)',
        gold: '0 1px 0 rgba(200,165,78,0.6), 0 6px 18px rgba(200,165,78,0.25)',
        inset: 'inset 0 1px 2px rgba(15,27,51,0.08)',
      },
      backgroundImage: {
        'navy-gradient': 'linear-gradient(160deg, #1B2A4A 0%, #0F1B33 100%)',
        'navy-accent': 'linear-gradient(180deg, #0F1B33 0%, #1B2A4A 100%)',
        'hero-fade': 'linear-gradient(120deg, #0F1B33 0%, #1B2A4A 45%, #1a3d2e 100%)',
        'esp-ribbon':
          'linear-gradient(90deg, rgba(227,30,36,0.85) 0%, #FDB913 50%, rgba(0,150,57,0.85) 100%)',
        'grid-faint':
          'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1rem',
      },
      spacing: {
        18: '4.5rem',
      },
    },
  },
  plugins: [],
};
