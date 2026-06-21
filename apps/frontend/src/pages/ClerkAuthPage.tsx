import { SignIn, SignUp } from "@clerk/clerk-react";
import { useState } from "react";
import { PlinthLogo } from "../components/PlinthLogo";

const theme = {
  variables: {
    colorPrimary: "#3b82f6",
    colorBackground: "#ffffff",
    colorText: "#1e293b",
    colorTextSecondary: "#64748b",
    colorInputBackground: "#ffffff",
    colorInputText: "#1e293b",
    colorDanger: "#ef4444",
    colorSuccess: "#22c55e",
    colorWarning: "#f59e0b",
    fontFamily: "Outfit, Inter, sans-serif",
    fontSize: "14px",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full",
    card: "bg-white border border-slate-200 shadow-xl rounded-2xl p-6",
    headerTitle: "text-slate-900 text-xl font-bold",
    headerSubtitle: "text-slate-500",
    formFieldLabel: "text-slate-700 font-semibold",
    formFieldInput: "bg-slate-50 border border-slate-300 text-slate-900 rounded-lg h-10 px-3",
    formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold normal-case text-sm h-10 shadow-sm transition-colors",
    footerActionText: "text-slate-500",
    footerActionLink: "text-blue-600 hover:text-blue-700",
    socialButtonsBlockButton:
      "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg flex items-center justify-center gap-3 w-full px-4 py-2.5 text-sm font-medium transition-colors",
    socialButtonsBlockButtonIcon:
      "w-5 h-5 flex items-center justify-center [&_svg]:w-full [&_svg]:h-full",
    socialButtonsBlockButton__google: "border-slate-300",
    socialButtonsBlockButton__facebook: "border-slate-300",
    socialButtonsBlockButton__apple: "border-slate-300",
    socialButtonsBlockButtonText: "text-slate-700 text-sm font-medium",
    dividerRow: "my-4",
    dividerText: "text-slate-400 px-2 text-xs",
    dividerLine: "bg-slate-200 flex-1 h-px",
    formFieldError: "text-red-500 text-xs",
    identityPreviewText: "text-slate-900",
    identityPreviewEditButton: "text-blue-600",
    formHeaderTitle: "text-slate-900",
    formHeaderSubtitle: "text-slate-500",
    otpInputField: "bg-white border-slate-300 text-slate-900",
  },
};

export function ClerkAuthPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");

  return (
    <div className="flex h-screen w-screen bg-slate-50 font-sans">
      {/* LEFT PANE: Info banner */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 border-r border-slate-200 p-10">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <PlinthLogo size={36} />
            <span className="text-2xl font-extrabold text-slate-800 tracking-tight">Plinth</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 leading-tight mb-4">
            Your autonomous<br />Plinth AI agent
          </h1>
          <p className="text-slate-500 text-base leading-relaxed mb-8">
            Research, strategy, content, and analytics — powered by AI agents that work while you sleep.
          </p>
          <div className="space-y-3">
            {[
              "AI-powered market research & competitor analysis",
              "Auto-generated social media content for all platforms",
              "Performance scoring & campaign optimization",
            ].map((text) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 flex-shrink-0">
                  <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-slate-700 font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANE: Auth component */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 p-6">
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <PlinthLogo size={32} />
          <span className="text-xl font-bold text-slate-800 tracking-tight">Plinth</span>
        </div>

        <div className="w-full max-w-md">
          {mode === "sign-in" ? (
            <>
              <SignIn routing="virtual" signUpUrl="/login?mode=sign-up" appearance={theme} />
              <p className="text-center mt-4 text-xs text-slate-500">
                Don't have an account?{" "}
                <button onClick={() => setMode("sign-up")} className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                  Sign up
                </button>
              </p>
            </>
          ) : (
            <>
              <SignUp routing="virtual" signInUrl="/login?mode=sign-in" appearance={theme} />
              <p className="text-center mt-4 text-xs text-slate-500">
                Already have an account?{" "}
                <button onClick={() => setMode("sign-in")} className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                  Sign in
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
