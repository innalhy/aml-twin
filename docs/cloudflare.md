# Deploy on Cloudflare

The COMP3424 demo runs on Cloudflare. Pages hosts the Vite React frontend. A Worker hosts the API. FastAPI in `backend/` is a local alternative and is not deployed for this demo.

No account id, API token, or real hostname is stored in this repository. Replace the placeholder hostnames below with the domain you already have on Cloudflare.

## What gets deployed

| Piece | Cloudflare product | Config | Local command |
| --- | --- | --- | --- |
| Web face | Cloudflare Pages | `frontend/wrangler.jsonc` | `npm run dev` in `frontend/` |
| Demo API | Cloudflare Workers | `workers/api/wrangler.jsonc` | `npm run dev` in `workers/api/` |

Suggested hostnames, once the zone is on your Cloudflare account:

- Web: the apex (`example.com`) or `www.example.com`
- API: `api.example.com`

The Worker does not share an origin with Pages in this scaffold. When the player starts calling the API, the browser will need CORS on the Worker for the Pages origin. `GET /health` already allows a simple cross-origin GET so you can probe it from the browser.

## Pages (frontend)

Build settings if you connect the GitHub repository in the dashboard:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | `frontend` |
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |

Direct upload from a machine that is already logged in with Wrangler:

```bash
cd frontend
npm install
npm run build
npx wrangler pages deploy dist --project-name twinaml-web
```

`frontend/wrangler.jsonc` sets `pages_build_output_dir` to `./dist` and names the project `twinaml-web`. The first dashboard create or `wrangler pages project create twinaml-web` has to happen once on the account. This repo does not call the Cloudflare API.

`frontend/public/_redirects` sends unknown paths to `index.html` with status 200 so a later client-side route still loads the SPA.

## Worker (API)

`workers/api` is a Hono Worker. The only route is `GET /health`, which returns:

```json
{"status":"ok","service":"twinaml-api"}
```

Session, decision, and twin routes will be added here. They will not be added as a required FastAPI deployment.

```bash
cd workers/api
npm install
npx wrangler deploy
```

Local check:

```bash
npm run dev
```

Then open `http://127.0.0.1:8787/health`.

## Custom domain

The zone for your domain must already be active on the same Cloudflare account (full setup). Cloudflare will create the DNS record and certificate. Do not commit the real hostname until you have chosen it; the Wrangler route below stays commented so a deploy of this stub does not try to bind a domain you have not set.

You cannot attach a custom domain to a hostname that already has a CNAME, or to a zone you do not own.

### Pages

1. In the Cloudflare dashboard, open **Workers & Pages**.
2. Open the `twinaml-web` project.
3. Go to **Custom domains** and choose **Set up a custom domain**.
4. Enter the hostname (for example `training.example.com` or the apex).
5. Confirm. Cloudflare adds the DNS record when the zone is on this account.

Wrangler 4 can create the Pages project and upload `dist/`. It does not have a `pages domain` subcommand. Attach the hostname in the dashboard.

### Worker

Dashboard:

1. Open **Workers & Pages** and select the `twinaml-api` Worker.
2. Go to **Settings** → **Domains & Routes** → **Add** → **Custom domain**.
3. Enter `api.example.com` (your real API hostname).
4. Add the domain. Cloudflare creates the DNS record and certificate.

Wrangler: uncomment `routes` in `workers/api/wrangler.jsonc` and set your hostname:

```jsonc
"routes": [
  { "pattern": "api.example.com", "custom_domain": true }
]
```

Then run `npx wrangler deploy` from `workers/api`. A custom domain sends every path on that hostname to the Worker, which is what this API wants.

## What this demo does not use

Docker, Docker Compose, and Kubernetes are not a run path and not a deploy path. Do not add them back as the way to start TwinAML. The FastAPI folder remains so a local Python process can mirror the health check while the Worker is the demo API.
