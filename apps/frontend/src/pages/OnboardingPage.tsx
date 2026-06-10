import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";
import { useAuthStore } from "../stores/authStore";
import { createCompany, discoverCompetitors, runFullAnalysis, aiSuggest } from "../api";
import type { StrategyRequest } from "../api";
import type { CompanyPayload, Competitor } from "../types";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Globe,
  Users,
  Search,
  Mail,
  TrendingUp,
  Heart,
  Building2,
  LogOut,
} from "lucide-react";

const INDUSTRIES = [
  "E-commerce", "SaaS", "Fintech", "Healthcare", "Education",
  "Real Estate", "Retail", "Food & Beverage", "Travel",
  "Entertainment", "Technology", "Other",
];

const COMPANY_SIZES = [
  "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+",
];

const PRICING_MODELS = [
  "Subscription", "One-time", "Freemium", "Usage-based", "Per-project",
];

const GOALS = [
  { id: "brand-awareness", label: "Brand Awareness", icon: Globe, desc: "Get your brand in front of the right people" },
  { id: "lead-generation", label: "Lead Generation", icon: Users, desc: "Capture qualified leads for your pipeline" },
  { id: "seo-traffic", label: "SEO Traffic", icon: Search, desc: "Rank higher and drive organic visitors" },
  { id: "newsletter-growth", label: "Newsletter Growth", icon: Mail, desc: "Build a loyal subscriber base" },
  { id: "product-sales", label: "Product Sales", icon: TrendingUp, desc: "Convert audience into paying customers" },
  { id: "community-building", label: "Community Building", icon: Heart, desc: "Foster an engaged community around your brand" },
];

const STEP_LABELS = [
  "Company Info",
  "Business Context",
  "Competitors",
  "Goal",
  "Analysis",
];

const ANALYSIS_STEPS = [
  "Website Analysis",
  "Competitor Analysis",
  "Content Gap Analysis",
  "Keyword Discovery",
  "Strategy Creation",
  "Calendar Planning",
];

type Step = 0 | 1 | 2 | 3 | 4;

function PlinthLogo({ size = 48 }: { size?: number }) {
  const s = size;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="plogo" x1="0" y1="0" x2="48" y2="48">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#plogo)" />
      <path
        d="M16 12h7v24h-7zM23 12h11v14h-11zM28.5 15.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"
        fill="white"
        fillRule="evenodd"
      />
    </svg>
  );
}

function ClerkSignOutButton({ className, children }: { className: string; children: React.ReactNode }) {
  const { signOut } = useClerk();
  return (
    <button onClick={() => signOut()} className={className}>
      {children}
    </button>
  );
}

export function OnboardingPage({ clerkEnabled }: { clerkEnabled?: boolean }) {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const { signOut } = useClerk();

  const [step, setStep] = useState<Step>(0);

  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");

  const [productDesc, setProductDesc] = useState("");
  const [pricingType, setPricingType] = useState("");
  const [averagePrice, setAveragePrice] = useState("");
  const [businessType, setBusinessType] = useState<"b2b" | "b2c">("b2b");
  const [targetCountries, setTargetCountries] = useState<string[]>([]);
  const [countryInput, setCountryInput] = useState("");
  const [worldwide, setWorldwide] = useState(false);
  const [targetAudience, setTargetAudience] = useState("");

  const [competitorUrls, setCompetitorUrls] = useState<string[]>([""]);
  const [discoveredCompetitors, setDiscoveredCompetitors] = useState<Competitor[]>([]);
  const [selectedCompetitors, setSelectedCompetitors] = useState<Set<string>>(new Set());
  const [discoveringCompetitors, setDiscoveringCompetitors] = useState(false);
  const [competitorError, setCompetitorError] = useState("");

  const [selectedGoal, setSelectedGoal] = useState("");

  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const launchedRef = useRef(false);

  const [suggesting, setSuggesting] = useState<Record<string, boolean>>({});
  const [suggestError, setSuggestError] = useState("");

  useEffect(() => {
    if (!token && !isSignedIn) {
      navigate("/login", { replace: true });
    }
  }, [token, isSignedIn, navigate]);

  function goNext() {
    setStep((s) => Math.min(s + 1, 4) as Step);
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0) as Step);
  }

  function handleLogout() {
    useAuthStore.getState().clearAuth();
    navigate("/login", { replace: true });
  }

  async function handleAiSuggest(field: string, currentText: string, setter: (v: string) => void, context?: string) {
    setSuggesting((s) => ({ ...s, [field]: true }));
    try {
      const result = await aiSuggest(field, currentText, context);
      setter(result.suggestion);
      setSuggestError("");
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "AI suggest failed. Check backend logs.");
    } finally {
      setSuggesting((s) => ({ ...s, [field]: false }));
    }
  }

  function addCountry() {
    const c = countryInput.trim();
    if (c && !targetCountries.includes(c)) {
      setTargetCountries((prev) => [...prev, c]);
      setCountryInput("");
    }
  }

  function removeCountry(c: string) {
    setTargetCountries((prev) => prev.filter((x) => x !== c));
  }

  function handleCountryKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addCountry();
    }
  }

  function addCompetitorUrl() {
    setCompetitorUrls((u) => [...u, ""]);
  }

  function updateCompetitorUrl(index: number, value: string) {
    setCompetitorUrls((u) => u.map((url, i) => (i === index ? value : url)));
  }

  function removeCompetitorUrl(index: number) {
    setCompetitorUrls((u) => u.filter((_, i) => i !== index));
  }

  function toggleCompetitor(url: string) {
    setSelectedCompetitors((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  async function handleDiscover() {
    if (!companyName.trim() || !industry) {
      setCompetitorError("Company name and industry are required for discovery.");
      return;
    }
    setCompetitorError("");
    setDiscoveringCompetitors(true);
    try {
      const results = await discoverCompetitors({
        companyName: companyName.trim(),
        industry,
        productDescription: productDesc || undefined,
        targetCountry: worldwide ? "Worldwide" : (targetCountries[0] || undefined),
      });
      setDiscoveredCompetitors(results);
      const allUrls = new Set(results.map((c) => c.url));
      setSelectedCompetitors(allUrls);
    } catch (err) {
      setCompetitorError(err instanceof Error ? err.message : "Failed to discover competitors");
    } finally {
      setDiscoveringCompetitors(false);
    }
  }

  async function handleLaunch() {
    if (launchedRef.current) return;
    launchedRef.current = true;
    setAnalysisStep(0);
    setAnalysisComplete(false);
    setAnalysisError("");

    try {
      const companyPayload: CompanyPayload = {
        name: companyName.trim(),
        websiteUrl: websiteUrl.trim() || undefined,
        industry: industry || undefined,
        description: productDesc.trim() || undefined,
        targetAudience: targetAudience.trim() || undefined,
        competitors: Array.from(selectedCompetitors),
      };

      const company = await createCompany(companyPayload);

      const priceText = pricingType
        ? `${pricingType}: ${averagePrice.trim()}`
        : averagePrice.trim();

      const req: StrategyRequest = {
        companyId: company.companyId,
        websiteUrl: websiteUrl.trim() || undefined,
        businessType,
        targetCountry: worldwide ? "Worldwide" : targetCountries.join(", "),
        productDescription: productDesc.trim() || undefined,
        averagePrice: priceText || undefined,
        personaType: targetAudience.trim() || undefined,
        goal: selectedGoal,
        competitorUrls: Array.from(selectedCompetitors),
      };

      const totalSteps = ANALYSIS_STEPS.length;
      const updateInterval = setInterval(() => {
        setAnalysisStep((prev) => {
          if (prev < totalSteps - 1) return prev + 1;
          return prev;
        });
      }, 1200);

      const result = await runFullAnalysis(req);

      clearInterval(updateInterval);
      setAnalysisStep(totalSteps);
      setAnalysisComplete(true);
      await sleep(800);
      navigate(`/dashboard/${result.companyId}`, { replace: true });
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed");
      launchedRef.current = false;
    }
  }

  const isStep0Valid = companyName.trim() && websiteUrl.trim() && industry;
  const isStep1Valid = productDesc.trim() && (worldwide || targetCountries.length > 0) && targetAudience.trim();
  const hasAtLeastOneCompetitor = selectedCompetitors.size > 0;
  const isStep2Valid = hasAtLeastOneCompetitor;
  const isStep3Valid = selectedGoal !== "";

  if (!token && !isSignedIn) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#06060e]">
      {/* Sidebar */}
      <div className="hidden lg:flex w-[440px] flex-col justify-between p-12 bg-gradient-to-br from-[#080814] to-[#030308] border-r border-[#111122]">
        <div>
          <div className="flex items-center gap-4 mb-10">
            <PlinthLogo size={52} />
            <span className="text-3xl font-bold text-white">Plinth</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-5">
            AI-powered marketing strategy
          </h2>
          <p className="text-neutral-400 text-base leading-relaxed">
            Research, analyze, decide — automatically. Our AI agents scan your market,
            analyze competitors, find content gaps, and build a complete strategy
            tailored to your business.
          </p>
          <div className="mt-10 space-y-4">
            {[
              "Competitor analysis & positioning",
              "Content gap discovery",
              "Keyword opportunity mapping",
              "30-day content calendar",
              "AI-generated content briefs",
            ].map((text) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600/30 flex-shrink-0">
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                </div>
                <span className="text-sm text-neutral-400">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          {clerkEnabled ? (
            <ClerkSignOutButton className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-neutral-500 hover:text-red-400 hover:bg-[#111122] transition-colors mb-4">
              <LogOut className="h-4 w-4" />
              Sign out
            </ClerkSignOutButton>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-neutral-500 hover:text-red-400 hover:bg-[#111122] transition-colors mb-4"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          )}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm text-neutral-500 font-medium">{STEP_LABELS[step]}</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#111122] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 transition-all duration-500"
              style={{ width: `${((step + 1) / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-2xl">
          {/* Step indicator - top */}
          <div className="mb-12">
            <div className="flex items-center gap-2">
              {STEP_LABELS.map((label, i) => {
                const isCurrent = i === step;
                const isDone = i < step;
                const isLast = i === STEP_LABELS.length - 1;
                return (
                  <div key={i} className="flex items-center flex-1 last:flex-[0_0_auto]">
                    <div
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${
                        isCurrent
                          ? "bg-blue-700/30 text-blue-300"
                          : isDone
                          ? "bg-emerald-700/20 text-emerald-300"
                          : "bg-transparent text-neutral-600"
                      }`}
                    >
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
                          isCurrent
                            ? "bg-blue-600 text-white"
                            : isDone
                            ? "bg-emerald-600 text-white"
                            : "bg-[#1a1a2e] text-neutral-500"
                        }`}
                      >
                        {isDone ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span className={`text-sm font-medium whitespace-nowrap hidden sm:inline ${
                        isCurrent ? "text-blue-300" : isDone ? "text-emerald-300" : "text-neutral-600"
                      }`}>
                        {label}
                      </span>
                    </div>
                    {!isLast && (
                      <div className={`h-px flex-1 mx-2 ${
                        i < step ? "bg-emerald-600/40" : "bg-[#1a1a2e]"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile header */}
          <div className="lg:hidden flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <PlinthLogo size={34} />
              <span className="text-base font-semibold text-white">Plinth</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-500">Step {step + 1}/5</span>
              {clerkEnabled ? (
                <ClerkSignOutButton
                  className="text-neutral-500 hover:text-red-400 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </ClerkSignOutButton>
              ) : (
                <button
                  onClick={handleLogout}
                  className="text-neutral-500 hover:text-red-400 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {suggestError && (
            <p className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {suggestError}
            </p>
          )}

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="animate-fadeIn">
              <h1 className="text-4xl font-bold text-white mb-3">
                Build your marketing strategy in 10 minutes.
              </h1>
              <p className="text-neutral-400 text-base mb-10">
                Tell us about your company and we'll handle the rest.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Company Name
                  </label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Acme Corp"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Website URL
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
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Industry
                  </label>
                  <select
                    className="auth-input"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  >
                    <option value="">Select industry...</option>
                    {INDUSTRIES.map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Company Size
                  </label>
                  <select
                    className="auth-input"
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                  >
                    <option value="">Select size...</option>
                    {COMPANY_SIZES.map((s) => (
                      <option key={s} value={s}>{s} employees</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={goNext}
                disabled={!isStep0Valid}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 mt-8 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 1: Business Context */}
          {step === 1 && (
            <div className="animate-fadeIn">
              <h2 className="text-3xl font-bold text-white mb-2">
                Tell us about your business
              </h2>
              <p className="text-neutral-400 text-base mb-10">
                The more we know, the better your strategy will be.
              </p>

              <div className="space-y-5">
                <div>
                  <div className="flex items-end gap-2 mb-1.5">
                    <label className="block text-sm font-medium text-neutral-300">
                      What do you sell?
                    </label>
                    <button
                      onClick={() => handleAiSuggest("productDesc", productDesc, setProductDesc)}
                      disabled={suggesting["productDesc"] || !productDesc.trim()}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors ml-auto mb-0.5"
                    >
                      {suggesting["productDesc"] ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      AI suggest
                    </button>
                  </div>
                  <textarea
                    className="auth-input min-h-[120px] resize-y"
                    placeholder="Describe your product or service in detail — what makes it unique, who it helps, and why customers choose it..."
                    value={productDesc}
                    onChange={(e) => setProductDesc(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Pricing model
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRICING_MODELS.map((pm) => (
                      <button
                        key={pm}
                        onClick={() => setPricingType(pricingType === pm ? "" : pm)}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                          pricingType === pm
                            ? "border-blue-600 bg-blue-700/10 text-blue-300"
                            : "border-[#1a1a2e] text-neutral-400 hover:border-[#252545] hover:text-neutral-300"
                        }`}
                      >
                        {pm}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-end gap-2 mb-1.5">
                    <label className="block text-sm font-medium text-neutral-300">
                      Average product price?
                    </label>
                    <button
                      onClick={() => handleAiSuggest("averagePrice", averagePrice, setAveragePrice, `Pricing model: ${pricingType || "unknown"}`)}
                      disabled={suggesting["averagePrice"] || !averagePrice.trim()}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors ml-auto mb-0.5"
                    >
                      {suggesting["averagePrice"] ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      AI suggest
                    </button>
                  </div>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder={pricingType === "Subscription" ? "e.g. $49/month" : pricingType === "One-time" ? "e.g. $299" : "e.g. $49/month"}
                    value={averagePrice}
                    onChange={(e) => setAveragePrice(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    B2B or B2C?
                  </label>
                  <div className="flex gap-3">
                    {(["b2b", "b2c"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setBusinessType(type)}
                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                          businessType === type
                            ? "border-blue-600 bg-blue-700/10 text-blue-300"
                            : "border-[#1a1a2e] text-neutral-400 hover:border-[#252545]"
                        }`}
                      >
                        <Building2 className="h-4 w-4" />
                        {type.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Target countries
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="relative flex-1">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                      <input
                        type="text"
                        className="auth-input"
                        style={{ paddingLeft: "2.5rem" }}
                        placeholder="Type a country and press Enter..."
                        value={countryInput}
                        onChange={(e) => setCountryInput(e.target.value)}
                        onKeyDown={handleCountryKeyDown}
                        disabled={worldwide}
                      />
                    </div>
                    <button
                      onClick={addCountry}
                      disabled={worldwide || !countryInput.trim()}
                      className="px-4 py-3 rounded-lg bg-blue-700 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={worldwide}
                      onChange={(e) => {
                        setWorldwide(e.target.checked);
                        if (e.target.checked) setTargetCountries([]);
                      }}
                      className="h-4 w-4 rounded border-[#1a1a2e] bg-[#080814] text-blue-600 focus:ring-blue-600"
                    />
                    <span className="text-sm text-neutral-400">Worldwide (all countries)</span>
                  </label>
                  {targetCountries.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {targetCountries.map((c) => (
                        <span
                          key={c}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111122] border border-[#1a1a2e] text-sm text-neutral-300"
                        >
                          {c}
                          <button
                            onClick={() => removeCountry(c)}
                            className="text-neutral-500 hover:text-red-400 transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-end gap-2 mb-1.5">
                    <label className="block text-sm font-medium text-neutral-300">
                      Who is your target customer?
                    </label>
                    <button
                      onClick={() => handleAiSuggest("targetAudience", targetAudience, setTargetAudience, `Product: ${productDesc || "unknown"}`)}
                      disabled={suggesting["targetAudience"] || !targetAudience.trim()}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors ml-auto mb-0.5"
                    >
                      {suggesting["targetAudience"] ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      AI suggest
                    </button>
                  </div>
                  <textarea
                    className="auth-input min-h-[80px] resize-y"
                    placeholder="Describe your ideal customer — their demographics, interests, pain points, and what motivates them to buy..."
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={goBack}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#1a1a2e] px-6 py-3 text-sm font-semibold text-neutral-400 hover:border-[#252545] hover:text-neutral-200 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={goNext}
                  disabled={!isStep1Valid}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Competitor Discovery */}
          {step === 2 && (
            <div className="animate-fadeIn">
              <h2 className="text-3xl font-bold text-white mb-2">
                Who are your competitors?
              </h2>
              <p className="text-neutral-400 text-base mb-10">
                Enter competitor websites or let us find them for you.
              </p>

              {/* Manual URL inputs */}
              <div className="space-y-2 mb-4">
                {competitorUrls.map((url, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="url"
                      className="auth-input flex-1"
                      placeholder={`Competitor URL #${i + 1}`}
                      value={url}
                      onChange={(e) => updateCompetitorUrl(i, e.target.value)}
                    />
                    {competitorUrls.length > 1 && (
                      <button
                        onClick={() => removeCompetitorUrl(i)}
                        className="px-3 text-neutral-500 hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addCompetitorUrl}
                  className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  + Add another competitor URL
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-[#1a1a2e]" />
                <span className="text-xs text-neutral-500">OR</span>
                <div className="flex-1 h-px bg-[#1a1a2e]" />
              </div>

              {/* Discover competitors */}
              <button
                onClick={handleDiscover}
                disabled={discoveringCompetitors}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#1a1a2e] px-6 py-3 text-sm font-semibold text-neutral-300 hover:border-[#252545] hover:text-white disabled:opacity-50 transition-colors mb-4"
              >
                {discoveringCompetitors ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
                    Discovering competitors...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Discover Competitors
                  </>
                )}
              </button>

              {competitorError && (
                <div className="mb-4 rounded-lg border border-red-600/30 bg-red-600/10 px-4 py-3 text-sm text-red-400">
                  {competitorError}
                </div>
              )}

              {/* Discovered competitor cards */}
              {discoveredCompetitors.length > 0 && (
                <div className="space-y-2 mb-6">
                  <p className="text-xs text-neutral-500 mb-2">
                    Select the competitors to analyze ({selectedCompetitors.size} selected):
                  </p>
                  {discoveredCompetitors.map((comp) => (
                    <button
                      key={comp.url}
                      onClick={() => toggleCompetitor(comp.url)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        selectedCompetitors.has(comp.url)
                          ? "border-blue-600/30 bg-blue-700/5"
                          : "border-[#1a1a2e] hover:border-[#252545]"
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded border-2 flex-shrink-0 ${
                          selectedCompetitors.has(comp.url)
                            ? "border-blue-600 bg-blue-600"
                            : "border-neutral-700"
                        }`}
                      >
                        {selectedCompetitors.has(comp.url) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{comp.name}</p>
                        <p className="text-xs text-neutral-500 truncate">{comp.url}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Manual URLs as checkable items */}
              {competitorUrls.some((u) => u.trim()) && discoveredCompetitors.length === 0 && (
                <div className="space-y-2 mb-6">
                  <p className="text-xs text-neutral-500 mb-2">
                    Added URLs (will be analyzed):
                  </p>
                  {competitorUrls.filter((u) => u.trim()).map((url) => (
                    <div
                      key={url}
                      className="flex items-center gap-3 p-3 rounded-xl border border-[#1a1a2e] bg-[#080814]"
                    >
                      <div className="flex h-5 w-5 items-center justify-center rounded border-2 border-emerald-600 bg-emerald-600 flex-shrink-0">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                      <p className="text-sm text-neutral-300 truncate">{url}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 mt-8">
                <button
                  onClick={goBack}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#1a1a2e] px-6 py-3 text-sm font-semibold text-neutral-400 hover:border-[#252545] hover:text-neutral-200 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={goNext}
                  disabled={!isStep2Valid}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Goal Selection */}
          {step === 3 && (
            <div className="animate-fadeIn">
              <h2 className="text-3xl font-bold text-white mb-2">
                What's your primary goal?
              </h2>
              <p className="text-neutral-400 text-base mb-10">
                Your strategy will be built around this.
              </p>

              <div className="grid gap-3">
                {GOALS.map((g) => {
                  const sel = selectedGoal === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGoal(g.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                        sel
                          ? "border-blue-600/30 bg-blue-700/5"
                          : "border-[#1a1a2e] hover:border-[#252545] hover:bg-[#080814]"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${
                          sel ? "bg-blue-700" : "bg-[#111122]"
                        }`}
                      >
                        <g.icon className={`h-5 w-5 ${sel ? "text-white" : "text-neutral-500"}`} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${sel ? "text-white" : "text-neutral-200"}`}>
                          {g.label}
                        </p>
                        <p className="text-xs text-neutral-500 mt-0.5">{g.desc}</p>
                      </div>
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 flex-shrink-0 ${
                          sel ? "border-blue-600 bg-blue-600" : "border-neutral-700"
                        }`}
                      >
                        {sel && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={goBack}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#1a1a2e] px-6 py-3 text-sm font-semibold text-neutral-400 hover:border-[#252545] hover:text-neutral-200 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={() => {
                    goNext();
                    handleLaunch();
                  }}
                  disabled={!isStep3Valid}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Launch Analysis <TrendingUp className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Analysis */}
          {step === 4 && (
            <div className="animate-fadeIn">
              <div className="text-center mb-10">
                <div className="flex justify-center mb-5">
                  <div className="relative">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-700">
                      <Sparkles
                        className={`h-10 w-10 text-white ${
                          !analysisComplete ? "animate-pulse" : ""
                        }`}
                      />
                    </div>
                    {!analysisComplete && (
                      <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#06060e] border-2 border-blue-700">
                        <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-blue-300 border-t-transparent" />
                      </div>
                    )}
                    {analysisComplete && (
                      <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  {analysisComplete ? "Analysis complete!" : "Analyzing your market..."}
                </h2>
                <p className="text-neutral-400 text-base">
                  {analysisComplete
                    ? "Redirecting to your dashboard..."
                    : "Our AI agents are working through the data"}
                </p>
              </div>

              {analysisError && (
                <div className="mb-6 rounded-lg border border-red-600/30 bg-red-600/10 px-4 py-3 text-sm text-red-400">
                  {analysisError}
                </div>
              )}

              <div className="space-y-2">
                {ANALYSIS_STEPS.map((label, i) => {
                  const done = analysisStep > i;
                  const active = analysisStep === i;
                  const pending = analysisStep < i;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        done
                          ? "border-emerald-600/20 bg-emerald-700/5"
                          : active
                          ? "border-blue-600/20 bg-blue-700/5"
                          : "border-[#1a1a2e]"
                      }`}
                    >
                      {done ? (
                        <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      ) : active ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-transparent flex-shrink-0" />
                      ) : (
                        <div className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-neutral-700" />
                      )}
                      <span
                        className={`text-sm ${
                          done ? "text-emerald-300" : active ? "text-blue-300" : "text-neutral-600"
                        }`}
                      >
                        {label}
                      </span>
                      <span className="ml-auto text-xs">
                        {done && (
                          <span className="text-emerald-500 font-medium">Complete</span>
                        )}
                        {active && (
                          <span className="text-blue-400 font-medium">In progress...</span>
                        )}
                        {pending && (
                          <span className="text-neutral-700">Pending</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
