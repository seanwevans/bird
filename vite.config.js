import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset paths, so the built site works wherever it is served from —
  // the repository root, a GitHub Pages project subpath, or a subfolder — with
  // no build-time knowledge of the URL.
  base: "./",
  plugins: [tailwindcss()],
});
