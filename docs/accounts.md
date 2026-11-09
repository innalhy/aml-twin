# Accounts and saved progress

The Node/VPS application uses Clerk for sign-up, sign-in, Google OAuth and sign-out. The API verifies the short-lived Clerk session token before identifying a learner. SQLite remains the source of truth for training progress; Clerk does not store training snapshots. No passwords or OAuth credentials are stored in the training database.

Local development was connected to the owner's existing Clerk application on 2 November 2026. Google is enabled, Clerk's diagnostics pass the authentication/link/environment checks, and the real sign-in controls render in Chrome. Development keys are in ignored, mode-600 environment files. No test user was created; the owner can sign in with Google to verify their first account. Production Clerk setup and deployment remain separate steps. A checkout without Clerk configuration shows a setup message and refuses to create new runs, while health checks and existing unclaimed run APIs still work. The explicit anonymous [development environments](development.md) run without Clerk, using separate synthetic data; they do not verify Google sign-in or account synchronization.

## Connect Clerk and Google

1. Select the intended application in the [Clerk Dashboard](https://dashboard.clerk.com/). Use its development instance locally and its production instance for the public VPS.
2. Under **SSO connections**, add **Google** for all users and enable sign-up and sign-in. Clerk's development instance supports shared Google OAuth credentials. Production requires your Google OAuth client ID and secret, configured in Clerk with its provided redirect URI. Follow [Clerk's Google setup](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google); publish the Google OAuth app before public use. Google credentials stay in Clerk, never in this repository.
3. Copy `frontend/.env.example` to `frontend/.env.local` and set `VITE_CLERK_PUBLISHABLE_KEY` from that instance's **API keys** page. This key is public and goes into the frontend build. Enable any other desired sign-in methods in Clerk; the sign-in component renders those configured methods, including Google.
4. Copy `workers/api/.env.example` to `workers/api/.env`. Set `CLERK_ISSUER` to the exact HTTPS **Frontend API URL**, with no trailing slash, and `CLERK_SECRET_KEY` from the same instance. For example, an issuer can be `https://your-instance.clerk.accounts.dev`; it is not the application website or Account Portal URL. Alternatively, set `CLERK_JWT_KEY` to the instance's PEM JWT public key for networkless verification. Public keys containing literal `\n` are supported. Keep private keys and secret keys out of `VITE_` variables and Git.
5. Set `TWINAML_FRONTEND_ORIGIN` to the exact web origin in production. Several origins can be separated by commas. The token's authorized party must match an allowed origin as well as the configured issuer. The existing local development origins on ports 5173, 4173 and 8787 are included.

Clerk's [React quickstart](https://clerk.com/docs/react/getting-started/quickstart) and [session verification reference](https://clerk.com/docs/reference/backend/verify-token) describe the SDKs used here. No custom session-token template is needed. An optional signed `email` session claim is stored as a display value; identity and ownership always use Clerk's verified `sub` user ID. Without that claim, the browser displays the email provided by Clerk's user component and the local email field stays empty.

From the repository root, run the API with its local environment file:

```bash
npm --prefix workers/api run build:node
cd workers/api
node --env-file=.env dist/server.mjs
```

In another terminal, run `npm run dev` from `frontend/`. Vite loads `.env.local` automatically and proxies `/api`. For a single-origin build, run `npm --prefix frontend run build` from the root first; the Node server serves it at `http://127.0.0.1:8787`. If `VITE_API_URL` is used for a separate API origin, add the web origin to the server allowlist. Authentication uses the Authorization header, without cross-site API cookies.

For a VPS release, add the server settings to the existing private runtime `.env`, build the frontend with the matching production publishable key, and preserve the existing `TWINAML_DB` path. Follow [VPS releases](vps.md). This implementation does not configure Clerk remotely or deploy a release.

## Learner experience

Sign in with Google or another method enabled in Clerk. New runs in **Hong Kong AML**, **The Second Ledger**, and the **Case library** belong to that account automatically. Submitted actions save on the server immediately. **My progress** lists all earlier runs, their saved progress and last-save time. **Resume** opens the correct training area, including on another browser or device after signing into the same Clerk account.

Starting another run preserves the earlier run in My progress. Signing out or changing accounts removes the previous workspace from the screen. Browser resume shortcuts are scoped to the Clerk user ID. Tokens are obtained from Clerk on demand and are not stored by TwinAML in local storage. Unsubmitted form text, selections and open tabs remain local drafts and are not synchronized across devices.

Earlier runs remain in their original tables and retain their exact snapshots. They are not automatically assigned to whoever next uses a shared browser. In **My progress → Add progress from before accounts**, explicitly add your own browser-saved run or paste its full opaque run ID from an export. Claiming is atomic and makes the run private to the account. Already-owned runs cannot be reassigned through this API. Until claimed, a legacy run remains accessible to anyone holding its old opaque ID; it is never listed publicly or in another account's progress list.

The training role selector still simulates analyst, reviewer and administrator identities within your own run. Clerk accounts do not add instructor roles, shared classroom access or organizational permissions.

## API and storage

Send `Authorization: Bearer <Clerk session token>` for account operations and owned runs. Only verified Clerk user sessions are accepted; expired, tampered, pending, wrong-issuer or wrong-origin tokens are rejected. API authorization does not accept user IDs or email supplied by the client as identity.

| Route | Result |
| --- | --- |
| `GET /api/account` | `{ enabled, configured, user }`; `user` is null when signed out. Missing server settings return `configured: false`. |
| `GET /api/account/runs` | `{ runs: [{ kind, id, title, progress, createdAt, updatedAt }] }`, newest saved first, for the current account only. |
| `POST /api/account/claim` | JSON `{ kind: "aml" \| "investigation" \| "case", id }`; returns `{ run }` after assigning an unowned legacy run. |

Creating any new run on Node requires sign-in. Owned-run reads and mutations return 404 for guests or another account. A supplied invalid bearer token returns 401; a new-run or account operation with missing Clerk server configuration returns 503. Claim requests require JSON and are limited to 4 KiB. Sign-up/sign-in/sign-out belong to Clerk's SDK, rather than local password endpoints.

Startup adds `users` and `run_owners` tables alongside `sessions`, `case_sessions` and `aml_sessions`. Run creation and ownership are committed together. Mutations update the snapshot and last-save time in the same transaction, and retain the existing revision checks. Back up the entire SQLite database. Keep the same Clerk application: changing to an unrelated Clerk instance changes user IDs and does not transfer run ownership.

The optional Cloudflare Worker adapter retains its separate anonymous session storage and returns `{ enabled: false, configured: false, user: null }`. It does not provide account synchronization or Node database access. Use the Node/VPS runtime for this account feature.

## Verification

`npm --prefix workers/api run test:node` includes local RSA-signed Clerk-shaped fixtures, real signature verification, all three run kinds, isolation between users and guests, restart persistence, explicit legacy adoption, expired/tampered/wrong-origin tokens, missing configuration and CORS preflight. It does not use a real Clerk account or contact Google. `npm --prefix frontend run build` checks the React integration.

After connecting your instance, verify Google sign-in in a normal browser, create and change a run, sign out, then sign into the same Google account in another browser and resume it from My progress. Repeat with a different account to confirm isolation. Real-provider OAuth and a public deployment cannot be verified until the owner's instance is connected.
