/**
 * AuthCallbackPage — /auth/callback
 *
 * The backend redirects here after a successful Google OAuth flow with
 * accessToken and refreshToken in the URL query string.
 *
 * Responsibilities:
 *   1. Read tokens from URL params
 *   2. Dispatch to Redux + write to localStorage
 *   3. Immediately wipe tokens from URL (no browser history pollution)
 *   4. Redirect to dashboard
 *
 * If tokens are missing (e.g. user navigated here directly), redirect to login.
 */

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setTokens } from "./authSlice";
import { Spinner } from "@/components/ui/spinner";

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const dispatch  = useDispatch();
  const navigate  = useNavigate();

  useEffect(() => {
    const accessToken  = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const error        = searchParams.get("error");

    // Wipe tokens from the URL immediately — they should never sit in
    // browser history or be visible after this page runs.
    window.history.replaceState({}, document.title, "/auth/callback");

    if (error) {
      navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true });
      return;
    }

    if (!accessToken || !refreshToken) {
      navigate("/login", { replace: true });
      return;
    }

    dispatch(setTokens({ accessToken, refreshToken }));
    // AppBootstrap's useCurrentUserQuery will fire immediately after
    // isAuthenticated becomes true, so profile populates automatically.
    navigate("/dashboard", { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}
