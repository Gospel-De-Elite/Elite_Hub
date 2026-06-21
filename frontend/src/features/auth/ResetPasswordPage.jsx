import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { authApi } from "@/api/authApi";
import AuthLayout from "@/components/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Missing or invalid reset link. Please request a new one.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword({ token, newPassword });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "This reset link is invalid or has expired.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a new password for your account">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="destructive">{error}</Alert>}

        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="mr-2" />}
          Reset password
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
