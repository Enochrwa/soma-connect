import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector, useDispatch } from "react-redux";
import { ShoppingCart, Heart, Bell, User, Search, Menu, X, Globe } from "lucide-react";
import type { RootState } from "../../app/store";
import { useLogoutMutation, useGetNotificationsQuery } from "../../app/api";
import { clearAuth } from "../../features/auth/authSlice";

export function Navbar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const cartCount = useSelector((s: RootState) =>
    s.cart.items.reduce((acc, i) => acc + i.quantity, 0),
  );
  const user = useSelector((s: RootState) => s.auth.user);
  const wishlistCount = useSelector((s: RootState) => s.wishlist.items.length);
  const { data: notifData } = useGetNotificationsQuery(undefined, { skip: !user });
  const [logout] = useLogoutMutation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
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

  return (
    <header className="sticky top-0 z-50 bg-forest shadow-md">
      {/* ── Desktop navbar ─────────────────────────────────────────────────── */}
      <nav className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="font-display text-xl font-bold text-saffron shrink-0">
          SOMA
        </Link>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-forest/60 w-4 h-4" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("nav.search")}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/10 text-white placeholder-white/50 border border-white/10 focus:outline-none focus:border-saffron focus:bg-white/15 transition text-sm"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2">
          {/* Language switcher */}
          <div className="relative group hidden md:block">
            <button className="flex items-center gap-1 text-white/70 hover:text-white text-sm px-2 py-1 rounded-lg">
              <Globe size={14} />
              {i18n.language.toUpperCase()}
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-card-hover py-1 min-w-24 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => i18n.changeLanguage(l.code)}
                  className="block w-full text-left px-3 py-1.5 text-sm text-slate hover:bg-forest/5"
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Wishlist */}
          <Link to="/wishlist" className="relative p-2 text-white/70 hover:text-white">
            <Heart size={20} />
            {wishlistCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-vermillion text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-mono">
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Notifications */}
          {user && (
            <button className="relative p-2 text-white/70 hover:text-white">
              <Bell size={20} />
              {(notifData?.unreadCount ?? 0) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-vermillion text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-mono">
                  {notifData!.unreadCount}
                </span>
              )}
            </button>
          )}

          {/* Cart */}
          <Link to="/cart" className="relative p-2 text-white/70 hover:text-white">
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-saffron text-forest text-xs w-4 h-4 rounded-full flex items-center justify-center font-mono font-bold">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Account */}
          {user ? (
            <div className="relative group hidden md:block">
              <button className="flex items-center gap-2 text-white/70 hover:text-white">
                {user.profile?.avatar ? (
                  <img
                    src={user.profile.avatar}
                    alt="avatar"
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <User size={20} />
                )}
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-card-hover py-1 min-w-44 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-50">
                <Link
                  to="/account"
                  className="block px-4 py-2 text-sm text-slate hover:bg-forest/5"
                >
                  {t("nav.account")}
                </Link>
                <Link to="/orders" className="block px-4 py-2 text-sm text-slate hover:bg-forest/5">
                  {t("nav.orders")}
                </Link>
                <Link
                  to="/rewards"
                  className="block px-4 py-2 text-sm text-slate hover:bg-forest/5"
                >
                  🏆 Rewards
                </Link>
                {user.role === "seller" && (
                  <Link
                    to="/seller"
                    className="block px-4 py-2 text-sm text-slate hover:bg-forest/5"
                  >
                    Seller Dashboard
                  </Link>
                )}
                {user.role === "admin" && (
                  <Link
                    to="/admin"
                    className="block px-4 py-2 text-sm text-slate hover:bg-forest/5"
                  >
                    {t("nav.admin")}
                  </Link>
                )}
                <hr className="my-1 border-gray-100" />
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-vermillion hover:bg-vermillion/5"
                >
                  Log out
                </button>
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden md:flex items-center gap-1 bg-saffron text-forest font-semibold text-sm px-4 py-2 rounded-xl hover:bg-saffron-dark transition"
            >
              {t("auth.login")}
            </Link>
          )}

          {/* Mobile menu */}
          <button className="md:hidden p-2 text-white" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* ── Mobile search ──────────────────────────────────────────────────── */}
      <div className="md:hidden px-4 pb-3">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-4 h-4" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("nav.search")}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:border-saffron border border-white/10"
            />
          </div>
        </form>
      </div>

      {/* ── Mobile menu drawer ─────────────────────────────────────────────── */}
      {menuOpen && (
        <div className="md:hidden bg-forest-light border-t border-white/10 px-4 py-3 space-y-2">
          {!user ? (
            <>
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-white"
              >
                {t("auth.login")}
              </Link>
              <Link
                to="/register"
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-saffron"
              >
                {t("auth.register")}
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/account"
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-white"
              >
                {t("nav.account")}
              </Link>
              <Link
                to="/orders"
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-white"
              >
                {t("nav.orders")}
              </Link>
              <Link
                to="/rewards"
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-white"
              >
                🏆 Rewards
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setMenuOpen(false);
                }}
                className="block py-2 text-vermillion"
              >
                Log out
              </button>
            </>
          )}
          <div className="flex gap-2 pt-2">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  i18n.changeLanguage(l.code);
                  setMenuOpen(false);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${i18n.language === l.code ? "bg-saffron text-forest" : "bg-white/10 text-white"}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
