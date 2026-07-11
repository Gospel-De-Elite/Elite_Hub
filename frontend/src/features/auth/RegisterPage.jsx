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

export default function RegisterPage() {
  const navigate   = useNavigate();
  const dispatch   = useDispatch();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    firstName:    "",
    lastName:     "",
    email:        "",
    phone:        "",
    password:     "",
    referralCode: searchParams.get("ref") || "",
  });
  const [error, setError]           = useState("");
  const [isSubmitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.referralCode) delete payload.referralCode;

      const { data } = await authApi.register(payload);
      const { user, accessToken, refreshToken } = data.data;
      dispatch(setTokens({ accessToken, refreshToken }));
      dispatch(setProfile(user));
      // Redirect to verify-email notice page — registration always succeeds,
      // email is just a nudge, not a gate.
      navigate("/auth/verify-email");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start sending airtime, data, SMS, and more">
      <div className="space-y-4">
        {error && <Alert variant="destructive">{error}</Alert>}

        {/* Google sign-up */}
        <GoogleAuthButton label="Sign up with Google" />

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or sign up with email</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Registration form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                name="firstName"
                required
                value={form.firstName}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                name="lastName"
                required
                value={form.lastName}
                onChange={handleChange}
              />
            </div>
          </div>

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
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="08012345678"
              required
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={form.password}
              onChange={handleChange}
            />
            <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referralCode">
              Referral code{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="referralCode"
              name="referralCode"
              value={form.referralCode}
              onChange={handleChange}
              placeholder="e.g. GOE4F2A1B"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Spinner className="mr-2" />}
            Create account
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        By creating an account you agree to our{" "}
        <Link to="/terms" className="underline hover:no-underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link to="/privacy" className="underline hover:no-underline">
          Privacy Policy
        </Link>
        .
      </p>
    </AuthLayout>
  );
}
