import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AmlWorkflow } from "./AmlWorkflow";
import { AccountShell } from "./AccountShell";
import { TrainingPortal } from "./TrainingPortal";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}
const development = import.meta.env.DEV || import.meta.env.VITE_APP_ENV === "development";
if (development) document.title = `DEV · ${document.title}`;

createRoot(root).render(
  <StrictMode>
    {development && <aside className="environment-banner" aria-label="Environment">Development environment · Separate synthetic test data</aside>}
    <AccountShell>{(accountId) => /^\/investigation\/?$/.test(window.location.pathname) ? <App accountId={accountId} /> : /^\/(operations|aml)\/?$/.test(window.location.pathname) ? <AmlWorkflow accountId={accountId} /> : <TrainingPortal accountId={accountId} />}</AccountShell>
  </StrictMode>,
);
