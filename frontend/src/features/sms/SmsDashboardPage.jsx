import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import apiClient from "@/api/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { MessageSquare, Megaphone, Hash, Plus, ShoppingCart } from "lucide-react";

export default function SmsDashboardPage() {
  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["sms-wallet"],
    queryFn: async () => {
      const { data } = await apiClient.get("/sms/wallet");
      return data.data;
    },
  });

  const { data: requests, isLoading: sendersLoading } = useQuery({
    queryKey: ["sender-ids", "requests"],
    queryFn: async () => {
      const { data } = await apiClient.get("/sms/sender-ids/requests");
      return data.data;
    },
  });

  const { data: campaignsData, isLoading: campaignsLoading } = useQuery({
    queryKey: ["sms-campaigns", "summary"],
    queryFn: async () => {
      const { data } = await apiClient.get("/sms/campaigns", { params: { limit: 1 } });
      return data.data;
    },
  });

  // The default "EliteHub" sender ID is a fixed platform constant, not
  // something worth a round trip to fetch — we only need the backend for
  // whether a CUSTOM one has been activated, which the request history
  // already tells us once a request reaches ACTIVE.
  const activeRequest = requests?.find((r) => r.status === "ACTIVE");
  const isLoading = walletLoading || sendersLoading || campaignsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">SMS</h1>
          <p className="text-muted-foreground">Send bulk SMS and manage your sender IDs.</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/sms/campaigns/new">
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              SMS Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-semibold text-foreground">{wallet?.credits ?? 0}</p>
            <Link
              to="/dashboard/sms/buy-credits"
              className="mt-2 inline-flex items-center text-sm text-primary hover:underline"
            >
              <ShoppingCart className="mr-1 h-3.5 w-3.5" />
              Buy more credits
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Hash className="h-4 w-4" />
              Active Sender ID
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-semibold text-foreground">
              {activeRequest ? activeRequest.requestedSenderId : "EliteHub"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {activeRequest ? "Custom sender ID active" : "Using default sender ID"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Megaphone className="h-4 w-4" />
              Total Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-semibold text-foreground">
              {campaignsData?.pagination?.total ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/dashboard/sms/campaigns"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-secondary"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Campaigns</p>
            <p className="text-xs text-muted-foreground">View and manage your SMS campaigns</p>
          </div>
        </Link>

        <Link
          to="/dashboard/sms/sender-ids"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-secondary"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Hash className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Sender IDs</p>
            <p className="text-xs text-muted-foreground">Request and manage custom sender IDs</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
