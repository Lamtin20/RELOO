import { readFile } from "node:fs/promises";
import { join } from "node:path";
export const MEDIA_ROOT =
  process.env.RELOO_MEDIA_DIR || join(process.cwd(), "data", "public-media");
export function mediaUrl(id) {
  return id ? `/api/media/${id}` : null;
}
export async function mediaBytes(asset) {
  if (!/^[a-f0-9-]{36}\.webp$/i.test(asset.filename))
    throw new Error("INVALID_MEDIA_PATH");
  return readFile(join(MEDIA_ROOT, asset.filename));
}
