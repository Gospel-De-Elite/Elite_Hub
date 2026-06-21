import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "@/api/authApi";
import AuthLayout from "@/components/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const { data } = await authApi.forgotPassword(email);
      setSubmitted(true);
      // Dev-only convenience: the backend returns the raw reset token
      // directly when no email provider is configured, purely so this flow
      // can be tested end-to-end before real email delivery is wired in.
      if (data.data?.devOnlyResetToken) {
        setDevToken(data.data.devOnlyResetToken);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="If an account exists for that email, we've sent a reset link."
      >
        {devToken && (
          <Alert className="mb-4">
            <p className="font-medium">Development mode — no email provider configured yet.</p>
            <p className="mt-1 break-all">
              Reset link:{" "}
              <Link to={`/reset-password?token=${devToken}`} className="text-primary hover:underline">
                /reset-password?token={devToken}
              </Link>
            </p>
          </Alert>
        )}
        <Link to="/login" className="text-sm text-primary hover:underline">
          Back to login
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter your email and we'll send you a reset link">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="destructive">{error}</Alert>}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="mr-2" />}
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="text-primary hover:underline">
          Back to login
        </Link>
      </p>
    </AuthLayout>
  );
}
