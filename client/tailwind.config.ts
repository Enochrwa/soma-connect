import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: "#0A2E1F", 50: "#E8F0EC", 100: "#C6DACF", 600: "#13452F", 700: "#0A2E1F" },
        saffron: { DEFAULT: "#F5A623", 50: "#FFF5E2", 100: "#FCE3B4", 600: "#D88E16" },
        ivory: "#FAF7F2",
        vermillion: "#E63B2E",
        slate: { DEFAULT: "#1C1C1E", 600: "#2C2C2E" },
      },
      fontFamily: {
        display: ['"Clash Display"', "system-ui", "sans-serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "0 8px 24px -12px rgba(10,46,31,0.18)",
        gold: "0 12px 32px -16px rgba(245,166,35,0.55)",
      },
      borderRadius: { xl: "1rem", "2xl": "1.5rem" },
    },
  },
  plugins: [],
} satisfies Config;
