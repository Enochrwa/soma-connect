export default function SocialProof() {
  const stats = [
    { value: "12,400+", label: "Active buyers in Kigali" },
    { value: "480+", label: "Verified sellers" },
    { value: "RWF 2.1B", label: "Traded last quarter" },
    { value: "98%", label: "Orders delivered on time" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 mt-12">
      <div className="rounded-3xl bg-forest text-ivory px-6 md:px-10 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="font-display text-3xl text-saffron">{s.value}</div>
            <div className="text-sm text-ivory/70 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
