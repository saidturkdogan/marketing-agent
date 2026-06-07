import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { App } from "./App";
import "./style.css";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";
const FAKE_PATTERNS = ["placeholder", "your_key", "example", "xxx", "test_key"];
const isPublishableKey = (k: string) =>
  k.length > 20 &&
  (k.startsWith("pk_test_") || k.startsWith("pk_live_")) &&
  !FAKE_PATTERNS.some((p) => k.toLowerCase().includes(p));

function Root() {
  if (isPublishableKey(CLERK_KEY)) {
    return (
      <ClerkProvider publishableKey={CLERK_KEY} afterSignOutUrl="/login">
        <BrowserRouter>
          <App clerkEnabled={true} />
        </BrowserRouter>
      </ClerkProvider>
    );
  }
  return (
    <BrowserRouter>
      <App clerkEnabled={false} />
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
