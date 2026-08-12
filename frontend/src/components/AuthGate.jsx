import { useEffect, useState } from "react";

import { useAppData } from "../context/AppDataContext.jsx";

// Shown only if the API returns 401 (MERIT_JWT_SECRET is set in production
// and no/expired session is stored) -- real per-user login, not a shared
// secret. A full-page takeover, not a dialog over the dashboard -- an
// unauthenticated visitor sees this and nothing else. Hidden by default --
// local/dev/demo use never sees this.
export default function AuthGate() {
  const { authGate, hideAuthGate, authMode, setAuthMode, submitAuth, googleHref } = useAppData();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const visible = authGate.visible;
  const isSignup = authMode === "signup";

  useEffect(() => {
    if (!visible) return;
    // Full-page takeover -- nothing behind it should scroll either.
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  useEffect(() => {
    if (visible) setError(authGate.error);
  }, [visible, authGate.error]);

  if (!visible) return null;

  function toggleMode() {
    setAuthMode(isSignup ? "login" : "signup");
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return;
    setSubmitting(true);
    const result = await submitAuth({ email: trimmedEmail, password, name: name.trim() });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPassword("");
  }

  return (
    <div className="auth-page" id="authGate">
      <div className="auth-page-inner">
        <div className="auth-page-brand">
          <div className="sb-logo" aria-hidden="true">
            <i style={{ height: "10px", background: "#cad2fb" }} />
            <i style={{ height: "15px", background: "#7c74f4" }} />
            <i style={{ height: "20px", background: "#4f46e5" }} />
          </div>
          <b>
            Merit<span style={{ fontSize: "11px", fontWeight: 400, verticalAlign: "super", marginLeft: "1px" }}>&trade;</span>
          </b>
        </div>

        <div className="auth-page-card">
          <h2>{isSignup ? "Create your account" : "Sign in to Merit"}</h2>
          <p>This deployment requires an account to view live data.</p>

          <a className="auth-google-btn" href={googleHref}>
            <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 0 0 9 18Z"
              />
              <path
                fill="#FBBC05"
                d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.05l3.02-2.33Z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
              />
            </svg>
            Sign in with Google
          </a>
          <div className="auth-divider">
            <span>or</span>
          </div>

          <form onSubmit={handleSubmit}>
            {isSignup && (
              <input
                type="text"
                placeholder="Full name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
            <input
              type="email"
              placeholder="Work email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="auth-submit-btn" disabled={submitting}>
              {isSignup ? "Sign up" : "Sign in"}
            </button>
          </form>
          <p className="auth-toggle">
            <span>{isSignup ? "Already have an account?" : "Don't have an account?"}</span>
            <button type="button" onClick={toggleMode}>
              {isSignup ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>

        <button type="button" className="auth-skip-link" onClick={hideAuthGate}>
          Continue with demo data instead
        </button>
      </div>
    </div>
  );
}
