export default function SellerDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-display text-3xl text-forest">Seller dashboard</h1>
      <p className="text-slate/60 mt-2">Scaffold ready — extend with overview, products, orders, analytics, payouts, reviews, promotions, settings tabs.</p>
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        {["Revenue today","Pending orders","Store rating"].map((s)=>(
          <div key={s} className="card p-5">
            <div className="text-xs text-slate/60">{s}</div>
            <div className="font-display text-2xl text-forest mt-2">—</div>
          </div>
        ))}
      </div>
    </div>
  );
}