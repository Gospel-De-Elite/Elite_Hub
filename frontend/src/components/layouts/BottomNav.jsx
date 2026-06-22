import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  Menu,
  User,
  MessageSquare,
  Smartphone,
  Code2,
  Users,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearAuth } from "@/features/auth/authSlice";
import { clearProfile } from "@/features/user/userSlice";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";

const primaryItems = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { to: "/dashboard/orders", label: "Orders", icon: Receipt },
];

const moreItems = [
  { to: "/dashboard/sms", label: "SMS", icon: MessageSquare },
  { to: "/dashboard/esim", label: "eSIM", icon: Smartphone },
  { to: "/dashboard/api", label: "Developer API", icon: Code2 },
  { to: "/dashboard/referrals", label: "Referrals", icon: Users },
  { to: "/dashboard/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  function handleLogout() {
    dispatch(clearAuth());
    dispatch(clearProfile());
    navigate("/login");
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card md:hidden">
      {primaryItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium",
              isActive ? "text-primary" : "text-muted-foreground"
            )
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground">
          <Menu className="h-5 w-5" />
          More
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1">
            {moreItems.map(({ to, label, icon: Icon }) => (
              <SheetClose asChild key={to}>
                <NavLink
                  to={to}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </NavLink>
              </SheetClose>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5" />
              Log out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
