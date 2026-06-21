import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/features/auth/LoginPage";
import RegisterPage from "@/features/auth/RegisterPage";
import ForgotPasswordPage from "@/features/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/features/auth/ResetPasswordPage";
import ProtectedRoute from "@/components/layouts/ProtectedRoute";

// Placeholder until the next frontend bit builds the real dashboard home —
// keeping this here makes the auth flow fully testable end-to-end now,
// without waiting on screens that don't exist yet.
function DashboardPlaceholder() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <p className="text-center text-muted-foreground">
        You&apos;re logged in. Dashboard home lands in the next frontend bit.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPlaceholder />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
