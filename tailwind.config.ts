import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        charcoal: {
          950: "#080C0E",
          900: "#0B0F14",
          850: "#11161D",
          800: "#161F28",
          700: "#1E293B",
          600: "#334155",
        },
        gold: {
          50: "#FDFBF7",
          100: "#F9F4E8",
          200: "#F3E5AB",
          300: "#DEC672",
          400: "#D4AF37",
          500: "#C5A059",
          600: "#B38F48",
          700: "#997D33",
          800: "#7A6328",
          900: "#5C491D",
        },
        emeraldLuxury: {
          950: "#021611",
          900: "#03231B",
          800: "#063B2E",
          700: "#0B4A3A",
          600: "#0F6B54",
          500: "#10B981",
          400: "#34D399",
        },
        theme: {
          bg: "var(--theme-bg)",
          surface: "var(--theme-surface)",
          "glass-panel": "var(--theme-glass-panel)",
          "glass-card": "var(--theme-glass-card)",
          "glass-subtle": "var(--theme-glass-subtle)",
          "glass-input": "var(--theme-glass-input)",
          "glass-elevated": "var(--theme-glass-elevated)",
          border: "var(--theme-glass-border)",
          highlight: "var(--theme-glass-highlight)",
          ring: "var(--theme-focus-ring)",
          accent: {
            DEFAULT: "var(--theme-accent)",
            hover: "var(--theme-accent-hover)",
            subtle: "var(--theme-accent-subtle)",
            border: "var(--theme-accent-border)",
            glow: "var(--theme-accent-glow)",
            contrast: "var(--theme-accent-contrast)",
          },
          text: {
            primary: "var(--theme-text-primary)",
            secondary: "var(--theme-text-secondary)",
            muted: "var(--theme-text-muted)",
          },
        },
      },
      boxShadow: {
        "glass-sm": "0 2px 10px -1px rgba(0, 0, 0, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
        "glass-md": "0 8px 30px -4px rgba(0, 0, 0, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
        "glass-lg": "0 20px 40px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.12)",
        "gold-glow": "0 0 25px -4px rgba(197, 160, 89, 0.35)",
        "emerald-glow": "0 0 25px -4px rgba(16, 185, 129, 0.3)",
        "theme-glow": "0 0 25px -4px var(--theme-accent-glow)",
      },
    },
  },
  plugins: [],
};

export default config;
