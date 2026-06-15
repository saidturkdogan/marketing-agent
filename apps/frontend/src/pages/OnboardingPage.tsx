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

  const isValid = websiteUrl.trim() && selectedGoal;

  if (!token && !isSignedIn) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#06060e]">
      {/* Left Panel */}
      <div className="hidden lg:flex w-[440px] flex-col justify-between p-12 bg-gradient-to-br from-[#080814] to-[#030308] border-r border-[#111122]">
        <div>
          <div className="flex items-center gap-4 mb-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-400">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-3xl font-bold text-white">Plinth</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-5">
            AI-powered marketing in 4 steps
          </h2>
          <p className="text-neutral-400 text-base leading-relaxed mb-10">
            Drop your website, pick a goal, and watch our AI agents research your market,
            build your strategy, create a 30-day plan, and generate ready-to-publish content.
          </p>
          <div className="space-y-4">
            {[
              { icon: Search, label: "Research", desc: "Website scan + competitor analysis" },
              { icon: Sparkles, label: "Strategy", desc: "Positioning + pillars + channels" },
              { icon: TrendingUp, label: "Execution Plan", desc: "30-day calendar + briefs" },
              { icon: Check, label: "Assets", desc: "LinkedIn posts + newsletter + schedule" },
            ].map((step) => (
              <div key={step.label} className="flex items-center gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 flex-shrink-0">
                  <step.icon className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{step.label}</p>
                  <p className="text-xs text-neutral-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-white mb-3">
              Let's get started
            </h1>
            <p className="text-neutral-400">
              Your website URL and marketing goal — we handle the rest.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-600/30 bg-red-600/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Your Website URL
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <input
                  type="url"
                  className="auth-input"
                  style={{ paddingLeft: "2.5rem" }}
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Company Name <span className="text-neutral-500">(optional)</span>
              </label>
              <input
                type="text"
                className="auth-input"
                placeholder="e.g. Acme Corp"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-3">
                What's your primary marketing goal?
              </label>
              <div className="grid gap-2">
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
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!isValid || loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 mt-8 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Creating...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Start Analysis</>
            )}
          </button>

          <p className="text-xs text-neutral-600 text-center mt-4">
            We'll scan your website and analyze your market. No credit card needed.
          </p>
        </div>
      </div>
    </div>
  );
}
