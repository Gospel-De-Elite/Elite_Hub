import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { getStatusVariant } from "@/lib/statusVariant";

export default function SenderIdsPage() {
  const queryClient = useQueryClient();
  const [requestedSenderId, setRequestedSenderId] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["sender-ids", "requests"],
    queryFn: async () => {
      const { data } = await apiClient.get("/sms/sender-ids/requests");
      return data.data;
    },
  });

  const activeRequest = requests?.find((r) => r.status === "ACTIVE");
  const inProgressRequest = requests?.find((r) =>
    ["PENDING", "ADMIN_APPROVED", "SUBMITTED_TO_CARRIER"].includes(r.status)
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!requestedSenderId.trim()) {
      setError("Please enter a sender ID.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/sms/sender-ids", { requestedSenderId });
      queryClient.invalidateQueries({ queryKey: ["sender-ids", "requests"] });
      setRequestedSenderId("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit this request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Sender IDs</h1>
        <p className="text-muted-foreground">
          Every campaign sends under <span className="font-semibold text-foreground">EliteHub</span> by default —
          request a custom sender ID to send under your own brand name instead.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Currently sending as</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-display text-2xl font-semibold text-primary">
            {activeRequest ? activeRequest.requestedSenderId : "EliteHub"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeRequest
              ? "Your custom sender ID is active."
              : "Default sender ID — always available, never blocks sending."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request a custom sender ID</CardTitle>
        </CardHeader>
        <CardContent>
          {inProgressRequest ? (
            <Alert>
              Your request for &quot;{inProgressRequest.requestedSenderId}&quot; is currently{" "}
              <span className="font-medium">{inProgressRequest.status.replaceAll("_", " ")}</span>. Campaigns
              continue sending under the default sender ID in the meantime.
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <Alert variant="destructive">{error}</Alert>}
              <div className="space-y-2">
                <Label htmlFor="requestedSenderId">Sender ID (3–11 characters)</Label>
                <Input
                  id="requestedSenderId"
                  placeholder="e.g. MyShop"
                  maxLength={11}
                  value={requestedSenderId}
                  onChange={(e) => setRequestedSenderId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Subject to admin approval, then carrier registration — this can take a few days.
                </p>
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                Submit Request
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8 text-primary" />
            </div>
          ) : requests?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sender ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.requestedSenderId}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(r.status)}>{r.status.replaceAll("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="px-6 py-12 text-center text-muted-foreground">No requests yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
