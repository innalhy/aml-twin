# TwinAML on hosting-vps

The deployed investigation pilot is available at [https://amlsim.spectrumvps.tech](https://amlsim.spectrumvps.tech). The HTTPS domain routes to the Node process, which serves the built React interface and `/api` together on **100.74.159.31:8080**. This remains the hosted application port; local development keeps its default port 8787. Direct VPS administration requires the existing Tailscale access.

The current release is `20261013T083052Z`, deployed to `hosting-vps` as user `torres`. It runs `/usr/bin/node` version 22.22.1 with file-backed SQLite. The optional Cloudflare adapter is a separate hosting path and is not used by this deployment.

## Deployed layout

All paths below are relative to `~/agents/twinaml/` on the VPS:

```text
run.sh                         # starts the current Node bundle
.env                           # runtime settings, mode 600
current -> releases/20261013T083052Z
releases/20261013T083052Z/
  workers/api/dist/server.mjs   # bundled server, engine and server-only evidence
  frontend/dist/               # built learner interface
data/investigation.sqlite      # persistent sessions, outside every release
```

Keep the bundle at `workers/api/dist/server.mjs` and the interface at `frontend/dist/` within each release. The server resolves static files relative to that layout. It needs Node alone on the VPS; no frontend build tools or Cloudflare account are required at runtime.

| Runtime setting | Deployed value |
| --- | --- |
| `HOST` | `100.74.159.31` |
| `PORT` | `8080` |
| `TWINAML_FRONTEND_ORIGIN` | `https://amlsim.spectrumvps.tech` |
| `TWINAML_DB` | Absolute path to `~/agents/twinaml/data/investigation.sqlite` |

Use the HTTPS domain for browser gameplay. The API accepts that exact browser origin; the former IP-based browser URL is no longer the configured origin. A different hostname or scheme requires an allowed-origin configuration change. Requests without an Origin header, such as the direct health check below, still work. The SQLite file is mode 600 in a mode-700 data directory. Preserve it across releases to preserve learner sessions.

## Service operation

The existing user service `agent@twinaml.service` is enabled, loads `.env`, and runs `run.sh`. User lingering is enabled, so the user service can start at boot and continue after logout. Its drop-in sets `NoNewPrivileges=yes` and `UMask=0077`. The existing agent template applies a 6-GB memory limit and a three-CPU quota; these are limits, not a measured classroom capacity guarantee.

Run these commands on `hosting-vps` as `torres`:

```bash
systemctl --user status agent@twinaml.service
systemctl --user restart agent@twinaml.service
journalctl --user -u agent@twinaml.service -n 100 --no-pager
curl --fail http://100.74.159.31:8080/health
```

The health response is `{"status":"ok","service":"twinaml-api"}`. For live logs, use `journalctl --user -u agent@twinaml.service -f`. The service is already enabled; if deliberately disabled later, restore its enablement with `systemctl --user enable --now agent@twinaml.service`.

## Build, update and rollback

Build on the development machine from the repository root:

```bash
npm --prefix frontend ci
npm --prefix frontend run build
npm --prefix workers/api ci
npm --prefix workers/api run build:node
```

For an update, copy the new `workers/api/dist/server.mjs` and `frontend/dist/` into a new release directory with the same layout. Retain the previous release. Point `current` to the new release, restart `agent@twinaml.service`, then check the health endpoint, the interface and a previously saved investigation session. Runtime settings stay in `.env`; persistent data stays in `data/`.

Before a change to session storage, make a consistent SQLite backup using SQLite's backup mechanism, or stop the service and retain the database together with any `-wal` and `-shm` files. A learner JSON export is a run history, not a database backup.

To roll back the application, point `current` to the previous retained release and restart the service. Keep the same `TWINAML_DB` and data directory. Application rollback does not restore or migrate session data; the selected bundle must accept the stored session version. An incompatible bundle returns `incompatible_session` rather than silently rewriting saved runs.

For local development, use Node 22.13 or later and the commands in the [API README](../workers/api/README.md). The Node defaults remain `127.0.0.1:8787`; Vite proxies `/api` to that port. Local defaults do not change the VPS settings above.

## Access and validation scope

The Node listener remains on the VPS's Tailscale address and port 8080. The HTTPS domain already routes to that listener. The domain-origin fix did not change SSH, Tailscale, firewall, DNS or proxy settings.

The pilot uses an opaque session identifier as access to a run and has no account login, institutional tenancy or instructor permissions. Public course access needs an access-control design before rollout. The app contains synthetic classroom records and does not submit reports or connect to a bank.

Verified on 13 October 2026 (America/New_York): the service listens at `100.74.159.31:8080`, the frontend returns HTTP 200, the health endpoint returns the expected JSON, and eleven API integration checks passed against port 8080. Three saved investigation views matched their pre-switch state after the service restart, including an in-progress browser investigation with released evidence and an outbound hold. Port 8787 is no longer listening on the VPS.

The subsequent domain-origin fix was checked through `https://amlsim.spectrumvps.tech`: all eleven API integration checks passed, the configured HTTPS origin and preflight succeeded, an unrelated origin remained rejected, and a saved investigation matched its state before the restart. A browser shift started, requested supporting documents, received EV-006 at minute 8, and restored that progress after reload without an origin error.

No reboot was performed; service enablement and user lingering confirm the configured startup mechanism. No class-size load test or production capacity guarantee is established by these checks.
