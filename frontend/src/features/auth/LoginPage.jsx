import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { authApi } from "@/api/authApi";
import { setTokens } from "./authSlice";
import { setProfile } from "@/features/user/userSlice";
import AuthLayout from "@/components/layouts/AuthLayout";
import GoogleAuthButton from "./GoogleAuthButton";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import { Alert }   from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

export default function LoginPage() {
  const navigate     = useNavigate();
  const dispatch     = useDispatch();
  const [searchParams] = useSearchParams();

  const [form, setForm]             = useState({ email: "", password: "" });
  const [error, setError]           = useState(searchParams.get("error") || "");
  const [isSubmitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await authApi.login(form);
      const { user, accessToken, refreshToken } = data.data;
      dispatch(setTokens({ accessToken, refreshToken }));
      dispatch(setProfile(user));
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to manage your wallet and services">
      <div className="space-y-4">
        {error && <Alert variant="destructive">{error}</Alert>}

        {/* Google sign-in */}
        <GoogleAuthButton label="Continue with Google" />

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Email / password form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Spinner className="mr-2" />}
            Log in
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="text-primary hover:underline">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}
