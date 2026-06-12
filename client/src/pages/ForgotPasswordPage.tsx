import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useForgotPasswordMutation, useResetPasswordMutation } from "../app/api";
import { Loader2, CheckCircle, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [forgotPassword, { isLoading: sending }] = useForgotPasswordMutation();
  const [resetPassword, { isLoading: resetting }] = useResetPasswordMutation();

  const [step, setStep] = useState<"request" | "reset" | "done">("request");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isEmail = identifier.includes("@");

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!identifier.trim()) {
      setError("Enter your phone number or email address.");
      return;
    }
    try {
      const result = await forgotPassword(
        isEmail ? { email: identifier } : { phone: identifier },
      ).unwrap();
      setMessage(result.message ?? "Code sent!");
      setStep("reset");
    } catch (err: unknown) {
      setError(
        (err as { data?: { error?: string } }).data?.error ?? "Request failed. Please try again.",
      );
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    try {
      await resetPassword({
        ...(isEmail ? { email: identifier } : { phone: identifier }),
        code,
        newPassword,
      }).unwrap();
      setStep("done");
    } catch (err: unknown) {
      setError(
        (err as { data?: { error?: string } }).data?.error ?? "Reset failed. Please try again.",
      );
    }
  }

  return (
    <>
      <Helmet>
        <title>Reset password — SOMA Market</title>
      </Helmet>
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-ivory">
        <div className="w-full max-w-md">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-forest/60 hover:text-forest mb-6"
          >
            <ArrowLeft size={15} /> Back to login
          </Link>

          <div className="bg-white rounded-2xl shadow-card p-8">
            {step === "done" ? (
              <div className="text-center">
                <CheckCircle size={48} className="text-green-600 mx-auto mb-4" />
                <h1 className="font-display text-2xl text-forest mb-2">Password updated!</h1>
                <p className="text-slate/60 text-sm mb-6">
                  Your password has been changed. You can now sign in with your new password.
                </p>
                <Link to="/login" className="btn-primary w-full block text-center">
                  Sign in
                </Link>
              </div>
            ) : step === "request" ? (
              <>
                <h1 className="font-display text-2xl text-forest mb-2">Forgot password?</h1>
                <p className="text-sm text-slate/60 mb-6">
                  Enter your phone number or email and we'll send you a 6-digit reset code.
                </p>
                <form onSubmit={handleRequest} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-forest block mb-1">
                      Phone or email
                    </label>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="+250 7XX XXX XXX or you@email.com"
                      className="w-full border border-forest/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30"
                      autoFocus
                    />
                  </div>
                  {error && <p className="text-vermillion text-xs">{error}</p>}
                  <button
                    type="submit"
                    disabled={sending}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {sending && <Loader2 size={15} className="animate-spin" />}
                    Send reset code
                  </button>
                </form>
              </>
            ) : (
              <>
                <h1 className="font-display text-2xl text-forest mb-2">Enter reset code</h1>
                <p className="text-sm text-slate/60 mb-6">
                  {message} Check your inbox and enter the 6-digit code below.
                </p>
                <form onSubmit={handleReset} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-forest block mb-1">Reset code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="w-full border border-forest/20 rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-saffron/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-forest block mb-1">
                      New password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full border border-forest/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-forest block mb-1">
                      Confirm new password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your new password"
                      className="w-full border border-forest/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron/30"
                    />
                  </div>
                  {error && <p className="text-vermillion text-xs">{error}</p>}
                  <button
                    type="submit"
                    disabled={resetting}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {resetting && <Loader2 size={15} className="animate-spin" />}
                    Set new password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("request");
                      setError("");
                    }}
                    className="w-full text-sm text-forest/50 hover:text-forest"
                  >
                    ← Request a new code
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
