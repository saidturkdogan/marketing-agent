import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { createCompany, analyzeWebsite, getGmailAuthUrl } from "../api";
import type { CompanyPayload } from "../types";
import {
  Sparkles, ArrowRight, Check, Globe, Search, Users, Mail, TrendingUp, Heart, User, Building2, Briefcase, Tag, Inbox, ChevronRight,
} from "lucide-react";

const ROLES = [
  { id: "owner", label: "Owner" },
  { id: "manager", label: "Manager" },
  { id: "employee", label: "Employee" },
  { id: "student-freelancer-intern", label: "Student / Freelancer / Intern" },
];

const COMPANY_SIZES = [
  { id: "1", label: "Just me (1)" },
  { id: "2-10", label: "2-10 employees" },
  { id: "11-50", label: "11-50 employees" },
  { id: "51-200", label: "51-200 employees" },
  { id: "201-1000", label: "201-1000 employees" },
  { id: "1000+", label: "1000+ employees" },
];

const EMAIL_PROVIDERS = [
  { id: "gmail", label: "Gmail", icon: Mail, desc: "Google Workspace / Gmail" },
];

export function OnboardingPage({ clerkEnabled }: { clerkEnabled?: boolean }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useAuthStore((s) => s.token);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const authName = useAuthStore((s) => s.name);

  const [step, setStep] = useState(0);
  const [role, setRole] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState(searchParams.get("url") || "");
  const [companySize, setCompanySize] = useState("");
  const [detectedName, setDetectedName] = useState("");
  const [detectedIndustry, setDetectedIndustry] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isOAuthCallback = searchParams.get("email_connected") === "true";
  const oauthCompanyId = searchParams.get("company_id");

  useEffect(() => {
    if (!token && !isSignedIn) {
      navigate("/login", { replace: true });
    }
  }, [token, isSignedIn, navigate]);

  useEffect(() => {
    if (isOAuthCallback && oauthCompanyId) {
      const timer = setTimeout(() => {
        navigate(`/pipeline/${oauthCompanyId}`, { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOAuthCallback, oauthCompanyId, navigate]);

  async function handleWebsiteContinue() {
    if (!websiteUrl.trim()) return;
    setAnalyzing(true);
    setError("");
    try {
      const result = await analyzeWebsite(websiteUrl.trim());
      if (result && !result.error) {
        const data = result as Record<string, string>;
        setDetectedName(data.company_name || data.name || extractCompanyName(websiteUrl));
        setDetectedIndustry(data.industry || "");
      } else {
        setDetectedName(extractCompanyName(websiteUrl));
        setDetectedIndustry("");
      }
    } catch {
      setDetectedName(extractCompanyName(websiteUrl));
      setDetectedIndustry("");
    }
    setAnalyzing(false);
    setStep(2);
  }

  function extractCompanyName(url: string): string {
    const domain = url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].split(".")[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  }

  async function handleCreateCompany() {
    setLoading(true);
    setError("");
    try {
      const payload: CompanyPayload = {
        name: detectedName,
        role: role,
        companySize: companySize,
        websiteUrl: websiteUrl.trim(),
        industry: detectedIndustry,
        description: "",
        targetAudience: "",
      };
      const company = await createCompany(payload);
      setCompanyId(company.companyId);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create company");
      setLoading(false);
    }
  }

  function handleSkipEmail() {
    if (companyId) {
      navigate(`/pipeline/${companyId}`, { replace: true });
    }
  }

  async function handleGmailConnect() {
    if (!companyId) return;
    try {
      const result = await getGmailAuthUrl(companyId);
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate Gmail connection");
    }
  }

  if (!token && !isSignedIn) return null;

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              What's your role?
            </h2>
            <p className="text-neutral-400 mb-6">
              So we can tailor the experience to you.
            </p>
            <div className="flex flex-col gap-2 mb-6">
              {ROLES.map((r) => {
                const sel = role === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => { setRole(r.id); setStep(1); }}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      sel
                        ? "border-blue-600/30 bg-blue-700/5"
                        : "border-[#1a1a2e] hover:border-[#252545] hover:bg-[#080814]"
                    }`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${
                      sel ? "bg-blue-700" : "bg-[#111122]"
                    }`}>
                      <User className={`h-4 w-4 ${sel ? "text-white" : "text-neutral-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${sel ? "text-white" : "text-neutral-200"}`}>
                        {r.label}
                      </p>
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
                onKeyDown={(e) => e.key === "Enter" && !analyzing && handleWebsiteContinue()}
                autoFocus
              />
            </div>
            <button
              onClick={handleWebsiteContinue}
              disabled={!websiteUrl.trim() || analyzing}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 mt-6 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {analyzing ? (
                <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Analyzing...</>
              ) : (
                <>Continue <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </div>
        );

      case 2:
        return (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Company Details
            </h2>
            <p className="text-neutral-400 mb-6">
              Review your information and add your company size.
            </p>
            <div className="rounded-xl border border-[#1a1a2e] bg-[#0a0a16] p-5 mb-6">
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[#1a1a2e]">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700/10">
                  <Building2 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Your Name</p>
                  <p className="text-sm font-semibold text-white">{authName || "You"}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Tag className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-neutral-500">Role</p>
                    <p className="text-sm text-white">{ROLES.find((r) => r.id === role)?.label || role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-neutral-500">Company Name</p>
                    <p className="text-sm text-white">{detectedName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-neutral-500">Website URL</p>
                    <p className="text-sm text-white">{websiteUrl}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-neutral-500">Industry</p>
                    <p className="text-sm text-white">{detectedIndustry || "Auto-detected during analysis"}</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm font-semibold text-white mb-3">Company Size</p>
            <div className="flex flex-col gap-2 mb-6">
              {COMPANY_SIZES.map((s) => {
                const sel = companySize === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setCompanySize(s.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      sel
                        ? "border-blue-600/30 bg-blue-700/5"
                        : "border-[#1a1a2e] hover:border-[#252545] hover:bg-[#080814]"
                    }`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${
                      sel ? "bg-blue-700" : "bg-[#111122]"
                    }`}>
                      <Users className={`h-4 w-4 ${sel ? "text-white" : "text-neutral-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${sel ? "text-white" : "text-neutral-200"}`}>
                        {s.label}
                      </p>
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

            <button
              onClick={handleCreateCompany}
              disabled={!companySize || loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Creating...</>
              ) : (
                <>Continue <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </div>
        );

      case 3:
        return (
          <div className="text-center py-8">
            <div className="flex justify-center mb-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">
              Glad to have you here!
            </h1>
            <p className="text-neutral-400 mb-8">
              We're setting up your workspace and scanning your website...
            </p>
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400">
                  <Mail className="h-8 w-8 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Connect your Gmail
              </h2>
              <p className="text-neutral-400">
                Sync your conversations and contacts to enrich your marketing.
              </p>
            </div>

            <div className="flex flex-col gap-3 mb-8">
              {EMAIL_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={handleGmailConnect}
                  className="flex items-center gap-4 p-4 rounded-xl border border-[#1a1a2e] bg-[#0a0a16] hover:border-[#252545] hover:bg-[#080814] transition-all text-left"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#111122]">
                    <p.icon className="h-5 w-5 text-neutral-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{p.label}</p>
                    <p className="text-xs text-neutral-500">{p.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-600" />
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleGmailConnect}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 transition-all"
              >
                <Mail className="h-4 w-4" /> Connect Gmail
              </button>
              <button
                onClick={handleSkipEmail}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#1a1a2e] px-6 py-3 text-sm font-semibold text-neutral-400 hover:text-white hover:bg-[#080814] transition-all"
              >
                Skip for now
              </button>
            </div>
          </div>
        );
    }
  }

  useEffect(() => {
    if (step === 3 && companyId) {
      const timer = setTimeout(() => {
        setStep(4);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step, companyId]);

  if (isOAuthCallback) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#06060e] overflow-hidden">
        <div className="w-full max-w-lg px-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-green-400">
              <Check className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Gmail connected!
          </h2>
          <p className="text-neutral-400">
            We're pulling in your emails. Taking you to your workspace...
          </p>
          <div className="flex justify-center mt-8">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          </div>
        </div>
      </div>
    );
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

        {step > 0 && step < 3 && !loading && (
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

        {step < 3 && (
          <p className="text-xs text-neutral-600 text-center mt-6">
            We'll scan your website and analyze your market. No credit card needed.
          </p>
        )}
      </div>
    </div>
  );
}
