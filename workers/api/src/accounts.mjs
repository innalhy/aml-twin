import { InputError } from "./engine.ts";

export function createAccounts(db, describeRun) {
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS run_owners (
      kind TEXT NOT NULL CHECK (kind IN ('aml', 'investigation', 'case')),
      id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (kind, id)
    );
    CREATE INDEX IF NOT EXISTS run_owners_user ON run_owners(user_id, updated_at DESC);
  `);
  const selectUser = db.prepare("SELECT * FROM users WHERE id = ?");
  const upsertUser = db.prepare("INSERT INTO users (id, email, created_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET email = excluded.email");
  const selectOwner = db.prepare("SELECT * FROM run_owners WHERE kind = ? AND id = ?");
  const insertOwner = db.prepare("INSERT INTO run_owners (kind, id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)");
  const updateOwner = db.prepare("UPDATE run_owners SET updated_at = ? WHERE kind = ? AND id = ?");
  const selectRuns = db.prepare("SELECT * FROM run_owners WHERE user_id = ? ORDER BY updated_at DESC, id DESC");

  function summary(owner) {
    let description;
    try { description = describeRun(owner.kind, owner.id); }
    catch (error) {
      if (!(error instanceof InputError) || error.status !== 409) throw error;
      description = { title: "Saved training run", progress: "Saved with an older version" };
    }
    if (!description) return null;
    return { kind: owner.kind, id: owner.id, title: description.title, progress: description.progress, createdAt: owner.created_at, updatedAt: owner.updated_at, ...(description.route ? { route: description.route } : {}) };
  }

  return {
    resolve(identity) {
      // This identity comes only from the API's verified Clerk session.
      upsertUser.run(identity.id, identity.email, new Date().toISOString());
      const row = selectUser.get(identity.id);
      return { id: row.id, email: row.email, createdAt: row.created_at };
    },
    canAccess(kind, id, userId) {
      const owner = selectOwner.get(kind, id);
      return !owner || owner.user_id === userId;
    },
    addOwner(kind, id, userId) {
      if (!userId) return;
      const now = new Date().toISOString();
      insertOwner.run(kind, id, userId, now, now);
    },
    touch(kind, id) { updateOwner.run(new Date().toISOString(), kind, id); },
    list(userId) { return selectRuns.all(userId).map(summary).filter(Boolean); },
    claim(userId, kind, id) {
      db.exec("BEGIN IMMEDIATE");
      try {
        let owner = selectOwner.get(kind, id);
        if (owner && owner.user_id !== userId) throw new InputError("session_not_found", 404);
        // The original opaque ID is required to adopt a pre-account run.
        const description = describeRun(kind, id);
        if (!description) throw new InputError("session_not_found", 404);
        if (!owner) {
          const now = new Date().toISOString();
          insertOwner.run(kind, id, userId, now, now);
          owner = selectOwner.get(kind, id);
        }
        const result = summary(owner);
        db.exec("COMMIT");
        return result;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}
