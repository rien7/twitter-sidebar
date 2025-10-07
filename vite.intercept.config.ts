import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      $: resolve(__dirname, "src/utils"),
      "#": resolve(__dirname, "src/types"),
      "@common": resolve(__dirname, "src/common"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/interceptor/index.ts"),
      name: "TwitterSidebarIntercept",
      formats: ["iife"],
      fileName: () => "intercept.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
