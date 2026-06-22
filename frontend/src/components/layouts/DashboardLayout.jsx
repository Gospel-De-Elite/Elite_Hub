import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import BottomNav from "./BottomNav";
import { useCurrentUserQuery } from "@/features/user/useCurrentUserQuery";
import { useWalletQuery } from "@/features/wallet/useWalletQuery";
import { useNotificationsQuery } from "@/features/notifications/useNotificationsQuery";

export default function DashboardLayout() {
  // Keeps Redux's user/wallet/notifications slices fresh app-wide — every
  // dashboard screen sits under this layout via <Outlet/>, so syncing once
  // here means individual pages never need to repeat it.
  useCurrentUserQuery();
  useWalletQuery();
  useNotificationsQuery();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
