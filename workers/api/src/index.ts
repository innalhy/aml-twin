import { Hono } from "hono";
import { cors } from "hono/cors";

/**
 * Legacy Cloudflare Worker scaffold. Not the COMP3424 demo deploy.
 * The demo API is FastAPI in backend/. See docs/deploy-vps.md.
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
