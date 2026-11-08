import { mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {assertComplianceRelease} from '../compliance/assert-release.mjs';
assertComplianceRelease();

const root = process.cwd();
const directory = resolve(root, "output", "deployment");
await mkdir(directory, { recursive: true });
const archive = resolve(directory, "reloo-release.tar.gz");
const files = ["app", "components", "lib", "public", "supabase", "deploy", "docs", "scripts", "tests", "compliance", "package.json", "package-lock.json", "next.config.mjs", "proxy.js", "jsconfig.json", "tsconfig.json", "eslint.config.mjs", "server.mjs", "Dockerfile", "compose.yml", ".dockerignore", ".gitignore", "README.md", "AGENTS.md"];
const result = spawnSync("tar", ["-czf", archive, "--exclude=.env*", "--exclude=**/.env*", ...files], { cwd: root, stdio: "pipe" });
if (result.error || result.status !== 0) throw new Error("Source release could not be packaged. No credentials were included.");
const listing = spawnSync("tar", ["-tzf", archive], { encoding: "utf8" });
if (listing.status !== 0 || listing.stdout.split(/\r?\n/).some((file) => /(^|\/)\.env(?:\.|$)|(^|\/)node_modules\/|\.pem$|(^|\/)\.cloudflared\//.test(file))) throw new Error("Release archive contains an unexpected path");
const info = await stat(archive);
console.log(`Production source archive prepared: output/deployment/reloo-release.tar.gz (${Math.round(info.size / 1024)} KB). Build on the actual laptop server; secrets, .next and dependencies are excluded.`);
