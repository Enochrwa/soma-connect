import { Link, useLocation } from "react-router-dom";
import { Home, Search, ShoppingCart, Heart, User } from "lucide-react";
import { useSelector } from "react-redux";
import type { RootState } from "../../app/store";
import { cn } from "../../utils/cn";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/cart", icon: ShoppingCart, label: "Cart" },
  { to: "/wishlist", icon: Heart, label: "Saved" },
  { to: "/account", icon: User, label: "Account" },
] as const;

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const cartCount = useSelector((s: RootState) =>
    s.cart.items.reduce((acc, i) => acc + i.quantity, 0),
  );

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 safe-area-pb">
      <div className="flex items-center justify-around h-14">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isActive = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full text-xs gap-0.5 transition",
                isActive ? "text-forest" : "text-gray-400",
              )}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                {to === "/cart" && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-saffron text-forest text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center font-mono">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className={cn("font-medium", isActive && "font-semibold")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
