import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { createCompany } from "../api";
import type { CompanyPayload } from "../types";
import {
  Sparkles, ArrowRight, Check, Globe, Search, Users, Mail, TrendingUp, Heart,
} from "lucide-react";

const GOALS = [
  { id: "brand-awareness", label: "Brand Awareness", icon: Globe, desc: "Get your brand in front of the right people" },
  { id: "lead-generation", label: "Lead Generation", icon: Users, desc: "Capture qualified leads for your pipeline" },
  { id: "seo-traffic", label: "SEO Traffic", icon: Search, desc: "Rank higher and drive organic visitors" },
  { id: "newsletter-growth", label: "Newsletter Growth", icon: Mail, desc: "Build a loyal subscriber base" },
  { id: "product-sales", label: "Product Sales", icon: TrendingUp, desc: "Convert audience into paying customers" },
  { id: "community-building", label: "Community Building", icon: Heart, desc: "Foster an engaged community around your brand" },
];

export function OnboardingPage({ clerkEnabled }: { clerkEnabled?: boolean }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useAuthStore((s) => s.token);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);

  const [step, setStep] = useState(0);
  const [websiteUrl, setWebsiteUrl] = useState(searchParams.get("url") || "");
  const [selectedGoal, setSelectedGoal] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token && !isSignedIn) {
      navigate("/login", { replace: true });
    }
  }, [token, isSignedIn, navigate]);

  async function handleStart() {
    if (!websiteUrl.trim() || !selectedGoal) return;

    setLoading(true);
    setError("");
    try {
      const payload: CompanyPayload = {
        name: companyName.trim() || websiteUrl.replace(/^https?:\/\//, "").split("/")[0],
        websiteUrl: websiteUrl.trim(),
        industry: "",
        description: "",
        targetAudience: "",
      };
      const company = await createCompany(payload);
      navigate(`/pipeline/${company.companyId}?goal=${selectedGoal}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create company");
      setLoading(false);
    }
  }

  if (!token && !isSignedIn) return null;

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-3">
              Let's get started
            </h1>
            <p className="text-neutral-400 mb-8">
              Your website URL and marketing goal — we handle the rest.
            </p>
            <button
              onClick={() => setStep(1)}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-800 transition-all mx-auto"
            >
              Begin <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        );

      case 1:
        return (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              What's your website URL?
            </h2>
            <p className="text-neutral-400 mb-6">
              We'll scan it to understand your business.
            </p>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <input
                type="url"
                className="auth-input"
                style={{ paddingLeft: "2.5rem" }}
                placeholder="https://example.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && websiteUrl.trim() && setStep(2)}
                autoFocus
              />
            </div>
            <button
              onClick={() => websiteUrl.trim() && setStep(2)}
              disabled={!websiteUrl.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 mt-6 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        );

      case 2:
        return (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              What's your company called?
            </h2>
            <p className="text-neutral-400 mb-6">
              We'll auto-detect it if you skip. <span className="text-neutral-500">(optional)</span>
            </p>
            <input
              type="text"
              className="auth-input"
              placeholder="e.g. Acme Corp"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setStep(3)}
              autoFocus
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#1a1a2e] px-6 py-3 text-sm font-semibold text-neutral-300 hover:bg-[#080814] transition-all"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 transition-all"
              >
                {companyName.trim() ? "Continue" : "Skip"} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              What's your primary marketing goal?
            </h2>
            <p className="text-neutral-400 mb-6">
              This helps us tailor your strategy.
            </p>
            <div className="grid gap-2 mb-6">
              {GOALS.map((g) => {
                const sel = selectedGoal === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGoal(g.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      sel
                        ? "border-blue-600/30 bg-blue-700/5"
                        : "border-[#1a1a2e] hover:border-[#252545] hover:bg-[#080814]"
                    }`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${
                      sel ? "bg-blue-700" : "bg-[#111122]"
                    }`}>
                      <g.icon className={`h-4 w-4 ${sel ? "text-white" : "text-neutral-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${sel ? "text-white" : "text-neutral-200"}`}>
                        {g.label}
                      </p>
                      <p className="text-xs text-neutral-500">{g.desc}</p>
                    </div>
                    <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 flex-shrink-0 ${
                      sel ? "border-blue-600 bg-blue-600" : "border-neutral-700"
                    }`}>
                      {sel && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#1a1a2e] px-6 py-3 text-sm font-semibold text-neutral-300 hover:bg-[#080814] transition-all"
              >
                Back
              </button>
              <button
                onClick={handleStart}
                disabled={!selectedGoal || loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Creating...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Start Analysis</>
                )}
              </button>
            </div>
          </div>
        );
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#06060e] overflow-hidden">
      <div className="w-full max-w-lg px-6">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-400">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Plinth</span>
          </div>
        </div>

        <div className="animate-slideUpFade" key={step}>
          {renderStep()}
        </div>

        {step > 0 && !loading && (
          <div className="flex items-center justify-center gap-2 mt-10">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-500 ${
                  i === step - 1 ? "w-8 bg-blue-600" : "w-2 bg-[#1a1a2e]"
                }`}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-600/30 bg-red-600/10 px-4 py-3 text-sm text-red-400 text-center animate-fadeIn">
            {error}
          </div>
        )}

        <p className="text-xs text-neutral-600 text-center mt-6">
          We'll scan your website and analyze your market. No credit card needed.
        </p>
      </div>
    </div>
  );
}
