#!/usr/bin/env node
import { rm, copyFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import archiver from "archiver";
import { createWriteStream } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

async function main() {
  await rm(path.join(root, "dist"), { recursive: true, force: true });
  await rm(path.join(root, "dist.zip"), { force: true })

  run("pnpm", ["exec", "tsc", "-b"]);
  run("pnpm", ["exec", "vite", "build", "-c", "vite.content.config.ts"]);
  run("pnpm", ["exec", "vite", "build", "-c", "vite.intercept.config.ts"]);

  await copyFile(
    path.join(root, "src/manifest.json"),
    path.join(root, "dist/manifest.json")
  );
  await copyFile(
    path.join(root, "assets/icon-128.png"),
    path.join(root, "dist/icon-128.png")
  );

  const output = createWriteStream(path.join(root, "dist.zip"));
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.pipe(output);
  archive.directory(path.join(root, "dist"), false);
  await archive.finalize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
