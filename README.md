# TwinAML

A digital twin for AML simulation training. COMP3424 course demo.

Repository: [github.com/innalhy/aml-twin](https://github.com/innalhy/aml-twin)

TwinAML lets a trainee make decisions inside one synthetic case. The backend holds the digital twin of that investigation: the customer, KYC signals, transactions, risk flags, and the outcome. The screen only plays that state back. The first example is a Hong Kong deepfake video onboarding case (`deepfake-hk-001`). Every record in it is synthetic.

This is a course demo of a proprietary platform idea. It is not a bank production system and not an enterprise reference architecture.

## Platform and clients

The digital twin is backend state plus events. The web app is the face.

| | Role |
| --- | --- |
| Demo API | One Cloudflare Worker in `workers/api`. It will load a script, open a session, accept a decision, update the twin with rules, and write events. |
| Web client | React + Vite + TypeScript, deployed to Cloudflare Pages. A scenario player and a simple dashboard that read the same state. |
| Local alternative | FastAPI in `backend/`. Useful for offline development. The production demo does not run it. |
| Unity | An optional later client. Do not add a Unity project until one is requested. It does not own a second twin. |

The player must not compute compliance outcomes itself. Outcomes come from the rules in the script and from the state machine that will apply them.

## Simplified stack

For a classroom demo. Do not expand this into microservices.

| Layer | Choice | Now |
| --- | --- | --- |
| Demo API | Hono on a Cloudflare Worker (`workers/api`) | `GET /health` only |
| Web | React + Vite + TypeScript on Cloudflare Pages (`frontend/`) | A placeholder page that builds |
| Local API | FastAPI (`backend/`) | Optional. Same health JSON. Not the deploy path. |
| Cases | JSON scripts and initial twin state in `data/cases/` | One deepfake branch |
| Media | `data/media/` | Only `.gitkeep` is tracked. Large mp4 files stay out of git. |
| Contract | `packages/schemas/script.schema.json` | Minimal JSON Schema for script nodes |
| Docs | `docs/` | Architecture, course mapping, Cloudflare deploy |
| Deploy | Cloudflare Pages + Workers | Config stubs. No Docker. |

Do not add Docker, Kubernetes, Neo4j, Kafka, a service split, a Unity project, or a live bank connection.

## Folders

```
.
├── README.md
├── AGENTS.md
├── AGENT.md                 # points at AGENTS.md
├── .gitignore
├── docs/
│   ├── architecture.md
│   ├── cloudflare.md        # Pages, Worker, custom domain
│   └── comp3424-mapping.md
├── workers/
│   └── api/                 # demo API (Cloudflare Worker)
│       ├── src/index.ts     # GET /health
│       └── wrangler.jsonc
├── backend/                 # optional local FastAPI; not the demo deploy
│   ├── README.md
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       └── main.py
├── frontend/                # Cloudflare Pages site
│   ├── README.md
│   ├── wrangler.jsonc
│   └── src/
├── data/
│   ├── cases/
│   │   └── deepfake-hk-001.example.json
│   └── media/
│       └── .gitkeep
├── packages/
│   └── schemas/
│       └── script.schema.json
└── scripts/
    └── .gitkeep
```

## Run locally

Start the Worker and the web app in two terminals. Do not use Docker.

Demo API, from `workers/api/`:

```bash
npm install
npm run dev
```

`http://127.0.0.1:8787/health` returns `{"status":"ok","service":"twinaml-api"}`.

Web, from `frontend/`:

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The page shows the TwinAML scaffold. It is not a case player yet.

Optional FastAPI stand-in, from `backend/`: see `backend/README.md`. It returns the same health JSON on port 8000. Use it only when you want a local Python process. The course demo deploys the Worker.

## Deploy

The demo target is Cloudflare. Pages serves the Vite build. The Worker in `workers/api` is the API. Steps, including how to attach a domain you already have on Cloudflare, are in `docs/cloudflare.md`.

## Vibe-coding

Short rules for agents and for yourself. The full agreement is `AGENTS.md`.

1. Change one small slice at a time. After it, you should be able to say what a trainee can now see.
2. Stay on the stack above. Do not add Docker, Kubernetes, a database cluster, a message bus, or a second frontend.
3. The case shape is `packages/schemas/script.schema.json` and `data/cases/deepfake-hk-001.example.json`.
4. Rules come before AI. A model may explain a decision later. It must not quietly change the outcome.
5. Docs and UI copy are English. Keep course terms in English as well: mirroring, shadowing, threading, Chan Level 1, Chan Level 2.
6. Do not commit secrets or large media.

Architecture: `docs/architecture.md`. Course mapping: `docs/comp3424-mapping.md`.

## License

The TwinAML platform idea and the contents of this repository are proprietary. All rights reserved.

This repository is a COMP3424 course demo. It does not include an OSI license. Do not redistribute it as an open-source project or turn it into a commercial product. Use and modification follow the owner's permission.
