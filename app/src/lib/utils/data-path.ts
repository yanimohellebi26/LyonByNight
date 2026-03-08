import { join } from "path";
import { existsSync } from "fs";

/**
 * Resolves the path to a data file.
 * Checks `./data/` first (Vercel runtime), then `../data/` (local dev).
 */
export function getDataFilePath(filename: string): string {
  const localPath = join(process.cwd(), "data", filename);
  if (existsSync(localPath)) return localPath;
  return join(process.cwd(), "..", "data", filename);
}
