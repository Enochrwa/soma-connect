import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useLocation } from "react-router-dom";
import { Home, Search, ShoppingCart, Heart, User } from "lucide-react";
import { useSelector } from "react-redux";
import { cn } from "../../utils/cn";
const NAV_ITEMS = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/search", icon: Search, label: "Search" },
    { to: "/cart", icon: ShoppingCart, label: "Cart" },
    { to: "/wishlist", icon: Heart, label: "Saved" },
    { to: "/account", icon: User, label: "Account" },
];
export function MobileBottomNav() {
    const { pathname } = useLocation();
    const cartCount = useSelector((s) => s.cart.items.reduce((acc, i) => acc + i.quantity, 0));
    return (_jsx("nav", { className: "md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 safe-area-pb", children: _jsx("div", { className: "flex items-center justify-around h-14", children: NAV_ITEMS.map(({ to, icon: Icon, label }) => {
                const isActive = to === "/" ? pathname === "/" : pathname.startsWith(to);
                return (_jsxs(Link, { to: to, className: cn("relative flex flex-col items-center justify-center flex-1 h-full text-xs gap-0.5 transition", isActive ? "text-forest" : "text-gray-400"), children: [_jsxs("div", { className: "relative", children: [_jsx(Icon, { size: 20, strokeWidth: isActive ? 2.5 : 1.5 }), to === "/cart" && cartCount > 0 && (_jsx("span", { className: "absolute -top-1.5 -right-1.5 bg-saffron text-forest text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center font-mono", children: cartCount }))] }), _jsx("span", { className: cn("font-medium", isActive && "font-semibold"), children: label })] }, to));
            }) }) }));
}
