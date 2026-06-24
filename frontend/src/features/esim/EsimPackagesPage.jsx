import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, Wifi, Calendar } from "lucide-react";
import EsimPurchaseResult from "./EsimPurchaseResult";

function formatNaira(value) {
  const number = Number(value || 0);
  return `₦${number.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function EsimPackagesPage() {
  const { countryCode } = useParams();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [purchasingId, setPurchasingId] = useState(null);
  const [result, setResult] = useState(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["esim-products", countryCode],
    queryFn: async () => {
      const { data } = await apiClient.get("/esim/products", { params: { countryCode } });
      return data.data;
    },
  });

  async function handlePurchase(esimProductId) {
    setError("");
    setPurchasingId(esimProductId);
    try {
      const { data } = await apiClient.post("/esim/orders", { esimProductId });
      setResult(data.data);
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["esim-orders"] });
    } catch (err) {
      setError(err.response?.data?.message || "Purchase failed. Please try again.");
    } finally {
      setPurchasingId(null);
    }
  }

  if (result) {
    return <EsimPurchaseResult order={result} onReset={() => setResult(null)} />;
  }

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard/esim"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to countries
      </Link>

      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          {products?.[0]?.country || countryCode} eSIM Packages
        </h1>
        <p className="text-muted-foreground">Choose a data package to activate instantly.</p>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {products?.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-col gap-3 p-5">
                <p className="font-display text-lg font-semibold text-foreground">{p.packageName}</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4" />
                    {p.dataAllowance}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {p.validity}
                  </div>
                </div>
                <p className="font-display text-xl font-semibold text-primary">{formatNaira(p.sellingPrice)}</p>
                <Button onClick={() => handlePurchase(p.id)} disabled={purchasingId === p.id} className="w-full">
                  {purchasingId === p.id && <Spinner className="mr-2 h-4 w-4" />}
                  Buy Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
