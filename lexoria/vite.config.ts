import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Lexoria — Luyện thi IELTS/TOEIC",
        short_name: "Lexoria",
        description: "Game nhập vai luyện thi IELTS/TOEIC",
        lang: "vi",
        theme_color: "#1b1f3b",
        background_color: "#1b1f3b",
        display: "standalone",
        orientation: "any",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
      },
      workbox: {
        // Phaser alone is ~1.2 MB minified
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
