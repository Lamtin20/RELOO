import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const domain = "reloo.vn";
for (const type of ["A", "NS"]) {
  const data = await fetch(`https://dns.google/resolve?name=${domain}&type=${type}`, { signal: AbortSignal.timeout(15000) }).then((response) => response.json());
  console.log(JSON.stringify({ domain, type, status: data.Status, answers: data.Answer?.map((answer) => ({ type: answer.type, data: answer.data })) || [], diagnostic: data.Comment || null }));
}
try {
  const certificate = await readFile(join(homedir(), ".cloudflared", "cert.pem"), "utf8");
  const block = certificate.match(/-----BEGIN ARGO TUNNEL TOKEN-----([\s\S]*?)-----END ARGO TUNNEL TOKEN-----/);
  if (!block) throw new Error("No tunnel origin certificate");
  const credential = JSON.parse(Buffer.from(block[1].replace(/\s/g, ""), "base64").toString("utf8"));
  // Print only zone metadata. Never print the origin certificate or its token.
  const key = credential.apiToken || credential.serviceToken;
  if (!key) throw new Error("Certificate has no supported API token");
  const response = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${domain}`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) });
  const body = await response.json();
  console.log(JSON.stringify({ provider: "cloudflare", status: response.status, success: body.success, zones: (Array.isArray(body.result) ? body.result : []).map((zone) => ({ name: zone.name, status: zone.status, nameservers: zone.name_servers, originalNameservers: zone.original_name_servers })), errorCodes: body.errors?.map((error) => error.code) || [] }));
} catch {
  console.log("Cloudflare zone status could not be read using the local tunnel certificate.");
}
