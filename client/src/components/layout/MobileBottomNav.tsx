import { useLocation, useNavigate } from "react-router-dom";
import { Home, Search, ShoppingCart, Heart, User } from "lucide-react";
import { useSelector } from "react-redux";
import type { RootState } from "../../app/store";
import { cn } from "../../utils/cn";
import { useState } from "react";

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const cartCount = useSelector((s: RootState) =>
    s.cart.items.reduce((acc, i) => acc + i.quantity, 0),
  );
  const wishlistCount = useSelector((s: RootState) => s.wishlist.items.length);
  const user = useSelector((s: RootState) => s.auth.user);
  const [imgErr, setImgErr] = useState(false);

  const avatar = user?.profile?.avatar;
  const initials =
    user?.profile?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  function handleProtectedLink(path: string) {
    if (!user) {
      navigate("/login", { state: { from: path } });
    } else {
      navigate(path);
    }
  }

  const NAV_ITEMS = [
    { to: "/", icon: Home, label: "Home", badge: 0, protected: false },
    { to: "/search", icon: Search, label: "Search", badge: 0, protected: false },
    { to: "/cart", icon: ShoppingCart, label: "Cart", badge: cartCount, protected: false },
    { to: "/wishlist", icon: Heart, label: "Saved", badge: wishlistCount, protected: true },
  ] as const;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map(({ to, icon: Icon, label, badge, protected: isProtected }) => {
          const isActive = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <button
              key={to}
              onClick={() => (isProtected ? handleProtectedLink(to) : navigate(to))}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full text-xs gap-0.5 transition",
                isActive ? "text-forest" : "text-gray-400",
              )}
            >
              <div className="relative">
                <Icon size={21} strokeWidth={isActive ? 2.5 : 1.5} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-saffron text-forest text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center font-mono">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span className={cn("font-medium text-[11px]", isActive && "font-semibold")}>
                {label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-forest rounded-full" />
              )}
            </button>
          );
        })}

        {/* Account tab with avatar */}
        <button
          onClick={() => handleProtectedLink("/account")}
          className={cn(
            "relative flex flex-col items-center justify-center flex-1 h-full text-xs gap-0.5 transition",
            pathname.startsWith("/account") ? "text-forest" : "text-gray-400",
          )}
        >
          <div className="relative">
            {user && avatar && !imgErr ? (
              <img
                src={avatar}
                alt="profile"
                className="w-6 h-6 rounded-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setImgErr(true)}
              />
            ) : user ? (
              <div className="w-6 h-6 rounded-full bg-forest flex items-center justify-center text-saffron text-[10px] font-bold">
                {initials}
              </div>
            ) : (
              <User size={21} strokeWidth={pathname.startsWith("/account") ? 2.5 : 1.5} />
            )}
          </div>
          <span
            className={cn(
              "font-medium text-[11px]",
              pathname.startsWith("/account") && "font-semibold",
            )}
          >
            {user ? "Me" : "Account"}
          </span>
          {pathname.startsWith("/account") && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-forest rounded-full" />
          )}
        </button>
      </div>
    </nav>
  );
}
