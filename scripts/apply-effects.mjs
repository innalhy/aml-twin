/**
 * Apply schema 0.1 patches the way docs/effects.md describes.
 * The validator uses it as the contract check, and the API case library
 * (workers/api/src/cases.ts) replays a session's choices through play().
 */

function parentOf(state, parts) {
  let current = state;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (current === null || typeof current !== "object" || Array.isArray(current) || !(key in current)) {
      return null;
    }
    current = current[key];
  }
  if (current === null || typeof current !== "object" || Array.isArray(current)) return null;
  return current;
}

function copyValue(value) {
  if (value !== null && typeof value === "object") {
    return JSON.parse(JSON.stringify(value));
  }
  return value;
}

export function applyPatch(twin, patch) {
  if (patch === undefined) return;
  if (patch === null || typeof patch !== "object" || Array.isArray(patch)) {
    throw new Error("patch is not an object");
  }
  for (const [key, value] of Object.entries(patch)) {
    if (key.length === 0 || key.startsWith(".") || key.endsWith(".") || key.includes("..")) {
      throw new Error(`empty path segment in "${key}"`);
    }
    const parts = key.split(".");
    const last = parts[parts.length - 1];
    if (last === "flags_add") {
      if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
        throw new Error(`${key} must be an array of strings`);
      }
      const targetParts = parts.slice(0, -1).concat("flags");
      const parent = parentOf(twin, targetParts);
      const leaf = targetParts[targetParts.length - 1];
      if (!parent || !Array.isArray(parent[leaf])) {
        throw new Error(`${key} needs an existing array at ${targetParts.join(".")}`);
      }
      for (const item of value) {
        if (!parent[leaf].includes(item)) parent[leaf].push(item);
      }
      continue;
    }
    if (last === "score_delta") {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`${key} must be a finite number`);
      }
      const targetParts = parts.slice(0, -1).concat("score");
      const parent = parentOf(twin, targetParts);
      const leaf = targetParts[targetParts.length - 1];
      if (!parent || typeof parent[leaf] !== "number") {
        throw new Error(`${key} needs an existing number at ${targetParts.join(".")}`);
      }
      parent[leaf] += value;
      continue;
    }
    if (last.endsWith("_add") || last.endsWith("_delta")) {
      throw new Error(`${key} uses an undefined suffix. Defined suffixes are flags_add and score_delta.`);
    }
    const parent = parentOf(twin, parts);
    if (!parent) {
      throw new Error(`${key} has no parent object`);
    }
    parent[parts[parts.length - 1]] = copyValue(value);
  }
}

export function play(script, choiceIds) {
  const twin = JSON.parse(JSON.stringify(script.initial_twin_state));
  const byId = new Map(script.nodes.map((node) => [node.id, node]));
  let node = byId.get(script.start_node_id);
  if (!node) throw new Error(`start_node_id ${script.start_node_id} is missing`);
  const queue = [...choiceIds];
  const visited = [];
  const limit = script.nodes.length + queue.length + 2;
  for (let step = 0; step < limit; step += 1) {
    visited.push(node.id);
    applyPatch(twin, node.twin_patch);
    if (node.type === "outcome") {
      return { twin, nodeId: node.id, visited };
    }
    if (node.type === "scene") {
      const next = byId.get(node.next);
      if (!next) throw new Error(`scene ${node.id} next ${node.next} is missing`);
      node = next;
      continue;
    }
    if (node.type === "decision") {
      // Out of choices: the session is waiting at this decision.
      if (queue.length === 0) return { twin, nodeId: node.id, visited };
      const choiceId = queue.shift();
      const choice = (node.choices || []).find((item) => item.id === choiceId);
      if (!choice) throw new Error(`missing choice ${choiceId} on ${node.id}`);
      applyPatch(twin, choice.effects);
      const next = byId.get(choice.next);
      if (!next) throw new Error(`choice ${choice.id} next ${choice.next} is missing`);
      node = next;
      continue;
    }
    throw new Error(`unknown node type ${node.type}`);
  }
  throw new Error("play exceeded the node step limit");
}
