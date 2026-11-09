import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as util from "node:util";

const root = fileURLToPath(new URL("../", import.meta.url));
const apiDir = resolve(root, "workers/api");
const webDir = resolve(root, "frontend");
const apiUrl = "http://127.0.0.1:8787";
const webUrl = "http://127.0.0.1:5173";
const database = resolve(root, "data/local/development.sqlite");
let build;
let api;
let web;
let stopping = false;

function stopChild(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((done) => {
    const timeout = setTimeout(() => child.kill("SIGKILL"), 5000);
    timeout.unref();
    child.once("exit", () => { clearTimeout(timeout); done(); });
    child.kill("SIGTERM");
  });
}
async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  await Promise.all([stopChild(api), stopChild(web)]);
  await build?.dispose();
}
function fail(error) {
  if (stopping) return;
  console.error(`[dev] ${error.message}`);
  void shutdown(1);
}
process.once("SIGINT", () => { void shutdown(); });
process.once("SIGTERM", () => { void shutdown(); });

function launch(name, file, args, cwd, env) {
  const child = spawn(file, args, { cwd, env, stdio: "inherit" });
  child.once("error", (error) => fail(new Error(`${name} could not start: ${error.message}`)));
  child.once("exit", (code, signal) => {
    if (!stopping && (child === api || child === web)) fail(new Error(`${name} exited (${signal || code}). Fix the startup error and run npm run dev again.`));
  });
  return child;
}
async function available(port) {
  const server = createServer();
  await new Promise((done, reject) => {
    server.once("error", () => reject(new Error(`Port ${port} is already in use. Stop the other local server before running npm run dev.`)));
    server.listen(port, "127.0.0.1", () => server.close(done));
  });
}
async function loadApiEnvironment() {
  let local = {};
  try { local = util.parseEnv(await readFile(resolve(apiDir, ".env"), "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  return {
    ...local, ...process.env,
    HOST: "127.0.0.1", PORT: "8787", TWINAML_DB: database,
    TWINAML_FRONTEND_ORIGIN: webUrl, NODE_ENV: "development", TWINAML_DEV_MODE: "1",
  };
}
async function waitForApi(child) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (stopping || child.exitCode !== null || child.signalCode !== null) throw new Error("API stopped before its health check passed.");
    try {
      const response = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(500) });
      const health = await response.json();
      assert.equal(response.status, 200);
      assert.equal(health.status, "ok");
      assert.equal(health.service, "twinaml-api");
      return;
    } catch { await new Promise((done) => setTimeout(done, 100)); }
  }
  throw new Error("API did not become healthy. Review the startup messages above.");
}
async function restartApi(env) {
  const previous = api;
  api = undefined;
  await stopChild(previous);
  if (stopping) return;
  api = launch("API", process.execPath, ["--enable-source-maps", resolve(apiDir, "dist/dev-server.mjs")], apiDir, env);
  await waitForApi(api);
  console.log(`[dev] API ready at ${apiUrl} (pid ${api.pid}); database ${database}`);
}
async function install() {
  for (const directory of [apiDir, webDir]) {
    console.log(`[setup] Installing locked dependencies in ${directory}`);
    const child = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["ci"], { cwd: directory, stdio: "inherit" });
    api = child;
    await new Promise((done, reject) => {
      child.once("error", () => reject(new Error("npm is required. Install Node with npm, then run npm run setup.")));
      child.once("exit", (code) => code === 0 ? done() : reject(new Error(`npm ci failed in ${directory}.`)));
    });
    api = undefined;
    if (stopping) return;
  }
  console.log("[setup] Dependencies installed. Run npm run dev.");
}

try {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 13)) throw new Error(`Node 22.13 or later is required (current ${process.version}).`);
  await import("node:sqlite");
  if (process.argv[2] === "--setup") await install();
  else {
    if (process.argv.length > 2) throw new Error("Use npm run dev, or npm run setup to install dependencies.");
    let esbuild;
    try {
      const apiRequire = createRequire(resolve(apiDir, "package.json"));
      const webRequire = createRequire(resolve(webDir, "package.json"));
      esbuild = apiRequire("esbuild");
      apiRequire.resolve("@clerk/backend"); apiRequire.resolve("hono");
      webRequire.resolve("vite"); webRequire.resolve("react"); webRequire.resolve("@clerk/react");
    } catch { throw new Error("Development dependencies are missing. Run npm run setup first."); }
    await Promise.all([available(8787), available(5173)]);
    if (stopping) process.exit();
    const env = await loadApiEnvironment();
    let initial = true;
    let ready;
    let failed;
    const firstBuild = new Promise((done, reject) => { ready = done; failed = reject; });
    build = await esbuild.context({
      absWorkingDir: root, entryPoints: ["workers/api/src/node-server.mjs"],
      bundle: true, platform: "node", format: "esm", target: "node22", sourcemap: "linked",
      outfile: "workers/api/dist/dev-server.mjs", logLevel: "info",
      plugins: [{ name: "restart-local-api", setup(context) {
        context.onEnd(async (result) => {
          if (result.errors.length) {
            if (initial) { initial = false; failed(new Error("Initial API build failed. Fix the errors above, then run npm run dev.")); }
            return;
          }
          try {
            await restartApi(env);
            if (initial) { initial = false; ready(); }
          } catch (error) {
            if (initial) { initial = false; failed(error); }
            else fail(error);
          }
        });
      } }],
    });
    if (stopping) { await build.dispose(); process.exit(); }
    await build.watch();
    await firstBuild;
    if (!stopping) {
      web = launch("Vite", process.execPath, [resolve(webDir, "node_modules/vite/bin/vite.js")], webDir, { ...process.env, NODE_ENV: "development", VITE_APP_ENV: "development", VITE_API_URL: "", VITE_CLERK_PUBLISHABLE_KEY: "" });
      console.log(`[dev] Frontend ${webUrl}; source changes rebuild/restart the API and update the browser. Ctrl-C stops both servers.`);
      const account = await fetch(`${apiUrl}/api/account`).then((response) => response.json());
      assert.equal(account.enabled, false, "Local development requires the isolated anonymous training mode.");
      console.log("[dev] Anonymous synthetic training mode; local runs stay in the development database.");
    }
  }
} catch (error) {
  console.error(`[dev] ${error.message}`);
  await shutdown(1);
}
