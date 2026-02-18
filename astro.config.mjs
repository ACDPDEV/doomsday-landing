// @ts-check
import { defineConfig, envField } from "astro/config";
import tailwind from "@tailwindcss/vite";

import node from "@astrojs/node";

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

  adapter: node({
    mode: "standalone",
  }),
});