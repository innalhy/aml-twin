# Development environments

## Local development

Use Node **22.13 or later** with npm. From the repository root, install the existing API and frontend lockfiles once:

```bash
npm run setup
```

Start both servers with one command:

```bash
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). The training portal is at `/`, the AML operations workflow is at `/operations`, the earlier investigation is at `/investigation`, and the case library is at `/cases`. Vite proxies `/api` to the Node API on `127.0.0.1:8787`. The launcher checks both ports and validates API health before starting Vite. If a port is occupied, stop the earlier local process and rerun the command.

Frontend edits use Vite's updates. Changes to imported API code and data rebuild `workers/api/dist/dev-server.mjs` and restart the API automatically; failed rebuilds print the error for correction. **Ctrl-C stops both servers and the build watcher.** After a dependency or lockfile change, stop the servers and run `npm run setup` again.

Local progress is stored in the ignored `data/local/development.sqlite`, separate from the earlier local `investigation.sqlite` and the hosted database. Rebuilds and restarts preserve it. The launcher pins local bind addresses, ports, database path and frontend origin, and keeps `VITE_API_URL` empty so local requests use the Vite proxy. No production database or deployment environment is required.

### Anonymous synthetic runs and account checks

The one-command environment runs in explicit **anonymous development mode**: the launcher sets `NODE_ENV=development` and `TWINAML_DEV_MODE=1`, and leaves the browser's Clerk publishable key empty. You can create and change synthetic runs immediately, without Clerk or Google setup. The development runtime refuses to open a database containing account-owned runs. These settings do not alter the account checks used by the normal Node/VPS runtime.

To test Clerk and Google sign-in, use a matching Clerk **development instance** and the separate two-terminal commands in [account setup](accounts.md), with a separate account-test database. Do not set `TWINAML_DEV_MODE=1` for that test. The root launcher deliberately keeps its database and anonymous browser mode fixed, even when account keys or production settings exist in the shell or local environment files.

The launcher reads `workers/api/.env` for other API values; inherited process values take precedence, followed by its fixed local development settings. Restart after changing API environment values. Vite loads its usual frontend development files, with `VITE_API_URL` and `VITE_CLERK_PUBLISHABLE_KEY` forced empty by the launcher. Secret keys still belong outside `VITE_` variables and Git.

Check health at [http://127.0.0.1:8787/health](http://127.0.0.1:8787/health). Relevant checks remain:

```bash
npm --prefix frontend run build
npm --prefix workers/api run typecheck
npm --prefix workers/api test
npm --prefix workers/api run test:node
```

The last command uses temporary test databases. Real Google sign-in still needs the configured development instance and a browser check.

## Hosted development on OVH

Open [https://dev-amltwin.spectrumvps.tech](https://dev-amltwin.spectrumvps.tech). The development app serves the role-based learning center at `/`, the environment gallery at `/simulations`, the AML simulation at `/simulation`, the compliance tools hub at `/tools`, the AML operations workflow at `/operations`, The Second Ledger at `/investigation`, and the case library at `/cases`, with a persistent yellow development banner. Read the active release identifier from `current/release.json` using the command below. This is an independent app on the existing 4-core / 8-GB OVH server. The production app stays at [https://amltwin.spectrumvps.tech](https://amltwin.spectrumvps.tech) on release `20261102T045424Z`.

| Setting | Development | Production |
| --- | --- | --- |
| Application root | `/home/debian/agents/twinaml-dev` | `/home/debian/agents/twinaml` |
| User service | `twinaml-dev.service` | `twinaml.service` |
| Loopback listener | `127.0.0.1:8081` | `127.0.0.1:8080` |
| Database | `twinaml-dev/data/investigation.sqlite` | `twinaml/data/investigation.sqlite` |
| Release selection | `twinaml-dev/current` | `twinaml/current` |

Hosted development has its own private `.env`, release directories, backups and fresh SQLite database. Production session data and credentials were not copied. The dev service uses the installed Node 22.23.4 runtime through a pinned symlink, with `MemoryMax=768M`, `CPUQuota=50%` and `Nice=10`. It is enabled for automatic startup through the existing user lingering setup. These limits keep development bounded; capacity testing has not been performed.

The existing Cloudflare Tunnel routes the dev hostname to port 8081 and preserves the production route to port 8080. Both ports stay on loopback. The dev runtime allows its own exact HTTPS Origin and the existing local development Origins; requests carrying the production Origin are rejected. The tunnel service is shared by these two hostnames, so do not stop it to restart or retire only the dev app. Dev builds include `noindex,nofollow`; the site is still publicly reachable.

Hosted development explicitly sets `NODE_ENV=development` and `TWINAML_DEV_MODE=1`. Anyone can start synthetic training runs, and an opaque run ID grants access to that dev run. It does not provide private account progress or exercise Google authentication. The normal account-enabled runtime remains fail-closed. Never point anonymous development at account-owned data; the runtime refuses databases containing `run_owners` rows.

### Release current source to development

With dependencies installed and Tailscale connected, check the SSH alias and deploy from the repository root:

```bash
ssh ovh-ca hostname
npm run deploy:dev
```

This command releases the **current working tree**, including uncommitted changes. It builds the frontend into ignored `frontend/dist-dev/`, forcing the API URL and Clerk publishable key empty and setting `VITE_APP_ENV=development`. The normal `frontend/dist/` build is kept separate. The API bundle and complete dev frontend are copied into a timestamped release on OVH; no `.env`, source checkout, dependencies, credentials or local database are uploaded.

Before switching `current`, the script verifies the fixed dev runtime settings and takes a consistent SQLite backup under `twinaml-dev/backups/`. It restarts only `twinaml-dev.service`, then verifies health, anonymous mode and the exact release stamp in the served HTML. A startup-check failure restores the previous release link and restarts it. That rollback changes code only; it does not restore old database contents. Retained releases and SQLite backups remain available for recovery. Prefer a compatible account-aware release for rollback: the original anonymous seed code ignores ownership and exposes internal fields from newer simulation runs, even when the stored state version matches. Use that old code only before any writes with the new release or with a deliberate database restore that accounts for losing later writes.

Useful commands after `ssh ovh-ca`:

```bash
systemctl --user status twinaml-dev.service
systemctl --user restart twinaml-dev.service
journalctl --user -u twinaml-dev.service -n 100 --no-pager
curl --fail http://127.0.0.1:8081/health
cat /home/debian/agents/twinaml-dev/current/release.json
```

The initial empty environment was seeded from production's immutable release `20261102T045424Z`, copying only its matching built frontend and server. It was then updated to the current source in explicit development mode. Production retains its existing release, service settings and sessions. Neither local source edits nor `npm run dev` update the hosted site; use `npm run deploy:dev` when a change is ready to test there. Promoting changes to production remains a separate action under [VPS releases](vps.md).

Production replacement `20261102T065243Z` is staged and preflighted only. Its Clerk production instance and five Cloudflare CNAME records are prepared, with DNS, SSL and mail verification complete; Google OAuth credentials remain pending. The owner is configuring Google in Clerk and explicitly asked to wait. Development remains available anonymously while production activation is paused for that setup.

### Verification on 2 November 2026

Current development release `20261102T064244Z` passed public simulation creation and advancement to minute 1. The saved simulation reloaded with the same state after restarting `twinaml-dev.service`. Production remains on its earlier release.

Earlier development release `20261102T052101Z` passed public checks for all three client routes then available, anonymous run creation and saving, cross-environment Origin rejection, and 13 existing HTTP integration checks. A saved dev run matched exactly after restarting `twinaml-dev.service`, and its ID returned 404 from production. SQLite `quick_check` returned `ok`. Production's PID, release link and hashes of every saved session snapshot remained unchanged from that preflight.

Earlier local checks covered startup, Vite proxying, automatic API rebuild/restart with saved state preserved, occupied-port errors and Ctrl-C cleanup. The frontend production build, API typecheck and all 26 Node tests then present passed, including four development-mode boundary tests and the account checks. Dependencies were already installed; the setup command's nested `npm ci` installs were not repeated. Real Google OAuth, automatic rollback on an induced failed release, host reboot and capacity tests were not performed.
