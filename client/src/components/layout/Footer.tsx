export function Footer() {
  return (
    <footer className="bg-forest text-ivory/80 mt-16">
      <div className="mx-auto max-w-7xl px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="font-display text-2xl text-saffron mb-2">SOMA</div>
          <p className="text-ivory/60">Rwanda&apos;s digital marketplace. Built in Kigali.</p>
        </div>
        <div>
          <div className="font-semibold text-ivory mb-3">Shop</div>
          <ul className="space-y-2">
            <li>Electronics</li>
            <li>Fashion</li>
            <li>Food</li>
            <li>Agriculture</li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-ivory mb-3">Help</div>
          <ul className="space-y-2">
            <li>Track order</li>
            <li>Returns</li>
            <li>Contact</li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-ivory mb-3">Sellers</div>
          <ul className="space-y-2">
            <li>Become a seller</li>
            <li>Seller fees</li>
            <li>Policies</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-ivory/50">
        © {new Date().getFullYear()} SOMA Market. Murakoze!
      </div>
    </footer>
  );
}
