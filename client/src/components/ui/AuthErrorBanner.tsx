import { AlertTriangle, XCircle, RefreshCw, Mail, Phone, X } from "lucide-react";

/** Canonical error codes surfaced via ?error= query param or thrown from RTK mutations */
export type AuthErrorCode =
  | "google"
  | "google_denied"
  | "google_popup_closed"
  | "network"
  | "invalid_credentials"
  | "account_not_found"
  | "account_exists"
  | "too_many_attempts"
  | "session_expired"
  | "otp_expired"
  | "otp_invalid"
  | string; // pass-through for raw server messages

interface ErrorConfig {
  title: string;
  detail: string;
  tip?: string;
  icon?: "warning" | "error";
  action?: { label: string; href?: string; onClick?: () => void };
}

function resolveConfig(code: AuthErrorCode): ErrorConfig {
  switch (code) {
    case "google":
      return {
        title: "Google sign-in failed",
        detail:
          "We couldn't complete your Google sign-in. This can happen if you denied permissions, your session timed out, or there was a temporary server issue.",
        tip: "Try again, or sign in with your phone number and password instead.",
        icon: "warning",
      };
    case "google_denied":
      return {
        title: "Google access denied",
        detail: "You cancelled the Google sign-in or didn't grant the required permissions.",
        tip: "Click 'Continue with Google' again and allow access when prompted.",
        icon: "warning",
      };
    case "google_popup_closed":
      return {
        title: "Sign-in window closed",
        detail: "The Google sign-in window was closed before completing.",
        tip: "Click 'Continue with Google' to try again.",
        icon: "warning",
      };
    case "network":
      return {
        title: "Connection problem",
        detail: "We couldn't reach the server. Check your internet connection and try again.",
        tip: "If this keeps happening, the service may be temporarily down.",
        icon: "error",
      };
    case "invalid_credentials":
      return {
        title: "Incorrect phone or password",
        detail: "The phone number or password you entered doesn't match our records.",
        tip: "Double-check your details or reset your password.",
        icon: "error",
        action: { label: "Reset password", href: "/forgot-password" },
      };
    case "account_not_found":
      return {
        title: "No account found",
        detail: "We couldn't find an account with those details.",
        tip: "Check for typos, or create a new account.",
        icon: "error",
        action: { label: "Create account", href: "/register" },
      };
    case "account_exists":
      return {
        title: "Account already exists",
        detail: "An account with this phone number or email already exists.",
        tip: "Sign in to your existing account instead.",
        icon: "warning",
        action: { label: "Sign in", href: "/login" },
      };
    case "too_many_attempts":
      return {
        title: "Too many attempts",
        detail: "Your account has been temporarily locked due to too many failed sign-in attempts.",
        tip: "Wait a few minutes and try again, or reset your password.",
        icon: "error",
        action: { label: "Reset password", href: "/forgot-password" },
      };
    case "session_expired":
      return {
        title: "Session expired",
        detail: "Your session has expired. Please sign in again.",
        tip: "This happens automatically for your security after a period of inactivity.",
        icon: "warning",
      };
    case "otp_expired":
      return {
        title: "Code expired",
        detail: "The verification code you entered has expired (codes are valid for 10 minutes).",
        tip: "Request a new code and enter it quickly.",
        icon: "error",
      };
    case "otp_invalid":
      return {
        title: "Invalid code",
        detail: "The code you entered is incorrect.",
        tip: "Check your email and try again, or request a new code.",
        icon: "error",
      };
    default:
      // Raw server message passed through
      return {
        title: "Sign-in failed",
        detail: code || "An unexpected error occurred.",
        tip: "Try again. If the problem persists, contact support.",
        icon: "error",
      };
  }
}

interface AuthErrorBannerProps {
  error: AuthErrorCode;
  onDismiss?: () => void;
  className?: string;
}

export function AuthErrorBanner({ error, onDismiss, className = "" }: AuthErrorBannerProps) {
  if (!error) return null;
  const cfg = resolveConfig(error);
  const isWarning = cfg.icon === "warning";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`rounded-xl border px-4 py-3.5 text-sm relative ${
        isWarning
          ? "bg-saffron/10 border-saffron/30 text-amber-900"
          : "bg-vermillion/10 border-vermillion/20 text-vermillion"
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        {isWarning ? (
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-saffron" />
        ) : (
          <XCircle size={16} className="mt-0.5 shrink-0 text-vermillion" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold leading-snug">{cfg.title}</p>
          <p className="mt-0.5 text-xs opacity-80 leading-relaxed">{cfg.detail}</p>
          {cfg.tip && (
            <p className="mt-1 text-xs opacity-70 italic">{cfg.tip}</p>
          )}
          {cfg.action && (
            <div className="mt-2">
              {cfg.action.href ? (
                <a
                  href={cfg.action.href}
                  className={`inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2 hover:opacity-80 transition ${
                    isWarning ? "text-amber-800" : "text-vermillion"
                  }`}
                >
                  {cfg.action.label} →
                </a>
              ) : (
                <button
                  type="button"
                  onClick={cfg.action.onClick}
                  className={`inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2 hover:opacity-80 transition ${
                    isWarning ? "text-amber-800" : "text-vermillion"
                  }`}
                >
                  {cfg.action.label} →
                </button>
              )}
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss error"
            className="shrink-0 opacity-50 hover:opacity-80 transition mt-0.5"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Utility: extract a human-readable error code from RTK Query / fetch errors */
export function extractAuthError(err: unknown): AuthErrorCode {
  if (typeof err === "object" && err !== null) {
    // RTK Query error shape: { status, data: { error, message } }
    const e = err as Record<string, unknown>;
    const data = e["data"] as Record<string, string> | undefined;
    if (data?.error) return data.error;
    if (data?.message) return data.message;
    // fetch Response errors
    if (typeof e["message"] === "string") {
      const msg = e["message"].toLowerCase();
      if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch"))
        return "network";
    }
    // RTK status codes
    if (e["status"] === "FETCH_ERROR") return "network";
    if (e["status"] === 401) return "invalid_credentials";
    if (e["status"] === 404) return "account_not_found";
    if (e["status"] === 409) return "account_exists";
    if (e["status"] === 429) return "too_many_attempts";
  }
  return "An unexpected error occurred.";
}

/** Small inline retry hint shown below a failed action */
export function RetryHint({
  onRetry,
  label = "Try again",
}: {
  onRetry: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className="inline-flex items-center gap-1.5 text-xs text-forest/60 hover:text-forest transition mt-1"
    >
      <RefreshCw size={11} className="shrink-0" />
      {label}
    </button>
  );
}

/** Contact-support nudge for persistent failures */
export function SupportNudge() {
  return (
    <div className="flex items-center gap-3 mt-2 text-xs text-slate/50">
      <span className="flex items-center gap-1">
        <Mail size={11} />
        <a href="mailto:support@somaconnect.rw" className="hover:text-forest transition">
          support@somaconnect.rw
        </a>
      </span>
      <span className="flex items-center gap-1">
        <Phone size={11} />
        <a href="tel:+250788000000" className="hover:text-forest transition">
          +250 788 000 000
        </a>
      </span>
    </div>
  );
}
