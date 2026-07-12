import { useState, useEffect }           from "react";
import { useNavigate }                   from "react-router-dom";
import { useQuery, useQueryClient }      from "@tanstack/react-query";
import apiClient                         from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Alert }    from "@/components/ui/alert";
import { Spinner }  from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn }       from "@/lib/utils";
import { Package, Sliders, Info } from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const MIN_UNITS = 10;
const MAX_UNITS = 100_000;

// ─── Fixed Bundle Card ────────────────────────────────────────────────────────

function BundleCard({ bundle, selected, onSelect }) {
  const credits = bundle.metadata?.credits;

  return (
    <button
      type="button"
      onClick={() => onSelect(bundle.id)}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all",
        selected
          ? "border-primary bg-primary/10 ring-1 ring-primary"
          : "border-border bg-secondary hover:border-primary/40"
      )}
    >
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-foreground">{bundle.name}</p>
        {credits && (
          <p className="text-xs text-muted-foreground">{Number(credits).toLocaleString()} SMS units</p>
        )}
        {credits && bundle.price && (
          <p className="text-xs text-muted-foreground">
            ≈ {fmt(Number(bundle.price) / Number(credits))}/unit
          </p>
        )}
      </div>
      <div className="text-right">
        <p className="text-base font-bold text-primary">{fmt(bundle.price)}</p>
      </div>
    </button>
  );
}

// ─── Custom Units Section ─────────────────────────────────────────────────────

function CustomUnitsSection({ onPurchase, isSubmitting, error, setError }) {
  const [units, setUnits]       = useState("");
  const [touched, setTouched]   = useState(false);

  // Fetch the SMS-CUSTOM product to get the per-unit price for the user's role
  const { data: customProduct } = useQuery({
    queryKey: ["sms-custom-product"],
    queryFn:  async () => {
      const { data } = await apiClient.get("/catalog/products", {
        params: { category: "sms" },
      });
      const products = data.data || [];
      return products.find((p) => p.code === "SMS-CUSTOM") || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const pricePerUnit  = customProduct?.price ? Number(customProduct.price) : null;
  const parsedUnits   = parseInt(units, 10);
  const validUnits    = Number.isInteger(parsedUnits) && parsedUnits >= MIN_UNITS && parsedUnits <= MAX_UNITS;
  const totalCost     = validUnits && pricePerUnit ? parsedUnits * pricePerUnit : null;

  // Live validation message
  let unitError = "";
  if (touched && units !== "") {
    if (!Number.isInteger(parsedUnits) || isNaN(parsedUnits)) {
      unitError = "Please enter a whole number.";
    } else if (parsedUnits < MIN_UNITS) {
      unitError = `Minimum is ${MIN_UNITS} units.`;
    } else if (parsedUnits > MAX_UNITS) {
      unitError = `Maximum is ${MAX_UNITS.toLocaleString()} units per purchase.`;
    }
  }

  function handleChange(e) {
    setTouched(true);
    setError("");
    // Only allow digits
    const val = e.target.value.replace(/\D/g, "");
    setUnits(val);
  }

  function handleSubmit() {
    setTouched(true);
    if (!validUnits) return;
    onPurchase({ type: "custom", units: parsedUnits });
  }

  return (
    <div className="space-y-5">
      {/* Per-unit rate info box */}
      {pricePerUnit && (
        <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              Your rate: <span className="text-primary">{fmt(pricePerUnit)}/unit</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Charged from your NGN wallet. No minimum commitment — buy exactly what you need.
            </p>
          </div>
        </div>
      )}

      {/* Units input */}
      <div className="space-y-2">
        <Label htmlFor="custom-units">
          Number of SMS units
        </Label>
        <Input
          id="custom-units"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={units}
          onChange={handleChange}
          placeholder={`Min ${MIN_UNITS} — Max ${MAX_UNITS.toLocaleString()}`}
          className={cn(unitError && "border-destructive focus-visible:ring-destructive")}
        />
        {unitError && (
          <p className="text-xs text-destructive">{unitError}</p>
        )}
        {!unitError && touched && units && (
          <p className="text-xs text-muted-foreground">
            {MIN_UNITS.toLocaleString()} – {MAX_UNITS.toLocaleString()} units per purchase
          </p>
        )}
      </div>

      {/* Real-time cost preview */}
      {validUnits && totalCost !== null && (
        <div className="rounded-xl border border-border bg-secondary p-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Order Summary
          </p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {parsedUnits.toLocaleString()} units × {fmt(pricePerUnit)}
            </span>
            <span className="font-semibold text-foreground">{fmt(totalCost)}</span>
          </div>
          <div className="border-t border-border pt-2 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Total</span>
            <span className="text-base font-bold text-primary">{fmt(totalCost)}</span>
          </div>
        </div>
      )}

      {error && <Alert variant="destructive">{error}</Alert>}

      <Button
        className="w-full"
        disabled={!validUnits || isSubmitting || !pricePerUnit}
        onClick={handleSubmit}
      >
        {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
        {validUnits && totalCost
          ? `Buy ${parsedUnits.toLocaleString()} units for ${fmt(totalCost)}`
          : "Buy Credits"}
      </Button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SmsBuyCreditsPage() {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();

  const [selectedBundleId, setSelectedBundleId] = useState(null);
  const [error,            setError]            = useState("");
  const [isSubmitting,     setSubmitting]        = useState(false);

  // Fetch SMS products — bundles only (exclude SMS-CUSTOM from the bundle tab)
  const { data: allProducts, isLoading } = useQuery({
    queryKey: ["catalog", "sms"],
    queryFn:  async () => {
      const { data } = await apiClient.get("/catalog/products", {
        params: { category: "sms" },
      });
      return data.data || [];
    },
  });

  const bundles = allProducts?.filter((p) => p.code !== "SMS-CUSTOM") || [];

  async function handlePurchase({ type, units }) {
    setError("");
    setSubmitting(true);

    try {
      if (type === "bundle") {
        if (!selectedBundleId) { setError("Please select a bundle."); setSubmitting(false); return; }
        await apiClient.post("/sms/wallet/purchase", { productId: selectedBundleId });
      } else {
        await apiClient.post("/sms/wallet/purchase-custom", { units });
      }

      // Invalidate SMS wallet and NGN wallet balances
      queryClient.invalidateQueries({ queryKey: ["sms-wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      navigate("/dashboard/sms");
    } catch (err) {
      setError(err.response?.data?.message || "Purchase failed. Please try again.");
    } finally {
      setSubmitting(false);
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
        <p className="text-sm text-muted-foreground">
          Credits are deducted from your NGN wallet. Choose a bundle or enter a custom amount.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="bundles">
            <TabsList className="w-full rounded-b-none">
              <TabsTrigger value="bundles" className="flex flex-1 items-center gap-2">
                <Package className="h-4 w-4" /> Bundles
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex flex-1 items-center gap-2">
                <Sliders className="h-4 w-4" /> Custom Amount
              </TabsTrigger>
            </TabsList>

            {/* ── Fixed bundles tab ─────────────────────────────── */}
            <TabsContent value="bundles" className="p-5 space-y-4">
              <div className="space-y-2.5">
                {bundles.length ? (
                  bundles.map((bundle) => (
                    <BundleCard
                      key={bundle.id}
                      bundle={bundle}
                      selected={selectedBundleId === bundle.id}
                      onSelect={setSelectedBundleId}
                    />
                  ))
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-6">
                    No bundles available. Please try the Custom Amount tab.
                  </p>
                )}
              </div>

              {error && <Alert variant="destructive">{error}</Alert>}

              <Button
                className="w-full"
                disabled={!selectedBundleId || isSubmitting}
                onClick={() => handlePurchase({ type: "bundle" })}
              >
                {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                {selectedBundleId
                  ? `Buy ${bundles.find((b) => b.id === selectedBundleId)?.name || "Bundle"}`
                  : "Select a Bundle"}
              </Button>
            </TabsContent>

            {/* ── Custom units tab ──────────────────────────────── */}
            <TabsContent value="custom" className="p-5">
              <CustomUnitsSection
                onPurchase={handlePurchase}
                isSubmitting={isSubmitting}
                error={error}
                setError={setError}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Need more than 100,000 units?{" "}
        <a href="mailto:support@elitehub.ng" className="text-primary hover:underline">
          Contact us for bulk pricing.
        </a>
      </p>
    </div>
  );
}
