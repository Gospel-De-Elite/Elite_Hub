import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { getStatusVariant } from "@/lib/statusVariant";

export default function CampaignDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["sms-campaign", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/sms/campaigns/${id}`);
      return data.data;
    },
  });

  async function handleCancel() {
    setError("");
    setIsCancelling(true);
    try {
      await apiClient.post(`/sms/campaigns/${id}/cancel`);
      queryClient.invalidateQueries({ queryKey: ["sms-campaign", id] });
      queryClient.invalidateQueries({ queryKey: ["sms-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["sms-wallet"] });
    } catch (err) {
      setError(err.response?.data?.message || "Could not cancel this campaign.");
    } finally {
      setIsCancelling(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!campaign) {
    return <p className="text-muted-foreground">Campaign not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">{campaign.campaignName}</h1>
          <p className="text-muted-foreground">Sent from {campaign.senderId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(campaign.status)}>{campaign.status}</Badge>
          {campaign.status === "SCHEDULED" && (
            <Button variant="destructive" size="sm" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling && <Spinner className="mr-2 h-4 w-4" />}
              Cancel
            </Button>
          )}
        </div>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Recipients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-xl font-semibold text-foreground">{campaign.totalRecipients}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-xl font-semibold text-foreground">{campaign.totalSent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-xl font-semibold text-foreground">{campaign.totalFailed}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Message</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">{campaign.messageBody}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Status</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {campaign.messages?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaign.messages.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell>{msg.recipient}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(msg.deliveryStatus)}>{msg.deliveryStatus}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="px-6 py-8 text-center text-muted-foreground">No message data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
