import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import fs from "fs";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: "public/manifest.json",
          dest: ".",
        },
        {
          src: "public/images",
          dest: ".",
        },
      ],
    }),
    {
      name: "copy-background-script",
      writeBundle() {
        // Ensure source directory exists
        const srcDir = resolve(__dirname, "src/background");
        const backgroundPath = resolve(srcDir, "background.js");
        const destPath = resolve(__dirname, "build/background.js");

        if (fs.existsSync(backgroundPath)) {
          // Create directory if it doesn't exist
          if (!fs.existsSync("build")) {
            fs.mkdirSync("build", { recursive: true });
          }

          // Copy background.js to build directory
          fs.copyFileSync(backgroundPath, destPath);
          console.log("✓ background.js copied to build folder");
        } else {
          console.warn("⚠ background.js not found in src/background directory");
        }
      },
    },
  ],
  build: {
    outDir: "build",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
    },
  },
});
