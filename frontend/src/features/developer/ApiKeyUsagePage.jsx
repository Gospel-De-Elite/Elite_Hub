import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft } from "lucide-react";

export default function ApiKeyUsagePage() {
  const { id } = useParams();

  const { data: usage, isLoading } = useQuery({
    queryKey: ["api-key-usage", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/developer/api-keys/${id}/usage`, { params: { days: 7 } });
      return data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard/api/keys"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to API Keys
      </Link>

      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Usage — Last {usage?.periodDays ?? 7} Days
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-xl font-semibold text-foreground">{usage?.totalRequests ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-xl font-semibold text-foreground">{usage?.successRate ?? 100}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-xl font-semibold text-foreground">{usage?.errorCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-xl font-semibold text-foreground">{usage?.avgResponseTime ?? 0}ms</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requests by Endpoint</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {usage?.byEndpoint && Object.keys(usage.byEndpoint).length > 0 ? (
            Object.entries(usage.byEndpoint).map(([endpoint, count]) => (
              <div
                key={endpoint}
                className="flex items-center justify-between border-b border-border py-2 last:border-0"
              >
                <span className="font-mono text-sm text-foreground">{endpoint}</span>
                <span className="text-sm font-medium text-muted-foreground">{count}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No requests in this period yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
