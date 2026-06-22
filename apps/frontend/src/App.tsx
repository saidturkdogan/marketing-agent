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
import { ProgressivePipelinePage } from "./pages/ProgressivePipelinePage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { PostLoginRedirect } from "./components/PostLoginRedirect";
import { noteActiveUser } from "./lib/userSession";

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
  const lastClerkUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    setTokenGetter(
      async () => {
        if (!isSignedIn) return null;
        return (await getToken()) ?? null;
      },
      async () => {
        if (!isSignedIn) return null;
        return (await getToken({ skipCache: true })) ?? null;
      },
    );
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (!isSignedIn || !user) {
      lastClerkUserIdRef.current = null;
      useAuthStore.getState().clearAuth();
      return;
    }

    const clerkId = user.id;
    const switched = noteActiveUser(clerkId);
    if (switched || lastClerkUserIdRef.current !== clerkId) {
      lastClerkUserIdRef.current = clerkId;
      const email = user.primaryEmailAddress?.emailAddress ?? "";
      const name = user.fullName ?? user.firstName ?? email;
      setAuth("clerk", email, name, clerkId);
      syncClerkUser(clerkId, email, name).catch(() => {});
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
      <Route path="/login" element={isSignedIn ? <PostLoginRedirect /> : <ClerkAuthPage />} />
      <Route path="/onboarding" element={isSignedIn ? <OnboardingPage clerkEnabled /> : <Navigate to="/login" replace />} />
      <Route path="/report/:companyId" element={isSignedIn ? <AnalysisReportPage /> : <Navigate to="/login" replace />} />
      <Route path="/pipeline/:companyId" element={isSignedIn ? <ProgressivePipelinePage /> : <Navigate to="/login" replace />} />
      <Route path="/dashboard/:companyId/:tab" element={isSignedIn ? <DashboardPage /> : <Navigate to="/login" replace />} />
      <Route path="/dashboard/:companyId" element={isSignedIn ? <DashboardPage /> : <Navigate to="/login" replace />} />
      <Route path="/dashboard/" element={isSignedIn ? <DashboardPage /> : <Navigate to="/login" replace />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="*" element={isSignedIn ? <PostLoginRedirect /> : <Navigate to="/login" replace />} />
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
      <Route path="/login" element={token ? <PostLoginRedirect /> : <LoginPage />} />
      <Route path="/onboarding" element={token ? <OnboardingPage /> : <Navigate to="/login" replace />} />
      <Route path="/report/:companyId" element={token ? <AnalysisReportPage /> : <Navigate to="/login" replace />} />
      <Route path="/pipeline/:companyId" element={token ? <ProgressivePipelinePage /> : <Navigate to="/login" replace />} />
      <Route path="/dashboard/:companyId/:tab" element={token ? <DashboardPage /> : <Navigate to="/login" replace />} />
      <Route path="/dashboard/:companyId" element={token ? <DashboardPage /> : <Navigate to="/login" replace />} />
      <Route path="/dashboard/" element={token ? <DashboardPage /> : <Navigate to="/login" replace />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="*" element={token ? <PostLoginRedirect /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}
