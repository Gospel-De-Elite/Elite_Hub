import { NavLink } from "react-router-dom";
import { LayoutDashboard, Wallet, Receipt, MessageSquare, Smartphone, Code2, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { to: "/dashboard/orders", label: "Orders", icon: Receipt },
  { to: "/dashboard/sms", label: "SMS", icon: MessageSquare },
  { to: "/dashboard/esim", label: "eSIM", icon: Smartphone },
  { to: "/dashboard/api", label: "Developer API", icon: Code2 },
  { to: "/dashboard/referrals", label: "Referrals", icon: Users },
  { to: "/dashboard/profile", label: "Profile", icon: User },
];

export default function Sidebar() {
  return (
    <aside className="hidden w-64 flex-col border-r border-border bg-card px-4 py-6 md:flex">
      <div className="mb-8 px-2">
        <h1 className="font-display text-xl font-semibold text-foreground">Elite Hub</h1>
        <p className="text-xs text-muted-foreground">One Hub. Endless Connections.</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
