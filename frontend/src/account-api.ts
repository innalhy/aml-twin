const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export const ACCOUNT_EXPIRED = "twinaml-account-expired";

let tokenGetter: (() => Promise<string | null>) | null = null;

export function setTokenGetter(getter: (() => Promise<string | null>) | null) { tokenGetter = getter; }

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = await tokenGetter?.();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (response.status === 401) {
    window.dispatchEvent(new Event(ACCOUNT_EXPIRED));
  }
  return response;
}

export function sessionKey(base: string, accountId: string | null) {
  return accountId ? `${base}:${accountId}` : base;
}

export function loadResume(key: string, useUrl = true) {
  const selected = useUrl ? new URLSearchParams(window.location.search).get("run") : null;
  if (selected) return selected;
  try { return localStorage.getItem(key); } catch { return null; }
}

export function saveResume(key: string, id: string | null) {
  const url = new URL(window.location.href);
  url.searchParams.delete("run");
  try {
    if (id) localStorage.setItem(key, id);
    else localStorage.removeItem(key);
  } catch (error) {
    if (id) url.searchParams.set("run", id);
    throw error;
  } finally {
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }
}
