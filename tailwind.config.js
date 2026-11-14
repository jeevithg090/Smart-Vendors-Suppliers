import colors from 'tailwindcss/colors';

/**
 * Accessible palette: the mid tones (500-700) of the accent hues are shifted
 * two steps darker so white text on solid buttons and coloured text on light
 * backgrounds meet WCAG AA (≥ 4.5:1). Light tints (50-400) are unchanged.
 */
const accessible = (hue) => ({
  ...hue,
  500: hue[700],
  600: hue[800],
  700: hue[900],
  800: hue[900],
});

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    screens: {
      xs: '475px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        orange: accessible(colors.orange),
        green: accessible(colors.green),
        emerald: accessible(colors.emerald),
        teal: accessible(colors.teal),
        blue: accessible(colors.blue),
        indigo: accessible(colors.indigo),
        purple: accessible(colors.purple),
        red: accessible(colors.red),
        yellow: accessible(colors.yellow),
        amber: accessible(colors.amber),
        // gray-400/500 are used for helper text; darken them one step for AA contrast
        gray: { ...colors.gray, 400: colors.gray[500], 500: colors.gray[600] },
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minHeight: {
        touch: '44px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
