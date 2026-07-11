/**
 * VerifyEmailPage — /auth/verify-email?token=xxx
 *
 * Reads the token from the URL, calls the backend, shows success or error.
 * Also handles the "resend" flow for users who land here without a token
 * (e.g. typed the URL) or whose token has expired.
 */

import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import apiClient from "@/api/client";
import AuthLayout from "@/components/layouts/AuthLayout";
import { Button }  from "@/components/ui/button";
import { Alert }   from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle, XCircle, Mail } from "lucide-react";

export default function VerifyEmailPage() {
  const [searchParams]  = useSearchParams();
  const token           = searchParams.get("token");
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);

  const [status,  setStatus]  = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");
  const [resendState, setResendState] = useState("idle"); // idle | loading | sent | error
  const [cooldown, setCooldown] = useState(0);

  // Auto-verify when a token is present in the URL
  useEffect(() => {
    if (!token) return;

    async function verify() {
      setStatus("loading");
      try {
        const { data } = await apiClient.get(`/auth/verify-email?token=${token}`);
        setMessage(data.data.message || "Email verified successfully.");
        setStatus("success");
      } catch (err) {
        setMessage(
          err.response?.data?.message ||
          "This verification link is invalid or has expired."
        );
        setStatus("error");
      }
    }

    verify();
  }, [token]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleResend() {
    if (!isAuthenticated) return;
    setResendState("loading");
    try {
      await apiClient.post("/auth/resend-verification");
      setResendState("sent");
      setCooldown(60);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to resend. Please try again.";
      // If the server returns a wait time, extract it
      if (msg.includes("wait")) {
        const match = msg.match(/(\d+) second/);
        if (match) setCooldown(parseInt(match[1], 10));
      }
      setResendState("error");
    }
  }

  // ── No token in URL — show "check your inbox" screen ─────────────────────
  if (!token) {
    return (
      <AuthLayout title="Verify your email" subtitle="One last step">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-7 w-7 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            We sent a verification link to your email address. Click the link
            in that email to activate your account.
          </p>
          <p className="text-xs text-muted-foreground">
            The link expires in 24 hours and can only be used once.
          </p>

          {isAuthenticated && (
            <div className="w-full space-y-2 pt-2">
              {resendState === "sent" && (
                <Alert>A new verification email has been sent.</Alert>
              )}
              {resendState === "error" && (
                <Alert variant="destructive">Failed to resend. Please try again.</Alert>
              )}
              <Button
                variant="outline"
                className="w-full"
                disabled={resendState === "loading" || cooldown > 0}
                onClick={handleResend}
              >
                {resendState === "loading" && <Spinner className="mr-2 h-4 w-4" />}
                {cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : "Resend verification email"}
              </Button>
            </div>
          )}

          <Link to="/dashboard" className="text-sm text-primary hover:underline">
            Back to dashboard
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // ── Token is present — show verification result ───────────────────────────
  return (
    <AuthLayout
      title={
        status === "success"
          ? "Email verified"
          : status === "error"
          ? "Verification failed"
          : "Verifying…"
      }
    >
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        {status === "loading" && (
          <>
            <Spinner className="h-10 w-10 text-primary" />
            <p className="text-sm text-muted-foreground">
              Verifying your email address…
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Link to="/dashboard">
              <Button className="mt-2 w-full">Go to dashboard</Button>
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <Alert variant="destructive">{message}</Alert>

            {isAuthenticated && (
              <div className="w-full space-y-2 pt-2">
                {resendState === "sent" && (
                  <Alert>A new verification email has been sent.</Alert>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={resendState === "loading" || cooldown > 0}
                  onClick={handleResend}
                >
                  {resendState === "loading" && <Spinner className="mr-2 h-4 w-4" />}
                  {cooldown > 0
                    ? `Resend in ${cooldown}s`
                    : "Send a new verification link"}
                </Button>
              </div>
            )}

            <Link to="/login" className="text-sm text-primary hover:underline">
              Back to login
            </Link>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
