import { Zap, Clock, Webhook, FlaskConical } from "lucide-react";

const benefits = [
  { icon: Zap, label: "Easy Integration" },
  { icon: Clock, label: "Fast Response Times" },
  { icon: Webhook, label: "Webhook Support" },
  { icon: FlaskConical, label: "Sandbox Testing" },
];

// Matches the real public API built in Phase 8 — not a placeholder shape.
const codeSnippet = `POST /api/v1/public/sms/send

{
  "recipient": "+234xxxxxxxxxx",
  "message": "Hello World"
}`;

export default function ApiSection() {
  return (
    <section id="api" className="bg-landing-bg py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <h2 className="text-center font-display text-2xl font-semibold text-white md:text-3xl">
          Developer-Friendly APIs
        </h2>

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-5">
            {benefits.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-landing-primary/15">
                  <Icon className="h-4 w-4 text-landing-primary" />
                </div>
                <p className="text-sm font-medium text-white">{label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-landing-card p-6">
            <div className="mb-3 flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-500/60" />
              <span className="h-3 w-3 rounded-full bg-amber-500/60" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/60" />
            </div>
            <pre className="overflow-x-auto text-sm text-landing-text-secondary">
              <code>{codeSnippet}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
