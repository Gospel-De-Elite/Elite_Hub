import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import OrderResult from "@/components/common/OrderResult";
import { cn } from "@/lib/utils";

const NG_PHONE_REGEX = /^(\+234|0)[789][01]\d{8}$/;

function formatNaira(value) {
  const number = Number(value || 0);
  return `₦${number.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AirtimePurchasePage() {
  const queryClient = useQueryClient();
  const [network, setNetwork] = useState(null);
  const [productId, setProductId] = useState(null);
  const [recipientNumber, setRecipientNumber] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["catalog", "airtime"],
    queryFn: async () => {
      const { data } = await apiClient.get("/catalog/products", { params: { category: "airtime" } });
      return data.data;
    },
  });

  const networks = products ? [...new Set(products.map((p) => p.metadata?.network).filter(Boolean))] : [];
  const networkProducts = products?.filter((p) => p.metadata?.network === network) || [];
  const selectedProduct = products?.find((p) => p.id === productId);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!productId) {
      setError("Please select a denomination.");
      return;
    }
    if (!NG_PHONE_REGEX.test(recipientNumber)) {
      setError("Please enter a valid Nigerian phone number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await apiClient.post("/orders/airtime", { productId, recipientNumber });
      setResult(data.data);
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    } catch (err) {
      setError(err.response?.data?.message || "Purchase failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function reset() {
    setResult(null);
    setNetwork(null);
    setProductId(null);
    setRecipientNumber("");
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (result) {
    return <OrderResult order={result} onReset={reset} />;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Buy Airtime</h1>
        <p className="text-muted-foreground">Top up any Nigerian number instantly.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <Alert variant="destructive">{error}</Alert>}

            <div className="space-y-2">
              <Label>Network</Label>
              <div className="grid grid-cols-4 gap-2">
                {networks.map((net) => (
                  <button
                    key={net}
                    type="button"
                    onClick={() => {
                      setNetwork(net);
                      setProductId(null);
                    }}
                    className={cn(
                      "rounded-lg border p-3 text-center text-sm font-medium transition-colors",
                      network === net
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary text-foreground hover:border-primary/40"
                    )}
                  >
                    {net}
                  </button>
                ))}
              </div>
            </div>

            {network && (
              <div className="space-y-2">
                <Label>Amount</Label>
                <div className="grid grid-cols-3 gap-2">
                  {networkProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProductId(p.id)}
                      className={cn(
                        "rounded-lg border p-3 text-center transition-colors",
                        productId === p.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary hover:border-primary/40"
                      )}
                    >
                      <p className="text-sm font-semibold text-foreground">{formatNaira(p.price)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {productId && (
              <div className="space-y-2">
                <Label htmlFor="recipientNumber">Recipient phone number</Label>
                <Input
                  id="recipientNumber"
                  placeholder="08012345678"
                  required
                  value={recipientNumber}
                  onChange={(e) => setRecipientNumber(e.target.value)}
                />
              </div>
            )}

            {selectedProduct && recipientNumber && (
              <div className="rounded-lg bg-secondary p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">You&apos;re paying</span>
                  <span className="font-semibold text-foreground">{formatNaira(selectedProduct.price)}</span>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting || !productId || !recipientNumber}>
              {isSubmitting && <Spinner className="mr-2" />}
              Confirm Purchase
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
