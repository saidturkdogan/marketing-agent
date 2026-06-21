import { Bot, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type Step = { id: string; label: string; detail: string };

const LOAD_STEPS: Step[] = [
  { id: "perceive", label: "Perceive", detail: "Syncing market & trend data" },
  { id: "insights", label: "Learn", detail: "Analyzing past performance" },
  { id: "decisions", label: "Recall", detail: "Loading recent decisions" },
  { id: "ready", label: "Ready", detail: "Agent pipeline online" },
];

const RUN_STEPS: Step[] = [
  { id: "perceive", label: "Perceive", detail: "Reading live market signals" },
  { id: "plan", label: "Plan", detail: "Choosing topics & schedule slots" },
  { id: "generate", label: "Generate", detail: "Drafting platform content" },
  { id: "review", label: "Review", detail: "Running guardrails & QA" },
  { id: "act", label: "Act", detail: "Scheduling & requesting approval" },
];

type Props = {
  mode: "load" | "run";
  title?: string;
  subtitle?: string;
};

export function AgentLoadingFlow({ mode, title, subtitle }: Props) {
  const steps = mode === "run" ? RUN_STEPS : LOAD_STEPS;
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, mode === "run" ? 2200 : 900);
    return () => clearInterval(interval);
  }, [mode, steps.length]);

  return (
    <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-sky-50/60 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-200">
          <Bot className="h-6 w-6 text-white" />
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-sky-400" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-gray-900">
            {title ?? (mode === "run" ? "Agent run in progress" : "Initializing agent pipeline")}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {subtitle ?? steps[activeIndex]?.detail ?? "Preparing intelligence layer..."}
          </p>

          <div className="mt-5 space-y-2.5">
            {steps.map((step, index) => {
              const done = index < activeIndex;
              const active = index === activeIndex;
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-all duration-500 ${
                    active
                      ? "border-violet-200 bg-white shadow-sm"
                      : done
                        ? "border-emerald-100 bg-emerald-50/40"
                        : "border-transparent bg-white/40"
                  }`}
                >
                  <StepIcon done={done} active={active} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${active ? "text-violet-900" : done ? "text-emerald-800" : "text-gray-400"}`}>
                      {step.label}
                    </p>
                    {active && (
                      <p className="text-xs text-gray-500 truncate">{step.detail}</p>
                    )}
                  </div>
                  {active && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-500 animate-pulse">
                      Live
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-violet-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-500 transition-all duration-700 ease-out"
              style={{ width: `${((activeIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepIcon({ done, active }: { done: boolean; active: boolean }) {
  if (done) return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />;
  if (active) return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-600" />;
  return <Circle className="h-4 w-4 shrink-0 text-gray-300" />;
}
