import { TrendingUp, MessageSquare, Activity } from "lucide-react";

const recentTransactions = [
  { type: "Airtime - MTN", amount: "₦500", status: "Success" },
  { type: "Data - Airtel 2GB", amount: "₦1,200", status: "Success" },
  { type: "Bulk SMS - 500 units", amount: "₦2,000", status: "Success" },
  { type: "DStv Compact", amount: "₦19,000", status: "Processing" },
];

export default function DashboardPreviewSection() {
  return (
    <section className="bg-landing-bg py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <h2 className="text-center font-display text-2xl font-semibold text-white md:text-3xl">
          Built For Speed And Simplicity
        </h2>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-landing-card p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white">Recent Transactions</p>
              <Activity className="h-4 w-4 text-landing-text-secondary" />
            </div>
            <div className="mt-4 space-y-3">
              {recentTransactions.map((t, i) => (
                <div key={i} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
                  <p className="text-sm text-white">{t.type}</p>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{t.amount}</p>
                    <p
                      className={
                        t.status === "Success" ? "text-xs text-emerald-400" : "text-xs text-amber-400"
                      }
                    >
                      {t.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-landing-card p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Revenue This Month</p>
                <TrendingUp className="h-4 w-4 text-landing-primary" />
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-white">₦4.8M</p>
              <p className="mt-1 text-xs text-emerald-400">+18% from last month</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-landing-card p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">SMS Delivery Report</p>
                <MessageSquare className="h-4 w-4 text-landing-primary" />
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-white">98.6%</p>
              <p className="mt-1 text-xs text-landing-text-secondary">Delivery success rate</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
