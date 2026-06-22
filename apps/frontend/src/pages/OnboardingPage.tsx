import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { createCompany, analyzeWebsite, getGmailAuthUrl, runOnboardingBootstrap } from "../api";
import type { CompanyPayload } from "../types";
import {
  OnboardingShell,
  OnboardingWaitOverlay,
  OnboardingLaunchResults,
  WEBSITE_ANALYZE_PHASES,
  WORKSPACE_SETUP_PHASES,
  ONBOARDING_LAUNCH_PHASES,
  GMAIL_SYNC_PHASES,
} from "../components/OnboardingFlowUI";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Globe,
  Users,
  Mail,
  User,
  Building2,
  Briefcase,
  Tag,
  ChevronRight,
  Loader2,
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

type WaitMode = "analyze" | "setup" | "bootstrap" | "gmail-callback" | null;

type BootstrapTweet = {
  contentId: string;
  title?: string;
  body?: string;
  status?: string;
  scheduledAt?: string;
};

function railStep(step: number, waitMode: WaitMode): number {
  if (waitMode === "analyze") return 1;
  if (waitMode === "setup") return 2;
  if (waitMode === "gmail-callback") return 3;
  if (waitMode === "bootstrap") return 4;
  return step;
}

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
  const [companyId, setCompanyId] = useState<string | null>(searchParams.get("company_id"));
  const [waitMode, setWaitMode] = useState<WaitMode>(null);
  const [waitFinishing, setWaitFinishing] = useState(false);
  const [error, setError] = useState("");
  const [bootstrapTweets, setBootstrapTweets] = useState<BootstrapTweet[]>([]);
  const [marketingScore, setMarketingScore] = useState<number | undefined>();
  const launchStartedRef = useRef(false);

  const isOAuthCallback = searchParams.get("email_connected") === "true";
  const oauthCompanyId = searchParams.get("company_id");
  const resumeLaunch = searchParams.get("resume_launch") === "1";

  useEffect(() => {
    if (!token && !isSignedIn) {
      navigate("/login", { replace: true });
    }
  }, [token, isSignedIn, navigate]);

  useEffect(() => {
    if (resumeLaunch && oauthCompanyId) {
      setCompanyId(oauthCompanyId);
      setStep(4);
    }
  }, [resumeLaunch, oauthCompanyId]);

  useEffect(() => {
    if (isOAuthCallback && oauthCompanyId && !resumeLaunch) {
      setCompanyId(oauthCompanyId);
      setWaitMode("gmail-callback");
      const timer = setTimeout(() => {
        setWaitMode(null);
        setStep(4);
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [isOAuthCallback, oauthCompanyId, resumeLaunch]);

  const runBootstrap = useCallback(async (targetCompanyId: string) => {
    if (launchStartedRef.current) return;
    launchStartedRef.current = true;
    setWaitMode("bootstrap");
    setWaitFinishing(false);
    setError("");
    try {
      const result = await runOnboardingBootstrap(targetCompanyId);
      setBootstrapTweets(result.tweets ?? []);
      setMarketingScore(result.marketingScore);
      setWaitFinishing(true);
      await new Promise((r) => setTimeout(r, 800));
      setWaitMode(null);
      setWaitFinishing(false);
    } catch (err) {
      launchStartedRef.current = false;
      setWaitMode(null);
      setWaitFinishing(false);
      const name = err instanceof Error ? err.name : "";
      if (name === "TimeoutError" || name === "AbortError") {
        setError("Generation took too long. Try again — no X or Gmail connection is required.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to generate your marketing content");
      }
    }
  }, []);

  useEffect(() => {
    if (step === 4 && companyId && bootstrapTweets.length === 0 && waitMode !== "bootstrap" && !launchStartedRef.current) {
      runBootstrap(companyId);
    }
  }, [step, companyId, bootstrapTweets.length, waitMode, runBootstrap]);

  function extractCompanyName(url: string): string {
    const domain = url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].split(".")[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  }

  async function handleWebsiteContinue() {
    if (!websiteUrl.trim()) return;
    setWaitMode("analyze");
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
      setWaitFinishing(true);
      await new Promise((r) => setTimeout(r, 500));
      setWaitMode(null);
      setWaitFinishing(false);
      setStep(2);
    } catch {
      setDetectedName(extractCompanyName(websiteUrl));
      setDetectedIndustry("");
      setWaitMode(null);
      setStep(2);
    }
  }

  async function handleCreateCompany() {
    setWaitMode("setup");
    setWaitFinishing(false);
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
      setWaitFinishing(true);
      await new Promise((r) => setTimeout(r, 500));
      setWaitMode(null);
      setWaitFinishing(false);
      setStep(3);
    } catch (err) {
      setWaitMode(null);
      setWaitFinishing(false);
      setError(err instanceof Error ? err.message : "Failed to create company");
    }
  }

  function goToLaunch() {
    setStep(4);
  }

  function openDashboard() {
    if (companyId) {
      navigate(`/dashboard/${companyId}`, { replace: true });
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

  if (isOAuthCallback && !resumeLaunch && waitMode === "gmail-callback") {
    return (
      <>
        <div className="flex h-screen w-screen items-center justify-center bg-slate-50" />
        <OnboardingWaitOverlay
          open
          title="Gmail connected"
          subtitle="Returning to onboarding"
          phases={GMAIL_SYNC_PHASES}
          finishing
          successTitle="Gmail connected!"
          successSubtitle="Generating your first marketing content..."
        />
      </>
    );
  }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">What&apos;s your role?</h2>
            <p className="text-xs text-slate-500 mb-6">So we can tailor the experience to you.</p>
            <div className="flex flex-col gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setRole(r.id);
                    setStep(1);
                  }}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white text-left transition-all"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold flex-1 text-slate-700">{r.label}</p>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </button>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div>
            <button type="button" onClick={() => setStep(0)} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 mb-4">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-1">What&apos;s your website URL?</h2>
            <p className="text-xs text-slate-500 mb-6">We&apos;ll scan it to understand your business.</p>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="url"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all placeholder-slate-400"
                placeholder="https://example.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && websiteUrl.trim() && waitMode !== "analyze" && handleWebsiteContinue()}
                autoFocus
              />
            </div>
            <button
              onClick={handleWebsiteContinue}
              disabled={!websiteUrl.trim() || waitMode === "analyze"}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 mt-6 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-all shadow-md"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        );

      case 2:
        return (
          <div>
            <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 mb-4">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Company details</h2>
            <p className="text-xs text-slate-500 mb-6">Review your information and add your company size.</p>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 mb-6">
              <div className="space-y-4">
                <DetailRow icon={Tag} label="Role" value={ROLES.find((r) => r.id === role)?.label || role} />
                <DetailRow icon={Building2} label="Company" value={detectedName} />
                <DetailRow icon={Globe} label="Website" value={websiteUrl} />
                <DetailRow icon={Briefcase} label="Industry" value={detectedIndustry || "Detected during analysis"} />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wider">Company size</p>
            <div className="flex flex-col gap-2 mb-6 max-h-40 overflow-y-auto">
              {COMPANY_SIZES.map((s) => {
                const sel = companySize === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setCompanySize(s.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      sel ? "border-blue-500 bg-blue-50/50" : "border-slate-200 hover:bg-slate-50 bg-white"
                    }`}
                  >
                    <Users className={`h-4 w-4 ${sel ? "text-blue-600" : "text-slate-400"}`} />
                    <p className={`text-sm font-semibold flex-1 ${sel ? "text-blue-900" : "text-slate-700"}`}>{s.label}</p>
                    {sel && <Check className="h-4 w-4 text-blue-600" />}
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleCreateCompany}
              disabled={!companySize || waitMode === "setup"}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-all shadow-md"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        );

      case 3:
        return (
          <div>
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Mail className="h-7 w-7" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Connect Gmail (optional)</h2>
              <p className="text-xs text-slate-500">Power the mail agent — or skip straight to content generation.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleGmailConnect}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 shadow-md"
              >
                <Mail className="h-4 w-4" /> Connect Gmail
              </button>
              <button
                onClick={goToLaunch}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-semibold"
              >
                <Sparkles className="h-4 w-4" /> Generate my marketing
              </button>
            </div>
          </div>
        );

      case 4:
        if (bootstrapTweets.length > 0) {
          return (
            <OnboardingLaunchResults
              tweets={bootstrapTweets}
              marketingScore={marketingScore}
              onContinue={openDashboard}
            />
          );
        }
        if (error && waitMode !== "bootstrap") {
          return (
            <div className="text-center py-4 space-y-4">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => {
                  launchStartedRef.current = false;
                  setError("");
                  if (companyId) runBootstrap(companyId);
                }}
                className="w-full h-11 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Try again
              </button>
            </div>
          );
        }
        return (
          <div className="text-center py-6">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Building your marketing</h2>
            <p className="text-xs text-slate-500">
              Research, strategy, and X posts — typically 1–3 minutes. No integrations required.
            </p>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <>
      <OnboardingShell
        currentStep={railStep(step, waitMode)}
        error={error}
        footer={
          step < 4 ? (
            <p className="text-[10px] text-slate-400 text-center mt-6">
              Onboarding ends with real X posts drafted for your brand.
            </p>
          ) : undefined
        }
      >
        {renderStep()}
      </OnboardingShell>

      <OnboardingWaitOverlay
        open={waitMode === "analyze"}
        title="Analyzing your website"
        phases={WEBSITE_ANALYZE_PHASES}
        finishing={waitFinishing && waitMode === "analyze"}
        successTitle="Profile ready"
      />

      <OnboardingWaitOverlay
        open={waitMode === "setup"}
        title="Creating workspace"
        phases={WORKSPACE_SETUP_PHASES}
        finishing={waitFinishing}
        successTitle="Workspace ready"
      />

      <OnboardingWaitOverlay
        open={waitMode === "bootstrap"}
        title="Launching your marketing"
        subtitle="Agents are working from your company profile"
        phases={ONBOARDING_LAUNCH_PHASES}
        finishing={waitFinishing}
        successTitle="Posts ready!"
        successSubtitle="Your first X content is waiting in the dashboard"
      />
    </>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Tag; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-slate-400 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm text-slate-700 truncate">{value}</p>
      </div>
    </div>
  );
}
