import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGetMeQuery, useUpdateProfileMutation, useLogoutMutation } from "../app/api";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { clearAuth, setAuth } from "../features/auth/authSlice";
import type { RootState } from "../app/store";
import {
  User,
  Package,
  Heart,
  Star,
  LogOut,
  Settings,
  Camera,
  Loader2,
  ChevronRight,
  Shield,
} from "lucide-react";

function Avatar({ name, avatar }: { name?: string; avatar?: string }) {
  const [imgError, setImgError] = useState(false);
  if (avatar && !imgError)
    return (
      <img
        src={avatar}
        alt={name}
        className="w-20 h-20 rounded-2xl object-cover ring-2 ring-saffron/20"
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
      />
    );
  const initials =
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";
  return (
    <div className="w-20 h-20 rounded-2xl bg-forest flex items-center justify-center text-saffron font-bold text-2xl font-display">
      {initials}
    </div>
  );
}

type Tab = "profile" | "orders" | "settings";

export default function AccountPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("profile");
  const user = useAppSelector((s: RootState) => s.auth.user);
  const accessToken = useAppSelector((s: RootState) => s.auth.accessToken ?? "");
  const { data } = useGetMeQuery(undefined, { skip: !user });
  const [updateProfile, { isLoading: saving }] = useUpdateProfileMutation();
  const [logout] = useLogoutMutation();

  const [name, setName] = useState(user?.profile?.name ?? "");
  const [lang, setLang] = useState(user?.profile?.language ?? "en");
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await updateProfile({
        profile: { name, language: lang as "en" | "rw" | "fr" },
      }).unwrap();
      dispatch(setAuth({ user: res.user, accessToken }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* */
    }
  }

  async function handleLogout() {
    await logout();
    dispatch(clearAuth());
    navigate("/");
  }

  const me = data?.user ?? user;

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "profile", label: "My Profile", icon: User },
    { key: "orders", label: "My Orders", icon: Package },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header card */}
      <div className="bg-forest rounded-2xl p-6 mb-6 flex items-center gap-5">
        <div className="relative">
          <Avatar name={me?.profile?.name} avatar={me?.profile?.avatar} />
          <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-saffron rounded-full flex items-center justify-center shadow">
            <Camera size={12} className="text-white" />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-bold text-white">
            {me?.profile?.name ?? "SOMA User"}
          </h1>
          <p className="text-white/60 text-sm mt-0.5">{me?.phone}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="bg-saffron/20 text-saffron text-xs font-bold px-2.5 py-1 rounded-full capitalize">
              {me?.tier ?? "starter"}
            </span>
            <span className="text-white/40 text-xs">⭐ {me?.loyaltyPoints ?? 0} points</span>
          </div>
        </div>
        {me?.role === "seller" && (
          <Link
            to="/seller"
            className="bg-saffron text-forest font-bold px-4 py-2 rounded-xl text-sm hover:bg-saffron-dark transition flex items-center gap-2"
          >
            <Star size={14} /> Seller Dashboard
          </Link>
        )}
        {me?.role === "admin" && (
          <Link
            to="/admin"
            className="bg-vermillion text-white font-bold px-4 py-2 rounded-xl text-sm hover:opacity-90 transition flex items-center gap-2"
          >
            <Shield size={14} /> Admin Panel
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left ${
                tab === key
                  ? "bg-forest text-white"
                  : "text-slate/70 hover:bg-forest/10 hover:text-forest"
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-vermillion hover:bg-vermillion/5 transition text-left"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>

        {/* Content */}
        <div className="md:col-span-3">
          {tab === "profile" && (
            <div className="bg-white rounded-2xl shadow-card p-6">
              <h2 className="font-display font-bold text-forest mb-5">Personal information</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-xl border border-forest/15 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    value={me?.phone ?? ""}
                    disabled
                    className="w-full rounded-xl border border-forest/10 px-4 py-3 text-sm bg-ivory text-slate/50 font-mono"
                  />
                  <p className="text-xs text-slate/40 mt-1">Phone number cannot be changed.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={me?.email ?? ""}
                    disabled
                    className="w-full rounded-xl border border-forest/10 px-4 py-3 text-sm bg-ivory text-slate/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                    Language
                  </label>
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    className="w-full rounded-xl border border-forest/15 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30 bg-white"
                  >
                    <option value="en">English</option>
                    <option value="rw">Kinyarwanda</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition ${
                    saved ? "bg-green-500 text-white" : "bg-forest text-white hover:bg-forest-light"
                  } disabled:opacity-60`}
                >
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  {saved ? "Saved!" : "Save changes"}
                </button>
              </form>
            </div>
          )}

          {tab === "orders" && (
            <div className="bg-white rounded-2xl shadow-card p-6">
              <h2 className="font-display font-bold text-forest mb-5">My Orders</h2>
              <div className="flex flex-col items-center py-8 text-center">
                <Package className="text-forest/20 mb-3" size={40} />
                <p className="text-slate/50 mb-4">View all your orders here</p>
                <Link
                  to="/orders"
                  className="flex items-center gap-2 bg-forest text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-forest-light transition text-sm"
                >
                  View orders <ChevronRight size={15} />
                </Link>
              </div>
            </div>
          )}

          {tab === "settings" && (
            <div className="bg-white rounded-2xl shadow-card p-6 space-y-5">
              <h2 className="font-display font-bold text-forest">Account Settings</h2>
              <div className="space-y-3">
                <Link
                  to="/rewards"
                  className="flex items-center justify-between p-4 rounded-xl border border-forest/10 hover:bg-forest/5 transition group"
                >
                  <div className="flex items-center gap-3">
                    <Star size={18} className="text-saffron" />
                    <div>
                      <div className="font-semibold text-sm text-forest">Loyalty Rewards</div>
                      <div className="text-xs text-slate/50">
                        {me?.loyaltyPoints ?? 0} points · {me?.tier}
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-slate/30 group-hover:text-forest transition"
                  />
                </Link>
                <Link
                  to="/wishlist"
                  className="flex items-center justify-between p-4 rounded-xl border border-forest/10 hover:bg-forest/5 transition group"
                >
                  <div className="flex items-center gap-3">
                    <Heart size={18} className="text-vermillion" />
                    <div>
                      <div className="font-semibold text-sm text-forest">Wishlist</div>
                      <div className="text-xs text-slate/50">Saved products</div>
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-slate/30 group-hover:text-forest transition"
                  />
                </Link>
              </div>
              <div className="pt-3 border-t border-forest/8">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm text-vermillion font-semibold hover:underline"
                >
                  <LogOut size={15} /> Sign out of SOMA
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
