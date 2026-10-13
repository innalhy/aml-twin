import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { CaseLibrary } from "./CaseLibrary";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

createRoot(root).render(
  <StrictMode>
    {/^\/cases\/?$/.test(window.location.pathname) ? <CaseLibrary /> : <App />}
  </StrictMode>,
);
