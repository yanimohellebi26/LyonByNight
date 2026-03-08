/**
 * Copies ../data/*.json into ./data/ so files are available at Vercel runtime.
 * Runs as a prebuild step.
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";

const src = join(process.cwd(), "..", "data");
const dst = join(process.cwd(), "data");

if (existsSync(src)) {
  if (!existsSync(dst)) mkdirSync(dst, { recursive: true });

  const files = readdirSync(src).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    cpSync(join(src, file), join(dst, file));
  }
  console.log(`[copy-data] Copied ${files.length} JSON files to app/data/`);
} else {
  console.warn("[copy-data] Source ../data/ not found, skipping copy");
}
