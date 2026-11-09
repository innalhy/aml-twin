import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { transformWithEsbuild } from "vite";

const source = await readFile(new URL("../src/account-api.ts", import.meta.url), "utf8");
const { code } = await transformWithEsbuild(source, "account-api.ts", { define: { "import.meta.env.VITE_API_URL": '""' } });
const { loadResume, saveResume, sessionKey } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

test("resume shortcuts are scoped to accounts and an explicit URL selection wins", () => {
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  try {
    globalThis.window = { location: { search: "?run=selected-run" } };
    globalThis.localStorage = { getItem: () => "earlier-run" };
    assert.equal(sessionKey("cases", "user-one"), "cases:user-one");
    assert.equal(sessionKey("cases", null), "cases");
    assert.equal(loadResume("cases"), "selected-run");
    assert.equal(loadResume("cases", false), "earlier-run", "a different training area must ignore the simulation's URL selection");
  } finally {
    globalThis.window = previousWindow;
    globalThis.localStorage = previousStorage;
  }
});

test("a newly saved run remains resumable when browser storage is blocked", () => {
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  try {
    const location = new URL("http://localhost/cases?run=earlier-run&filter=all#case");
    globalThis.window = { location, history: { replaceState: (_state, _title, path) => { location.href = new URL(path, location).href; } } };
    const blocked = new Error("Storage is blocked");
    globalThis.localStorage = { setItem: () => { throw blocked; }, getItem: () => { throw blocked; } };
    assert.throws(() => saveResume("cases", "new-run"), (error) => error === blocked);
    assert.equal(location.searchParams.get("run"), "new-run");
    assert.equal(location.searchParams.get("filter"), "all");
    assert.equal(location.hash, "#case");
    assert.equal(loadResume("cases"), "new-run");
  } finally {
    globalThis.window = previousWindow;
    globalThis.localStorage = previousStorage;
  }
});

test("successful storage replaces a selected run and leaving clears both shortcuts", () => {
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  try {
    const location = new URL("http://localhost/cases?run=earlier-run#case");
    const saved = new Map();
    globalThis.window = { location, history: { replaceState: (_state, _title, path) => { location.href = new URL(path, location).href; } } };
    globalThis.localStorage = { setItem: (key, value) => saved.set(key, value), getItem: (key) => saved.get(key) ?? null, removeItem: (key) => saved.delete(key) };
    saveResume("cases", "new-run");
    assert.equal(location.search, "");
    assert.equal(loadResume("cases"), "new-run");
    saveResume("cases", null);
    assert.equal(loadResume("cases"), null);
    assert.equal(location.hash, "#case");
  } finally {
    globalThis.window = previousWindow;
    globalThis.localStorage = previousStorage;
  }
});
