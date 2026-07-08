import { useCurrentUserQuery } from '@/features/user/useCurrentUserQuery';

/**
 * AppBootstrap — mounts at the application root, above all route guards.
 *
 * Responsibility: run useCurrentUserQuery() unconditionally on every app
 * mount so that profile hydration always fires — regardless of which route
 * the user lands on, including direct navigation to /admin/*.
 *
 * Without this, useCurrentUserQuery() only ran inside DashboardLayout and
 * AdminLayout. Because AdminRoute returned null while profile was absent,
 * AdminLayout never mounted, the query never fired, and profile stayed null
 * permanently — a deadlock that produced a blank /admin page on hard refresh
 * or direct navigation.
 *
 * This component renders no UI — it exists purely for its side effect.
 */
export default function AppBootstrap({ children }) {
  useCurrentUserQuery();
  return children;
}
