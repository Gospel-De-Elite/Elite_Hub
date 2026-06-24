import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export default function EsimPurchaseResult({ order, onReset }) {
  const isDelivered = order.status === "QR_DELIVERED" || order.status === "ACTIVATED";
  const isFailed = order.status === "FAILED";
  const isProcessing = !isDelivered && !isFailed;

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          {isDelivered && <CheckCircle2 className="h-12 w-12 text-emerald-500" />}
          {isFailed && <XCircle className="h-12 w-12 text-destructive" />}
          {isProcessing && <Clock className="h-12 w-12 text-amber-500" />}

          <p className="font-display text-lg font-semibold text-foreground">
            {isDelivered && "Your eSIM is Ready"}
            {isFailed && "Purchase Failed"}
            {isProcessing && "Processing"}
          </p>
          <p className="text-sm text-muted-foreground">
            {isDelivered && "Scan your QR code to activate it on your device."}
            {isFailed && "Your wallet was not charged. Please try again."}
            {isProcessing && "We're finalizing this with the provider — check back shortly."}
          </p>

          <div className="w-full space-y-2 pt-2">
            {isDelivered && (
              <Button asChild className="w-full">
                <Link to={`/dashboard/esim/orders/${order.id}`}>View QR Code</Link>
              </Button>
            )}
            <Button onClick={onReset} variant={isDelivered ? "secondary" : "default"} className="w-full">
              Browse More Packages
            </Button>
            <Button asChild variant="secondary" className="w-full">
              <Link to="/dashboard/esim/orders">View All Orders</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
