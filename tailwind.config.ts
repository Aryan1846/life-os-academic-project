import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Base Theme CSS variables
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Berserk-Inspired Bespoke Color Palette
        berserk: {
          bg: "#0A0A0A",
          surface: "#121212",
          card: "#181818",
          elevated: "#222222",
          border: "#262626",
          "border-subtle": "#1c1c1c",
          crimson: "#8B0D18",
          "crimson-hover": "#A3121F",
          "crimson-dark": "#5A070E",
          "crimson-glow": "rgba(139, 13, 24, 0.25)",
          gold: "#A39168",
          "gold-hover": "#B8A57A",
          "gold-subtle": "rgba(163, 145, 104, 0.18)",
          sand: "#E8E2D9",
          "sand-muted": "#9A948D",
          "sand-dim": "#6E6862",
        },
      },
      borderRadius: {
        lg: "var(--radius, 0.5rem)",
        md: "calc(var(--radius, 0.5rem) - 2px)",
        sm: "calc(var(--radius, 0.5rem) - 4px)",
      },
      fontFamily: {
        serif: ["Cinzel", "Georgia", "Cambria", "Times New Roman", "serif"],
        sans: [
          "var(--font-inter)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        "crimson-glow": "0 0 20px -5px rgba(139, 13, 24, 0.4)",
        "crimson-sm": "0 0 10px -2px rgba(139, 13, 24, 0.3)",
        "gold-glow": "0 0 15px -4px rgba(163, 145, 104, 0.3)",
        "card-dark": "0 4px 20px -2px rgba(0, 0, 0, 0.7)",
      },
    },
  },
  plugins: [],
};

export default config;
