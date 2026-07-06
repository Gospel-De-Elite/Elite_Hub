import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  LayoutDashboard, Users, Tag, Server, Hash,
  Globe, ArrowUpCircle, MessageCircle, FileText,
  ShieldCheck, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearAuth } from '@/features/auth/authSlice';
import { clearProfile } from '@/features/user/userSlice';
import { clearWallet } from '@/features/wallet/walletSlice';
import { useCurrentUserQuery } from '@/features/user/useCurrentUserQuery';
import { useWalletQuery } from '@/features/wallet/useWalletQuery';

const NAV = [
  { to: '/admin',               label: 'Overview',         icon: LayoutDashboard, end: true },
  { to: '/admin/users',         label: 'Users',            icon: Users },
  { to: '/admin/pricing',       label: 'Pricing',          icon: Tag },
  { to: '/admin/providers',     label: 'Providers',        icon: Server },
  { to: '/admin/sender-ids',    label: 'Sender IDs',       icon: Hash },
  { to: '/admin/esim-disputes', label: 'eSIM Disputes',    icon: Globe },
  { to: '/admin/role-upgrades', label: 'Role Upgrades',    icon: ArrowUpCircle },
  { to: '/admin/support',       label: 'Support',          icon: MessageCircle },
  { to: '/admin/audit-logs',    label: 'Audit Logs',       icon: FileText },
];

export default function AdminLayout() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const profile   = useSelector((s) => s.user.profile);

  useCurrentUserQuery();
  useWalletQuery();

  function logout() {
    dispatch(clearAuth());
    dispatch(clearProfile());
    dispatch(clearWallet());
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-60 flex-col border-r border-border bg-card px-3 py-6">
        <div className="mb-6 px-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="font-display text-base font-semibold text-foreground">Admin Panel</span>
          </div>
          {profile && (
            <span className="mt-1.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {profile.role.replace('_', ' ')}
            </span>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-0.5 border-t border-border pt-3">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            ← Dashboard
          </NavLink>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center border-b border-border bg-card px-8 py-4">
          <p className="text-sm text-muted-foreground">
            Signed in as{' '}
            <span className="font-medium text-foreground">{profile?.email}</span>
          </p>
        </header>
        <main className="flex-1 overflow-auto px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
