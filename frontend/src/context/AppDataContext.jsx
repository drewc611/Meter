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
  // Google's OAuth callback redirects the whole page back here with either
  // ?token=... (success) or ?auth_error=... (failure) -- consumed once on
  // mount, before the first load, so it never re-fires on a later reload.
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
      // Expired/invalid session -- clear it and ask again (with a hint if
      // one was already stored) rather than silently retrying forever.
      // Demo data still renders underneath so the page isn't blank while
      // the visitor logs back in.
      setStoredToken("");
      showAuthGate(hadToken ? "Your session expired -- sign in again." : "");
    }
    setData(live ? { ...live, live: true } : FALLBACK_STATE);
    setLoaded(true);
  }, [showAuthGate]);

  useEffect(() => {
    if (redirectHandled.current) return;
    redirectHandled.current = true;
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const authError = params.get("auth_error");
    if (token || authError) {
      if (token) setStoredToken(token);
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
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
