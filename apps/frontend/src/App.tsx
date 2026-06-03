import { useEffect, useRef } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { setTokenGetter } from "./api";
import { LoginPage } from "./pages/LoginPage";
import { ChatLayout } from "./pages/ChatLayout";
import { useAuthStore } from "./stores/authStore";

export function App() {
  const token = useAuthStore((s) => s.token);
  const wasAuthed = useRef(false);

  // Set up API token getter once
  useEffect(() => {
    setTokenGetter(() => useAuthStore.getState().token);
  }, []);

  // Track auth state to prevent loops
  useEffect(() => {
    wasAuthed.current = !!token;
  }, [token]);

  return (
    <Routes>
      <Route
        path="/login"
        element={token ? <Navigate to="/chat" replace /> : <LoginPage />}
      />
      <Route
        path="/chat/:conversationId?"
        element={token ? <ChatLayout /> : <Navigate to="/login" replace />}
      />
      <Route
        path="*"
        element={<Navigate to={token ? "/chat" : "/login"} replace />}
      />
    </Routes>
  );
}