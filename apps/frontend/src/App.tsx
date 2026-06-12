import { useEffect, useRef } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { setTokenGetter, syncClerkUser } from "./api";
import { useAuthStore } from "./stores/authStore";
import { ClerkAuthPage } from "./pages/ClerkAuthPage";
import { LoginPage } from "./pages/LoginPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AnalysisReportPage } from "./pages/AnalysisReportPage";

type Props = { clerkEnabled: boolean };

export function App({ clerkEnabled }: Props) {
  if (clerkEnabled) {
    return <ClerkApp />;
  }
  return <DefaultApp />;
}

function ClerkApp() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();
  const setAuth = useAuthStore((s) => s.setAuth);
  const syncedRef = useRef(false);

  useEffect(() => {
    setTokenGetter(async () => {
      if (!isSignedIn) return null;
      const t = await getToken();
      if (!t) {
        console.warn("[auth] Clerk getToken() returned null despite isSignedIn=true");
      }
      return t ?? null;
    });
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (isSignedIn && user && !syncedRef.current) {
      syncedRef.current = true;
      const email = user.primaryEmailAddress?.emailAddress ?? "";
      const name = user.fullName ?? user.firstName ?? email;
      setAuth("clerk", email, name, user.id);
      syncClerkUser(user.id, email, name).catch(() => {});
    }
    if (!isSignedIn) {
      syncedRef.current = false;
      useAuthStore.getState().clearAuth();
    }
  }, [isSignedIn, user, setAuth]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#06060e]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isSignedIn ? <Navigate to="/dashboard/" replace /> : <ClerkAuthPage />} />
      <Route path="/onboarding" element={isSignedIn ? <OnboardingPage clerkEnabled /> : <Navigate to="/login" replace />} />
      <Route path="/report/:companyId" element={isSignedIn ? <AnalysisReportPage /> : <Navigate to="/login" replace />} />
      <Route path="/dashboard/:companyId" element={isSignedIn ? <DashboardPage /> : <Navigate to="/login" replace />} />
      <Route path="/dashboard/" element={isSignedIn ? <DashboardPage /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={isSignedIn ? "/dashboard/" : "/login"} replace />} />
    </Routes>
  );
}

function DefaultApp() {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    setTokenGetter(async () => useAuthStore.getState().token);
  }, []);

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/dashboard/" replace /> : <LoginPage />} />
      <Route path="/onboarding" element={token ? <OnboardingPage /> : <Navigate to="/login" replace />} />
      <Route path="/report/:companyId" element={token ? <AnalysisReportPage /> : <Navigate to="/login" replace />} />
      <Route path="/dashboard/:companyId" element={token ? <DashboardPage /> : <Navigate to="/login" replace />} />
      <Route path="/dashboard/" element={token ? <DashboardPage /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={token ? "/dashboard/" : "/login"} replace />} />
    </Routes>
  );
}
