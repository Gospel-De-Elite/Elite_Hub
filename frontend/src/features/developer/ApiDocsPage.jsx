import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const endpoints = [
  { method: "POST", path: "/api/v1/public/airtime", body: "{ productId, recipientNumber }" },
  { method: "POST", path: "/api/v1/public/data", body: "{ productId, recipientNumber }" },
  {
    method: "POST",
    path: "/api/v1/public/electricity",
    body: "{ productId, meterNumber, meterType, billAmount }",
  },
  { method: "POST", path: "/api/v1/public/tv", body: "{ productId, smartcardNumber }" },
  { method: "POST", path: "/api/v1/public/sms/send", body: "{ recipient, message }" },
  { method: "POST", path: "/api/v1/public/esim/orders", body: "{ esimProductId }" },
  { method: "GET", path: "/api/v1/public/orders/:reference", body: null },
];

const rateLimits = [
  { role: "Customer", limit: "100 / minute" },
  { role: "Reseller", limit: "300 / minute" },
  { role: "Agent", limit: "500 / minute" },
  { role: "Admin", limit: "1000 / minute" },
];

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">API Documentation</h1>
        <p className="text-muted-foreground">Everything you need to integrate with the Elite Hub public API.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-foreground">
            Generate an API key under <span className="font-medium">API Keys</span>. Combine your key and secret
            with a single dot, and send it as a bearer token:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-secondary p-4 text-xs text-foreground">
            {`Authorization: Bearer {apiKey}.{apiSecret}`}
          </pre>
          <p className="text-sm text-muted-foreground">
            Your secret is shown only once at creation — store it securely, it can&apos;t be retrieved again.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {endpoints.map((e) => (
            <div key={e.path} className="rounded-lg bg-secondary p-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {e.method}
                </span>
                <span className="font-mono text-sm text-foreground">{e.path}</span>
              </div>
              {e.body && <p className="mt-1 font-mono text-xs text-muted-foreground">{e.body}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rate Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rateLimits.map((r) => (
            <div key={r.role} className="flex items-center justify-between border-b border-border py-2 last:border-0">
              <span className="text-sm text-foreground">{r.role}</span>
              <span className="text-sm text-muted-foreground">{r.limit}</span>
            </div>
          ))}
          <p className="pt-2 text-xs text-muted-foreground">
            Limits are keyed per API key, not per IP — they apply across however many servers call with the same
            credential.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Example: Buy Airtime</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-secondary p-4 text-xs text-foreground">
            {`curl -X POST https://api.elitehub.ng/api/v1/public/airtime \\
  -H "Authorization: Bearer eh_xxxx.yyyyyyyyyy" \\
  -H "Content-Type: application/json" \\
  -d '{
    "productId": "PASTE_PRODUCT_ID",
    "recipientNumber": "08012345678"
  }'`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
