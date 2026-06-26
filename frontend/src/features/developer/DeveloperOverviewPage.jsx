import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { Key, BookOpen } from "lucide-react";

export default function DeveloperOverviewPage() {
  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data } = await apiClient.get("/developer/api-keys");
      return data.data;
    },
  });

  const activeKeyCount = keys?.filter((k) => k.status === "ACTIVE").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Developer API</h1>
        <p className="text-muted-foreground">
          Integrate Elite Hub into your own apps — airtime, data, SMS, and eSIM, all behind one API.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/dashboard/api/keys"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-secondary"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Key className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">API Keys</p>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Loading..." : `${activeKeyCount} active key${activeKeyCount === 1 ? "" : "s"}`}
            </p>
          </div>
        </Link>

        <Link
          to="/dashboard/api/docs"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-secondary"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Documentation</p>
            <p className="text-xs text-muted-foreground">Endpoints, auth, and rate limits</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
