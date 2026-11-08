import { createRequire } from "node:module";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
const require = createRequire(import.meta.url),
  sharp = require("sharp"),
  root = process.cwd(),
  fallbackLogo = join(root, "public/brand/reloo-symbol.png");
let logo=await readFile(fallbackLogo);
try{const branding=await (await fetch("https://reloo.vn/api/brand",{signal:AbortSignal.timeout(15000)})).json();const url=new URL(branding.appIcon,"https://reloo.vn");if(url.origin!=="https://reloo.vn")throw Error("Untrusted branding origin");const response=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error("Brand icon unavailable");const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>8*1024*1024)throw Error("Brand icon too large");await sharp(bytes).metadata();logo=bytes;}catch{console.log("Using last local RELOO app icon.");}
for (const [density, size] of Object.entries({
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
})) {
  const folder = join(
    root,
    "mobile/android/app/src/main/res",
    "mipmap-" + density,
  );
  await mkdir(folder, { recursive: true });
  const base = await sharp(logo)
      .resize(Math.round(size * 0.78), Math.round(size * 0.78), {
        fit: "contain",
      })
      .png()
      .toBuffer(),
    icon = await sharp({
      create: { width: size, height: size, channels: 4, background: "#f0fff3" },
    })
      .composite([{ input: base, gravity: "center" }])
      .png()
      .toBuffer();
  await writeFile(join(folder, "ic_launcher.png"), icon);
  await writeFile(join(folder, "ic_launcher_round.png"), icon);
  await writeFile(join(folder, "ic_launcher_foreground.png"), icon);
}
const iosFolder = join(
  root,
  "mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset",
);
await mkdir(iosFolder, { recursive: true });
const mark = await sharp(logo)
    .resize(800, 800, { fit: "contain" })
    .png()
    .toBuffer(),
  iosIcon = await sharp({
    create: { width: 1024, height: 1024, channels: 3, background: "#f0fff3" },
  })
    .composite([{ input: mark, gravity: "center" }])
    .flatten({ background: "#f0fff3" })
    .png()
    .toBuffer();
await writeFile(join(iosFolder, "AppIcon-512@2x.png"), iosIcon);
await writeFile(
  join(iosFolder, "Contents.json"),
  JSON.stringify(
    {
      images: [
        {
          filename: "AppIcon-512@2x.png",
          idiom: "universal",
          platform: "ios",
          size: "1024x1024",
        },
      ],
      info: { author: "xcode", version: 1 },
    },
    null,
    2,
  ),
);
console.log("RELOO native icons generated.");
