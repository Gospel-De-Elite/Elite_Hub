import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

export default function AdminRoute({ children }) {
  const { isAuthenticated } = useSelector((s) => s.auth);
  const profile = useSelector((s) => s.user.profile);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wait for profile to hydrate from /auth/me before making a redirect
  // decision — avoids a flash-redirect on hard refresh.
  if (!profile) return null;

  if (!ADMIN_ROLES.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
