export default function ComingSoonPage({ title }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center">
      <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-muted-foreground">This screen lands in an upcoming frontend bit.</p>
    </div>
  );
}
