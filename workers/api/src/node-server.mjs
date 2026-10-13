import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { readFile, realpath, stat } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import api from "./api.ts";
import pack from "./investigation-pack.json";
import { applyAction, createSession, InputError, sessionView, STATE_VERSION } from "./engine.ts";
import { CASE_STATE_VERSION, caseView, createCaseSession, decideCase } from "./cases.ts";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const STATIC_DIR = resolve(ROOT, "frontend/dist");
const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8",
};

function sqliteStore(path) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, snapshot TEXT NOT NULL); CREATE TABLE IF NOT EXISTS case_sessions (id TEXT PRIMARY KEY, snapshot TEXT NOT NULL)");
  const select = db.prepare("SELECT snapshot FROM sessions WHERE id = ?");
  const insert = db.prepare("INSERT INTO sessions (id, snapshot) VALUES (?, ?)");
  const update = db.prepare("UPDATE sessions SET snapshot = ? WHERE id = ?");
  const selectCase = db.prepare("SELECT snapshot FROM case_sessions WHERE id = ?");
  const insertCase = db.prepare("INSERT INTO case_sessions (id, snapshot) VALUES (?, ?)");
  const updateCase = db.prepare("UPDATE case_sessions SET snapshot = ? WHERE id = ?");
  function loadCase(id) {
    const row = selectCase.get(id);
    if (!row) return null;
    const state = JSON.parse(row.snapshot);
    if (state.version !== CASE_STATE_VERSION) throw new InputError("incompatible_session", 409);
    return state;
  }
  function load(id) {
    const row = select.get(id);
    if (!row) return null;
    const state = JSON.parse(row.snapshot);
    if (state.version !== STATE_VERSION) throw new InputError("incompatible_session", 409);
    return state;
  }
  return {
    close: () => db.close(),
    cases: {
      create(id, caseId) {
        const state = createCaseSession(id, caseId);
        insertCase.run(id, JSON.stringify(state));
        return caseView(state);
      },
      read(id) {
        const state = loadCase(id);
        return state ? { view: caseView(state) } : { error: "session_not_found", status: 404 };
      },
      decide(id, input) {
        db.exec("BEGIN IMMEDIATE");
        try {
          const current = loadCase(id);
          if (!current) {
            db.exec("COMMIT");
            return { error: "session_not_found", status: 404 };
          }
          const state = decideCase(current, input);
          updateCase.run(JSON.stringify(state), id);
          db.exec("COMMIT");
          return { view: caseView(state) };
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      },
    },
    create(id) {
      const state = createSession(id, pack);
      insert.run(id, JSON.stringify(state));
      return sessionView(state, pack);
    },
    read(id) {
      const state = load(id);
      return state ? { view: sessionView(state, pack) } : { error: "session_not_found", status: 404 };
    },
    action(id, input) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const current = load(id);
        if (!current) {
          db.exec("COMMIT");
          return { error: "session_not_found", status: 404 };
        }
        const state = applyAction(current, pack, input);
        update.run(JSON.stringify(state), id);
        db.exec("COMMIT");
        return { view: sessionView(state, pack) };
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

function safePath(url) {
  const path = decodeURIComponent(url.split("?")[0]);
  if (!path.startsWith("/") || path.includes("\0") || path.includes("\\") || path.split("/").some((part) => part === "." || part === "..")) {
    throw new InputError("invalid_path");
  }
  return path;
}

async function staticResponse(path, method) {
  if (method !== "GET" && method !== "HEAD") return Response.json({ error: "not_found" }, { status: 404 });
  let candidate = resolve(STATIC_DIR, `.${path}`);
  if (candidate !== STATIC_DIR && !candidate.startsWith(STATIC_DIR + sep)) throw new InputError("invalid_path");
  try {
    if (candidate === STATIC_DIR) candidate = resolve(STATIC_DIR, "index.html");
    try {
      if (!(await stat(candidate)).isFile()) throw Object.assign(new Error(), { code: "ENOENT" });
    } catch (error) {
      if (error.code !== "ENOENT" || extname(path)) throw error;
      candidate = resolve(STATIC_DIR, "index.html");
    }
    candidate = await realpath(candidate);
    if (!candidate.startsWith(STATIC_DIR + sep)) throw new InputError("invalid_path");
    return new Response(method === "HEAD" ? null : await readFile(candidate), {
      headers: { "Content-Type": MIME[extname(candidate)] ?? "application/octet-stream", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return Response.json({ error: "not_found" }, { status: 404 });
    throw error;
  }
}

export function createNodeServer(dbPath = process.env.TWINAML_DB ?? resolve(ROOT, "data/local/investigation.sqlite")) {
  const store = sqliteStore(resolve(dbPath));
  const env = { store, cases: store.cases, frontendOrigin: process.env.TWINAML_FRONTEND_ORIGIN ?? "" };
  const server = createServer((req, res) => { void serve(req, res); });
  server.on("close", () => store.close());
  async function serve(req, res) {
    try {
      let path;
      try { path = safePath(req.url ?? "/"); }
      catch { throw new InputError("invalid_path"); }
      let response;
      if (path === "/health" || path === "/api" || path.startsWith("/api/")) {
        const headers = new Headers();
        for (let index = 0; index < req.rawHeaders.length; index += 2) headers.append(req.rawHeaders[index], req.rawHeaders[index + 1]);
        const request = new Request(new URL(req.url, "http://localhost"), {
          method: req.method, headers,
          ...(req.method !== "GET" && req.method !== "HEAD" ? { body: Readable.toWeb(req), duplex: "half" } : {}),
        });
        response = await api.fetch(request, env);
      } else response = await staticResponse(path, req.method);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      if (response.body) await pipeline(Readable.fromWeb(response.body), res);
      else res.end();
    } catch (error) {
      if (res.headersSent || res.destroyed) { res.destroy(); return; }
      const status = error instanceof InputError ? error.status : 500;
      res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
      res.end(JSON.stringify({ error: error instanceof InputError ? error.message : "internal_error" }));
      if (status === 500) console.error(JSON.stringify({ event: "server_error", error: error.name }));
    }
  }
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = Number(process.env.PORT ?? 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be between 1 and 65535");
  const host = process.env.HOST ?? "127.0.0.1";
  const server = createNodeServer();
  server.listen(port, host, () => console.log(`TwinAML running at http://${host}:${port}`));
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => server.close());
}
