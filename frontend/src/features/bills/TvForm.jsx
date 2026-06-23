import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import OrderResult from "@/components/common/OrderResult";
import { cn } from "@/lib/utils";

function formatNaira(value) {
  const number = Number(value || 0);
  return `₦${number.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TvForm() {
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState(null);
  const [smartcardNumber, setSmartcardNumber] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const { data: bouquets, isLoading } = useQuery({
    queryKey: ["catalog", "cable-tv"],
    queryFn: async () => {
      const { data } = await apiClient.get("/catalog/products", { params: { category: "cable-tv" } });
      return data.data;
    },
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!productId) {
      setError("Please select a bouquet.");
      return;
    }
    if (!smartcardNumber.trim()) {
      setError("Please enter your smartcard number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await apiClient.post("/orders/tv", { productId, smartcardNumber });
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
    setProductId(null);
    setSmartcardNumber("");
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (result) {
    return <OrderResult order={result} onReset={reset} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="space-y-2">
        <Label>Bouquet</Label>
        <div className="space-y-2">
          {bouquets?.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setProductId(b.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors",
                productId === b.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary hover:border-primary/40"
              )}
            >
              <span className="text-sm font-medium text-foreground">{b.name}</span>
              <span className="text-sm font-semibold text-primary">{formatNaira(b.price)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="smartcardNumber">Smartcard number</Label>
        <Input
          id="smartcardNumber"
          required
          value={smartcardNumber}
          onChange={(e) => setSmartcardNumber(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Spinner className="mr-2" />}
        Pay Subscription
      </Button>
    </form>
  );
}
