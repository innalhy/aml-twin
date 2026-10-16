# Deploy the COMP3424 demo on a Linux VPS

The course demo runs on a **self-hosted Linux VPS**. One reverse proxy, nginx or Caddy, terminates HTTPS, serves the static React build, and forwards API paths to one process on localhost.

Hostnames, certificates, and private keys stay on that machine. This repository does not store them.

## What runs on the VPS

| Piece | In this repo | On the VPS |
| --- | --- | --- |
| Web | `frontend/` (Vite). `npm run build` writes `dist/`. | Static files. The proxy serves them. |
| API | `backend/` FastAPI. Today: `GET /health`. | `uvicorn` bound to `127.0.0.1:8000`. |
| Unity | [`unity/TwinAML`](../unity/UNITY.md) | Editor training room on a workstation. In scope for the demo. It is not a site on the VPS, and it does not call this API yet. |
| Legacy scaffold | `workers/api`, `workers/api/wrangler.jsonc`, `frontend/wrangler.jsonc` | Left in the tree. Not the COMP3424 demo target. |

A Node/Hono process may be the API instead of FastAPI when it serves the same routes. This repo does not ship a Node server entrypoint. `workers/api` is Hono for the Workers runtime (`wrangler dev` / `wrangler deploy`). Use the FastAPI app for the VPS until a later slice adds a Node listener.

FlexSim is out of scope. Docker, Docker Compose, and Kubernetes are not the run path and not the deploy path.

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

Session routes are not implemented. When they land they stay on this same process: `/sessions` and paths under it.

## Reverse proxy and HTTPS

Use one hostname for the student demo so the page and the API share an origin. `training.example.com` below is a placeholder. Point the DNS A or AAAA record at the VPS. Put the real name in the proxy config on the server.

Paths the API owns today: `/health`. Reserve `/sessions` for the later session API. Every other path is the static site. Unknown site paths fall back to `index.html`.

### Caddy

Caddy can obtain and renew a certificate when that DNS name points at this machine and ports 80 and 443 are reachable. Write the site block on the VPS. It is an example, not a file in this repo.

```
training.example.com {
	handle /health* {
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

- `https://training.example.com/` shows the TwinAML placeholder page.
- `https://training.example.com/health` returns the health JSON.

The placeholder does not call the API. A later scenario player on this same origin will.

## Secrets

Do not commit `.env` files, API keys, TLS private keys, or a hostname you have not chosen to publish. The health check needs none of those.

## Legacy Cloudflare files

`workers/` and the Wrangler config files may remain so older notes still resolve. They are not the deploy target for this demo. Do not treat `npx wrangler deploy` or a Pages upload as the course path. The short pointer is [`cloudflare.md`](cloudflare.md).
