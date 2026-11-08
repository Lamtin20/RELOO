# Windows/WSL recovery — 15 October 2026

The Windows host was reachable while the Ubuntu WSL distribution was stopped and Cloudflare returned 1033. After the operator started Ubuntu, SSH and the public website recovered.

Installed the `RELOO-WSL-Web` scheduled task for the existing Windows account `DESKTOP-DJ1NMKK\KENT` using `deploy/install-server-autostart.ps1`. The task runs hidden at account sign-in, starts the existing Docker/SSH/Tailscale services, starts the known application/tunnel containers and keeps an active WSL command running. It stores no password and restarts after task failure.

Verified task state Running (267009 means currently running), a separate sleep-60 keepalive process, enabled Linux services, container restart policies and HTTP 200 for the public homepage and health endpoint.

The original PowerShell sleep-infinity window may be closed after installation. The Windows account must remain signed in. After restarting Windows, sign in to that account to launch the task. This setup does not prevent Windows shutdown, sign-out, suspend, power loss or Internet disconnection.

2026-10-17: K3s is enabled inside the existing Ubuntu distribution, with Docker/Tailscale/firewall ordering and release-sync/backup timers. This adds pod recovery and bounded web-renderer scaling; it does not start Windows or make one physical host highly available. No Windows reboot/power-loss recovery drill was performed for this rollout. See `docs/KUBERNETES_OPERATIONS.md` for scope, observed tests and rollback.

On the server, inspect with `Get-ScheduledTask -TaskName RELOO-WSL-Web` and `Get-ScheduledTaskInfo -TaskName RELOO-WSL-Web`. The generated launcher is under the account's LocalAppData/RELOO-Server directory.
