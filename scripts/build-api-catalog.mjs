import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
const source = "output/dependencies/public-apis";
const tree = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .parse(await readFile(`${source}/README.md`, "utf8"));
function text(node) {
  return node?.value || node?.children?.map(text).join("") || "";
}
function link(node) {
  if (node.type === "link") return node.url;
  for (const child of node.children || []) {
    const url = link(child);
    if (url) return url;
  }
  return null;
}
const entries = [];
let category = "Other";
for (const node of tree.children) {
  if (node.type === "heading" && node.depth === 3) category = text(node);
  if (
    node.type !== "table" ||
    text(node.children[0].children[0]) !== "API" ||
    node.children[0].children.length !== 5
  )
    continue;
  for (const row of node.children.slice(1)) {
    const [api, description, auth, https, cors] = row.children,
      url = link(api);
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    if (
      !["https:", "http:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password
    )
      continue;
    entries.push({
      name: text(api),
      description: text(description),
      auth: text(auth) || "None",
      https: text(https) === "Yes",
      cors: text(cors),
      category,
      url: parsed.href,
    });
  }
}
const commit = spawnSync("git", ["-C", source, "rev-parse", "HEAD"], {
  encoding: "utf8",
});
if (commit.status !== 0 || entries.length < 500)
  throw new Error("CATALOG_SOURCE_INVALID");
await mkdir("lib/catalog", { recursive: true });
await writeFile(
  "lib/catalog/public-apis.json",
  JSON.stringify({
    source: "https://github.com/public-apis/public-apis",
    commit: commit.stdout.trim(),
    generatedAt: new Date().toISOString(),
    entries,
  }),
);
await writeFile(
  "lib/catalog/PUBLIC_APIS_LICENSE.txt",
  await readFile(`${source}/LICENSE`),
);
console.log(
  `Catalog generated: ${entries.length} APIs. Snapshot only; endpoints were not invoked.`,
);
