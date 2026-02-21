import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";

const resolveAlias = {
  "@": path.resolve(__dirname, "src"),
  "@mmo-claw/ipc": path.resolve(__dirname, "../../packages/ipc/src/index.ts"),
  "@mmo-claw/db": path.resolve(__dirname, "../../packages/db/src/index.ts"),
  "@mmo-claw/uvx-manager": path.resolve(
    __dirname,
    "../../packages/uvx-manager/src/index.ts",
  ),
};

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: "electron/main.ts",
        vite: {
          resolve: { alias: resolveAlias },
          build: {
            outDir: "dist/electron",
          },
        },
      },
      {
        entry: "electron/preload.ts",
        onstart(options) {
          options.reload();
        },
        vite: {
          resolve: { alias: resolveAlias },
          build: {
            outDir: "dist/electron",
          },
        },
      },
    ]),
    renderer(),
  ],
  build: {
    outDir: "dist/renderer",
    sourcemap: true,
  },
  resolve: {
    alias: resolveAlias,
  },
});
