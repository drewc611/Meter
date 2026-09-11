import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { API_BASE, AuthError, fetchLive, getStoredToken, setStoredToken } from "../lib/api.js";
import {
  FALLBACK_ADOPTION,
  FALLBACK_OVERVIEW,
  FALLBACK_ROLES,
  FALLBACK_SPEND_FORECAST,
  FALLBACK_TEAMS,
  FALLBACK_TOOL_BREAKDOWN,
  FALLBACK_TOOL_PERFORMANCE,
  FALLBACK_TRENDS,
} from "../lib/fallbackData.js";

const FALLBACK_STATE = {
  overview: FALLBACK_OVERVIEW,
  teams: FALLBACK_TEAMS,
  roles: FALLBACK_ROLES,
  trends: FALLBACK_TRENDS,
  toolBreakdown: FALLBACK_TOOL_BREAKDOWN,
  adoption: FALLBACK_ADOPTION,
  toolPerformance: FALLBACK_TOOL_PERFORMANCE,
  spendForecast: FALLBACK_SPEND_FORECAST,
  live: false,
};

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [data, setData] = useState(FALLBACK_STATE);
  const [loaded, setLoaded] = useState(false);
  const [authGate, setAuthGate] = useState({ visible: false, error: "" });
  const [authMode, setAuthMode] = useState("login");
  // Not derived from `data.live` -- a real session can still be stored
  // during a brief API hiccup showing demo data.
  const [hasSession, setHasSession] = useState(() => !!getStoredToken());
  // Consumed once on mount so a later reload doesn't re-fire the OAuth redirect.
  const redirectHandled = useRef(false);

  const showAuthGate = useCallback((errorMsg) => {
    setAuthGate({ visible: true, error: errorMsg || "" });
  }, []);
  const hideAuthGate = useCallback(() => {
    setAuthGate({ visible: false, error: "" });
  }, []);

  const reload = useCallback(async () => {
    const hadToken = !!getStoredToken();
    let live = null;
    try {
      live = await fetchLive();
    } catch (e) {
      if (!(e instanceof AuthError)) throw e;
      // Expired/invalid session -- clear it and show the gate; demo data
      // still renders underneath so the page isn't blank in the meantime.
      setStoredToken("");
      setHasSession(false);
      showAuthGate(hadToken ? "Your session expired -- sign in again." : "");
    }
    setData(live ? { ...live, live: true } : FALLBACK_STATE);
    setLoaded(true);
  }, [showAuthGate]);

  const logout = useCallback(() => {
    setStoredToken("");
    setHasSession(false);
    reload();
  }, [reload]);

  useEffect(() => {
    if (redirectHandled.current) return;
    redirectHandled.current = true;
    // The session token comes back in the fragment, not the query string --
    // a fragment is never sent to a server, so it can't end up in an access
    // log or a Referer header on the way in. The error, which isn't secret,
    // stays a query param. Both are wiped from the address bar immediately so
    // neither survives into history.
    const token = new URLSearchParams(location.hash.slice(1)).get("token");
    const authError = new URLSearchParams(location.search).get("auth_error");
    if (token || authError) {
      if (token) {
        setStoredToken(token);
        setHasSession(true);
      }
      history.replaceState({}, "", location.pathname);
      if (authError) showAuthGate(authError);
    }
    reload();
  }, []);

  const submitAuth = useCallback(
    async ({ email, password, name }) => {
      const path = authMode === "signup" ? "/auth/signup" : "/auth/login";
      const body = authMode === "signup" ? { email, password, name } : { email, password };
      try {
        const res = await fetch(API_BASE + path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const responseData = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { ok: false, error: responseData.detail || "Something went wrong -- try again." };
        }
        setStoredToken(responseData.access_token);
        setHasSession(true);
        hideAuthGate();
        await reload();
        return { ok: true };
      } catch {
        return { ok: false, error: "Couldn't reach the server -- try again in a moment." };
      }
    },
    [authMode, hideAuthGate, reload],
  );

  const value = {
    ...data,
    loaded,
    authGate,
    hideAuthGate,
    authMode,
    setAuthMode,
    submitAuth,
    googleHref: API_BASE + "/auth/google/login",
    hasSession,
    logout,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
