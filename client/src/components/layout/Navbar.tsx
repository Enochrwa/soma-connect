import { Link, NavLink } from "react-router-dom";
import { ShoppingCart, Search, User, Menu } from "lucide-react";
import { useAppSelector } from "../../app/hooks";
import { useState } from "react";

export default function Navbar() {
  const cartCount = useAppSelector((s) => s.cart.items.reduce((a, b) => a + b.quantity, 0));
  const user = useAppSelector((s) => s.auth.user);
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-ivory/85 backdrop-blur border-b border-black/[0.04]">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-block w-8 h-8 rounded-lg bg-forest grid place-items-center text-saffron font-display font-bold">S</span>
          <span className="font-display text-xl font-semibold text-forest">SOMA</span>
        </Link>

        <form
          className="hidden md:flex flex-1 max-w-xl items-center bg-white border border-black/[0.06] rounded-xl px-3 py-2 shadow-soft"
          onSubmit={(e) => e.preventDefault()}
        >
          <Search size={18} className="text-slate/50" />
          <input
            type="search"
            placeholder="Search Samsung A54, Akabanga, coffee…"
            className="flex-1 bg-transparent px-3 outline-none text-sm"
          />
        </form>

        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {[
            { to: "/", label: "Home" },
            { to: "/catalog", label: "Shop" },
          ].map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg ${isActive ? "text-forest" : "text-slate/70 hover:text-forest"}`
              }
              end
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          <Link to="/cart" className="relative p-2 rounded-lg hover:bg-black/[0.04]">
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-vermillion text-white text-[10px] font-bold w-5 h-5 grid place-items-center rounded-full">
                {cartCount}
              </span>
            )}
          </Link>
          <Link to={user ? "/seller" : "/auth"} className="btn-ghost text-sm">
            <User size={16} /> {user ? user.profile?.name ?? "Account" : "Sign in"}
          </Link>
          <button className="md:hidden p-2 rounded-lg hover:bg-black/[0.04]" onClick={() => setOpen(!open)}>
            <Menu size={20} />
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-black/[0.04] px-4 py-3 bg-white flex flex-col gap-2 text-sm">
          <Link to="/" onClick={() => setOpen(false)}>Home</Link>
          <Link to="/catalog" onClick={() => setOpen(false)}>Shop</Link>
          <Link to="/seller" onClick={() => setOpen(false)}>Sell on SOMA</Link>
        </div>
      )}
    </header>
  );
}