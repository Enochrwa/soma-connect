import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginMutation, useRegisterMutation } from "../app/api";
import { useAppDispatch } from "../app/hooks";
import { setAuth } from "../features/auth/authSlice";
import { AuthErrorBanner } from "../components/ui/AuthErrorBanner";
import { extractAuthError, type AuthErrorCode } from "../components/ui/authErrorUtils";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", phone: "+250 ", email: "", password: "" });
  const [error, setError] = useState<AuthErrorCode>("");
  const [login] = useLoginMutation();
  const [register] = useRegisterMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res =
        mode === "login"
          ? await login({ phone: form.phone, password: form.password }).unwrap()
          : await register(form).unwrap();
      dispatch(setAuth({ user: res.user, accessToken: res.accessToken }));
      navigate("/");
    } catch (err: unknown) {
      setError(extractAuthError(err));
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl text-forest">
        {mode === "login" ? "Welcome back" : "Create your account"}
      </h1>
      <div className="card p-5 mt-6 space-y-3">
        {error && <AuthErrorBanner error={error} onDismiss={() => setError("")} />}
        <form onSubmit={submit} className="space-y-3">
          {mode === "register" && (
            <input
              className="w-full rounded-lg border p-2"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          )}
          <input
            className="w-full rounded-lg border p-2 font-mono"
            placeholder="+250 7XX XXX XXX"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          {mode === "register" && (
            <input
              className="w-full rounded-lg border p-2"
              placeholder="Email (optional)"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          )}
          <input
            className="w-full rounded-lg border p-2"
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button type="submit" className="btn-primary w-full">
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button
          type="button"
          className="text-sm text-slate/60 w-full"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
        >
          {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
