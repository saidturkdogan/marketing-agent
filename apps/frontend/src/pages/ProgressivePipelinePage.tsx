import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { runPipelineResearch, runPipelineStrategy, runPipelinePlan, runPipelineAssets, getCompany } from "../api";
import type { ProgressiveResponse, PipelineStage, Company } from "../types";
import {
  Sparkles, ArrowRight, Check, Globe, Users, Target, Calendar,
  FileText, Linkedin, Mail, TrendingUp, Search, Zap, Star,
  Lightbulb, ChevronRight, AlertTriangle, Layers,
} from "lucide-react";

type StageInfo = {
  id: PipelineStage;
  label: string;
  icon: typeof Sparkles;
  color: string;
  gradient: string;
};

const STAGES: StageInfo[] = [
  { id: "research", label: "Research", icon: Search, color: "text-blue-400", gradient: "from-blue-600 to-blue-400" },
  { id: "strategy", label: "Strategy", icon: Layers, color: "text-violet-400", gradient: "from-violet-600 to-violet-400" },
  { id: "plan", label: "Execution Plan", icon: Calendar, color: "text-emerald-400", gradient: "from-emerald-600 to-emerald-400" },
  { id: "assets", label: "Assets", icon: FileText, color: "text-amber-400", gradient: "from-amber-600 to-amber-400" },
];

const STAGE_ORDER: PipelineStage[] = ["research", "strategy", "plan", "assets"];

export function ProgressivePipelinePage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);

  const [currentStage, setCurrentStage] = useState<PipelineStage>("research");
  const [completedStages, setCompletedStages] = useState<Set<PipelineStage>>(new Set());
  const [strategyId, setStrategyId] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [stageData, setStageData] = useState<Partial<Record<PipelineStage, Record<string, unknown> | null>>>({
    research: null, strategy: null, plan: null, assets: null,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token && !isSignedIn) {
      navigate("/login", { replace: true });
      return;
    }
    if (companyId) {
      getCompany(companyId).then(setCompany).catch(() => {});
    }
  }, [token, isSignedIn, navigate, companyId]);

  const executeStage = useCallback(async (stage: PipelineStage) => {
    if (!companyId) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result: ProgressiveResponse = await (async (): Promise<ProgressiveResponse> => {
        switch (stage) {
          case "research":
            return runPipelineResearch({
              companyId,
              websiteUrl: company?.websiteUrl,
              companyName: company?.name,
              industry: company?.industry,
            });
          case "strategy":
            if (!strategyId) throw new Error("No strategy available. Complete research first.");
            return runPipelineStrategy(strategyId);
          case "plan":
            if (!strategyId) throw new Error("No strategy available. Complete strategy first.");
            return runPipelinePlan(strategyId);
          case "assets":
            if (!strategyId) throw new Error("No strategy available. Complete plan first.");
            return runPipelineAssets(strategyId);
          default:
            throw new Error("Unknown stage: " + stage);
        }
      })();
      setStrategyId(result.strategyId);
      setStageData(prev => ({ ...prev, [stage]: result.data }));
      setCompletedStages(prev => new Set(prev).add(stage));
      setMessage(result.message);
      if (result.nextAvailable && result.nextStage) {
        setCurrentStage(result.nextStage);
      } else {
        setCurrentStage("assets");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pipeline step failed");
    } finally {
      setLoading(false);
    }
  }, [companyId, strategyId, company]);

  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  const stageInfo = STAGES.find(s => s.id === currentStage) || STAGES[0];

  if (!token && !isSignedIn) return null;

  const stageContent = () => {
    if (!stageData[currentStage] && !loading && !error) {
      return (
        <div className="text-center py-16">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${stageInfo.gradient} mb-6`}>
            <stageInfo.icon className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">{stageInfo.label}</h2>
          <p className="text-neutral-400 text-base max-w-lg mx-auto mb-8">
            {currentStage === "research" && "We'll scan your website, find competitors, and identify content opportunities in your market."}
            {currentStage === "strategy" && "Based on our research, we'll create a tailored marketing strategy with positioning, pillars, and channel plan."}
            {currentStage === "plan" && "We'll build a 30-day content calendar with blog briefs and a detailed execution roadmap."}
            {currentStage === "assets" && "We'll generate LinkedIn posts, newsletter drafts, and a publishing schedule ready for review."}
          </p>
          <button
            onClick={() => executeStage(currentStage)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-700 text-base font-semibold text-white hover:bg-blue-800 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <><div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Running...</>
            ) : (
              <><Sparkles className="h-5 w-5" /> Run {stageInfo.label}</>
            )}
          </button>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="text-center py-16">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${stageInfo.gradient}`}>
                <stageInfo.icon className="h-10 w-10 text-white animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#06060e] border-2 border-blue-700">
                <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-blue-300 border-t-transparent" />
              </div>
            </div>
          </div>
          <p className="text-white text-lg font-semibold">Running {stageInfo.label}...</p>
          <p className="text-neutral-500 text-sm mt-1">Our AI agents are analyzing your data</p>
        </div>
      );
    }

    return renderStageContent(currentStage, stageData[currentStage] || {});
  };

  return (
    <div className="min-h-screen bg-[#06060e] overflow-y-auto font-sans">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#06060e]/80 backdrop-blur-xl border-b border-[#111122]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">
              {company?.name || "Marketing Agent"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {message && (
              <span className="text-xs text-emerald-400 bg-emerald-600/10 px-3 py-1.5 rounded-lg">
                {message}
              </span>
            )}
            <button
              onClick={() => navigate(`/dashboard/${companyId}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#1a1a2e] text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Dashboard <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Pipeline Progress */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {STAGES.map((s, i) => {
              const isCompleted = completedStages.has(s.id);
              const isCurrent = s.id === currentStage;
              const isLast = i === STAGES.length - 1;
              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <button
                    onClick={() => {
                      if (completedStages.has(s.id) || s.id === currentStage) return;
                      if (STAGE_ORDER.indexOf(s.id) <= STAGE_ORDER.indexOf(currentStage)) {
                        setCurrentStage(s.id);
                      }
                    }}
                    disabled={!completedStages.has(s.id) && s.id !== currentStage}
                    className={`flex flex-col items-center gap-2 transition-all ${
                      isCompleted ? "cursor-pointer" : isCurrent ? "" : "cursor-not-allowed opacity-40"
                    }`}
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-500 ${
                      isCompleted
                        ? "bg-emerald-600 shadow-lg shadow-emerald-600/20"
                        : isCurrent
                        ? `bg-gradient-to-br ${s.gradient} shadow-lg`
                        : "bg-[#111122] border border-[#1a1a2e]"
                    }`}>
                      {isCompleted ? (
                        <Check className="h-6 w-6 text-white" />
                      ) : (
                        <s.icon className={`h-6 w-6 ${isCurrent ? "text-white" : "text-neutral-600"}`} />
                      )}
                    </div>
                    <span className={`text-xs font-semibold ${
                      isCompleted ? "text-emerald-400" : isCurrent ? s.color : "text-neutral-600"
                    }`}>
                      {s.label}
                    </span>
                    {isCompleted && (
                      <span className="text-[10px] text-emerald-500 font-medium">Complete</span>
                    )}
                  </button>
                  {!isLast && (
                    <div className={`flex-1 h-0.5 mx-4 rounded-full ${
                      completedStages.has(s.id) ? "bg-emerald-600" : "bg-[#1a1a2e]"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-600/30 bg-red-600/10 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Stage Content */}
        <div className="rounded-2xl border border-[#1a1a2e] bg-[#0c0c1a] p-8">
          {stageContent()}
        </div>

        {/* Next Step Navigation */}
        {completedStages.has(currentStage) && !loading && (
          <div className="mt-8 text-center">
            {currentStage !== "assets" ? (
              <button
                onClick={() => executeStage(STAGE_ORDER[STAGE_ORDER.indexOf(currentStage) + 1])}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-700 text-base font-semibold text-white hover:bg-blue-800 transition-all shadow-lg shadow-blue-700/20"
              >
                Next: {STAGES[STAGE_ORDER.indexOf(currentStage) + 1].label} <ArrowRight className="h-5 w-5" />
              </button>
            ) : (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-600/10 border border-emerald-600/20 text-emerald-400 text-sm font-semibold">
                  <Check className="h-4 w-4" /> All stages complete
                </div>
                <div>
                  <button
                    onClick={() => navigate(`/dashboard/${companyId}`)}
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-700 text-base font-semibold text-white hover:bg-blue-800 transition-all"
                  >
                    Go to Dashboard <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function renderStageContent(stage: PipelineStage, data: Record<string, unknown>) {
  switch (stage) {
    case "research":
      return <ResearchContent data={data} />;
    case "strategy":
      return <StrategyContent data={data} />;
    case "plan":
      return <PlanContent data={data} />;
    case "assets":
      return <AssetsContent data={data} />;
    default:
      return null;
  }
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function safeStrArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function safeNum(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

function ResearchContent({ data }: { data: Record<string, unknown> }) {
  const websiteScore = safeNum(data.websiteScore);
  const strengths = safeStrArray(data.websiteStrengths);
  const weaknesses = safeStrArray(data.websiteWeaknesses);
  const takeaways = safeStrArray(data.keyTakeaways);
  const competitors = Array.isArray(data.competitors) ? data.competitors as Array<Record<string, unknown>> : [];
  const copyThese = safeStrArray(data.copyThese);
  const doDifferently = safeStrArray(data.doDifferently);
  const exploitThese = safeStrArray(data.exploitThese);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-400 text-sm font-medium mb-4">
          <Search className="h-4 w-4" /> Research Complete
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Here's what we found</h2>
        <p className="text-neutral-400">Website analysis, competitor landscape, and market opportunities</p>
      </div>

      {websiteScore && (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-[#080814] border border-[#1a1a2e]">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 text-white text-2xl font-bold">
            {typeof websiteScore === "number" ? websiteScore : "?"}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Website Score</p>
            <p className="text-xs text-neutral-400">Overall marketing effectiveness</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {strengths.length > 0 && (
          <div className="rounded-xl border border-emerald-600/20 bg-emerald-600/5 p-4">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Strengths</p>
            <div className="flex flex-wrap gap-2">
              {strengths.map((s, i) => (
                <span key={i} className="px-3 py-1.5 rounded-lg bg-emerald-600/10 border border-emerald-600/20 text-xs text-emerald-300">{s}</span>
              ))}
            </div>
          </div>
        )}
        {weaknesses.length > 0 && (
          <div className="rounded-xl border border-red-600/20 bg-red-600/5 p-4">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">Weaknesses</p>
            <div className="flex flex-wrap gap-2">
              {weaknesses.map((w, i) => (
                <span key={i} className="px-3 py-1.5 rounded-lg bg-red-600/10 border border-red-600/20 text-xs text-red-300">{w}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {takeaways.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Key Takeaways</p>
          <ul className="space-y-2">
            {takeaways.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                <ChevronRight className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {competitors.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-violet-400" />
            <h3 className="text-sm font-bold text-white">Competitor Landscape</h3>
            <span className="text-xs text-neutral-500">{competitors.length} found</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {competitors.slice(0, 4).map((c, i) => (
              <div key={i} className="rounded-xl border border-[#1a1a2e] bg-[#080814] p-4 hover:border-[#252545] transition-colors">
                <p className="text-sm font-semibold text-white mb-1">{safeStr(c.name)}</p>
                <p className="text-xs text-neutral-500 truncate">{safeStr(c.url)}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {copyThese.length > 0 && (
              <InsightBlock title="Copy These" items={copyThese} color="emerald" icon={<Check className="h-4 w-4" />} />
            )}
            {doDifferently.length > 0 && (
              <InsightBlock title="Do Differently" items={doDifferently} color="amber" icon={<Lightbulb className="h-4 w-4" />} />
            )}
            {exploitThese.length > 0 && (
              <InsightBlock title="Exploit These" items={exploitThese} color="blue" icon={<Zap className="h-4 w-4" />} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function safeObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
}

function safeObjArray(v: unknown): Array<Record<string, unknown>> {
  return Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => x !== null && typeof x === "object") : [];
}

function StrategyContent({ data }: { data: Record<string, unknown> }) {
  const summary = typeof data.executiveSummary === "string" ? data.executiveSummary : null;
  const pillars = safeObjArray(data.strategicPillars);
  const channels = safeObjArray(data.channelStrategy);
  const positioning = safeObj(data.brandPositioning);
  const contentStrategy = safeObj(data.contentStrategy);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-600/10 border border-violet-600/20 text-violet-400 text-sm font-medium mb-4">
          <Layers className="h-4 w-4" /> Strategy Complete
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Your marketing strategy</h2>
        <p className="text-neutral-400">Positioning, pillars, and channel focus</p>
      </div>

      {summary && (
        <div className="p-4 rounded-xl bg-[#080814] border border-[#1a1a2e]">
          <p className="text-sm text-neutral-300 leading-relaxed">{summary}</p>
        </div>
      )}

      {pillars.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Strategic Pillars</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {pillars.map((p, i) => (
              <div key={i} className="rounded-xl border border-[#1a1a2e] bg-[#080814] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-violet-400" />
                  <p className="text-sm font-semibold text-white">{safeStr(p.name)}</p>
                </div>
                <p className="text-xs text-neutral-400">{safeStr(p.description)}</p>
                {safeStrArray(p.initiatives).length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {safeStrArray(p.initiatives).slice(0, 3).map((init, j) => (
                      <li key={j} className="text-xs text-neutral-500 flex items-start gap-1">
                        <ChevronRight className="h-3 w-3 text-violet-500 flex-shrink-0 mt-0.5" />
                        {init}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {channels.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Channel Strategy</p>
          <div className="space-y-2">
            {channels.map((ch, i) => {
              const pct = typeof ch.focus_percentage === "number" ? ch.focus_percentage : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-neutral-300 w-24 flex-shrink-0">{safeStr(ch.channel)}</span>
                  <div className="flex-1 h-2 rounded-full bg-[#1a1a2e] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-500"
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-neutral-400 w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PlanContent({ data }: { data: Record<string, unknown> }) {
  const calendar = safeObj(data.calendar);
  const briefs = safeObjArray(data.briefs);

  const days = safeObjArray(calendar.days);
  const weekThemes = safeObjArray(calendar.week_themes);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600/10 border border-emerald-600/20 text-emerald-400 text-sm font-medium mb-4">
          <Calendar className="h-4 w-4" /> Plan Complete
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Your 30-day content plan</h2>
        <p className="text-neutral-400">Content calendar and detailed briefs</p>
      </div>

      {weekThemes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Weekly Themes</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {weekThemes.map((wt, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#080814] border border-[#1a1a2e]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-400 text-xs font-bold">
                  W{typeof wt.week === "number" ? wt.week : i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{safeStr(wt.theme)}</p>
                  <p className="text-xs text-neutral-500">{safeStr(wt.focus)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {days.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Content Calendar Preview</p>
          <div className="space-y-2">
            {days.slice(0, 5).map((d, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[#080814] border border-[#1a1a2e]">
                <div className="flex flex-col items-center min-w-[2.5rem]">
                  <span className="text-lg font-bold text-white">{i + 1}</span>
                  <span className="text-[10px] text-neutral-500">Day</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{safeStr(d.content_title)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-blue-600/10 text-blue-400 font-medium">{safeStr(d.content_type)}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-violet-600/10 text-violet-400 font-medium">{safeStr(d.platform)}</span>
                  </div>
                </div>
              </div>
            ))}
            {days.length > 5 && (
              <p className="text-xs text-neutral-500 text-center pt-2">+{days.length - 5} more content pieces</p>
            )}
          </div>
        </div>
      )}

      {briefs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Content Briefs</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {briefs.map((b, i) => (
              <div key={i} className="rounded-xl border border-[#1a1a2e] bg-[#080814] p-4">
                <p className="text-sm font-semibold text-white mb-2">{safeStr(b.title)}</p>
                <p className="text-xs text-neutral-400 mb-2">{safeStr(b.primary_goal) || safeStr(b.search_intent)}</p>
                {safeObjArray(b.outline).length > 0 && (
                  <ul className="space-y-1">
                    {safeObjArray(b.outline).slice(0, 3).map((o, j) => (
                      <li key={j} className="text-xs text-neutral-500 flex items-start gap-1">
                        <ChevronRight className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {safeStr(o.heading)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AssetsContent({ data }: { data: Record<string, unknown> }) {
  const linkedinPosts = safeObj(data.linkedinPosts);
  const newsletter = safeObj(data.newsletter);
  const publishingSchedule = safeObj(data.publishingSchedule);
  const posts = safeObjArray(linkedinPosts.posts);
  const schedule = safeObjArray(publishingSchedule.schedule);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-600/10 border border-amber-600/20 text-amber-400 text-sm font-medium mb-4">
          <FileText className="h-4 w-4" /> Assets Complete
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Your content assets</h2>
        <p className="text-neutral-400">LinkedIn posts, newsletter, and publishing schedule</p>
      </div>

      {posts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Linkedin className="h-5 w-5 text-blue-400" />
            <p className="text-sm font-bold text-white">LinkedIn Posts</p>
            <span className="text-xs text-neutral-500">{posts.length} ready</span>
          </div>
          <div className="space-y-3">
            {posts.map((post, i) => (
              <div key={i} className="rounded-xl border border-[#1a1a2e] bg-[#080814] p-4">
                <p className="text-sm font-semibold text-white mb-2">{safeStr(post.title)}</p>
                <p className="text-xs text-neutral-300 leading-relaxed mb-2">{safeStr(post.body).substring(0, 200)}...</p>
                {safeStrArray(post.hashtags).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {safeStrArray(post.hashtags).map((h, j) => (
                      <span key={j} className="text-xs text-blue-400">#{h}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {safeStr(newsletter.subject) && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Mail className="h-5 w-5 text-amber-400" />
            <p className="text-sm font-bold text-white">Newsletter Draft</p>
          </div>
          <div className="rounded-xl border border-[#1a1a2e] bg-[#080814] p-4">
            <p className="text-xs text-neutral-500 mb-1">Subject</p>
            <p className="text-sm font-semibold text-white mb-3">{safeStr(newsletter.subject)}</p>
            {safeStr(newsletter.intro) && (
              <>
                <p className="text-xs text-neutral-500 mb-1">Intro</p>
                <p className="text-xs text-neutral-300 mb-3">{safeStr(newsletter.intro)}</p>
              </>
            )}
            {safeObjArray(newsletter.sections).length > 0 && (
              <>
                <p className="text-xs text-neutral-500 mb-2">Sections</p>
                <div className="space-y-2">
                  {safeObjArray(newsletter.sections).map((sec, i) => (
                    <div key={i} className="p-3 rounded-lg bg-[#06060e]">
                      <p className="text-xs font-semibold text-white mb-1">{safeStr(sec.heading)}</p>
                      <p className="text-xs text-neutral-400">{safeStr(sec.body).substring(0, 100)}...</p>
                    </div>
                  ))}
                </div>
              </>
            )}
            {safeStr(newsletter.cta) && (
              <div className="mt-3 pt-3 border-t border-[#1a1a2e]">
                <p className="text-xs text-neutral-500 mb-1">CTA</p>
                <p className="text-xs text-blue-400 font-semibold">{safeStr(newsletter.cta)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {schedule.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-emerald-400" />
            <p className="text-sm font-bold text-white">Publishing Schedule</p>
          </div>
          <div className="space-y-2">
            {schedule.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#080814] border border-[#1a1a2e]">
                <div className="flex flex-col items-center min-w-[3rem]">
                  <span className="text-xs font-bold text-white">{safeStr(s.day)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">{safeStr(s.content)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-violet-600/10 text-violet-400">{safeStr(s.platform)}</span>
                    <span className="text-[10px] text-neutral-500">{safeStr(s.time)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InsightBlock({ title, items, color, icon }: {
  title: string; items: string[]; color: "emerald" | "amber" | "blue"; icon: React.ReactNode;
}) {
  const colors = {
    emerald: { bg: "bg-emerald-600/10", border: "border-emerald-600/20", text: "text-emerald-400", itemText: "text-emerald-300" },
    amber: { bg: "bg-amber-600/10", border: "border-amber-600/20", text: "text-amber-400", itemText: "text-amber-300" },
    blue: { bg: "bg-blue-600/10", border: "border-blue-600/20", text: "text-blue-400", itemText: "text-blue-300" },
  };
  const c = colors[color];
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
      <div className={`flex items-center gap-2 mb-3 ${c.text}`}>
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wider">{title}</p>
      </div>
      <ul className="space-y-1.5">
        {items.slice(0, 4).map((item, i) => (
          <li key={i} className={`text-xs ${c.itemText} flex items-start gap-1.5`}>
            <ChevronRight className="h-3 w-3 flex-shrink-0 mt-0.5 opacity-50" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
