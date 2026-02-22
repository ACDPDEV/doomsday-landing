// @ts-check
import { defineConfig, envField } from "astro/config";
import tailwind from "@tailwindcss/vite";

import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "static",

  vite: {
    plugins: [tailwind()],
  },

  env: {
    schema: {
      YOUTUBE_API_KEY: envField.string({ context: "server", access: "secret" }),
    },
  },

  adapter: cloudflare(),
});
