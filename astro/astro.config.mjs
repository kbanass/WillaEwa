// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://willaewanadmorzem.pl",
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes("/panel") &&
        !page.includes("/login") &&
        !page.includes("/opinie"),
    }),
  ],
  trailingSlash: "never",
  build: {
    format: "file", // generuje /opinie.html zamiast /opinie/index.html — zachowuje istniejące URLe
    // CSS wbudowany w HTML — bez tego dwa pliki CSS blokowały pierwsze renderowanie
    inlineStylesheets: "always",
  },
  vite: {
    server: {
      proxy: {
        // Forward /api/* to Express during `astro dev` so auth cookies and
        // all API routes work without running a separate proxy. /panel and
        // /login are intentionally NOT proxied — Astro dev serves them
        // directly with working CSS; auth is enforced via the client-side
        // guard in panel.astro (which calls /api/auth/verify through this proxy).
        "/api": { target: "http://localhost:3000", changeOrigin: true },
      },
    },
  },
});
