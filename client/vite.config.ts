import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/panel": "http://localhost:3000",
      "/login": "http://localhost:3000",
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        admin: resolve(__dirname, "admin.html"),
        login: resolve(__dirname, "login.html"),
        opinie: resolve(__dirname, "opinie.html"),
      },
    },
  },
});
