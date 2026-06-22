import {
  Bot,
  Building2,
  Check,
  CheckCircle2,
  Circle,
  Globe,
  Loader2,
  Mail,
  Sparkles,
  Twitter,
  User,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { PlinthLogo } from "./PlinthLogo";

export type OnboardingStepId = "role" | "website" | "details" | "connect" | "launch";

export const ONBOARDING_STEPS: { id: OnboardingStepId; label: string; icon: typeof User }[] = [
  { id: "role", label: "You", icon: User },
  { id: "website", label: "Website", icon: Globe },
  { id: "details", label: "Company", icon: Building2 },
  { id: "connect", label: "Connect", icon: Mail },
  { id: "launch", label: "Launch", icon: Sparkles },
];

export function stepToIndex(step: number): OnboardingStepId {
  if (step <= 0) return "role";
  if (step === 1) return "website";
  if (step === 2) return "details";
  if (step === 3) return "connect";
  return "launch";
}

export function OnboardingStepRail({ currentStep }: { currentStep: number }) {
  const activeId = stepToIndex(currentStep);
  const activeIndex = ONBOARDING_STEPS.findIndex((s) => s.id === activeId);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-1">
        {ONBOARDING_STEPS.map((step, index) => {
          const Icon = step.icon;
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <div key={step.id} className="flex flex-1 flex-col items-center min-w-0">
              <div className="flex items-center w-full">
                {index > 0 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors duration-500 ${
                      done ? "bg-blue-500" : "bg-slate-200"
                    }`}
                  />
                )}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                    done
                      ? "border-blue-600 bg-blue-600 text-white"
                      : active
                        ? "border-blue-600 bg-blue-50 text-blue-600 shadow-sm shadow-blue-100"
                        : "border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                {index < ONBOARDING_STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors duration-500 ${
                      done ? "bg-blue-500" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
              <p
                className={`mt-2 text-[10px] font-semibold uppercase tracking-wide truncate w-full text-center ${
                  active ? "text-blue-700" : done ? "text-slate-600" : "text-slate-400"
                }`}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type WaitPhase = { id: string; label: string; detail: string };

export const WEBSITE_ANALYZE_PHASES: WaitPhase[] = [
  { id: "fetch", label: "Fetching homepage", detail: "Reading your public website" },
  { id: "brand", label: "Extracting brand", detail: "Company name, tone & positioning" },
  { id: "industry", label: "Detecting industry", detail: "Mapping your market category" },
  { id: "profile", label: "Building profile", detail: "Preparing your company card" },
];

export const WORKSPACE_SETUP_PHASES: WaitPhase[] = [
  { id: "workspace", label: "Creating workspace", detail: "Saving your company profile" },
  { id: "profile", label: "Linking brand data", detail: "Connecting website insights" },
  { id: "ready", label: "Workspace ready", detail: "Preparing optional integrations" },
];

export const ONBOARDING_LAUNCH_PHASES: WaitPhase[] = [
  { id: "research", label: "Market research", detail: "Scanning website, competitors & gaps" },
  { id: "strategy", label: "Strategy", detail: "Building pillars and channel plan" },
  { id: "calendar", label: "Content calendar", detail: "Planning your first weeks" },
  { id: "tweets", label: "X / Twitter posts", detail: "Drafting posts from your profile" },
  { id: "schedule", label: "Saving drafts", detail: "No X or Gmail connection required" },
];

export const GMAIL_SYNC_PHASES: WaitPhase[] = [
  { id: "auth", label: "Gmail connected", detail: "OAuth authorization complete" },
  { id: "sync", label: "Syncing inbox", detail: "Pulling recent conversations" },
  { id: "route", label: "Opening workspace", detail: "Taking you to your pipeline" },
];

export function OnboardingLaunchResults({
  tweets,
  marketingScore,
  onContinue,
}: {
  tweets: Array<{ body?: string; title?: string; status?: string; scheduledAt?: string }>;
  marketingScore?: number;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="flex justify-center mb-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Your marketing is live</h2>
        <p className="text-xs text-slate-500 mt-1">
          {marketingScore ? `Marketing score ${Math.round(marketingScore)} · ` : ""}
          {tweets.length} X posts drafted from your profile
        </p>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {tweets.map((tweet, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-left">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Twitter className="h-3.5 w-3.5 text-sky-600" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {tweet.status === "scheduled" ? "Scheduled" : "Draft"}
              </span>
            </div>
            <p className="text-sm text-slate-800 whitespace-pre-wrap line-clamp-4">
              {tweet.body || tweet.title || "—"}
            </p>
            {tweet.scheduledAt && (
              <p className="text-[10px] text-slate-400 mt-1">
                {new Date(tweet.scheduledAt).toLocaleString()}
              </p>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-md"
      >
        Open dashboard
      </button>
    </div>
  );
}

export function OnboardingWaitOverlay({
  open,
  title,
  subtitle,
  phases,
  finishing,
  successTitle,
  successSubtitle,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  phases: WaitPhase[];
  finishing?: boolean;
  successTitle?: string;
  successSubtitle?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!open) {
      setActiveIndex(0);
      setShowSuccess(false);
      setElapsedSec(0);
      return;
    }

    setActiveIndex(0);
    setShowSuccess(false);
    setElapsedSec(0);

    const phaseInterval = setInterval(() => {
      setActiveIndex((prev) => (prev < phases.length - 1 ? prev + 1 : prev));
    }, 2800);

    const elapsedInterval = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);

    return () => {
      clearInterval(phaseInterval);
      clearInterval(elapsedInterval);
    };
  }, [open, phases.length]);

  useEffect(() => {
    if (!open || !finishing) return;
    setActiveIndex(phases.length - 1);
    const timer = setTimeout(() => setShowSuccess(true), 400);
    return () => clearTimeout(timer);
  }, [open, finishing, phases.length]);

  if (!open) return null;

  const onLastPhase = activeIndex >= phases.length - 1 && !showSuccess;
  const progress = showSuccess ? 100 : onLastPhase ? 92 : ((activeIndex + 1) / phases.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl animate-slideUpFade"
        role="dialog"
        aria-modal="true"
        aria-busy={!showSuccess}
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-5">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-500 ${
                showSuccess ? "bg-emerald-50" : "bg-blue-50"
              }`}
            >
              {showSuccess ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              ) : (
                <Bot className="h-8 w-8 text-blue-600" />
              )}
            </div>
            {!showSuccess && (
              <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold text-slate-900">
            {showSuccess ? successTitle ?? "All set!" : title}
          </h2>
          <p className="text-sm text-slate-500 mt-1.5 max-w-xs">
            {showSuccess ? successSubtitle ?? "Continuing..." : subtitle ?? phases[activeIndex]?.detail}
          </p>
          {onLastPhase && elapsedSec >= 8 && (
            <p className="text-xs text-blue-600 mt-2 font-medium animate-pulse">
              Still working… {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, "0")}
              {elapsedSec >= 45 ? " — AI can take 1–3 min, no integrations needed" : ""}
            </p>
          )}
        </div>

        {!showSuccess && (
          <div className="space-y-2 mb-6">
            {phases.map((phase, index) => {
              const done = index < activeIndex;
              const active = index === activeIndex;
              return (
                <div
                  key={phase.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-500 ${
                    active
                      ? "border-blue-200 bg-blue-50/80"
                      : done
                        ? "border-emerald-100 bg-emerald-50/50"
                        : "border-transparent bg-slate-50/80"
                  }`}
                >
                  <PhaseIcon done={done} active={active} />
                  <div className="min-w-0 flex-1 text-left">
                    <p
                      className={`text-sm font-medium ${
                        active ? "text-blue-900" : done ? "text-emerald-800" : "text-slate-400"
                      }`}
                    >
                      {phase.label}
                    </p>
                    {active && <p className="text-xs text-slate-500 truncate">{phase.detail}</p>}
                  </div>
                  {active && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 shrink-0">
                      Live
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              showSuccess ? "bg-emerald-500" : "bg-blue-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function PhaseIcon({ done, active }: { done: boolean; active: boolean }) {
  if (done) return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />;
  if (active) return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />;
  return <Circle className="h-4 w-4 shrink-0 text-slate-300" />;
}

export function OnboardingShell({
  children,
  currentStep,
  footer,
  error,
}: {
  children: ReactNode;
  currentStep: number;
  footer?: ReactNode;
  error?: string;
}) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50 overflow-hidden font-sans p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="px-8 pt-8 pb-2">
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <PlinthLogo size={32} />
            <span className="text-2xl font-extrabold text-slate-800 tracking-tight">Plinth</span>
          </div>
          <OnboardingStepRail currentStep={currentStep} />
        </div>

        <div className="px-8 pb-8">
          <div className="animate-slideUpFade" key={currentStep}>
            {children}
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 text-center font-semibold">
              {error}
            </div>
          )}

          {footer}
        </div>
      </div>
    </div>
  );
}
