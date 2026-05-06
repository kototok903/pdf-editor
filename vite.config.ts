import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const pdfjsAssetDirectories = [
  "cmaps",
  "iccs",
  "standard_fonts",
  "wasm",
] as const;

const pdfjsAssetRoot = path.resolve(__dirname, "node_modules/pdfjs-dist");

const pdfjsAssetContentTypes: Record<string, string> = {
  ".bcmap": "application/octet-stream",
  ".icc": "application/octet-stream",
  ".js": "text/javascript; charset=utf-8",
  ".pfb": "application/octet-stream",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
};

function pdfjsAssetsPlugin(): Plugin {
  return {
    name: "pdfjs-assets",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestPath = request.url?.split("?")[0] ?? "";
        const assetDirectory = pdfjsAssetDirectories.find((directory) =>
          requestPath.startsWith(`/pdfjs/${directory}/`),
        );

        if (!assetDirectory) {
          next();
          return;
        }

        const relativePath = decodeURIComponent(
          requestPath.slice(`/pdfjs/${assetDirectory}/`.length),
        );
        const assetDirectoryPath = path.join(pdfjsAssetRoot, assetDirectory);
        const assetPath = path.normalize(
          path.join(assetDirectoryPath, relativePath),
        );

        if (
          !assetPath.startsWith(assetDirectoryPath + path.sep) ||
          !fs.existsSync(assetPath) ||
          !fs.statSync(assetPath).isFile()
        ) {
          next();
          return;
        }

        response.setHeader("Cache-Control", "public, max-age=31536000");
        response.setHeader(
          "Content-Type",
          pdfjsAssetContentTypes[path.extname(assetPath)] ??
            "application/octet-stream",
        );
        fs.createReadStream(assetPath).pipe(response);
      });
    },
    generateBundle() {
      for (const directory of pdfjsAssetDirectories) {
        const directoryPath = path.join(pdfjsAssetRoot, directory);
        const files = fs.readdirSync(directoryPath, { recursive: true });

        for (const file of files) {
          if (typeof file !== "string") {
            continue;
          }

          const filePath = path.join(directoryPath, file);

          if (!fs.statSync(filePath).isFile()) {
            continue;
          }

          this.emitFile({
            fileName: `pdfjs/${directory}/${file}`,
            source: fs.readFileSync(filePath),
            type: "asset",
          });
        }
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), pdfjsAssetsPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
