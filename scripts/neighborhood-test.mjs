import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createNeighborhoodFixture } from "../tests/neighborhood-fixture.mjs";
const root = resolve("output/neighborhood-test", "run-" + Date.now());
await mkdir(root, { recursive: true });
const database = join(root, "database");
const fixture = await createNeighborhoodFixture(database);
await fixture.close();
const port = process.env.RELOO_NEIGHBORHOOD_TEST_PORT || "4518",
  secret = randomBytes(32).toString("hex");
const env = {
  ...process.env,
  NODE_ENV: "development",
  RELOO_NEIGHBORHOOD_ENABLED: "true",
  RELOO_NEIGHBORHOOD_TEST_MODE: "1",
  RELOO_NEIGHBORHOOD_TEST_DB: database,
  RELOO_NEIGHBORHOOD_TEST_SECRET: secret,
  RELOO_PRIVATE_DATA_KEY: randomBytes(32).toString("hex"),
  RELOO_EVIDENCE_DIR: join(root, "evidence"),
  RELOO_MEDIA_DIR: join(root, "media"),
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:45999",
  SUPABASE_INTERNAL_URL: "http://127.0.0.1:45999",
  SUPABASE_SERVICE_ROLE_KEY: "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  APP_ORIGIN: "http://127.0.0.1:" + port,
  CRM_ORIGIN: "http://127.0.0.1:" + port,
  RELOO_DATA_REGION: "TEST",
  RELOO_EDGE_SECRET: "",
  TRUST_PROXY: "false",
};
await writeFile(
  join(root, "runtime.secret.json"),
  JSON.stringify(
    { baseUrl: env.APP_ORIGIN, webhookSecret: secret, database },
    null,
    2,
  ),
  { mode: 0o600 },
);
await writeFile(
  resolve("output/neighborhood-test/latest.json"),
  JSON.stringify({ root, baseUrl: env.APP_ORIGIN, database }, null, 2),
);
console.log(
  "Isolated TEST database created. No production database, email or payment provider is used.",
);
console.log(env.APP_ORIGIN + "/noi-khu");
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--webpack",
    "--hostname",
    "127.0.0.1",
    "--port",
    port,
  ],
  { env, stdio: "inherit", windowsHide: true },
);
child.once("exit", (code) => {
  process.exitCode = code || 0;
});
process.on("SIGINT", () => child.kill("SIGINT"));
