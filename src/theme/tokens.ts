/**
 * Biz-Panel Design Tokens
 * Dark-first theme inspired by GitHub's design system
 */

export const colors = {
  // Primary Brand Colors
  primary: {
    50: '#e6f0ff',
    100: '#b3d1ff',
    200: '#80b3ff',
    300: '#4d94ff',
    400: '#1a75ff',
    500: '#0066ff', // Main brand color
    600: '#0052cc',
    700: '#003d99',
    800: '#002966',
    900: '#001433',
  },

  // Semantic Colors
  success: {
    light: '#d4edda',
    main: '#00c853',
    dark: '#00a844',
  },

  warning: {
    light: '#fff3cd',
    main: '#ffab00',
    dark: '#e69500',
  },

  error: {
    light: '#f8d7da',
    main: '#ff3d00',
    dark: '#cc3100',
  },

  info: {
    light: '#d1ecf1',
    main: '#17a2b8',
    dark: '#138496',
  },

  // Dark Theme Backgrounds
  bg: {
    primary: '#0d1117',    // Main background
    secondary: '#161b22',  // Cards, sidebar
    tertiary: '#21262d',   // Inputs, hovers
    elevated: '#2d333b',   // Modals, dropdowns
  },

  // Text Colors
  text: {
    primary: '#e6edf3',    // Main text
    secondary: '#8b949e',  // Secondary text
    muted: '#6e7681',      // Disabled, hints
    inverse: '#0d1117',    // On light backgrounds
  },

  // Border Colors
  border: {
    default: '#30363d',
    muted: '#21262d',
    emphasis: '#8b949e',
  },
};

export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
};

export const borderRadius = {
  none: '0',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px rgba(0, 0, 0, 0.3)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.4)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.5)',
};

export const typography = {
  fontFamily: {
    base: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
  },
  fontSize: {
    xs: '11px',
    sm: '12px',
    base: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px',
    '3xl': '24px',
    '4xl': '30px',
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    base: 1.5,
    relaxed: 1.75,
  },
};

export const breakpoints = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};
