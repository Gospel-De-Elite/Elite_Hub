import { Smartphone, Wifi, MessageSquare, Receipt, Code2, Users } from "lucide-react";

const services = [
  { icon: Smartphone, title: "Airtime", description: "Instant airtime top-up." },
  { icon: Wifi, title: "Data", description: "Affordable data bundles." },
  { icon: MessageSquare, title: "Bulk SMS", description: "Fast SMS delivery." },
  { icon: Receipt, title: "Utility Bills", description: "Electricity and TV payments." },
  { icon: Code2, title: "API", description: "Developer integrations." },
  { icon: Users, title: "Agent Services", description: "Earn commissions." },
];

export default function ServicesSection() {
  return (
    <section className="bg-landing-bg py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <h2 className="text-center font-display text-2xl font-semibold text-white md:text-3xl">
          Everything You Need In One Platform
        </h2>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-white/10 bg-landing-card p-6 transition-colors hover:border-landing-primary/40"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-landing-primary/15">
                <Icon className="h-5 w-5 text-landing-primary" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-white">{title}</h3>
              <p className="mt-1 text-sm text-landing-text-secondary">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
