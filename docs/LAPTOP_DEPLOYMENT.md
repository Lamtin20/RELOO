# reloo.vn on the laptop server

The current application now uses a separate Vietnam self-hosted authentication/data stack and `auth.reloo.vn` / `crm.reloo.vn`. See [current operations and hosting](OPERATIONS_VIETNAM.md) for the updated deployment commands, migrations, source availability and outstanding managed-project deletion. The observations below describe the initial deployment before that migration.

## Live Deployment Checked on 2026-10-10 (Asia/Saigon)

- SSH to `root@192.168.1.102` is authenticated and the ED25519 host key is pinned in this development laptop's known-hosts file. The remote hostname is `reloo-homelab`; the inspected OS is Ubuntu **26.04 LTS**, rather than the earlier supplied 22.04 label. Windows LAN is `192.168.1.102`, Tailscale host `100.122.200.65`, and Tailscale WSL `100.107.146.119`.
- The web application is deployed at `/srv/reloo/apps/web`, compose project `reloo-web`, container `reloo-web-app-1`. It runs Node.js 22 / Next.js **16.4.0** with the custom Socket.io production server and Docker health checks. Next.js and affected dependencies were patched; `npm audit --omit=dev` reported zero advisories at verification time. Deprecated TypeScript `baseUrl` was removed while preserving the `@/*` path mapping.
- `https://reloo.vn` serves RELOO successfully. Cloudflare's Always Use HTTPS is enabled: HTTP redirects to HTTPS with 301, and `https://www.reloo.vn` redirects to the apex with 308. Authoritative nameservers remain `bingo.ns.cloudflare.com` and `kenneth.ns.cloudflare.com`.
- The existing `reloo_cloudflared` connector runs tunnel `reloo`, id `ef0e7f5a-1973-4263-9dc3-aa49a85a8ec3`. It shares `reloo_caddy`'s network namespace. Both published routes point to `http://app:3000`; `deploy/compose.homelab.yml` attaches the web app to the existing `reloo_frontend` network so that the connector can resolve `app`. No second connector was started.
- Application environment is stored in `.env.production`, and deployment settings in `.env.tunnel`, both mode 600 on the server and excluded from source archives/build context. The application port is bound to `127.0.0.1:3000` on WSL. Existing Postgres, Redis, MinIO, Caddy and monitoring containers remained running.
- Supabase remains the application's Auth/PostgREST/storage provider. Its marketplace bootstrap returned HTTP 200 with 13 listings, 8 public profiles and no anonymous orders. The standalone `reloo_core` PostgreSQL, Redis and MinIO were not substituted for these APIs, migrated or newly published to the Internet.
- Supabase Site URL is now `https://reloo.vn`, with four separate local/production callback allowlist entries. Google sign-in completed through the genuine provider and callback on the public domain. The test account has a real session and completed PENDING profile. Google remains in Testing, and phone/evidence activation gates remain enforced.
- Desktop/mobile screenshots and interaction checks were performed on the public website at 1440x1000 and 390x844. Live checks passed for pages/assets, optimized images, www redirect, backend auth gates, signup/origin validation, Google PKCE and protected WebSocket transport.

## Operate the Current Deployment

Run these commands on the homelab from `/srv/reloo/apps/web`:

```sh
docker compose -p reloo-web \
  --env-file .env.production --env-file .env.tunnel \
  -f compose.yml -f deploy/compose.homelab.yml \
  up -d --build --wait --wait-timeout 120 app

docker compose -p reloo-web \
  --env-file .env.production --env-file .env.tunnel \
  -f compose.yml -f deploy/compose.homelab.yml ps

curl --fail http://127.0.0.1:3000/api/health
curl --fail https://reloo.vn/api/health
```

Set `RELOO_DOCKER_NETWORK=reloo_frontend` in `.env.tunnel` for this homelab. The `app` service uses the existing connector; do not enable the compose `tunnel` profile here. Docker restart policy is `unless-stopped`, and the homelab Docker service is enabled. Windows must still start WSL/Docker after reboot, and the laptop must stay awake and connected for the website to remain available.

The main website and www are configured. Publishing the separate `app`, `api`, `dashboard` and `storage` hostnames is not part of this verified deployment. Do not expose administrative consoles without their intended authentication/access controls.

## SSH Troubleshooting

The earlier banner-exchange failure was resolved on the server by disabling `ssh.socket` and running `ssh.service` independently. SSH authentication now succeeds. The commands below are for future diagnosis if connectivity fails again.

With port 22 accepting connections but not returning an SSH banner, inspect the forwarding target in Windows PowerShell on the homelab:

```powershell
wsl --list --verbose
wsl -u root -- hostname -I
wsl -u root -- service ssh status
netsh interface portproxy show v4tov4
```

The default WSL distribution must be the intended Ubuntu host. If it is another distribution, specify the actual Ubuntu name with `-d`. A Windows listener on `192.168.1.102:22` must forward to Ubuntu's current reachable IPv4 address and port 22; a stale WSL NAT address can accept TCP while SSH fails before authentication. Inspect the returned addresses before replacing an existing mapping. Do not treat a successful TCP-only check as deployment readiness.

The server must be powered on and Ubuntu running. In Ubuntu:

```sh
sudo service ssh start
sudo ss -lntp 'sport = :22'
```

If OpenSSH is missing, install `openssh-server` first. Confirm SSH authentication locally; the bootstrap below preserves the existing account/password/key policy and does not enable root password login.

For WSL2 NAT, Windows must forward its LAN port to Ubuntu's current IPv4 address. `deploy/enable-homelab-ssh.ps1` starts the existing WSL SSH service, validates the target machine, avoids conflicting port proxies/firewall rules, and permits only the specified development laptop. Run it in an elevated PowerShell **on the homelab**, using the exact distribution name shown by `wsl --list --verbose`:

```powershell
.\deploy\enable-homelab-ssh.ps1 -ServerLanAddress 192.168.1.102 -AllowedClientAddress 192.168.1.104 -Distro Ubuntu -WhatIf
.\deploy\enable-homelab-ssh.ps1 -ServerLanAddress 192.168.1.102 -AllowedClientAddress 192.168.1.104 -Distro Ubuntu
```

The script refuses to run on this development laptop, whose LAN IP is `192.168.1.104`. It does not open PostgreSQL, Redis, MinIO or Sunshine. Existing broader firewall rules are not changed. Recheck forwarding after a WSL restart or LAN address change; inspect existing mappings before updating them. Do not forward SSH or database ports through the Internet router.

From the development workspace, recheck without credentials:

```powershell
node scripts/check-homelab.mjs
```

The checker now distinguishes `OPEN_SSH` (a real SSH greeting) from `OPEN_NO_SSH_BANNER` (only a TCP listener). Other ports' `OPEN` status means TCP acceptance only. If the LAN address changes again, set `RELOO_SERVER_LAN_IP` before running it.

References: [Microsoft WSL networking](https://learn.microsoft.com/en-us/windows/wsl/networking), [Cloudflare tunnel DNS routing](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/dns/).

## Prepare the server

`output/deployment/reloo-release.tar.gz` contains the current source changes and deployment files. It excludes credentials, dependencies and compiled files; extract it to a dedicated project directory on the real laptop and build there. The working tree has not been pushed to GitHub, so cloning the current remote alone would not include these edits. Regenerate with `node scripts/package-release.mjs` after further changes.

Use Node.js 22 or Docker, and keep the laptop powered, connected and awake. Disable sleep while serving. Keep API/database secrets in `.env.production` on the server. Never transfer `.env.local` through a public repository. The application is installed in `/srv/reloo/apps/web` with compose project `reloo-web`; inspect existing projects before installing or updating additional services.

Start commands now explicitly use production mode and keep the custom Socket.io server:

```sh
npm ci
npm run build
npm start
```

The production startup loads `.env.production.local`/`.env.production` according to Next's environment rules and requires a completed build. It does not run a development server. Bind to `127.0.0.1` when using a local reverse proxy/tunnel.

Configure `APP_ORIGIN=https://reloo.vn`. Set Supabase Site URL to the same origin, and allow `https://reloo.vn/auth/callback` and the password recovery callback query. Public Supabase values are inlined at build time; rebuild after changing them. Apply the schema and feature migration to the correct project before enabling accounts. Verify email delivery and the administrative review workflow.

## Choose the connection

### Fresh Installation Behind a Home Network or CGNAT

The current homelab already has a connector; use the commands in Operate the Current Deployment above. The following steps describe an alternative fresh installation with its own compose-managed connector.

Use Cloudflare Tunnel. No router port forwarding or fixed public IP is required.

1. Open the Cloudflare account that owns the `reloo.vn` zone and ensure the zone is Active. Set the exact two nameservers assigned to that zone at the domain registrar. Check DNSSEC/DS settings if delegations changed; do not blindly remove registrar settings.
2. Use the RELOO tunnel on the actual server. Keep its credential/token there, outside source control. Do not repurpose another site's default cloudflared config.
3. For Docker, set the RELOO tunnel's published application routes for `reloo.vn` and `www.reloo.vn` to `http://app:3000`, reachable from the compose `tunnel` service.
4. Place the production variables from `deploy/production.env.example` in `.env.production`, and the separate tunnel token from `deploy/tunnel.env.example` in `.env.tunnel`. The application container does not need this token. Then:

```sh
docker compose -p reloo-web --env-file .env.production --env-file .env.tunnel --profile tunnel up -d --build
```

The application port is bound to localhost on the host. The cloudflared service uses a server-only tunnel token. Set the tunnel's published route through Cloudflare; a token alone does not set hostname routes. Do not print `docker compose config` with real secrets.

For a native process, the tunnel routes instead use `http://127.0.0.1:3000`. `deploy/cloudflared.reloo.example.yml` is a template for a locally managed tunnel and requires that tunnel's actual JSON credentials. A remotely managed tunnel runs with its issued token/service configuration. A certificate for another zone must not be assumed to authorize DNS changes for RELOO.

`TRUST_PROXY=false` is intentional until the deployment's proxy header behavior is configured and tested. Do not treat arbitrary X-Forwarded-For values as identity evidence.

### Server with a fixed public IP

Point the apex `A` record to that actual IP and `www` to the apex. Forward TCP 80 and 443 to Caddy on the server. Keep Node's port private. `deploy/Caddyfile` proxies WebSockets and HTTPS and redirects www to the apex. Caddy obtains TLS certificates after DNS and ports work.

On Linux, `deploy/reloo.service` is a service template; adjust the OS user, project path and Node executable before enabling it. On Windows, register the production Node process using the server's existing service supervisor or a Task Scheduler task for the dedicated account, and use a separate managed cloudflared service. Service creation is performed on the real laptop after its access and OS are confirmed.

## Verify before publishing

```sh
curl --fail http://127.0.0.1:3000/api/health
curl --fail https://reloo.vn/api/health
curl -I https://www.reloo.vn/
```

Verify DNS, HTTPS, redirects, cookies, email confirmation/recovery, GHTK quotes and authenticated Socket.io. `/api/health` is a liveness endpoint, not a promise that external integrations or the database are available. Start a browser session on the domain and verify the full flow before claiming deployment complete.

The Docker application and homelab network override have been built and executed on the external laptop. The native systemd/Caddy templates are alternatives and were not installed over the existing stack. The SSH bootstrap script has passed syntax validation; SSH was repaired directly on the server by the user instead.

Public-domain verification included a genuine Google login and real backend session. Email delivery/recovery, GHTK shipment webhooks, approved affiliate conversions/payouts and activation-source availability require their separate operational checks; `/api/health` does not establish those integrations. Local auth/security tests and TypeScript checks passed after the dependency update.
