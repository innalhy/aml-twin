# TwinAML on the OVH VPS

TwinAML runs on the owner's OVH machine, `ovh-ca-4c-8gb`: 4 vCPU, 7,757 MiB RAM (marketed as 8 GB), Debian 13.7. Use SSH alias `ovh-ca` as `debian` over the existing Tailscale connection (`100.99.63.39`). This is separate from the former `hosting-vps` machine (`100.74.159.31`, 4 vCPU / 16 GB).

The training portal and AML simulation are deployed to [hosted development](https://dev-amltwin.spectrumvps.tech) as release `20261102T064244Z`. Production still runs the earlier release described below; its staged replacement has not been activated.

The public address is [https://amltwin.spectrumvps.tech](https://amltwin.spectrumvps.tech). `/` serves the Hong Kong AML workflow, `/investigation` preserves The Second Ledger pilot, and `/cases` serves the eleven-workflow case library. The Node process serves the built frontend and API together on `127.0.0.1:8080`. The optional Worker adapter is a separate hosting path.

Release `20261102T045424Z` is installed and the public hostname uses the dedicated, remotely managed Cloudflare Tunnel `twinaml-ovh`. Cutover browser/API checks and persistence checks after an application restart passed; details and the subsequent hostname retirement are below.

Production release `20261102T065243Z` is staged and preflighted only. It will serve the dashboard at `/`, the AML workbench at `/operations`, and the investigation simulation at `/simulation`, with Clerk sign-in. A Clerk production instance has been created for `amltwin.spectrumvps.tech`, and five Cloudflare CNAME records were added; Clerk verified DNS, SSL and mail records. Google OAuth credentials remain pending. The owner is configuring Google in Clerk and explicitly asked to wait. Wait for that setup before switching production, then verify real sign-in and account-owned progress before declaring the release complete.

The staged frontend uses the production publishable key. Its separately staged runtime settings use the matching production Frontend API issuer and `CLERK_JWT_KEY` public-key verification, fetched from Clerk's HTTPS JWKS endpoint; no Clerk secret key was transferred. Refresh this verification key if Clerk rotates its signing key. The pending environment file also passed a Node environment-file parse and public-key check; the active production `.env` remains unchanged. The actual application service has not loaded the pending settings.

## Files and runtime

The application root is `/home/debian/agents/twinaml/`:

```text
run.sh                              # resolves current to its canonical release before exec
.env                                # runtime settings, mode 600
current -> releases/20261102T045424Z
releases/20261102T045424Z/
  workers/api/dist/server.mjs        # bundled server, engine and server-only synthetic data
  frontend/dist/                    # complete built client, including hashed assets
runtime/node/                       # symlink to the app-specific Node 22.23.4 directory
  bin/node                          # executable used by run.sh
runtime/cloudflared                 # app-specific cloudflared 2026.10.7 binary
tunnel.token                        # tunnel credential, mode 600; never copy into a release
data/investigation.sqlite           # persistent data, mode 600 in a mode-700 directory
backups/
  preflight.sqlite
  final.sqlite
  final-metadata.json
```

The app-specific Node 22.23.4 Linux x64 and cloudflared 2026.10.7 downloads were checked against their official release SHA values. System runtimes need not be changed. Node's built-in `node:sqlite` is used; the bundle needs no `node_modules`, source checkout or build tools on the server.

Preserve the release layout above: the bundle resolves its project root three directories above `workers/api/dist/server.mjs` and serves `frontend/dist/` under that root. `run.sh` uses `readlink -f current`, changes to that canonical release directory and executes the app-specific Node binary. This also satisfies the bundle's direct-entry path check.

| Runtime setting | Deployed value |
| --- | --- |
| `HOST` | `127.0.0.1` |
| `PORT` | `8080` |
| `TWINAML_FRONTEND_ORIGIN` | `https://amltwin.spectrumvps.tech` |
| `TWINAML_DB` | `/home/debian/agents/twinaml/data/investigation.sqlite` |

Keep the absolute database path outside releases. Startup adds the `aml_sessions` table alongside the existing `sessions` and `case_sessions` tables. Saved runs are not rebuilt from the frontend. Preserve `.env`, the database directory and their permissions across updates.

## Services and tunnel

Two user services run as `debian`: `twinaml.service` for the application and `twinaml-tunnel.service` for the dedicated tunnel. Both are enabled and active; user lingering is enabled. The app service loads `.env`, runs `run.sh`, restarts automatically, and sets `MemoryMax=6G`, `CPUQuota=300%`, `NoNewPrivileges=yes` and `UMask=0077`. These are configured limits, not measured classroom capacity.

The tunnel connects `amltwin.spectrumvps.tech` to `http://127.0.0.1:8080` on OVH. It uses `/home/debian/agents/twinaml/tunnel.token`; its local metrics listener is `127.0.0.1:20241`. The hostname's DNS CNAME targets this dedicated tunnel. Manage its ingress through Cloudflare's remotely managed tunnel configuration; the former server's local `/etc/cloudflared/config.yml` does not control this deployment. Never put tunnel tokens, tunnel/account identifiers or credentials in the repository.

After connecting with `ssh ovh-ca`, run:

```bash
systemctl --user status twinaml.service twinaml-tunnel.service
systemctl --user restart twinaml.service
journalctl --user -u twinaml.service -n 100 --no-pager
journalctl --user -u twinaml-tunnel.service -n 100 --no-pager
curl --fail http://127.0.0.1:8080/health
```

Health returns `{"status":"ok","service":"twinaml-api"}`. The listener is loopback-only; use the canonical HTTPS address for browser access. API Origin checks accept `https://amltwin.spectrumvps.tech` and the documented local development origins. Changing a public origin requires updating `.env` and restarting the app.

## Migration record and rollback

Migration release `20261102T045424Z` copied **18 investigation sessions and 9 case-library sessions** from `hosting-vps`. The old app was stopped for the final SQLite snapshot. Full-table hashes matched after import on OVH. The final source backup and metadata remain at `/home/torres/agents/twinaml/backups/ovh-migration-20261102T045424Z/` on the former machine. OVH copies are `/home/debian/agents/twinaml/backups/final.sqlite` and `final-metadata.json`, alongside `preflight.sqlite`.

The former application release `20261013T094200Z` remains on `hosting-vps` as a fallback. Its application service, `agent@twinaml.service`, is disabled and inactive. Its shared `cloudflared` service remains active and unchanged for other applications: **do not stop or disable that shared tunnel**.

For an ordinary application rollback on OVH, prefer a retained, compatible account-aware release, replace `current` and restart `twinaml.service`. Keep the same persistent database. Release rollback does not restore or migrate saved sessions. State version checks alone do not establish compatibility: the pre-account release `20261102T045424Z` ignores run ownership and can expose internal fields from newer simulation snapshots. Use that old code only before any writes with the new release, or with a deliberate database restore that accounts for losing later writes. Do not run it against a database containing new account-owned or simulation runs.

If moving traffic back to the former machine after live writes on OVH, first take a consistent backup of the **latest OVH database** and transfer it to the fallback's persistent database path with its app stopped. Install a compatible account-aware build before serving a database containing account-owned or newer simulation runs; the retained anonymous fallback is insufficient. Verify the selected app's state and ownership handling, start and check that origin, then switch the canonical hostname. Restoring the migration-time database instead would discard post-cutover sessions and changes. Coordinate the write stop and DNS change so two origins do not develop separate histories.

## Subsequent releases

Build both artifacts on the development machine from the repository root. For an account-enabled production release, explicitly supply the matching production `VITE_CLERK_PUBLISHABLE_KEY`, keep `VITE_API_URL` empty, and set `VITE_APP_ENV=production`; do not reuse `dist-dev` or the local Clerk development key. Keep the matching server verification settings in the private runtime `.env`, with anonymous development mode disabled.

```bash
npm --prefix frontend ci
npm --prefix frontend run build
npm --prefix workers/api ci
npm --prefix workers/api run build:node
```

Copy `workers/api/dist/server.mjs` and the complete `frontend/dist/` into a new release directory on OVH; retain the current release. Before switching, create a consistent SQLite backup using SQLite's backup mechanism, or stop the app and retain the database together with any `-wal` and `-shm` files. Learner JSON exports are histories, not database backups.

Replace `current`, restart `twinaml.service`, and check direct and public health, all client routes, a previously saved run, and a new AML workflow save/reload. For an account release, also verify real Clerk sign-in and isolation between accounts. Ordinary releases do not require a DNS or tunnel change. Runtime settings and persistent data stay outside release directories.

Local development keeps Node 22.13 or later, `127.0.0.1:8787`, and Vite's API proxy. Root `npm run dev` starts both servers with a separate local test database. A hosted development environment now runs at [https://dev-amltwin.spectrumvps.tech](https://dev-amltwin.spectrumvps.tech), using `/home/debian/agents/twinaml-dev`, `twinaml-dev.service`, loopback port 8081 and its own fresh database. `npm run deploy:dev` releases only to that app. Development uses explicit anonymous synthetic runs, with a visible banner; production retains the release and runtime settings documented above. See [development setup and releases](development.md).

## Verification scope

The following checks passed at the cutover of release `20261102T045424Z`, when both `amltwin.spectrumvps.tech` and the former `amlsim.spectrumvps.tech` alias were active:

- Both public hosts returned the new client on `/`, `/investigation` and `/cases`; a browser created three rule-generated alerts and restored the run after reload. All thirteen existing HTTP integration checks passed against the primary hostname.
- The public AML workflow completed claim, case creation, cited finding, complete STR training draft, submission and reviewer approval. Both hostnames returned the same saved view. Rerunning the rule added no duplicates; raising the threshold produced zero current matches while preserving the three historical alerts.
- A manual OVH app restart changed its process ID and preserved the exact saved AML view through both public hostnames. Every original snapshot in the eighteen investigation and nine case-library sessions still matched its source SHA, and SQLite `quick_check` returned `ok`.
- Both OVH services are active and enabled, user lingering is enabled, and the app and tunnel metrics listen only on `127.0.0.1:8080` and `127.0.0.1:20241`. The former app is disabled and inactive; its shared tunnel remains active.

On 2 November 2026, the `amlsim.spectrumvps.tech` alias was retired: its DNS record and tunnel ingress were removed, and the app's configured public Origin was reduced to `https://amltwin.spectrumvps.tech`. Post-retirement checks confirmed HTTP 200 for the canonical site and health endpoint, HTTP 403 for requests carrying the retired Origin, unchanged saved AML state after the app restart, and no alias DNS record. The retired hostname no longer serves the application; its observed public response after retirement was HTTP 530.

Staged release `20261102T065243Z` was checked in an isolated server process against a copy of the production database, with staged account settings supplied directly to that process. All 32 legacy runs were readable, guest creation returned HTTP 401 on all four creation endpoints, six client routes returned HTTP 200, and every original snapshot hash remained unchanged. These checks did not activate the production environment settings, test a systemd start of the staged release, or verify real Clerk/Google sign-in. Production remains on `20261102T045424Z` while the owner completes Google setup. DNS, SSL and mail verification are complete. After activation, verify real sign-in, account isolation, and saved-run persistence through a restart.

No reboot or class-size load test was performed. See [account setup](accounts.md) for frontend build settings and server runtime keys. The active production release predates the account change. Institutional tenancy and instructor permissions remain out of scope. Role switching is an audited classroom control, separate from account sign-in. All records are synthetic, and the application does not connect to a bank or submit reports to JFIU.
