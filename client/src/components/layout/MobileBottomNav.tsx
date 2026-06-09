import { NavLink } from "react-router-dom";
import { Home, Search, ShoppingCart, User } from "lucide-react";

export default function MobileBottomNav() {
  const items = [
    { to: "/", label: "Home", Icon: Home },
    { to: "/catalog", label: "Shop", Icon: Search },
    { to: "/cart", label: "Cart", Icon: ShoppingCart },
    { to: "/auth", label: "Me", Icon: User },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-black/[0.06] z-40">
      <div className="grid grid-cols-4">
        {items.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-3 text-[11px] ${isActive ? "text-forest" : "text-slate/60"}`
            }
          >
            <Icon size={20} /> {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}