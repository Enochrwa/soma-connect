import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector, useDispatch } from "react-redux";
import {
  ShoppingCart,
  Heart,
  Bell,
  CheckCheck,
  User,
  Search,
  Menu,
  X,
  Globe,
  Package,
  Star,
  LogOut,
  LayoutDashboard,
  Shield,
} from "lucide-react";
import type { RootState } from "../../app/store";
import type { AppNotification } from "../../types";
import {
  useLogoutMutation,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
} from "../../app/api";
import { clearAuth } from "../../features/auth/authSlice";

function UserAvatar({ name, avatar }: { name?: string; avatar?: string }) {
  const [err, setErr] = useState(false);
  const initials =
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";
  if (avatar && !err) {
    return (
      <img
        src={avatar}
        alt={name ?? "avatar"}
        className="w-8 h-8 rounded-full object-cover ring-2 ring-saffron/50"
        referrerPolicy="no-referrer"
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-saffron flex items-center justify-center text-forest font-bold text-xs">
      {initials}
    </div>
  );
}

export function Navbar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const accountRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const cartCount = useSelector((s: RootState) =>
    s.cart.items.reduce((acc, i) => acc + i.quantity, 0),
  );
  const user = useSelector((s: RootState) => s.auth.user);
  const wishlistCount = useSelector((s: RootState) => s.wishlist.items.length);
  const { data: notifData } = useGetNotificationsQuery(undefined, { skip: !user });
  const [markRead] = useMarkNotificationReadMutation();
  const [logout] = useLogoutMutation();

  // Close account dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleLogout = async () => {
    setAccountMenuOpen(false);
    setMenuOpen(false);
    await logout();
    dispatch(clearAuth());
    navigate("/");
  };

  const languages = [
    { code: "en", label: "EN 🇬🇧" },
    { code: "rw", label: "RW 🇷🇼" },
    { code: "fr", label: "FR 🇫🇷" },
  ];

  const unreadCount = notifData?.unreadCount ?? 0;

  return (
    <header className="sticky top-0 z-50 bg-forest shadow-md">
      {/* ── Desktop navbar ─────────────────────────────────────────────────── */}
      <nav className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link
          to="/"
          className="font-display text-xl font-bold text-saffron shrink-0 hover:opacity-90 transition"
        >
          SOMA
        </Link>

        {/* Search bar — desktop */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-4 h-4 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("nav.search")}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/10 text-white placeholder-white/50 border border-white/10 focus:outline-none focus:border-saffron focus:bg-white/15 transition text-sm"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1">
          {/* Language switcher */}
          <div className="relative group hidden md:block">
            <button className="flex items-center gap-1 text-white/70 hover:text-white text-sm px-2 py-1.5 rounded-lg hover:bg-white/10 transition">
              <Globe size={14} />
              {i18n.language.toUpperCase()}
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-card-hover py-1 min-w-[6rem] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => i18n.changeLanguage(l.code)}
                  className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-forest/5 transition ${i18n.language === l.code ? "text-forest font-semibold" : "text-slate"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Wishlist */}
          <Link
            to={user ? "/wishlist" : "/login"}
            className="relative p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
            aria-label="Wishlist"
          >
            <Heart size={20} />
            {wishlistCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-vermillion text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center font-mono">
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Notifications */}
          {user && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
                aria-label="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-vermillion text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center font-mono">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-2xl border border-slate/10 z-50 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate/10">
                    <span className="font-semibold text-forest text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={() =>
                          (notifData?.notifications as AppNotification[])
                            ?.filter((n) => !n.read)
                            .forEach((n) => markRead(n._id))
                        }
                        className="flex items-center gap-1 text-xs text-forest/60 hover:text-forest transition"
                      >
                        <CheckCheck size={13} />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <ul className="max-h-72 overflow-y-auto divide-y divide-slate/5">
                    {notifData?.notifications?.length ? (
                      (notifData.notifications as AppNotification[]).slice(0, 20).map((n) => (
                        <li
                          key={n._id}
                          onClick={() => !n.read && markRead(n._id)}
                          className={`px-4 py-3 cursor-pointer hover:bg-slate/5 transition ${
                            !n.read ? "bg-saffron/5" : ""
                          }`}
                        >
                          <p
                            className={`text-sm ${!n.read ? "font-medium text-forest" : "text-slate/70"}`}
                          >
                            {n.message}
                          </p>
                          <p className="text-[11px] text-slate/40 mt-0.5">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-8 text-center text-sm text-slate/40">
                        No notifications yet
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Cart */}
          <Link
            to="/cart"
            className="relative p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
            aria-label="Cart"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-saffron text-forest text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center font-mono">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Account — desktop */}
          {user ? (
            <div className="relative hidden md:block" ref={accountRef}>
              <button
                className="flex items-center gap-2 text-white/80 hover:text-white px-2 py-1.5 rounded-xl hover:bg-white/10 transition"
                onClick={() => setAccountMenuOpen((o) => !o)}
                aria-expanded={accountMenuOpen}
                aria-haspopup="true"
              >
                <UserAvatar name={user.profile?.name} avatar={user.profile?.avatar} />
                <span className="text-sm font-medium max-w-[96px] truncate">
                  {user.profile?.name?.split(" ")[0] ?? "Account"}
                </span>
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-card-hover py-2 min-w-[200px] z-50 animate-slide-up border border-forest/5">
                  {/* User info header */}
                  <div className="px-4 py-2 border-b border-gray-50 mb-1">
                    <p className="text-sm font-semibold text-forest truncate">
                      {user.profile?.name ?? "SOMA User"}
                    </p>
                    <p className="text-xs text-slate/50 truncate">{user.email ?? user.phone}</p>
                  </div>

                  <Link
                    to="/account"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate hover:bg-forest/5 transition"
                  >
                    <User size={15} className="text-slate/50" /> {t("nav.account")}
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate hover:bg-forest/5 transition"
                  >
                    <Package size={15} className="text-slate/50" /> {t("nav.orders")}
                  </Link>
                  <Link
                    to="/rewards"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate hover:bg-forest/5 transition"
                  >
                    <Star size={15} className="text-slate/50" /> Rewards
                  </Link>
                  {user.role === "seller" && (
                    <Link
                      to="/seller"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate hover:bg-forest/5 transition"
                    >
                      <LayoutDashboard size={15} className="text-slate/50" /> Seller Dashboard
                    </Link>
                  )}
                  {user.role === "admin" && (
                    <Link
                      to="/admin"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate hover:bg-forest/5 transition"
                    >
                      <Shield size={15} className="text-slate/50" /> {t("nav.admin")}
                    </Link>
                  )}
                  <hr className="my-1 border-gray-100" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm text-vermillion hover:bg-vermillion/5 transition"
                  >
                    <LogOut size={15} /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 ml-1">
              <Link
                to="/login"
                className="text-white/80 hover:text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-white/10 transition"
              >
                {t("auth.login")}
              </Link>
              <Link
                to="/register"
                className="bg-saffron text-forest font-semibold text-sm px-4 py-2 rounded-xl hover:bg-saffron-dark transition shadow-gold/30 shadow-sm"
              >
                {t("auth.register")}
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* ── Mobile search bar ──────────────────────────────────────────────── */}
      <div className="md:hidden px-4 pb-3">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-4 h-4 pointer-events-none" />
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

      {/* ── Mobile drawer ──────────────────────────────────────────────────── */}
      {menuOpen && (
        <div className="md:hidden bg-forest-light border-t border-white/10 px-4 py-4 space-y-1 animate-slide-up">
          {user ? (
            <>
              {/* User identity strip */}
              <div className="flex items-center gap-3 px-2 py-3 mb-2 border-b border-white/10">
                <UserAvatar name={user.profile?.name} avatar={user.profile?.avatar} />
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">
                    {user.profile?.name ?? "SOMA User"}
                  </p>
                  <p className="text-white/50 text-xs truncate">{user.email ?? user.phone}</p>
                </div>
              </div>
              <Link
                to="/account"
                className="flex items-center gap-3 px-2 py-3 text-white hover:bg-white/10 rounded-xl transition"
              >
                <User size={17} className="text-white/60" /> {t("nav.account")}
              </Link>
              <Link
                to="/orders"
                className="flex items-center gap-3 px-2 py-3 text-white hover:bg-white/10 rounded-xl transition"
              >
                <Package size={17} className="text-white/60" /> {t("nav.orders")}
              </Link>
              <Link
                to="/wishlist"
                className="flex items-center gap-3 px-2 py-3 text-white hover:bg-white/10 rounded-xl transition"
              >
                <Heart size={17} className="text-white/60" /> Wishlist
                {wishlistCount > 0 && (
                  <span className="ml-auto bg-vermillion text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <Link
                to="/cart"
                className="flex items-center gap-3 px-2 py-3 text-white hover:bg-white/10 rounded-xl transition"
              >
                <ShoppingCart size={17} className="text-white/60" /> Cart
                {cartCount > 0 && (
                  <span className="ml-auto bg-saffron text-forest text-xs font-bold px-2 py-0.5 rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>
              <Link
                to="/rewards"
                className="flex items-center gap-3 px-2 py-3 text-white hover:bg-white/10 rounded-xl transition"
              >
                <Star size={17} className="text-white/60" /> Rewards
              </Link>
              {user.role === "seller" && (
                <Link
                  to="/seller"
                  className="flex items-center gap-3 px-2 py-3 text-white hover:bg-white/10 rounded-xl transition"
                >
                  <LayoutDashboard size={17} className="text-white/60" /> Seller Dashboard
                </Link>
              )}
              {user.role === "admin" && (
                <Link
                  to="/admin"
                  className="flex items-center gap-3 px-2 py-3 text-saffron font-semibold hover:bg-white/10 rounded-xl transition"
                >
                  <Shield size={17} className="text-saffron/80" /> {t("nav.admin")}
                </Link>
              )}
              <div className="pt-2 border-t border-white/10 mt-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-2 py-3 text-vermillion hover:bg-vermillion/10 rounded-xl transition"
                >
                  <LogOut size={17} /> Log out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="flex items-center justify-center py-3 text-white font-medium hover:bg-white/10 rounded-xl transition"
              >
                {t("auth.login")}
              </Link>
              <Link
                to="/register"
                className="flex items-center justify-center py-3 bg-saffron text-forest font-semibold rounded-xl hover:bg-saffron-dark transition mt-1"
              >
                {t("auth.register")}
              </Link>
            </>
          )}
          {/* Language switcher */}
          <div className="flex gap-2 pt-3 border-t border-white/10 mt-2">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => i18n.changeLanguage(l.code)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                  i18n.language === l.code
                    ? "bg-saffron text-forest"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
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
