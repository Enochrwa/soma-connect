import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Use import.meta.url instead of __dirname — works natively in ESM without @types/node
const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": src("src"),
      "@components": src("src/components"),
      "@features": src("src/features"),
      "@pages": src("src/pages"),
      "@hooks": src("src/hooks"),
      "@utils": src("src/utils"),
      "@types": src("src/types"),
      "@constants": src("src/constants"),
      "@app": src("src/app"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:4000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2020",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          redux: ["@reduxjs/toolkit", "react-redux"],
          charts: ["recharts"],
          motion: ["framer-motion"],
          i18n: ["i18next", "react-i18next"],
          maps: ["leaflet", "react-leaflet"],
        },
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "@reduxjs/toolkit"],
  },
});
