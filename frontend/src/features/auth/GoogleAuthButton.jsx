/**
 * GoogleAuthButton — shared across LoginPage and RegisterPage.
 *
 * Renders a styled "Continue with Google" button that navigates the browser
 * to the backend's OAuth redirect endpoint. No SDK needed — the entire
 * OAuth dance is server-side (redirect flow, not popup flow).
 */

const GOOGLE_AUTH_URL =
  (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1")
    .replace("/api/v1", "") + "/api/v1/auth/google";

export default function GoogleAuthButton({ label = "Continue with Google" }) {
  return (
    <a
      href={GOOGLE_AUTH_URL}
      className={
        "flex w-full items-center justify-center gap-3 rounded-lg border border-border " +
        "bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm " +
        "transition-colors hover:bg-secondary active:scale-[0.99]"
      }
    >
      {/* Google "G" logo SVG — no external dependency */}
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        />
        <path
          fill="#FBBC05"
          d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
        />
      </svg>
      {label}
    </a>
  );
}
