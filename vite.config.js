import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// BASE_PATH permite servir el panel bajo un subdirectorio (GitHub Pages: /olist-ecommerce/).
// En Docker/nginx se sirve en la raíz.
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [react()],
});
