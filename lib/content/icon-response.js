import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { securityDb } from "../security/service.js";
import { mediaBytes } from "./media.js";
export async function iconResponse(kind) {
  const sizes = { favicon: 64, app: 512, apple: 180 };
  kind = Object.hasOwn(sizes, kind) ? kind : "favicon";
  let input;
  try {
    const { data } = await securityDb()
      .from("brand_settings")
      .select("favicon_id,app_icon_id")
      .eq("id", true)
      .single();
    const id = kind === "favicon" ? data?.favicon_id : data?.app_icon_id;
    if (id) {
      const asset = await securityDb()
        .from("media_assets")
        .select("filename")
        .eq("id", id)
        .single();
      if (asset.data) input = await mediaBytes(asset.data);
    }
  } catch {}
  if (!input)
    input = await readFile(
      join(process.cwd(), "public", "brand", "reloo-symbol.png"),
    );
  const png = await sharp(input)
    .resize(sizes[kind], sizes[kind], {
      fit: "contain",
      background: kind === "apple" ? "#fff" : "#00000000",
    })
    .png()
    .toBuffer();
  if (kind !== "favicon")
    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public,max-age=60",
      },
    });
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = 64;
  header[7] = 64;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  return new Response(Buffer.concat([header, png]), {
    headers: {
      "Content-Type": "image/x-icon",
      "Cache-Control": "public,max-age=60",
    },
  });
}
