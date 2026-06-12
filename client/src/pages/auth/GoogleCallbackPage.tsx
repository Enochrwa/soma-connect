import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useRefreshTokenMutation } from "../../app/api";
import { useAppDispatch } from "../../app/hooks";
import { setAuth } from "../../features/auth/authSlice";

/**
 * Lands here after the backend redirects from /api/auth/google/callback with
 * ?accessToken=... in the URL. The refresh-token cookie has already been set
 * (httpOnly) by the backend, so we just hit /auth/refresh to fetch the user
 * profile and finish signing the user in.
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
        const res = await refresh().unwrap();
        dispatch(setAuth({ user: res.user, accessToken: res.accessToken }));
        navigate("/", { replace: true });
      } catch {
        navigate("/login?error=google", { replace: true });
      }
    })();
  }, [navigate, dispatch, refresh]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-forest">
      <Loader2 className="animate-spin" size={28} />
      <p className="text-sm text-slate/60">Signing you in…</p>
    </div>
  );
}
