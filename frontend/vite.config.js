import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      "/static": "http://localhost:8080",
      "/health": "http://localhost:8080",
      "/run-campaign": "http://localhost:8080",
      "/job": "http://localhost:8080",
    },
  },
});
