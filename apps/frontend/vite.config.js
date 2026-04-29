import { defineConfig } from "vite";

const backendTarget = process.env.VITE_BACKEND_URL || "http://localhost:8080";

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      "/api": backendTarget,
    },
  },
});
