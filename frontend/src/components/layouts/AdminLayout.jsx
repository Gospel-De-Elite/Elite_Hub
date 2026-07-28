import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  LayoutDashboard, Users, Tag, Server, Hash,
  Globe, ArrowUpCircle, MessageCircle, FileText,
  ShieldCheck, LogOut, BookOpen, Menu, ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearAuth } from '@/features/auth/authSlice';
import { clearProfile } from '@/features/user/userSlice';
import { clearWallet } from '@/features/wallet/walletSlice';
import { useCurrentUserQuery } from '@/features/user/useCurrentUserQuery';
import { useWalletQuery } from '@/features/wallet/useWalletQuery';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';

const NAV = [
  { to: '/admin',               label: 'Overview',         icon: LayoutDashboard, end: true },
  { to: '/admin/users',         label: 'Users',            icon: Users },
  { to: '/admin/pricing',       label: 'Pricing',          icon: Tag },
  { to: '/admin/providers',     label: 'Providers',        icon: Server },
  { to: '/admin/sender-ids',    label: 'Sender IDs',       icon: Hash },
  { to: '/admin/esim-disputes', label: 'eSIM Disputes',    icon: Globe },
  { to: '/admin/role-upgrades', label: 'Role Upgrades',    icon: ArrowUpCircle },
  { to: '/admin/support',       label: 'Support',          icon: MessageCircle },
  { to: '/admin/blog',          label: 'Blog',             icon: BookOpen },
  { to: '/admin/audit-logs',    label: 'Audit Logs',       icon: FileText },
];

/** Shared nav link renderer used in both desktop sidebar and mobile sheet */
function NavItem({ to, label, icon: Icon, end, onClick }) {
  return (
    <NavLink
      key={to}
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </NavLink>
  );
}

export default function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
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

      {/* ── Desktop sidebar (hidden on mobile) ─────────────────────── */}
      <aside className="hidden w-60 flex-col border-r border-border bg-card px-3 py-6 md:flex">
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
          {NAV.map((item) => <NavItem key={item.to} {...item} />)}
        </nav>

        <div className="space-y-0.5 border-t border-border pt-3">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
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

      {/* ── Mobile sheet drawer ─────────────────────────────────────── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-72 px-3 py-6">
          <SheetHeader className="mb-4 px-2">
            <SheetTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Admin Panel
            </SheetTitle>
            {profile && (
              <span className="inline-block w-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {profile.role.replace('_', ' ')}
              </span>
            )}
          </SheetHeader>

          <nav className="flex flex-1 flex-col gap-0.5">
            {NAV.map((item) => (
              <SheetClose asChild key={item.to}>
                <NavItem {...item} onClick={() => setDrawerOpen(false)} />
              </SheetClose>
            ))}
          </nav>

          <div className="mt-4 space-y-0.5 border-t border-border pt-3">
            <SheetClose asChild>
              <NavLink
                to="/dashboard"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </NavLink>
            </SheetClose>
            <button
              onClick={() => { setDrawerOpen(false); logout(); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Main content column ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="font-display text-sm font-semibold text-foreground">Admin Panel</span>
          </div>
        </header>

        {/* Desktop top bar */}
        <header className="hidden items-center border-b border-border bg-card px-8 py-4 md:flex">
          <p className="text-sm text-muted-foreground">
            Signed in as{' '}
            <span className="font-medium text-foreground">{profile?.email}</span>
          </p>
        </header>

        <main className="flex-1 overflow-auto px-4 py-6 pb-8 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
