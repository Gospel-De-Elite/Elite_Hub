import { useState } from "react";
import apiClient from "@/api/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const gateways = [
  { id: "PAYSTACK", label: "Paystack", description: "Pay with card, bank transfer, or USSD" },
  { id: "MONNIFY", label: "Monnify", description: "Pay with card or bank transfer" },
];

export default function WalletFundingPage() {
  const [amount, setAmount] = useState("");
  const [gateway, setGateway] = useState("PAYSTACK");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const { data } = await apiClient.post("/wallet/fund/initialize", {
        amount: Number(amount),
        gateway,
      });

      const redirectUrl = data.data.authorizationUrl || data.data.checkoutUrl;
      if (!redirectUrl) {
        throw new Error("No payment redirect URL returned");
      }

      // Leaving the SPA entirely — the gateway's hosted page isn't part of
      // this app. It redirects back to /dashboard/wallet/callback when done.
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err.response?.data?.message || "Could not start funding. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Fund Wallet</h1>
        <p className="text-muted-foreground">Enter an amount and choose how you&apos;d like to pay.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Amount &amp; Gateway</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <Alert variant="destructive">{error}</Alert>}

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₦)</Label>
              <Input
                id="amount"
                type="number"
                min="100"
                step="1"
                placeholder="e.g. 5000"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Minimum funding amount is ₦100.</p>
            </div>

            <div className="space-y-2">
              <Label>Payment method</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {gateways.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGateway(g.id)}
                    className={cn(
                      "rounded-lg border p-4 text-left transition-colors",
                      gateway === g.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary hover:border-primary/40"
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">{g.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{g.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || !amount}>
              {isSubmitting && <Spinner className="mr-2" />}
              Continue to payment
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
