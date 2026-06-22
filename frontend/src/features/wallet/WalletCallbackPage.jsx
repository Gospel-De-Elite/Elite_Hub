import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle2, XCircle } from "lucide-react";

export default function WalletCallbackPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("verifying"); // verifying | success | failed
  const [message, setMessage] = useState("");

  // Paystack appends ?reference=, Monnify appends ?paymentReference= — both
  // are literally the same value we generated at /fund/initialize time, so
  // either query param resolves to the right record.
  const reference = searchParams.get("reference") || searchParams.get("paymentReference");

  useEffect(() => {
    if (!reference) {
      setStatus("failed");
      setMessage("No payment reference found in the URL.");
      return;
    }

    apiClient
      .get(`/wallet/fund/verify/${reference}`)
      .then(({ data }) => {
        if (data.data.status === "SUCCESS") {
          setStatus("success");
          setMessage(data.data.message || "Your wallet has been credited.");
          queryClient.invalidateQueries({ queryKey: ["wallet"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
        } else {
          setStatus("failed");
          setMessage(data.data.message || "Payment was not successful.");
        }
      })
      .catch((err) => {
        setStatus("failed");
        setMessage(err.response?.data?.message || "Could not verify this payment.");
      });
  }, [reference, queryClient]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          {status === "verifying" && (
            <>
              <Spinner className="h-10 w-10 text-primary" />
              <p className="text-foreground">Verifying your payment...</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <p className="font-display text-lg font-semibold text-foreground">Payment successful</p>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button asChild className="mt-2 w-full">
                <Link to="/dashboard/wallet">Back to Wallet</Link>
              </Button>
            </>
          )}

          {status === "failed" && (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="font-display text-lg font-semibold text-foreground">Payment not confirmed</p>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button asChild variant="secondary" className="mt-2 w-full">
                <Link to="/dashboard/wallet/fund">Try Again</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
