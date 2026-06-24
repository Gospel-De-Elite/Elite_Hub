import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { getStatusVariant } from "@/lib/statusVariant";

export default function EsimOrderDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [qrUrl, setQrUrl] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeError, setDisputeError] = useState("");
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["esim-order", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/esim/orders/${id}`);
      return data.data;
    },
  });

  const hasQr = order?.status === "QR_DELIVERED" || order?.status === "ACTIVATED";

  // The QR endpoint is JWT-authenticated and returns binary image data — a
  // plain <img src="..."> can't attach an Authorization header, so this
  // fetches the blob through the authenticated client and converts it to
  // an object URL instead.
  useEffect(() => {
    if (!hasQr) return;

    let objectUrl;
    setQrLoading(true);
    setQrError("");

    apiClient
      .get(`/esim/orders/${id}/qrcode`, { responseType: "blob" })
      .then((response) => {
        objectUrl = URL.createObjectURL(response.data);
        setQrUrl(objectUrl);
      })
      .catch(() => {
        setQrError("Could not load QR code.");
      })
      .finally(() => setQrLoading(false));

    // Object URLs aren't garbage collected automatically — revoke on
    // unmount/order change so we don't leak memory across navigations.
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hasQr, id]);

  async function handleDisputeSubmit(e) {
    e.preventDefault();
    setDisputeError("");

    if (!disputeReason.trim()) {
      setDisputeError("Please describe the issue.");
      return;
    }

    setIsSubmittingDispute(true);
    try {
      await apiClient.post(`/esim/orders/${id}/dispute`, { reason: disputeReason });
      queryClient.invalidateQueries({ queryKey: ["esim-order", id] });
      setShowDisputeForm(false);
      setDisputeReason("");
    } catch (err) {
      setDisputeError(err.response?.data?.message || "Could not submit this dispute.");
    } finally {
      setIsSubmittingDispute(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!order) {
    return <p className="text-muted-foreground">Order not found.</p>;
  }

  const canDispute = (order.status === "QR_DELIVERED" || order.status === "ACTIVATED") && !order.isDisputed;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            {order.esimProduct?.packageName}
          </h1>
          <p className="text-muted-foreground">{order.esimProduct?.country}</p>
        </div>
        <Badge variant={getStatusVariant(order.status)}>{order.status.replaceAll("_", " ")}</Badge>
      </div>

      {hasQr && (
        <Card>
          <CardHeader>
            <CardTitle>Your eSIM QR Code</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {qrLoading && <Spinner className="h-8 w-8 text-primary" />}
            {qrError && <Alert variant="destructive">{qrError}</Alert>}
            {qrUrl && (
              <img
                src={qrUrl}
                alt="eSIM activation QR code"
                className="h-64 w-64 rounded-lg border border-border bg-white p-2"
              />
            )}
            <p className="text-center text-sm text-muted-foreground">
              Scan this with your device&apos;s camera in Settings → Cellular → Add eSIM to activate.
            </p>
            {order.iccid && <p className="text-xs text-muted-foreground">ICCID: {order.iccid}</p>}
          </CardContent>
        </Card>
      )}

      {order.status === "DISPUTED" && (
        <Alert>
          A dispute is open for this order. Our support team is reviewing it — we&apos;ll notify you once
          it&apos;s resolved.
          {order.disputeReason && <p className="mt-1 text-xs">Reason given: {order.disputeReason}</p>}
        </Alert>
      )}

      {order.status === "REFUNDED" && (
        <Alert>This order was refunded to your wallet following a dispute review.</Alert>
      )}

      {order.status === "FAILED" && (
        <Alert variant="destructive">This purchase failed and your wallet was not charged.</Alert>
      )}

      {canDispute && (
        <Card>
          <CardHeader>
            <CardTitle>Having a problem with this eSIM?</CardTitle>
          </CardHeader>
          <CardContent>
            {showDisputeForm ? (
              <form onSubmit={handleDisputeSubmit} className="space-y-3">
                {disputeError && <Alert variant="destructive">{disputeError}</Alert>}
                <div className="space-y-2">
                  <Label htmlFor="disputeReason">Describe the issue</Label>
                  <Textarea
                    id="disputeReason"
                    rows={3}
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isSubmittingDispute}>
                    {isSubmittingDispute && <Spinner className="mr-2 h-4 w-4" />}
                    Submit Dispute
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowDisputeForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <Button variant="secondary" onClick={() => setShowDisputeForm(true)}>
                Report an Issue
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
