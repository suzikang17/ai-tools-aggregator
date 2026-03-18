import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";

export default defineConfig({
  outDir: "dist",
  integrations: [react()],
  adapter: vercel(),
  output: "static",
  security: {
    checkOrigin: false,
  },
});
