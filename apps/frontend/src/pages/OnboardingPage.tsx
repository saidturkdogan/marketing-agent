import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { createCompany, analyzeWebsite, getGmailAuthUrl } from "../api";
import type { CompanyPayload } from "../types";
import { PlinthLogo } from "../components/PlinthLogo";
import {
  Sparkles, ArrowRight, Check, Globe, Search, Users, Mail, TrendingUp, Heart, User, Building2, Briefcase, Tag, Inbox, ChevronRight, Loader2,
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
            <h2 className="text-xl font-bold text-slate-800 mb-1">
              What's your role?
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              So we can tailor the experience to you.
            </p>
            <div className="flex flex-col gap-2 mb-6">
              {ROLES.map((r) => {
                const sel = role === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => { setRole(r.id); setStep(1); }}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      sel
                        ? "border-blue-500 bg-blue-50/50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white"
                    }`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${
                      sel ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                    }`}>
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${sel ? "text-blue-900" : "text-slate-700"}`}>
                        {r.label}
                      </p>
                    </div>
                    <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 flex-shrink-0 ${
                      sel ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                    }`}>
                      {sel && <Check className="h-3 w-3" />}
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
            <h2 className="text-xl font-bold text-slate-800 mb-1">
              What's your website URL?
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              We'll scan it to understand your business.
            </p>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="url"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all placeholder-slate-400"
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
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 mt-6 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {analyzing ? (
                <><Loader2 className="h-4 w-4 animate-spin text-white" /> Analyzing...</>
              ) : (
                <>Continue <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </div>
        );

      case 2:
        return (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">
              Company Details
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Review your information and add your company size.
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 mb-6">
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-200">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Your Name</p>
                  <p className="text-sm font-semibold text-slate-800">{authName || "You"}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Tag className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Role</p>
                    <p className="text-sm text-slate-700">{ROLES.find((r) => r.id === role)?.label || role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Company Name</p>
                    <p className="text-sm text-slate-700">{detectedName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Website URL</p>
                    <p className="text-sm text-slate-700">{websiteUrl}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Industry</p>
                    <p className="text-sm text-slate-700">{detectedIndustry || "Auto-detected during analysis"}</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wider">Company Size</p>
            <div className="flex flex-col gap-2 mb-6">
              {COMPANY_SIZES.map((s) => {
                const sel = companySize === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setCompanySize(s.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      sel
                        ? "border-blue-500 bg-blue-50/50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white"
                    }`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${
                      sel ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                    }`}>
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${sel ? "text-blue-900" : "text-slate-700"}`}>
                        {s.label}
                      </p>
                    </div>
                    <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 flex-shrink-0 ${
                      sel ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                    }`}>
                      {sel && <Check className="h-3 w-3" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleCreateCompany}
              disabled={!companySize || loading}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin text-white" /> Creating...</>
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
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
                <Sparkles className="h-8 w-8 text-blue-500 animate-pulse" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              Glad to have you here!
            </h1>
            <p className="text-xs text-slate-500 mb-8">
              We're setting up your workspace and scanning your website...
            </p>
            <div className="flex justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 shadow-inner">
                  <Mail className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Connect your Gmail
              </h2>
              <p className="text-xs text-slate-500">
                Sync your conversations and contacts to enrich your marketing.
              </p>
            </div>

            <div className="flex flex-col gap-3 mb-8">
              {EMAIL_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={handleGmailConnect}
                  className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 transition-all text-left shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{p.label}</p>
                    <p className="text-xs text-slate-500">{p.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleGmailConnect}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-md"
              >
                <Mail className="h-4 w-4" /> Connect Gmail
              </button>
              <button
                onClick={handleSkipEmail}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 px-6 text-sm font-semibold transition-all"
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
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 overflow-hidden font-sans">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl border border-slate-200 shadow-xl text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-inner">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Gmail connected!
          </h2>
          <p className="text-xs text-slate-500">
            We're pulling in your emails. Taking you to your workspace...
          </p>
          <div className="flex justify-center mt-8">
            <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50 overflow-hidden font-sans">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl border border-slate-200 shadow-xl">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2.5">
            <PlinthLogo size={32} />
            <span className="text-2xl font-extrabold text-slate-800 tracking-tight">Plinth</span>
          </div>
        </div>

        <div className="animate-slideUpFade" key={step}>
          {renderStep()}
        </div>

        {step > 0 && step < 3 && !loading && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === step - 1 ? "w-8 bg-blue-600" : "w-1.5 bg-slate-200"
                }`}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 text-center animate-fadeIn font-semibold">
            {error}
          </div>
        )}

        {step < 3 && (
          <p className="text-[10px] text-slate-400 text-center mt-6">
            We'll scan your website and analyze your market. No credit card needed.
          </p>
        )}
      </div>
    </div>
  );
}
