import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector, useDispatch } from "react-redux";
import { ShoppingCart, Heart, Bell, User, Search, Menu, X, Globe } from "lucide-react";
import { useLogoutMutation, useGetNotificationsQuery } from "../../app/api";
import { clearAuth } from "../../features/auth/authSlice";
export function Navbar() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const cartCount = useSelector((s) => s.cart.items.reduce((acc, i) => acc + i.quantity, 0));
    const user = useSelector((s) => s.auth.user);
    const wishlistCount = useSelector((s) => s.wishlist.items.length);
    const { data: notifData } = useGetNotificationsQuery(undefined, { skip: !user });
    const [logout] = useLogoutMutation();
    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim())
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    };
    const handleLogout = async () => {
        await logout();
        dispatch(clearAuth());
        navigate("/");
    };
    const languages = [
        { code: "en", label: "EN 🇬🇧" },
        { code: "rw", label: "RW 🇷🇼" },
        { code: "fr", label: "FR 🇫🇷" },
    ];
    return (_jsxs("header", { className: "sticky top-0 z-50 bg-forest shadow-md", children: [_jsxs("nav", { className: "max-w-7xl mx-auto px-4 h-16 flex items-center gap-4", children: [_jsx(Link, { to: "/", className: "font-display text-xl font-bold text-saffron shrink-0", children: "SOMA" }), _jsx("form", { onSubmit: handleSearch, className: "flex-1 max-w-2xl hidden md:flex", children: _jsxs("div", { className: "relative w-full", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-forest/60 w-4 h-4" }), _jsx("input", { type: "search", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), placeholder: t("nav.search"), className: "w-full pl-10 pr-4 py-2 rounded-xl bg-white/10 text-white placeholder-white/50 border border-white/10 focus:outline-none focus:border-saffron focus:bg-white/15 transition text-sm" })] }) }), _jsxs("div", { className: "ml-auto flex items-center gap-2", children: [_jsxs("div", { className: "relative group hidden md:block", children: [_jsxs("button", { className: "flex items-center gap-1 text-white/70 hover:text-white text-sm px-2 py-1 rounded-lg", children: [_jsx(Globe, { size: 14 }), i18n.language.toUpperCase()] }), _jsx("div", { className: "absolute right-0 top-full mt-1 bg-white rounded-xl shadow-card-hover py-1 min-w-24 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition", children: languages.map((l) => (_jsx("button", { onClick: () => i18n.changeLanguage(l.code), className: "block w-full text-left px-3 py-1.5 text-sm text-slate hover:bg-forest/5", children: l.label }, l.code))) })] }), _jsxs(Link, { to: "/wishlist", className: "relative p-2 text-white/70 hover:text-white", children: [_jsx(Heart, { size: 20 }), wishlistCount > 0 && (_jsx("span", { className: "absolute -top-0.5 -right-0.5 bg-vermillion text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-mono", children: wishlistCount }))] }), user && (_jsxs("button", { className: "relative p-2 text-white/70 hover:text-white", children: [_jsx(Bell, { size: 20 }), (notifData?.unreadCount ?? 0) > 0 && (_jsx("span", { className: "absolute -top-0.5 -right-0.5 bg-vermillion text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-mono", children: notifData.unreadCount }))] })), _jsxs(Link, { to: "/cart", className: "relative p-2 text-white/70 hover:text-white", children: [_jsx(ShoppingCart, { size: 20 }), cartCount > 0 && (_jsx("span", { className: "absolute -top-0.5 -right-0.5 bg-saffron text-forest text-xs w-4 h-4 rounded-full flex items-center justify-center font-mono font-bold", children: cartCount }))] }), user ? (_jsxs("div", { className: "relative group hidden md:block", children: [_jsx("button", { className: "flex items-center gap-2 text-white/70 hover:text-white", children: user.profile?.avatar ? (_jsx("img", { src: user.profile.avatar, alt: "avatar", className: "w-7 h-7 rounded-full object-cover" })) : (_jsx(User, { size: 20 })) }), _jsxs("div", { className: "absolute right-0 top-full mt-1 bg-white rounded-xl shadow-card-hover py-1 min-w-44 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-50", children: [_jsx(Link, { to: "/account", className: "block px-4 py-2 text-sm text-slate hover:bg-forest/5", children: t("nav.account") }), _jsx(Link, { to: "/orders", className: "block px-4 py-2 text-sm text-slate hover:bg-forest/5", children: t("nav.orders") }), _jsx(Link, { to: "/rewards", className: "block px-4 py-2 text-sm text-slate hover:bg-forest/5", children: "\uD83C\uDFC6 Rewards" }), user.role === "seller" && (_jsx(Link, { to: "/seller", className: "block px-4 py-2 text-sm text-slate hover:bg-forest/5", children: "Seller Dashboard" })), user.role === "admin" && (_jsx(Link, { to: "/admin", className: "block px-4 py-2 text-sm text-slate hover:bg-forest/5", children: t("nav.admin") })), _jsx("hr", { className: "my-1 border-gray-100" }), _jsx("button", { onClick: handleLogout, className: "block w-full text-left px-4 py-2 text-sm text-vermillion hover:bg-vermillion/5", children: "Log out" })] })] })) : (_jsx(Link, { to: "/login", className: "hidden md:flex items-center gap-1 bg-saffron text-forest font-semibold text-sm px-4 py-2 rounded-xl hover:bg-saffron-dark transition", children: t("auth.login") })), _jsx("button", { className: "md:hidden p-2 text-white", onClick: () => setMenuOpen(!menuOpen), children: menuOpen ? _jsx(X, { size: 20 }) : _jsx(Menu, { size: 20 }) })] })] }), _jsx("div", { className: "md:hidden px-4 pb-3", children: _jsx("form", { onSubmit: handleSearch, children: _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-4 h-4" }), _jsx("input", { type: "search", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), placeholder: t("nav.search"), className: "w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:border-saffron border border-white/10" })] }) }) }), menuOpen && (_jsxs("div", { className: "md:hidden bg-forest-light border-t border-white/10 px-4 py-3 space-y-2", children: [!user ? (_jsxs(_Fragment, { children: [_jsx(Link, { to: "/login", onClick: () => setMenuOpen(false), className: "block py-2 text-white", children: t("auth.login") }), _jsx(Link, { to: "/register", onClick: () => setMenuOpen(false), className: "block py-2 text-saffron", children: t("auth.register") })] })) : (_jsxs(_Fragment, { children: [_jsx(Link, { to: "/account", onClick: () => setMenuOpen(false), className: "block py-2 text-white", children: t("nav.account") }), _jsx(Link, { to: "/orders", onClick: () => setMenuOpen(false), className: "block py-2 text-white", children: t("nav.orders") }), _jsx(Link, { to: "/rewards", onClick: () => setMenuOpen(false), className: "block py-2 text-white", children: "\uD83C\uDFC6 Rewards" }), _jsx("button", { onClick: () => {
                                    handleLogout();
                                    setMenuOpen(false);
                                }, className: "block py-2 text-vermillion", children: "Log out" })] })), _jsx("div", { className: "flex gap-2 pt-2", children: languages.map((l) => (_jsx("button", { onClick: () => {
                                i18n.changeLanguage(l.code);
                                setMenuOpen(false);
                            }, className: `px-3 py-1 rounded-lg text-xs font-semibold ${i18n.language === l.code ? "bg-saffron text-forest" : "bg-white/10 text-white"}`, children: l.label }, l.code))) })] }))] }));
}
