# Deploy the COMP3424 demo on a Linux VPS

The course demo runs on a **rented Linux VPS**. One reverse proxy, nginx or Caddy, terminates HTTPS, serves the static React build, and forwards API paths to one process on localhost.

Hostnames, certificates, and private keys stay on that machine. This repository does not store them.

The development Learning Center is [https://dev-amltwin.spectrumvps.tech/](https://dev-amltwin.spectrumvps.tech/) (release `20261109T064146Z`). That deploy is ahead of this tree. The gap is in the root [README](../README.md) under Linux VPS Platform (Learning Center). This page is how to serve the files in this tree.

## Linux VPS Platform (Learning Center)

| Piece | In this repo | On the current VPS |
| --- | --- | --- |
| Web | `frontend/` (React 19 + Vite). `npm run build` writes `dist/`. No `three` dependency. | Static files. The proxy serves them. The live bundle also lazy-loads `SceneViewport` and `TwinPlatform`, which are not in this tree. |
| API | `backend/` FastAPI. `GET /health`, `/cases`, `/sessions`, decisions, evidence. | `uvicorn` bound to `127.0.0.1:8000`. `GET /health` returns `{"status":"ok","service":"twinaml-api"}`. The live client also calls `/api/cases`, `/api/sessions`, `/api/case-sessions`, `POST /api/aml-simulations`, `/api/aml-sessions/{id}` (and `/actions`), and `GET /api/twin`. Those `/api/` handlers are not in `backend/app/` on this branch. |
| Session store | `backend/app/sessions.py`, Python stdlib `sqlite3`. Default `data/local/sessions.sqlite`. Override `TWINAML_SESSIONS_DB`. | Same store. Not PostgreSQL, Redis, or MySQL. |
| 3D | Not in this tree. | In-browser Three.js Simulation Center at `/simulations`. Not a Unity WebGL build. |
| Behavioral Sandbox | `demo/neo4j/`. | Streamlit may run on this VPS or on the presenter's laptop. This repo does not publish a Streamlit hostname. Bloom stays on the presenter's machine. |
| Unity Editor project | Not on this branch. Branch [`unity`](https://github.com/innalhy/aml-twin/tree/unity) only. | Outside the current demo path. Not a site on the VPS. |
| Legacy scaffold | `workers/` | Left in the tree. Not the demo path. |

FlexSim is out of scope. Docker, Docker Compose, and Kubernetes are not the run path and not the deploy path. Unity, Unreal, and Omniverse are not the current 3D path.

## Build the static site

On the VPS, from a checkout of this repo. Node 22 matches CI.

```bash
cd frontend
npm install
npm run build
```

Copy `frontend/dist/` to the directory the proxy serves, for example `/var/www/twinaml`. Do not commit `dist/`.

`frontend/public/_redirects` contains `/* /index.html 200` so a static host can fall back to the SPA. nginx and Caddy do not read that file. Set the same fallback in the proxy, below.

## Run the API

From `backend/`:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

On the VPS:

```bash
curl -s http://127.0.0.1:8000/health
```

Expected body: `{"status":"ok","service":"twinaml-api"}`.

Bind to `127.0.0.1` so the public ports are only 80 and 443 on the proxy. Keep `uvicorn` running with the process supervisor that machine already uses. This repo does not ship a systemd unit or a process-manager config.

Start one uvicorn process. Sessions are rows in `data/local/sessions.sqlite` under the repo root (the path is not the process working directory). Further workers on this same machine share that file. Do not run a second copy of the API on another host against a copied file. Closed sessions older than 7 days are deleted, and the file keeps at most 2000 sessions. See [`backend/README.md`](../backend/README.md).

Session routes stay on this same process: `/cases`, `/sessions`, and paths under `/sessions`.

## Reverse proxy and HTTPS

Use one hostname for the student demo so the page and the API share an origin. `training.example.com` below is a placeholder. Point the DNS A or AAAA record at the VPS. Put the real name in the proxy config on the server.

Paths the API owns: `/health`, `/cases`, and `/sessions`. Every other path is the static site. Unknown site paths fall back to `index.html`. The player calls those API paths on the same hostname.

### Caddy

Caddy can obtain and renew a certificate when that DNS name points at this machine and ports 80 and 443 are reachable. Write the site block on the VPS. It is an example, not a file in this repo.

```
training.example.com {
	handle /health* {
		reverse_proxy 127.0.0.1:8000
	}
	handle /cases* {
		reverse_proxy 127.0.0.1:8000
	}
	handle /sessions* {
		reverse_proxy 127.0.0.1:8000
	}
	handle {
		root * /var/www/twinaml
		try_files {path} /index.html
		file_server
	}
}
```

### nginx

Terminate TLS with a certificate that already lives on the server. Write the server block on the VPS. It is an example, not a file in this repo.

```
server {
    listen 443 ssl;
    server_name training.example.com;

    ssl_certificate     /etc/ssl/twinaml/fullchain.pem;
    ssl_certificate_key /etc/ssl/twinaml/privkey.pem;

    root /var/www/twinaml;
    index index.html;

    location /health {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
    }

    location /cases {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
    }

    location /sessions {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

A separate `listen 80` server can redirect to HTTPS. The certificate and the private key stay on the VPS.

## Check from another machine

- `https://training.example.com/` shows the case list.
- `https://training.example.com/health` returns the health JSON.
- Starting a case and opening the dashboard hits `/sessions` on that same origin.

## Secrets

Do not commit `.env` files, API keys, TLS private keys, or a hostname you have not chosen to publish. The health check needs none of those.

## Legacy Cloudflare files

`workers/` and the Wrangler config files may remain so older notes still resolve. They are not the deploy target for this demo. Do not treat `npx wrangler deploy` or a Pages upload as the course path. The short pointer is [`cloudflare.md`](cloudflare.md).
