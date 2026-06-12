import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useLoginMutation, useVerifyOtpMutation, useRequestOtpMutation } from "../../app/api";
import { useAppDispatch } from "../../app/hooks";
import { setAuth } from "../../features/auth/authSlice";
import { Eye, EyeOff, Phone, Mail, Loader2, ShieldCheck } from "lucide-react";

type Mode = "phone" | "otp";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("phone");
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState("+250 ");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");

  const [login, { isLoading: loginLoading }] = useLoginMutation();
  const [requestOtp, { isLoading: otpReqLoading }] = useRequestOtpMutation();
  const [verifyOtp, { isLoading: otpVerifyLoading }] = useVerifyOtpMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/";

  const loading = loginLoading || otpReqLoading || otpVerifyLoading;

  async function handlePhoneLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await login({ phone, password }).unwrap();
      dispatch(setAuth({ user: res.user, accessToken: res.accessToken }));
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "data" in err
          ? (err as { data?: { error?: string } }).data?.error
          : undefined;
      setError(msg ?? "Couldn't sign you in. Check your details.");
    }
  }

  async function handleOtpRequest(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await requestOtp({ email }).unwrap();
      setOtpSent(true);
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "data" in err
          ? (err as { data?: { error?: string } }).data?.error
          : undefined;
      setError(msg ?? "Couldn't send code. Try again.");
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
      const msg =
        typeof err === "object" && err !== null && "data" in err
          ? (err as { data?: { error?: string } }).data?.error
          : undefined;
      setError(msg ?? "Invalid or expired code.");
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
          {error && (
            <div className="bg-vermillion/10 border border-vermillion/20 text-vermillion rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

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
