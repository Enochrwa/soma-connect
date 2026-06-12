import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";

const SHOP_LINKS = [
  { label: "Electronics", to: "/search?category=electronics" },
  { label: "Fashion", to: "/search?category=fashion" },
  { label: "Food & Drinks", to: "/search?category=food" },
  { label: "Agriculture", to: "/search?category=agriculture" },
  { label: "Beauty", to: "/search?category=beauty" },
  { label: "Sports", to: "/search?category=sports" },
];

const HELP_LINKS = [
  { label: "Track your order", to: "/orders" },
  { label: "Returns & refunds", to: "/terms#returns" },
  { label: "Contact support", to: "mailto:support@soma.rw", external: true },
  { label: "Privacy Policy", to: "/privacy" },
];

const SELLER_LINKS = [
  { label: "Become a seller", to: "/seller/apply" },
  { label: "Seller dashboard", to: "/seller" },
  { label: "Seller policies", to: "/terms#selling" },
  { label: "Terms of Service", to: "/terms" },
];

export function Footer() {
  return (
    <footer className="bg-forest text-ivory/80 mt-16">
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <Link
            to="/"
            className="font-display text-2xl font-bold text-saffron block mb-3 hover:opacity-90 transition"
          >
            SOMA
          </Link>
          <p className="text-ivory/60 leading-relaxed mb-4">
            Rwanda's digital marketplace. Connecting buyers and sellers across the country.
          </p>
          <div className="space-y-2 text-xs text-ivory/50">
            <div className="flex items-center gap-2">
              <MapPin size={13} className="shrink-0" />
              <span>Kigali, Rwanda</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={13} className="shrink-0" />
              <a href="mailto:hello@soma.rw" className="hover:text-saffron transition">
                hello@soma.rw
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={13} className="shrink-0" />
              <a href="tel:+250780000000" className="hover:text-saffron transition">
                +250 780 000 000
              </a>
            </div>
          </div>
        </div>

        {/* Shop */}
        <div>
          <div className="font-semibold text-ivory mb-3 text-sm uppercase tracking-wide">Shop</div>
          <ul className="space-y-2">
            {SHOP_LINKS.map((l) => (
              <li key={l.label}>
                <Link to={l.to} className="text-ivory/60 hover:text-saffron transition text-sm">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Help */}
        <div>
          <div className="font-semibold text-ivory mb-3 text-sm uppercase tracking-wide">Help</div>
          <ul className="space-y-2">
            {HELP_LINKS.map((l) => (
              <li key={l.label}>
                <Link to={l.to} className="text-ivory/60 hover:text-saffron transition text-sm">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Sellers */}
        <div>
          <div className="font-semibold text-ivory mb-3 text-sm uppercase tracking-wide">
            Sellers
          </div>
          <ul className="space-y-2">
            {SELLER_LINKS.map((l) => (
              <li key={l.label}>
                <Link to={l.to} className="text-ivory/60 hover:text-saffron transition text-sm">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ivory/40">
          <span>© {new Date().getFullYear()} SOMA Market. Murakoze!</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-ivory/70 transition">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-ivory/70 transition">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
