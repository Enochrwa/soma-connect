import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#0A2E1F",
          light: "#13452F",
          50: "#E8F5EE",
          100: "#C6DACF",
        },
        saffron: {
          DEFAULT: "#F5A623",
          dark: "#D88E16",
          light: "#FDEABF",
        },
        ivory: {
          DEFAULT: "#FAF7F2",
          dark: "#F0EAE0",
        },
        vermillion: {
          DEFAULT: "#E63B2E",
          light: "#FDECEA",
        },
        slate: {
          DEFAULT: "#1C1C1E",
        },
      },
      fontFamily: {
        display: ["Clash Display", "system-ui", "sans-serif"],
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 2px 12px 0 rgba(10,46,31,0.08)",
        "card-hover": "0 8px 32px 0 rgba(10,46,31,0.16)",
        gold: "0 4px 24px 0 rgba(245,166,35,0.32)",
      },
      animation: {
        shimmer: "shimmer 1.5s infinite",
        "pulse-soft": "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      screens: {
        xs: "375px",
      },
    },
  },
  plugins: [],
};

export default config;
