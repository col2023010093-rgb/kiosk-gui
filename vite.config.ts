import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@generick/shared": path.resolve(__dirname, "./packages/shared/src/index.ts"),
    },
  },
  server: {
    host: true,        // listen on the network (same as --host)
    port: 5173,
    strictPort: true,
    proxy: {
      // Local SQLite API (local-db/local_api.py)
      "/local-api": {
        target: "http://127.0.0.1:5003",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/local-api/, ""),
      },
      // keep the more specific route first
      "/api/height": {
        target: "http://localhost:5002",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});