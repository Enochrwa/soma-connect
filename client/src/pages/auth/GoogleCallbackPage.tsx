import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useRefreshTokenMutation } from "../../app/api";
import { useAppDispatch } from "../../app/hooks";
import { setAuth } from "../../features/auth/authSlice";

/**
 * Lands here after the backend redirects from /api/auth/google/callback with
 * ?accessToken=... in the URL. The refresh-token cookie has already been set
 * (httpOnly) by the backend, so we hit /auth/refresh to get the full user
 * profile (including avatar) and finish signing in.
 */
export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [refresh] = useRefreshTokenMutation();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const accessToken = params.get("accessToken");
      const errorParam = params.get("error");

      if (errorParam || !accessToken) {
        navigate("/login?error=google", { replace: true });
        return;
      }

      try {
        // Use refresh to get full user profile (avatar, name, etc.) from the
        // httpOnly cookie the backend already set during the OAuth callback.
        const res = await refresh().unwrap();
        dispatch(setAuth({ user: res.user, accessToken: res.accessToken }));
        navigate("/", { replace: true });
      } catch {
        // Fallback: if refresh fails, we at least have the access token.
        // Redirect to home — the user will need to log in again for full profile.
        navigate("/login?error=google", { replace: true });
      }
    })();
  }, [navigate, dispatch, refresh]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-forest">
      <Loader2 className="animate-spin text-saffron" size={32} />
      <p className="text-sm text-slate/60 font-medium">Completing Google sign-in…</p>
    </div>
  );
}
