import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

/**
 * Guards all /admin/* routes.
 *
 * Profile hydration (useCurrentUserQuery) runs in AppBootstrap at the
 * application root — above all routing — so by the time any route renders,
 * profile is either populated or the /auth/me fetch is in-flight. The null
 * guard here handles only the brief in-flight window on a hard refresh; it
 * no longer causes a permanent blank page because the fetch is no longer
 * gated behind this component mounting.
 *
 * Flow:
 *   Not authenticated → /login
 *   Authenticated, profile loading → spinner (not null — prevents deadlock)
 *   Authenticated, non-admin role → /dashboard
 *   Authenticated, admin role → render children (AdminLayout + Outlet)
 */
export default function AdminRoute({ children }) {
  const { isAuthenticated } = useSelector((s) => s.auth);
  const profile             = useSelector((s) => s.user.profile);
  const location            = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Profile is being fetched by AppBootstrap. Show a minimal centred
  // spinner rather than null — returning null here is what caused the
  // permanent blank page when navigating directly to /admin.
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!ADMIN_ROLES.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
