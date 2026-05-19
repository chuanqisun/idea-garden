import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/idea-garden/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        setup: resolve(__dirname, "setup.html"),
      },
    },
  },
});
