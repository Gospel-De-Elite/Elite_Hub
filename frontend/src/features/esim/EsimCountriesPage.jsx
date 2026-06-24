import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import apiClient from "@/api/client";
import { Spinner } from "@/components/ui/spinner";
import { Globe } from "lucide-react";

export default function EsimCountriesPage() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["esim-products"],
    queryFn: async () => {
      const { data } = await apiClient.get("/esim/products");
      return data.data;
    },
  });

  const countries = products
    ? Array.from(
        products
          .reduce((map, p) => {
            if (!map.has(p.countryCode)) {
              map.set(p.countryCode, { countryCode: p.countryCode, country: p.country, count: 0 });
            }
            map.get(p.countryCode).count += 1;
            return map;
          }, new Map())
          .values()
      )
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">eSIM Marketplace</h1>
        <p className="text-muted-foreground">Stay connected anywhere — instant data eSIMs, no roaming fees.</p>
      </div>

      {countries.length === 0 ? (
        <p className="text-muted-foreground">No eSIM packages available right now.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {countries.map((c) => (
            <Link
              key={c.countryCode}
              to={`/dashboard/esim/packages/${c.countryCode}`}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 text-center transition-colors hover:border-primary/50 hover:bg-secondary"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">{c.country}</span>
              <span className="text-xs text-muted-foreground">
                {c.count} package{c.count > 1 ? "s" : ""}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
