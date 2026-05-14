import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** GitHub Pages project site: https://<user>.github.io/<repo>/ — set VITE_BASE_PATH=/repo-name/ */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base =
    env.VITE_BASE_PATH ||
    (mode === "production" ? "/tourism-project/" : "/");

  return {
    plugins: [react()],
    base,
    build: {
      rollupOptions: {
        input: resolve(__dirname, "src/main.jsx"),
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
