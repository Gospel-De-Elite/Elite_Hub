const stats = [
  { value: "5M+", label: "Transactions" },
  { value: "99.9%", label: "Uptime" },
  { value: "50K+", label: "Users" },
  { value: "1.2M+", label: "SMS Delivered" },
];

export default function TrustSection() {
  return (
    <section className="bg-landing-bg py-16">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <h2 className="text-center font-display text-2xl font-semibold text-white md:text-3xl">
          Trusted By Thousands Across Nigeria
        </h2>
        <div className="mt-12 grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-3xl font-bold text-landing-primary md:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-landing-text-secondary">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
