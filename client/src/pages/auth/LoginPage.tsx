import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useLoginMutation, useVerifyOtpMutation, useRequestOtpMutation } from "../../app/api";
import { useAppDispatch } from "../../app/hooks";
import { setAuth } from "../../features/auth/authSlice";
import { Eye, EyeOff, Phone, Mail, Loader2, ShieldCheck } from "lucide-react";
import { AuthErrorBanner } from "../../components/ui/AuthErrorBanner";
import { extractAuthError, type AuthErrorCode } from "../../components/ui/authErrorUtils";

type Mode = "phone" | "otp";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("phone");
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState("+250 ");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<AuthErrorCode>("");

  const [login, { isLoading: loginLoading }] = useLoginMutation();
  const [requestOtp, { isLoading: otpReqLoading }] = useRequestOtpMutation();
  const [verifyOtp, { isLoading: otpVerifyLoading }] = useVerifyOtpMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/";

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const err = params.get("error");
    if (err) setError(err);
  }, [location.search]);

  const loading = loginLoading || otpReqLoading || otpVerifyLoading;

  async function handlePhoneLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await login({ phone, password }).unwrap();
      dispatch(setAuth({ user: res.user, accessToken: res.accessToken }));
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(extractAuthError(err));
    }
  }

  async function handleOtpRequest(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await requestOtp({ email }).unwrap();
      setOtpSent(true);
    } catch (err: unknown) {
      setError(extractAuthError(err));
    }
  }

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await verifyOtp({ email, code: otpCode }).unwrap();
      dispatch(setAuth({ user: res.user, accessToken: res.accessToken }));
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(extractAuthError(err));
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-ivory">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-forest rounded-2xl mb-4 shadow-card">
            <ShieldCheck className="text-saffron" size={28} />
          </div>
          <h1 className="font-display text-3xl font-bold text-forest">Welcome back</h1>
          <p className="text-slate/60 mt-1 text-sm">Sign in to your SOMA account</p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-forest/5 rounded-xl p-1 mb-6">
          <button
            onClick={() => {
              setMode("phone");
              setError("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
              mode === "phone"
                ? "bg-white text-forest shadow-card"
                : "text-slate/60 hover:text-slate"
            }`}
          >
            <Phone size={15} /> Phone & Password
          </button>
          <button
            onClick={() => {
              setMode("otp");
              setError("");
              setOtpSent(false);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
              mode === "otp" ? "bg-white text-forest shadow-card" : "text-slate/60 hover:text-slate"
            }`}
          >
            <Mail size={15} /> Email OTP
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-6 space-y-4">
          {error && <AuthErrorBanner error={error} onDismiss={() => setError("")} />}

          <a
            href={`${import.meta.env.VITE_API_URL ?? "http://localhost:4000/api"}/auth/google`}
            className="w-full flex items-center justify-center gap-2 border border-forest/15 rounded-xl py-3 text-sm font-semibold text-slate hover:bg-forest/5 transition"
          >
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
            Continue with Google
          </a>

          <div className="flex items-center gap-3">
            <hr className="flex-1 border-forest/10" />
            <span className="text-xs text-slate/40 uppercase tracking-wide">or</span>
            <hr className="flex-1 border-forest/10" />
          </div>

          {mode === "phone" ? (
            <form onSubmit={handlePhoneLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                  Phone number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+250 7XX XXX XXX"
                  className="w-full rounded-xl border border-forest/15 px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:border-saffron transition"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full rounded-xl border border-forest/15 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:border-saffron transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate/40 hover:text-slate transition"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-forest text-white rounded-xl py-3 font-semibold text-sm hover:bg-forest-light transition disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Sign in
              </button>
              <div className="text-center">
                <Link to="/forgot-password" className="text-xs text-forest/50 hover:text-forest">
                  Forgot your password?
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={otpSent ? handleOtpVerify : handleOtpRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={otpSent}
                  className="w-full rounded-xl border border-forest/15 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:border-saffron transition disabled:bg-ivory disabled:opacity-70"
                  required
                />
              </div>
              {otpSent && (
                <div>
                  <label className="block text-xs font-semibold text-slate/60 uppercase tracking-wide mb-1.5">
                    6-digit code
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full rounded-xl border border-forest/15 px-4 py-3 font-mono text-xl tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:border-saffron transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode("");
                    }}
                    className="text-xs text-saffron hover:underline mt-1"
                  >
                    Use a different email
                  </button>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-forest text-white rounded-xl py-3 font-semibold text-sm hover:bg-forest-light transition disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {otpSent ? "Verify code" : "Send code"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-slate/60 mt-6">
          New to SOMA?{" "}
          <Link to="/register" className="text-forest font-semibold hover:text-saffron transition">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
