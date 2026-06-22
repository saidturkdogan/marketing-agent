import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { resolveDashboardTarget } from "../lib/userSession";

/** After login, route to onboarding or the user's own dashboard — never another account's URL. */
export function PostLoginRedirect() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveDashboardTarget()
      .then((path) => {
        if (!cancelled) setTarget(path);
      })
      .catch(() => {
        if (!cancelled) setTarget("/onboarding");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!target) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#06060e]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
      </div>
    );
  }

  return <Navigate to={target} replace />;
}
