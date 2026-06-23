import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

function formatNaira(value) {
  const number = Number(value || 0);
  return `₦${number.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SmsBuyCreditsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: bundles, isLoading } = useQuery({
    queryKey: ["catalog", "sms"],
    queryFn: async () => {
      const { data } = await apiClient.get("/catalog/products", { params: { category: "sms" } });
      return data.data;
    },
  });

  async function handlePurchase() {
    if (!productId) {
      setError("Please select a bundle.");
      return;
    }
    setError("");
    setIsSubmitting(true);

    try {
      await apiClient.post("/sms/wallet/purchase", { productId });
      queryClient.invalidateQueries({ queryKey: ["sms-wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      navigate("/dashboard/sms");
    } catch (err) {
      setError(err.response?.data?.message || "Purchase failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Buy SMS Credits</h1>
        <p className="text-muted-foreground">Credits are paid for from your NGN wallet balance.</p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          {error && <Alert variant="destructive">{error}</Alert>}

          <div className="space-y-2">
            {bundles?.map((bundle) => (
              <button
                key={bundle.id}
                type="button"
                onClick={() => setProductId(bundle.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors",
                  productId === bundle.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary hover:border-primary/40"
                )}
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{bundle.name}</p>
                  <p className="text-xs text-muted-foreground">{bundle.metadata?.credits} SMS units</p>
                </div>
                <p className="text-sm font-semibold text-primary">{formatNaira(bundle.price)}</p>
              </button>
            ))}
          </div>

          <Button onClick={handlePurchase} className="w-full" disabled={isSubmitting || !productId}>
            {isSubmitting && <Spinner className="mr-2" />}
            Purchase
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
