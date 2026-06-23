import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Bell, Wallet, LogOut, User as UserIcon } from "lucide-react";
import { clearAuth } from "@/features/auth/authSlice";
import { clearProfile } from "@/features/user/userSlice";
import { clearWallet } from "@/features/wallet/walletSlice";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

function formatNaira(value) {
  const number = Number(value || 0);
  return `₦${number.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Header() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const profile = useSelector((state) => state.user.profile);
  const wallet = useSelector((state) => state.wallet);
  const unreadCount = useSelector((state) => state.notifications.unreadCount);

  function handleLogout() {
    dispatch(clearAuth());
    dispatch(clearProfile());
    dispatch(clearWallet());
    navigate("/login");
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-4 md:px-8">
      <Link to="/dashboard/wallet" className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
        <Wallet className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{formatNaira(wallet.spendableBalance)}</span>
      </Link>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <Link
          to="/dashboard/notifications"
          className="relative rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {profile?.firstName?.[0]?.toUpperCase() || "?"}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {profile ? `${profile.firstName} ${profile.lastName}` : "Account"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/dashboard/profile")}>
              <UserIcon className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
