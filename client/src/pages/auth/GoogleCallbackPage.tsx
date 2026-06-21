import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useRefreshTokenMutation } from "../../app/api";
import { useAppDispatch } from "../../app/hooks";
import { setAuth } from "../../features/auth/authSlice";
import { AuthErrorBanner, SupportNudge } from "../../components/ui/AuthErrorBanner";
import { type AuthErrorCode } from "../../components/ui/authErrorUtils";

type Phase = "loading" | "error";

/**
 * Lands here after the backend redirects from /api/auth/google/callback with
 * ?accessToken=... (success) or ?error=... (failure) in the URL.
 *
 * Instead of silently redirecting on failure (which could crash if navigate
 * fails or the user ends up in a blank screen), we now show a descriptive
 * error UI with clear next steps.
 */
export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [refresh] = useRefreshTokenMutation();
  const ran = useRef(false);

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorCode, setErrorCode] = useState<AuthErrorCode>("google");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get("accessToken");
        const errorParam = params.get("error");

        if (errorParam) {
          // Backend explicitly signalled an error (e.g. user denied permissions)
          const code: AuthErrorCode = errorParam === "access_denied" ? "google_denied" : "google";
          setErrorCode(code);
          setPhase("error");
          return;
        }

        if (!accessToken) {
          // No token and no error param — something went wrong upstream
          setErrorCode("google");
          setPhase("error");
          return;
        }

        // Use refresh to get full user profile (avatar, name, etc.) from the
        // httpOnly cookie the backend already set during the OAuth callback.
        const res = await refresh().unwrap();
        dispatch(setAuth({ user: res.user, accessToken: res.accessToken }));
        navigate("/", { replace: true });
      } catch (err: unknown) {
        // refresh() failed — could be network issue or cookie not set
        const isNetwork =
          typeof err === "object" &&
          err !== null &&
          ("status" in err
            ? (err as { status: unknown }).status === "FETCH_ERROR"
            : "message" in err &&
              typeof (err as { message: unknown }).message === "string" &&
              (err as { message: string }).message.toLowerCase().includes("fetch"));

        setErrorCode(isNetwork ? "network" : "google");
        setPhase("error");
      }
    })();
  }, [navigate, dispatch, refresh]);

  if (phase === "loading") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-forest">
        <Loader2 className="animate-spin text-saffron" size={32} />
        <p className="text-sm text-slate/60 font-medium">Completing Google sign-in…</p>
      </div>
    );
  }

  // Error state — clear UI, no crash
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-vermillion/10 rounded-2xl mb-4">
            <span className="text-2xl" role="img" aria-label="error">
              ⚠️
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-forest">Sign-in didn't complete</h1>
          <p className="text-slate/60 text-sm mt-1">
            Something went wrong while signing you in with Google.
          </p>
        </div>

        <AuthErrorBanner error={errorCode} />

        <div className="flex flex-col gap-3">
          <a
            href={`${import.meta.env.VITE_API_URL ?? "http://localhost:4000/api"}/auth/google`}
            className="w-full flex items-center justify-center gap-2 bg-forest text-white rounded-xl py-3 font-semibold text-sm hover:bg-forest-light transition"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
              <path
                fill="#fff"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9A8.78 8.78 0 0 0 17.64 9.2z"
              />
              <path
                fill="#fff"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26A5.4 5.4 0 0 1 9 14.5a5.42 5.42 0 0 1-5.1-3.55H.86v2.33A9 9 0 0 0 9 18z"
              />
              <path
                fill="#fff"
                d="M3.9 10.95A5.42 5.42 0 0 1 3.6 9c0-.68.12-1.34.3-1.95V4.72H.86A9 9 0 0 0 0 9c0 1.45.35 2.83.86 4.28l3.04-2.33z"
              />
              <path
                fill="#fff"
                d="M9 3.5c1.32 0 2.5.45 3.44 1.34l2.58-2.58A8.97 8.97 0 0 0 9 0 9 9 0 0 0 .86 4.72L3.9 7.05A5.42 5.42 0 0 1 9 3.5z"
              />
            </svg>
            Try Google sign-in again
          </a>

          <a
            href="/login"
            className="w-full flex items-center justify-center gap-2 border border-forest/15 rounded-xl py-3 font-semibold text-sm text-slate hover:bg-forest/5 transition"
          >
            Sign in another way
          </a>
        </div>

        <SupportNudge />
      </div>
    </div>
  );
}
