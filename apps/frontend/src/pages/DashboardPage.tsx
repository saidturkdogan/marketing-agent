import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { getDashboard, getStrategy, generateBrief } from "../api";
import type { DashboardData, StrategyData, CalendarWeek, CalendarDay, CalendarItem, ContentBrief } from "../types";
import {
  Sparkles,
  BarChart3,
  Target,
  Calendar,
  UserPlus,
  Settings,
  Zap,
  Globe,
  FileText,
  Linkedin,
  Twitter,
  Mail,
  BookOpen,
  TrendingUp,
  ArrowRight,
  X,
  Search,
} from "lucide-react";

type View = "dashboard" | "strategy" | "calendar" | "competitors" | "settings";

const NAV_ITEMS: { id: View; label: string; icon: typeof BarChart3 }[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "strategy", label: "Strategy", icon: Target },
  { id: "calendar", label: "Content Calendar", icon: Calendar },
  { id: "competitors", label: "Competitors", icon: UserPlus },
  { id: "settings", label: "Settings", icon: Settings },
];

const CALENDAR_ICONS: Record<CalendarItem["type"], typeof FileText> = {
  blog: FileText,
  linkedin: Linkedin,
  x: Twitter,
  email: Mail,
  case_study: BookOpen,
};

const CALENDAR_LABELS: Record<CalendarItem["type"], string> = {
  blog: "Blog Post",
  linkedin: "LinkedIn Post",
  x: "X Post",
  email: "Email",
  case_study: "Case Study",
};

export function DashboardPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);

  const [view, setView] = useState<View>("dashboard");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [strategyData, setStrategyData] = useState<StrategyData | null>(null);
  const [strategyId, setStrategyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expandedWeek, setExpandedWeek] = useState<number | null>(0);

  const [briefingItem, setBriefingItem] = useState<CalendarItem | null>(null);
  const [brief, setBrief] = useState<ContentBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState("");

    const loadDashboard = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError("");
    try {
      const data = await getDashboard(companyId);
      setDashboardData(data);
      if (data.strategyId) setStrategyId(data.strategyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const loadStrategy = useCallback(async () => {
    if (!strategyId) return;
    try {
      const data = await getStrategy(strategyId);
      setStrategyData(data);
    } catch {
      setStrategyData(null);
    }
  }, [strategyId]);

  useEffect(() => {
    if (!token && !isSignedIn) {
      navigate("/login", { replace: true });
      return;
    }
    loadDashboard();
  }, [token, isSignedIn, navigate, loadDashboard]);

  useEffect(() => {
    if (view === "strategy" && !strategyData && strategyId) {
      loadStrategy();
    }
  }, [view, strategyData, strategyId, loadStrategy]);

  async function openContentBrief(item: CalendarItem) {
    setBriefingItem(item);
    setBrief(null);
    setBriefError("");
    setBriefLoading(true);
    try {
      const result = await generateBrief({
        companyId: companyId || "",
        strategyId: strategyId || "",
        contentTitle: item.title,
        contentType: item.type,
        goal: item.goal || "SEO Traffic",
        targetAudience: item.targetAudience || "General",
      });
      setBrief(result);
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : "Failed to load brief");
    } finally {
      setBriefLoading(false);
    }
  }

  function closeBrief() {
    setBriefingItem(null);
    setBrief(null);
    setBriefError("");
  }

  if (!token && !isSignedIn) return null;

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
      </div>
    );
  }

  const score = dashboardData?.marketingScore ?? 0;
  const circumference = 2 * Math.PI * 54;
  const scoreOffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <div className="w-[280px] flex flex-col bg-slate-900 border-r border-slate-800/50 flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Plinth</span>
          </div>
        </div>

        <nav className="flex-1 px-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`sidebar-nav-item ${
                view === item.id ? "active" : ""
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800/50">
          <button
            onClick={() => {
              useAuthStore.getState().clearAuth();
              navigate("/login", { replace: true });
            }}
            className="sidebar-nav-item text-slate-500 hover:text-slate-300"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {view === "dashboard" && <DashboardView data={dashboardData} score={score} circumference={circumference} scoreOffset={scoreOffset} onViewStrategy={() => setView("strategy")} onViewCalendar={() => setView("calendar")} />}
        {view === "strategy" && <StrategyView data={strategyData} dashboardData={dashboardData} error={error} />}
        {view === "calendar" && (
          <CalendarView
            weeks={dashboardData?.calendar?.weeks}
            expandedWeek={expandedWeek}
            onToggleWeek={setExpandedWeek}
            onItemClick={openContentBrief}
          />
        )}
        {view === "competitors" && <CompetitorsView />}
        {view === "settings" && <SettingsView companyId={companyId} />}
      </div>

      {/* Content Brief Modal */}
      {briefingItem && (
        <div className="modal-backdrop" onClick={closeBrief}>
          <div
            className="modal-content bg-slate-900 border border-slate-700 text-white max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Content Brief</h3>
              <button onClick={closeBrief} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {briefLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
              </div>
            )}

            {briefError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-4">
                {briefError}
              </div>
            )}

            {brief && (
              <div className="space-y-5">
                <Section label="Title" value={brief.title} />
                <Section label="Goal" value={brief.goal} />
                <Section label="Target Audience" value={brief.targetAudience} />
                <Section label="Primary Keyword" value={brief.primaryKeyword} />
                <Section label="Search Intent" value={brief.searchIntent} />
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Outline</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    {brief.outline.map((item, i) => (
                      <li key={i} className="text-sm text-slate-300">{item}</li>
                    ))}
                  </ol>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Competitor References</p>
                  <ul className="space-y-1">
                    {brief.competitorReferences.map((ref, i) => (
                      <li key={i} className="text-sm text-blue-400">&bull; {ref}</li>
                    ))}
                  </ul>
                </div>
                <Section label="CTA" value={brief.cta} />
                <button
                  onClick={closeBrief}
                  className="w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-slate-200">{value}</p>
    </div>
  );
}

function DashboardView({
  data,
  score,
  circumference,
  scoreOffset,
  onViewStrategy,
  onViewCalendar,
}: {
  data: DashboardData | null;
  score: number;
  circumference: number;
  scoreOffset: number;
  onViewStrategy: () => void;
  onViewCalendar: () => void;
}) {
  return (
    <div className="p-8 animate-fadeIn">
      <h1 className="text-2xl font-bold text-white mb-8">Marketing Command Center</h1>

      {/* Top bar: Score + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Score Circle */}
        <div className="col-span-1 flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Marketing Score</p>
          <div className="relative">
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="54" fill="none" stroke="#1e293b" strokeWidth="10" />
              <circle
                cx="70" cy="70" r="54" fill="none" stroke="url(#scoreGradient)" strokeWidth="10"
                strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={scoreOffset}
                transform="rotate(-90 70 70)" className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-white">{score}</span>
              <span className="text-sm text-slate-400">/100</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <StatCard icon={<Target className="h-5 w-5 text-blue-400" />} value={`+${data?.contentOpportunities ?? 0}`} label="Content Opportunities" />
        <StatCard icon={<Zap className="h-5 w-5 text-amber-400" />} value={`+${data?.competitorWeaknesses ?? 0}`} label="Competitor Weaknesses" />
        <StatCard icon={<Search className="h-5 w-5 text-emerald-400" />} value={`+${data?.keywordsFound ?? 0}`} label="Keywords Found" />
      </div>

      {/* Opportunities */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-4">Opportunities</h2>
        {data?.opportunities && data.opportunities.length > 0 ? (
          <div className="grid gap-4">
            {data.opportunities.map((opp, i) => (
              <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-slate-700 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 flex-shrink-0">
                    {i === 0 ? (
                      <Target className="h-5 w-5 text-blue-400" />
                    ) : i === 1 ? (
                      <Globe className="h-5 w-5 text-violet-400" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white mb-1">{opp.title}</h3>
                    <p className="text-sm text-slate-400 mb-3">{opp.description}</p>
                    {opp.estimatedTraffic && (
                      <p className="text-xs text-slate-500 mb-2">
                        Estimated traffic: {opp.estimatedTraffic}
                      </p>
                    )}
                    {opp.action && (
                      <p className="text-xs text-slate-500 mb-3">Action: {opp.action}</p>
                    )}
                    <button
                      onClick={onViewStrategy}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      View Strategy <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
            <Target className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">No opportunities found yet.</p>
            <p className="text-sm text-slate-600 mt-1">Run a full analysis from the Onboarding page.</p>
          </div>
        )}
      </div>

      {/* Calendar preview link */}
      {data?.calendar && data.calendar.weeks.length > 0 && (
        <button
          onClick={onViewCalendar}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-800 p-4 text-sm text-slate-300 hover:border-slate-600 hover:text-white transition-colors"
        >
          <Calendar className="h-4 w-4" />
          View 30-Day Content Calendar
        </button>
      )}
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-2">{icon}</div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  );
}

function StrategyView({
  data,
  dashboardData,
  error,
}: {
  data: StrategyData | null;
  dashboardData: DashboardData | null;
  error: string;
}) {
  const strategy = data?.strategy;

  if (error) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold text-white mb-8">Marketing Strategy</h2>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-8 animate-fadeIn">
      <h2 className="text-2xl font-bold text-white mb-8">Marketing Strategy</h2>

      {strategy && Object.keys(strategy).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(strategy).map(([key, val]) => (
            <div key={key} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-sm font-semibold text-blue-400 capitalize mb-3">
                {key.replace(/_/g, " ")}
              </h3>
              <div className="text-sm text-slate-300 leading-relaxed">
                {typeof val === "string" ? (
                  <p>{val}</p>
                ) : Array.isArray(val) ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {val.map((item: unknown, i: number) => (
                      <li key={i}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
                    ))}
                  </ul>
                ) : typeof val === "object" && val !== null ? (
                  <pre className="text-xs text-slate-400 whitespace-pre-wrap">
                    {JSON.stringify(val, null, 2)}
                  </pre>
                ) : (
                  <p>{String(val)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
          <Target className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">No strategy data available yet.</p>
          <p className="text-sm text-slate-600">
            The AI generates your strategy after analyzing your website and competitors.
          </p>
          {dashboardData?.opportunities && dashboardData.opportunities.length > 0 && (
            <div className="mt-6 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Discovered Opportunities
              </p>
              {dashboardData.opportunities.map((opp, i) => (
                <div key={i} className="rounded-lg border border-slate-800 p-4 text-left">
                  <p className="text-sm font-medium text-white">{opp.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{opp.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Website Analysis */}
      {data?.websiteAnalysis && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-blue-400 mb-3">Website Analysis</h3>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <pre className="text-xs text-slate-400 whitespace-pre-wrap">
              {JSON.stringify(data.websiteAnalysis, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Competitor Analysis */}
      {data?.competitorAnalysis && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-blue-400 mb-3">Competitor Analysis</h3>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <pre className="text-xs text-slate-400 whitespace-pre-wrap">
              {JSON.stringify(data.competitorAnalysis, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Content Gaps */}
      {data?.contentGaps && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-blue-400 mb-3">Content Gaps</h3>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <pre className="text-xs text-slate-400 whitespace-pre-wrap">
              {JSON.stringify(data.contentGaps, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Keyword Discovery */}
      {data?.keywordDiscovery && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-blue-400 mb-3">Keyword Discovery</h3>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <pre className="text-xs text-slate-400 whitespace-pre-wrap">
              {JSON.stringify(data.keywordDiscovery, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarView({
  weeks,
  expandedWeek,
  onToggleWeek,
  onItemClick,
}: {
  weeks?: CalendarWeek[];
  expandedWeek: number | null;
  onToggleWeek: (w: number | null) => void;
  onItemClick: (item: CalendarItem) => void;
}) {
  return (
    <div className="p-8 animate-fadeIn">
      <h2 className="text-2xl font-bold text-white mb-8">30-Day Content Calendar</h2>

      {weeks && weeks.length > 0 ? (
        <div className="space-y-4">
          {weeks.map((week) => {
            const isExpanded = expandedWeek === week.weekNumber;
            return (
              <div key={week.weekNumber} className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                <button
                  onClick={() => onToggleWeek(isExpanded ? null : week.weekNumber)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                >
                  <span className="text-sm font-semibold text-white">Week {week.weekNumber}</span>
                  <span className="text-xs text-slate-500">
                    {week.days.reduce((sum, d) => sum + d.items.length, 0)} items
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-800">
                    {week.days.map((day) => (
                      <DayRow key={day.day} day={day} onItemClick={onItemClick} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
          <Calendar className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">No calendar data yet.</p>
          <p className="text-sm text-slate-600 mt-1">
            Run a full analysis to generate a 30-day content calendar.
          </p>
        </div>
      )}
    </div>
  );
}

function DayRow({
  day,
  onItemClick,
}: {
  day: CalendarDay;
  onItemClick: (item: CalendarItem) => void;
}) {
  if (day.items.length === 0) return null;

  return (
    <div className="border-t border-slate-800/50">
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          {day.day}
          {day.date && <span className="text-slate-600 ml-2">{day.date}</span>}
        </p>
        <div className="space-y-2">
          {day.items.map((item, i) => {
            const Icon = CALENDAR_ICONS[item.type] || FileText;
            return (
              <button
                key={i}
                onClick={() => onItemClick(item)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-800 hover:border-slate-600 bg-slate-950/50 hover:bg-slate-800/50 transition-colors text-left"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10 flex-shrink-0">
                  <Icon className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {CALENDAR_LABELS[item.type]}
                    {item.primaryKeyword && ` · ${item.primaryKeyword}`}
                  </p>
                </div>
                <span className="text-xs text-slate-600 flex-shrink-0">
                  {CALENDAR_LABELS[item.type]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CompetitorsView() {
  return (
    <div className="p-8 animate-fadeIn">
      <h2 className="text-2xl font-bold text-white mb-8">Competitors</h2>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
        <UserPlus className="h-10 w-10 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-500">Competitor analysis data will appear here.</p>
        <p className="text-sm text-slate-600 mt-1">
          Run a full analysis or add competitors in the Onboarding flow.
        </p>
      </div>
    </div>
  );
}

function SettingsView({ companyId }: { companyId?: string }) {
  return (
    <div className="p-8 animate-fadeIn">
      <h2 className="text-2xl font-bold text-white mb-8">Settings</h2>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Company ID</p>
            <p className="text-sm text-slate-300 font-mono">{companyId || "N/A"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Plan</p>
            <p className="text-sm text-slate-300">Free</p>
          </div>
        </div>
      </div>
    </div>
  );
}
