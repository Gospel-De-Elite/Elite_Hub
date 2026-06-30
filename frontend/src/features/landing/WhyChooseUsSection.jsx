import { Zap, ShieldCheck, Lock, Tag, Code2, Headset } from "lucide-react";

const features = [
  { icon: Zap, title: "Fast Delivery", description: "Transactions completed instantly." },
  { icon: ShieldCheck, title: "Reliable Infrastructure", description: "99.9% uptime." },
  { icon: Lock, title: "Secure Payments", description: "Encrypted transactions." },
  { icon: Tag, title: "Affordable Pricing", description: "Competitive rates." },
  { icon: Code2, title: "Developer APIs", description: "Simple integrations." },
  { icon: Headset, title: "Dedicated Support", description: "Responsive customer service." },
];

export default function WhyChooseUsSection() {
  return (
    <section className="bg-landing-bg py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <h2 className="text-center font-display text-2xl font-semibold text-white md:text-3xl">Why Choose Us</h2>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="bg-landing-bg p-6">
              <Icon className="h-6 w-6 text-landing-primary" />
              <h3 className="mt-3 font-display text-base font-semibold text-white">{title}</h3>
              <p className="mt-1 text-sm text-landing-text-secondary">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
