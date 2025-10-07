import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      $: resolve(__dirname, "src/utils"),
      "#": resolve(__dirname, "src/types"),
      "@common": resolve(__dirname, "src/common"),
      "@icons": resolve(__dirname, "src/icons"),
      "@store": resolve(__dirname, "src/store"),
    },
  },
  plugins: [react(), tailwindcss()],
});
