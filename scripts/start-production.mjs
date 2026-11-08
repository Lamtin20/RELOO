import { access } from "node:fs/promises";
import { resolve } from "node:path";
import nextEnv from "@next/env";
import {assertStagingEnvironment} from '../lib/runtime/staging.js';

process.env.NODE_ENV = "production";
nextEnv.loadEnvConfig(process.cwd(), false);
assertStagingEnvironment();
try {
  await access(resolve(".next/BUILD_ID"));
} catch {
  throw new Error(
    "Production build missing. Run npm run build before npm start.",
  );
}
await import("../server.mjs");
