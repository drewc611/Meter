/* =====================================================================
   DATA LAYER
   Tries the live Merit API first (see ../backend/); if it's not reachable
   (most common — CORS-blocked preview build, or local dev without the
   backend running) it falls back to the snapshot in fallbackData.js, so
   the UI behaves identically either way. The sidebar badge tells you
   which mode it's in.
   ===================================================================== */
// localhost/127.0.0.1/file:// (empty hostname) means local dev — hit the
// local backend. Any other origin is a real deploy (the production domain,
// or a Cloudflare Workers preview build) — hit the production API. A preview
// build's origin won't be in MERIT_CORS_ORIGINS, so its fetches get CORS-
// blocked and it falls back to demo data — expected, not a bug.
export const API_BASE = ["localhost", "127.0.0.1", ""].includes(location.hostname)
  ? "http://localhost:8000"
  : "https://api.usemeritai.com";

// The backend gates /api/* behind MERIT_JWT_SECRET when that's set in
// production (see backend/app/dependencies.py) -- a real per-user login
// (password or Google, see backend/app/routers/auth.py), not a shared
// secret. Storing the issued JWT in localStorage means a visitor logs in
// once; it's sent as a Bearer token on every API call, same delivery
// mechanism the old shared token used.
const TOKEN_KEY = "merit_token";
export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}
export function setStoredToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export class AuthError extends Error {}

async function fetchJSON(path, timeoutMs = 900) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const token = getStoredToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(API_BASE + path, { signal: ctrl.signal, headers });
    clearTimeout(t);
    // A 401 means "the API is reachable but this token is wrong/missing" --
    // distinct from every other failure mode below, which all mean "treat
    // this the same as the API being offline and show demo data."
    if (res.status === 401) throw new AuthError("unauthorized");
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch (e) {
    clearTimeout(t);
    if (e instanceof AuthError) throw e;
    return null;
  }
}

export async function fetchLive() {
  const [ov, tm, rl, tr, tb, ad, tp, sf] = await Promise.all([
    fetchJSON("/api/overview"),
    fetchJSON("/api/teams"),
    fetchJSON("/api/roles"),
    fetchJSON("/api/trends"),
    fetchJSON("/api/tool-breakdown"),
    fetchJSON("/api/adoption"),
    fetchJSON("/api/tool-performance"),
    fetchJSON("/api/spend-forecast"),
  ]);
  if (ov && tm && rl && tr && tb && ad && tp && sf) {
    return {
      overview: ov,
      teams: tm,
      roles: rl,
      trends: tr,
      toolBreakdown: tb,
      adoption: ad,
      toolPerformance: tp,
      spendForecast: sf,
    };
  }
  return null;
}
