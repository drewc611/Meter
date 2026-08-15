// Tries the live Merit API first, falls back to the fallbackData.js
// snapshot if it's not reachable -- the sidebar badge shows which mode
// it's in.
//
// localhost/127.0.0.1/file:// means local dev -- hit the local backend.
// Any other origin (production, a Cloudflare preview build) hits the
// production API; a preview build's origin won't be in MERIT_CORS_ORIGINS,
// so it falls back to demo data, which is expected.
export const API_BASE = ["localhost", "127.0.0.1", ""].includes(location.hostname)
  ? "http://localhost:8000"
  : "https://api.usemeritai.com";

// JWT from a real per-user login (see backend/app/routers/auth.py), sent
// as a Bearer token on every API call.
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
    // 401 means the token is wrong/missing, not that the API is offline --
    // every other failure here just falls back to demo data.
    if (res.status === 401) throw new AuthError("unauthorized");
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch (e) {
    clearTimeout(t);
    if (e instanceof AuthError) throw e;
    return null;
  }
}

// On-demand drill-down fetch for a specific past month's people, used by the
// TrendChart click-through. Returns null (not a fallback) when the live API
// isn't reachable, since there's no historical snapshot in fallbackData.js.
export async function fetchPeopleForPeriod(monthsAgo) {
  return fetchJSON(`/api/people?months_ago=${monthsAgo}`, 4000);
}

// Admin-only, fetched on demand by the Integrations view rather than
// bundled into fetchLive() -- a non-admin gets a 403 here (not a broken
// dashboard), and demo/fallback mode has no session to fetch it with.
export async function fetchOrg() {
  return fetchJSON("/admin/org", 4000);
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
