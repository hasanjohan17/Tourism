import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/** Set VITE_BASE_PATH=/repo-name/ for GitHub Pages project sites. */
export default defineConfig(({ mode }) => {
  // Load ALL env variables with VITE_ prefix
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const base = env.VITE_BASE_PATH || "/";

  return {
    plugins: [react()],
    base,
    build: {
      rollupOptions: {
        input: "index.html",
        output: {
          entryFileNames: "assets/main.js",
          chunkFileNames: "assets/[name].js",
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith(".css")) {
              return "assets/main.css";
            }
            return "assets/[name][extname]";
          },
        },
      },
    },
  };
});
