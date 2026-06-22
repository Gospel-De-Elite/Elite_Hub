import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import apiClient from "@/api/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Wallet, Smartphone, Wifi, Receipt, MessageSquare, Globe, Copy, Users, Check } from "lucide-react";

function formatNaira(value) {
  const number = Number(value || 0);
  return `₦${number.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const quickActions = [
  { to: "/dashboard/wallet/fund", label: "Fund Wallet", icon: Wallet },
  { to: "/dashboard/airtime", label: "Buy Airtime", icon: Smartphone },
  { to: "/dashboard/data", label: "Buy Data", icon: Wifi },
  { to: "/dashboard/bills", label: "Pay Bills", icon: Receipt },
  { to: "/dashboard/sms", label: "Buy SMS", icon: MessageSquare },
  { to: "/dashboard/esim", label: "Buy eSIM", icon: Globe },
];

export default function DashboardHomePage() {
  const profile = useSelector((state) => state.user.profile);
  const [copied, setCopied] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const { data } = await apiClient.get("/dashboard/summary");
      return data.data;
    },
  });

  const referralLink = profile?.referralCode
    ? `${window.location.origin}/register?ref=${profile.referralCode}`
    : "";

  function handleCopy() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Welcome back, {profile?.firstName || "there"}
        </h1>
        <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your account.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Wallet Balance</p>
            <p className="mt-1 font-display text-xl font-semibold text-foreground">
              {formatNaira(summary?.wallet?.spendableBalance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Today&apos;s Transactions</p>
            <p className="mt-1 font-display text-xl font-semibold text-foreground">
              {summary?.todayTransactionCount ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Transactions</p>
            <p className="mt-1 font-display text-xl font-semibold text-foreground">
              {summary?.totalTransactionCount ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Referral Earnings</p>
            <p className="mt-1 font-display text-xl font-semibold text-foreground">
              {formatNaira(summary?.referralEarnings)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {quickActions.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-colors hover:border-primary/50 hover:bg-secondary"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Activity feed */}
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary?.recentOrders?.length ? (
                summary.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{order.orderType}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{formatNaira(order.amount)}</p>
                      <p
                        className={
                          order.status === "SUCCESS"
                            ? "text-xs text-emerald-500"
                            : order.status === "FAILED"
                              ? "text-xs text-destructive"
                              : "text-xs text-muted-foreground"
                        }
                      >
                        {order.status}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No transactions yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary?.recentNotifications?.length ? (
                summary.recentNotifications.map((note) => (
                  <div key={note.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-foreground">{note.title}</p>
                    <p className="text-xs text-muted-foreground">{note.body}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No notifications yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Referral widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Refer &amp; Earn
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share your link — when a friend funds their wallet with ₦2,000 or more, you earn ₦100.
            </p>

            <div>
              <p className="text-xs text-muted-foreground">Your referral code</p>
              <p className="font-display text-lg font-semibold text-foreground">{profile?.referralCode}</p>
            </div>

            <Button onClick={handleCopy} variant="secondary" className="w-full">
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copied!" : "Copy referral link"}
            </Button>

            <div className="rounded-lg bg-secondary p-3 text-center">
              <p className="text-xs text-muted-foreground">Total earned</p>
              <p className="font-display text-lg font-semibold text-primary">
                {formatNaira(summary?.referralEarnings)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
