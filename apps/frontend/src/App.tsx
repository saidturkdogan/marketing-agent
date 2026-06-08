import { useEffect, useRef } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { setTokenGetter, syncClerkUser } from "./api";
import { useAuthStore } from "./stores/authStore";
import { ClerkAuthPage } from "./pages/ClerkAuthPage";
import { LoginPage } from "./pages/LoginPage";
import { ChatLayout } from "./pages/ChatLayout";
import { OnboardingPage } from "./pages/OnboardingPage";
import { DashboardPage } from "./pages/DashboardPage";

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
    setTokenGetter(async () => (isSignedIn ? (getToken() ?? null) : null));
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (isSignedIn && user && !syncedRef.current) {
      syncedRef.current = true;
      const email = user.primaryEmailAddress?.emailAddress ?? "";
      const name = user.fullName ?? user.firstName ?? email;
      setAuth("clerk", email, name, user.id);
      syncClerkUser(user.id, email, name).catch(() => {});
    }
    if (!isSignedIn) syncedRef.current = false;
  }, [isSignedIn, user, setAuth]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isSignedIn ? <Navigate to="/onboarding" replace /> : <ClerkAuthPage />} />
      <Route path="/chat/:conversationId?" element={isSignedIn ? <ChatLayout /> : <Navigate to="/login" replace />} />
      <Route path="/onboarding" element={isSignedIn ? <OnboardingPage /> : <Navigate to="/login" replace />} />
      <Route path="/dashboard/:companyId" element={isSignedIn ? <DashboardPage /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={isSignedIn ? "/onboarding" : "/login"} replace />} />
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
      <Route path="/login" element={token ? <Navigate to="/onboarding" replace /> : <LoginPage />} />
      <Route path="/chat/:conversationId?" element={token ? <ChatLayout /> : <Navigate to="/login" replace />} />
      <Route path="/onboarding" element={token ? <OnboardingPage /> : <Navigate to="/login" replace />} />
      <Route path="/dashboard/:companyId" element={token ? <DashboardPage /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={token ? "/onboarding" : "/login"} replace />} />
    </Routes>
  );
}
