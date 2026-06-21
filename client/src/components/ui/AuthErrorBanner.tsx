import { AlertTriangle, XCircle, RefreshCw, Mail, Phone, X } from "lucide-react";
import { resolveErrorConfig, type AuthErrorCode } from "./authErrorUtils";

interface AuthErrorBannerProps {
  error: AuthErrorCode;
  onDismiss?: () => void;
  className?: string;
}

export function AuthErrorBanner({ error, onDismiss, className = "" }: AuthErrorBannerProps) {
  if (!error) return null;
  const cfg = resolveErrorConfig(error);
  const isWarning = cfg.icon === "warning";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`relative rounded-xl border px-4 py-3.5 text-sm ${
        isWarning
          ? "border-saffron/30 bg-saffron/10 text-amber-900"
          : "border-vermillion/20 bg-vermillion/10 text-vermillion"
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        {isWarning ? (
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-saffron" />
        ) : (
          <XCircle size={16} className="mt-0.5 shrink-0 text-vermillion" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{cfg.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed opacity-80">{cfg.detail}</p>
          {cfg.tip && <p className="mt-1 text-xs italic opacity-70">{cfg.tip}</p>}
          {cfg.action && (
            <div className="mt-2">
              {cfg.action.href ? (
                <a
                  href={cfg.action.href}
                  className={`inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2 transition hover:opacity-80 ${
                    isWarning ? "text-amber-800" : "text-vermillion"
                  }`}
                >
                  {cfg.action.label} →
                </a>
              ) : (
                <button
                  type="button"
                  onClick={cfg.action.onClick}
                  className={`inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2 transition hover:opacity-80 ${
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
            className="mt-0.5 shrink-0 opacity-50 transition hover:opacity-80"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

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
      className="mt-1 inline-flex items-center gap-1.5 text-xs text-forest/60 transition hover:text-forest"
    >
      <RefreshCw size={11} className="shrink-0" />
      {label}
    </button>
  );
}

export function SupportNudge() {
  return (
    <div className="mt-2 flex items-center gap-3 text-xs text-slate/50">
      <span className="flex items-center gap-1">
        <Mail size={11} />
        <a href="mailto:support@somaconnect.rw" className="transition hover:text-forest">
          support@somaconnect.rw
        </a>
      </span>
      <span className="flex items-center gap-1">
        <Phone size={11} />
        <a href="tel:+250788000000" className="transition hover:text-forest">
          +250 788 000 000
        </a>
      </span>
    </div>
  );
}
