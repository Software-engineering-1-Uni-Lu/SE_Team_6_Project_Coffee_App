/**
 * Theme configuration and design tokens for Café Aroma
 * Coffee-themed design system with browns and creams
 */

export const theme = {
  colors: {
    primary: {
      50: "hsl(35, 25%, 95%)",
      100: "hsl(35, 25%, 90%)",
      200: "hsl(35, 25%, 85%)",
      300: "hsl(30, 20%, 70%)",
      400: "hsl(30, 20%, 60%)",
      500: "hsl(25, 35%, 25%)",
      600: "hsl(25, 35%, 20%)",
      700: "hsl(25, 40%, 15%)",
      800: "hsl(25, 45%, 10%)",
      900: "hsl(25, 50%, 5%)",
    },
    secondary: {
      50: "hsl(35, 20%, 98%)",
      100: "hsl(35, 20%, 95%)",
      200: "hsl(35, 20%, 92%)",
      300: "hsl(35, 20%, 88%)",
      400: "hsl(35, 20%, 85%)",
      500: "hsl(35, 25%, 85%)",
      600: "hsl(35, 25%, 80%)",
      700: "hsl(35, 25%, 75%)",
      800: "hsl(35, 25%, 70%)",
      900: "hsl(35, 25%, 65%)",
    },
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
    "3xl": "4rem",
  },
  borderRadius: {
    sm: "0.25rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgba(60, 40, 20, 0.05)",
    md: "0 4px 6px -1px rgba(60, 40, 20, 0.1), 0 2px 4px -2px rgba(60, 40, 20, 0.1)",
    lg: "0 10px 15px -3px rgba(60, 40, 20, 0.1), 0 4px 6px -4px rgba(60, 40, 20, 0.1)",
    xl: "0 20px 25px -5px rgba(60, 40, 20, 0.1), 0 8px 10px -6px rgba(60, 40, 20, 0.1)",
  },
  typography: {
    fontSizes: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem",
    },
    lineHeights: {
      tight: "1.25",
      normal: "1.5",
      relaxed: "1.75",
    },
  },
  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },
} as const;

export type Theme = typeof theme;
