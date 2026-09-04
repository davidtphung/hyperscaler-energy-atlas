import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" keeps every asset reference relative so the build runs unchanged
// at a GitHub Pages project path (username.github.io/hyperscaler-energy-atlas/),
// a custom domain root, or local preview, with no per-host configuration.
// Nested forecast HTML entries keep /forecast and /forecast-lab as real 200s.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    target: "es2020",
    cssTarget: "chrome90",
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        main: "index.html",
        forecast: "forecast/index.html",
        forecastLab: "forecast-lab/index.html",
      },
    },
  },
});
