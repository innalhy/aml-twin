import { Hono } from "hono";
import { cors } from "hono/cors";

/**
 * Demo API for TwinAML.
 * Session, decision, and twin routes will be added here.
 * FastAPI in backend/ is only a local stand-in.
 */
const app = new Hono();

app.use(
  "/health",
  cors({
    origin: "*",
    allowMethods: ["GET", "OPTIONS"],
  }),
);

app.get("/health", (c) => c.json({ status: "ok", service: "twinaml-api" }));

app.notFound((c) => c.json({ error: "not_found" }, 404));

export default app;
