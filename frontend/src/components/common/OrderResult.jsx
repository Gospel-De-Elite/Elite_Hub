import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export default function OrderResult({ order, onReset }) {
  const isSuccess = order.status === "SUCCESS";
  const isFailed = order.status === "FAILED";
  const isProcessing = !isSuccess && !isFailed;

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          {isSuccess && <CheckCircle2 className="h-12 w-12 text-emerald-500" />}
          {isFailed && <XCircle className="h-12 w-12 text-destructive" />}
          {isProcessing && <Clock className="h-12 w-12 text-amber-500" />}

          <p className="font-display text-lg font-semibold text-foreground">
            {isSuccess && "Purchase Successful"}
            {isFailed && "Purchase Failed"}
            {isProcessing && "Processing"}
          </p>
          <p className="text-sm text-muted-foreground">
            {isSuccess && "Your purchase went through successfully."}
            {isFailed && "Your wallet was not charged. Please try again."}
            {isProcessing &&
              "We're confirming this with the provider — check Orders shortly for the final status."}
          </p>

          <div className="w-full space-y-2 pt-2">
            <Button onClick={onReset} className="w-full">
              Make Another Purchase
            </Button>
            <Button asChild variant="secondary" className="w-full">
              <Link to="/dashboard/orders">View Orders</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
