import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegisterMutation } from "../../app/api";
import { useAppDispatch } from "../../app/hooks";
import { setAuth } from "../../features/auth/authSlice";
import { Eye, EyeOff, Loader2, UserPlus, CheckCircle } from "lucide-react";
import { AuthErrorBanner } from "../../components/ui/AuthErrorBanner";
import { extractAuthError } from "../../components/ui/authErrorUtils";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9A8.78 8.78 0 0 0 17.64 9.2z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26A5.4 5.4 0 0 1 9 14.5a5.42 5.42 0 0 1-5.1-3.55H.86v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.9 10.95A5.42 5.42 0 0 1 3.6 9c0-.68.12-1.34.3-1.95V4.72H.86A9 9 0 0 0 0 9c0 1.45.35 2.83.86 4.28l3.04-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5c1.32 0 2.5.45 3.44 1.34l2.58-2.58A8.97 8.97 0 0 0 9 0 9 9 0 0 0 .86 4.72L3.9 7.05A5.42 5.42 0 0 1 9 3.5z"
      />
    </svg>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /\d/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ["bg-vermillion", "bg-saffron", "bg-saffron", "bg-green-500"];
  const labels = ["", "Weak", "Fair", "Strong"];
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < score ? colors[score] : "bg-forest/10"}`}
          />
        ))}
      </div>
      <div className="flex gap-3">
        {checks.map((c) => (
          <span
            key={c.label}
            className={`flex items-center gap-1 text-xs ${c.ok ? "text-green-600" : "text-slate/40"}`}
          >
            <CheckCircle size={10} className={c.ok ? "text-green-500" : "text-slate/20"} />
            {c.label}
          </span>
        ))}
      </div>
      {score > 0 && <p className="text-xs text-slate/60 font-medium">{labels[score]} password</p>}
    </div>
  );
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    phone: "+250 ",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [register, { isLoading }] = useRegisterMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const field = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    try {
      const payload: { name: string; phone: string; email?: string; password: string } = {
        name: form.name,
        phone: form.phone,
        password: form.password,
      };
      if (form.email) payload.email = form.email;
      const res = await register(payload).unwrap();
      dispatch(setAuth({ user: res.user, accessToken: res.accessToken }));
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(extractAuthError(err));
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-ivory">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-saffron rounded-2xl mb-4 shadow-gold">
            <UserPlus className="text-white" size={28} />
          </div>
          <h1 className="font-display text-3xl font-bold text-forest">Create account</h1>
          <p className="text-slate/60 mt-1 text-sm">Join SOMA — Rwanda's marketplace</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-6 space-y-4">
          {error && <AuthErrorBanner error={error} onDismiss={() => setError("")} />}

          <a
            href={`${import.meta.env.VITE_API_URL ?? "http://localhost:4000/api"}/auth/google`}
            className="w-full flex items-center justify-center gap-2 border border-forest/15 rounded-xl py-3 text-sm font-semibold text-slate hover:bg-forest/5 transition"
          >
            <GoogleIcon />
            Sign up with Google
          </a>

          <div className="flex items-center gap-3">
            <hr className="flex-1 border-forest/10" />
            <span className="text-xs text-slate/40 uppercase tracking-wide">or</span>
            <hr className="flex-1 border-forest/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                Full name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={field("name")}
                placeholder="Your full name"
                className="w-full rounded-xl border border-forest/15 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:border-saffron transition"
                required
                minLength={2}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                Phone number <span className="text-vermillion">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={field("phone")}
                placeholder="+250 7XX XXX XXX"
                className="w-full rounded-xl border border-forest/15 px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:border-saffron transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                Email address <span className="text-slate/30">(optional)</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={field("email")}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-forest/15 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:border-saffron transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={field("password")}
                  placeholder="Create a strong password"
                  className="w-full rounded-xl border border-forest/15 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:border-saffron transition"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate/40 hover:text-slate transition"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password && <PasswordStrength password={form.password} />}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                Confirm password
              </label>
              <input
                type={showPw ? "text" : "password"}
                value={form.confirmPassword}
                onChange={field("confirmPassword")}
                placeholder="Repeat your password"
                className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition ${
                  form.confirmPassword && form.password !== form.confirmPassword
                    ? "border-vermillion/50 focus:ring-vermillion/30 focus:border-vermillion"
                    : "border-forest/15 focus:ring-saffron/40 focus:border-saffron"
                }`}
                required
              />
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-xs text-vermillion mt-1">Passwords don't match</p>
              )}
            </div>

            <p className="text-xs text-slate/50">
              By creating an account you agree to our{" "}
              <span className="text-forest cursor-pointer hover:underline">Terms of Service</span>{" "}
              and <span className="text-forest cursor-pointer hover:underline">Privacy Policy</span>
              .
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-saffron text-white rounded-xl py-3 font-semibold text-sm hover:bg-saffron-dark transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              Create my account
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate/60 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-forest font-semibold hover:text-saffron transition">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
