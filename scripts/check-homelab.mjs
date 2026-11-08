import net from "node:net";

const timeoutMs = 4000;
const lanAddress = process.env.RELOO_SERVER_LAN_IP || "192.168.1.102";
const hosts = [lanAddress, "100.122.200.65", "100.107.146.119"];
if (net.isIP(lanAddress) !== 4) throw new Error("RELOO_SERVER_LAN_IP must be an IPv4 address.");
const ports = [22, 5432, 6379, 9000, 47990];
const domains = ["reloo.vn", "www.reloo.vn", "app.reloo.vn", "api.reloo.vn", "dashboard.reloo.vn", "storage.reloo.vn"];

function checkPort(host, port) {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = net.createConnection({ host, port });
    let settled = false;
    let connected = false;
    let greeting = "";
    const finish = (status, sshBanner) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ host, port, status, tcpConnected: connected, ...(sshBanner ? { sshBanner } : {}), elapsedMs: Date.now() - started });
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      connected = true;
      if (port !== 22) finish("OPEN");
    });
    socket.on("data", (data) => {
      if (port !== 22) return;
      greeting = (greeting + data.toString("ascii")).slice(0, 2048);
      const banner = greeting.match(/(?:^|\r?\n)(SSH-(?:2\.0|1\.99)-[^\r\n]+)/)?.[1];
      if (banner) finish("OPEN_SSH", banner);
    });
    socket.once("timeout", () => finish(connected ? "OPEN_NO_SSH_BANNER" : "TIMEOUT"));
    socket.once("end", () => finish(connected ? "CLOSED_BEFORE_SSH_BANNER" : "CLOSED"));
    socket.once("error", (error) => finish(error.code || "ERROR"));
  });
}

async function checkDns(name, type) {
  try {
    const url = new URL("https://dns.google/resolve");
    url.searchParams.set("name", name);
    url.searchParams.set("type", type);
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return { name, type, error: `HTTP_${response.status}` };
    const data = await response.json();
    return { name, type, status: data.Status, answers: (data.Answer || []).map(({ data: value }) => value) };
  } catch {
    return { name, type, error: "LOOKUP_UNAVAILABLE" };
  }
}

async function checkHttp(url) {
  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    const body = (await response.text()).slice(0, 64000);
    const result = { url, status: response.status };
    if (response.status === 530 && /\b1033\b/.test(body)) result.error = "CLOUDFLARE_TUNNEL_DISCONNECTED";
    if (/^Hello world\s*$/i.test(body)) result.placeholder = "HELLO_WORLD";
    try {
      const health = JSON.parse(body);
      result.relooHealthy = response.ok && health.service === "reloo" && health.status === "ok";
    } catch {
      result.relooHealthy = false;
    }
    return result;
  } catch (error) {
    return { url, error: error.cause?.code || (error.name === "TimeoutError" ? "TIMEOUT" : "HTTP_UNAVAILABLE") };
  }
}

const [tcp, dns, https, origin] = await Promise.all([
  Promise.all(hosts.flatMap((host) => ports.map((port) => checkPort(host, port)))),
  Promise.all([checkDns("reloo.vn", "NS"), ...domains.map((domain) => checkDns(domain, "A"))]),
  Promise.all(domains.map((domain) => checkHttp(`https://${domain}/api/health`))),
  Promise.all(["/", "/api/health"].map((path) => checkHttp(`http://${lanAddress}:3000${path}`))),
]);

console.log(JSON.stringify({ checkedAt: new Date().toISOString(), tcp, dns, https, origin }, null, 2));
