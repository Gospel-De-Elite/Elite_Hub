/**
 * EmailVerificationBanner
 *
 * Shown at the top of the dashboard when the user's email is unverified.
 * Soft nudge only — never blocks access. Dismissible per session.
 * Includes a one-click resend with a 60-second cooldown.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import apiClient from "@/api/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { X, Mail } from "lucide-react";

export default function EmailVerificationBanner() {
  const profile = useSelector((s) => s.user.profile);
  const [dismissed, setDismissed] = useState(false);
  const [resendState, setResendState] = useState("idle"); // idle|loading|sent|error
  const [cooldown, setCooldown] = useState(0);

  // Only show for logged-in users with unverified emails
  if (!profile || profile.isEmailVerified || dismissed) return null;

  async function handleResend() {
    setResendState("loading");
    try {
      await apiClient.post("/auth/resend-verification");
      setResendState("sent");
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) { clearInterval(timer); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch {
      setResendState("error");
      setTimeout(() => setResendState("idle"), 3000);
    }
  }

  return (
    <div className="relative flex flex-col gap-2 border-b border-yellow-500/30 bg-yellow-500/10 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex items-start gap-2 sm:items-center">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400 sm:mt-0" />
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <span className="font-medium">Please verify your email address.</span>{" "}
          Check your inbox for a verification link, or{" "}
          <Link
            to="/auth/verify-email"
            className="underline underline-offset-2 hover:no-underline"
          >
            view instructions
          </Link>
          .
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
        {resendState === "sent" ? (
          <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
            ✓ Email sent{cooldown > 0 ? ` — resend in ${cooldown}s` : ""}
          </span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 border-yellow-500/50 px-2.5 text-xs text-yellow-800 hover:bg-yellow-500/20 dark:text-yellow-200"
            disabled={resendState === "loading" || cooldown > 0}
            onClick={handleResend}
          >
            {resendState === "loading" && <Spinner className="mr-1 h-3 w-3" />}
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification"}
          </Button>
        )}

        <button
          onClick={() => setDismissed(true)}
          className="rounded p-0.5 text-yellow-700 hover:bg-yellow-500/20 dark:text-yellow-300"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
