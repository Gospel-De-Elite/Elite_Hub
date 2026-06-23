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

export default function ElectricityForm() {
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState(null);
  const [meterNumber, setMeterNumber] = useState("");
  const [meterType, setMeterType] = useState("PREPAID");
  const [billAmount, setBillAmount] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const { data: discos, isLoading } = useQuery({
    queryKey: ["catalog", "electricity"],
    queryFn: async () => {
      const { data } = await apiClient.get("/catalog/products", { params: { category: "electricity" } });
      return data.data;
    },
  });

  const selectedDisco = discos?.find((d) => d.id === productId);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!productId) {
      setError("Please select your electricity provider.");
      return;
    }
    if (!meterNumber.trim()) {
      setError("Please enter your meter number.");
      return;
    }
    if (!billAmount || Number(billAmount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await apiClient.post("/orders/electricity", {
        productId,
        meterNumber,
        meterType,
        billAmount: Number(billAmount),
      });
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
    setMeterNumber("");
    setBillAmount("");
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
        <Label>Electricity provider</Label>
        <div className="space-y-2">
          {discos?.map((disco) => (
            <button
              key={disco.id}
              type="button"
              onClick={() => setProductId(disco.id)}
              className={cn(
                "w-full rounded-lg border p-3 text-left text-sm font-medium transition-colors",
                productId === disco.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary text-foreground hover:border-primary/40"
              )}
            >
              {disco.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="meterType">Meter type</Label>
          <select
            id="meterType"
            value={meterType}
            onChange={(e) => setMeterType(e.target.value)}
            className="flex h-11 w-full rounded-lg border border-input bg-secondary px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="PREPAID">Prepaid</option>
            <option value="POSTPAID">Postpaid</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="meterNumber">Meter number</Label>
          <Input id="meterNumber" required value={meterNumber} onChange={(e) => setMeterNumber(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="billAmount">Amount to recharge (₦)</Label>
        <Input
          id="billAmount"
          type="number"
          min="500"
          required
          value={billAmount}
          onChange={(e) => setBillAmount(e.target.value)}
        />
      </div>

      {selectedDisco && billAmount && (
        <div className="space-y-1 rounded-lg bg-secondary p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Recharge amount</span>
            <span className="text-foreground">{formatNaira(billAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Convenience fee</span>
            <span className="text-foreground">{formatNaira(selectedDisco.price)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1 font-semibold">
            <span className="text-foreground">Total</span>
            <span className="text-foreground">
              {formatNaira(Number(billAmount) + Number(selectedDisco.price))}
            </span>
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Spinner className="mr-2" />}
        Pay Bill
      </Button>
    </form>
  );
}
