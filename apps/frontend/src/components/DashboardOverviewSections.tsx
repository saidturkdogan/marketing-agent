import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Calendar,
  Check,
  Hash,
  Mail,
  Minus,
  Radar,
  Send,
  Target,
  TrendingUp,
  Twitter,
  X,
  Zap,
  Search,
} from "lucide-react";
import type { ReactNode } from "react";
import type { AgentStatus, ApprovalItem } from "../api";
import type { DashboardData, Opportunity, StrategicPillar, LastPostMetrics } from "../types";
import type { MarketSignals } from "./MarketSignalsView";
import { Button } from "./ui/button";

// ── Top bar integration pills ─────────────────────────────────────

export function IntegrationStatusBar({
  twitterConnected,
  twitterScreenName,
  gmailConnected,
  calendarConnected,
  onNavigateSettings,
}: {
  twitterConnected: boolean;
  twitterScreenName?: string;
  gmailConnected: boolean;
  calendarConnected: boolean;
  onNavigateSettings?: () => void;
}) {
  return (
    <div className="hidden lg:flex items-center gap-1.5 mr-2">
      <IntegrationPill
        icon={<Twitter className="h-3.5 w-3.5" />}
        label="X"
        connected={twitterConnected}
        detail={twitterScreenName ? `@${twitterScreenName}` : undefined}
        onClick={onNavigateSettings}
      />
      <IntegrationPill
        icon={<Mail className="h-3.5 w-3.5" />}
        label="Gmail"
        connected={gmailConnected}
        onClick={onNavigateSettings}
      />
      <IntegrationPill
        icon={<Calendar className="h-3.5 w-3.5" />}
        label="Calendar"
        connected={calendarConnected}
        onClick={onNavigateSettings}
      />
    </div>
  );
}

function IntegrationPill({
  icon,
  label,
  connected,
  detail,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  connected: boolean;
  detail?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={connected ? `${label} connected${detail ? ` · ${detail}` : ""}` : `${label} not connected — open Settings`}
      className={`flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-medium transition-colors ${
        connected
          ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
          : "bg-[#3a3b3e] text-gray-400 hover:bg-[#4a4b4e] hover:text-gray-300"
      }`}
    >
      {icon}
      <span>{label}</span>
      <span
        className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-gray-500"}`}
        aria-hidden
      />
    </button>
  );
}

// ── Header: greeting + score + KPIs ─────────────────────────────

export function DashboardHeaderSection({
  date,
  greeting,
  userName,
  marketingScore,
  dashboardData,
}: {
  date: string;
  greeting: string;
  userName?: string;
  marketingScore: number;
  dashboardData: DashboardData | null;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-gray-500 mb-1">{date}</p>
        <h1 className="text-3xl font-bold text-gray-900">
          {greeting}, {userName?.split(" ")[0] || "User"}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MarketingScoreCard score={marketingScore} />
        <KpiCard
          icon={<Target className="h-5 w-5 text-blue-600" />}
          value={dashboardData?.contentOpportunities ?? 0}
          label="Content opportunities"
          hint="Topics competitors cover"
        />
        <KpiCard
          icon={<Zap className="h-5 w-5 text-amber-600" />}
          value={dashboardData?.competitorWeaknesses ?? 0}
          label="Competitor gaps"
          hint="Areas to differentiate"
        />
        <KpiCard
          icon={<Search className="h-5 w-5 text-emerald-600" />}
          value={dashboardData?.keywordsFound ?? 0}
          label="Keywords found"
          hint="SEO opportunities"
        />
      </div>
    </div>
  );
}

function MarketingScoreCard({ score }: { score: number }) {
  const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";
  const gradeColor =
    score >= 80 ? "text-emerald-600" : score >= 60 ? "text-sky-600" : score >= 40 ? "text-amber-600" : "text-red-600";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex items-center gap-4">
      <div className="relative h-16 w-16 shrink-0">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f3f4f6" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${score} 100`}
            className={gradeColor}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-lg font-bold tabular-nums ${gradeColor}`}>{score}</span>
        </div>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Marketing score</p>
        <p className="text-sm font-semibold text-gray-900 mt-0.5">Grade {grade}</p>
        <p className="text-xs text-gray-500 mt-0.5">From onboarding analysis</p>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  value,
  label,
  hint,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      <p className="text-sm font-medium text-gray-800 mt-0.5">{label}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{hint}</p>
    </div>
  );
}

// ── Needs attention ───────────────────────────────────────────────

export function NeedsAttentionSection({
  approvals,
  onApprove,
  onReject,
  onViewAll,
}: {
  approvals: ApprovalItem[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onViewAll: () => void;
}) {
  if (approvals.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Check className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-gray-900">Needs attention</h2>
        </div>
        <p className="text-sm text-gray-500">All clear — no pending approvals.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-semibold text-gray-900">Needs attention</h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
            {approvals.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-medium text-amber-800 hover:underline"
        >
          View all
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {approvals.slice(0, 3).map((a) => (
          <ApprovalPreviewCard key={a.approvalId} approval={a} onApprove={onApprove} onReject={onReject} />
        ))}
      </div>
    </div>
  );
}

function ApprovalPreviewCard({
  approval: a,
  onApprove,
  onReject,
}: {
  approval: ApprovalItem;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const kind =
    a.stepName === "email_reply"
      ? "Inbox reply"
      : a.stepName === "outreach_send"
        ? "Outreach"
        : "Tweet";

  const sendOnApprove = a.stepName === "email_reply" || a.stepName === "outreach_send";

  return (
    <div className="rounded-lg border border-amber-100 bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{kind}</p>
      <p className="text-sm text-gray-800 mt-1 line-clamp-2">{a.requestReason || a.outreachSubject || "Pending review"}</p>
      {a.draftBody && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.draftBody}</p>
      )}
      <div className="flex gap-2 mt-3">
        <Button size="sm" className="h-7 text-xs" onClick={() => onApprove(a.approvalId)}>
          {sendOnApprove ? "Approve & Send" : "Approve"}
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onReject(a.approvalId)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ── Agent fleet mini ──────────────────────────────────────────────

export function AgentFleetMiniSection({
  status,
  approvals,
  onNavigateAgent,
  onRunAgents,
  running,
}: {
  status: AgentStatus | null;
  approvals: ApprovalItem[];
  onNavigateAgent: () => void;
  onRunAgents: () => void;
  running?: boolean;
}) {
  const twitterPending = approvals.filter((a) => a.stepName !== "email_reply" && a.stepName !== "outreach_send").length;
  const mailPending = approvals.filter((a) => a.stepName === "email_reply").length;
  const outreachPending = approvals.filter((a) => a.stepName === "outreach_send").length;

  const agents = [
    {
      id: "analysis",
      name: "Analysis",
      icon: Radar,
      accent: "text-violet-600",
      bg: "bg-violet-50",
      stat: status?.llmBudgetExhausted ? "Budget low" : "Active",
      sub: `${status?.scheduledCount ?? 0} planned`,
    },
    {
      id: "twitter",
      name: "X Agent",
      icon: Twitter,
      accent: "text-sky-600",
      bg: "bg-sky-50",
      stat: status?.twitterConnected ? "Connected" : "Not linked",
      sub: `${twitterPending} pending · ${status?.scheduledCount ?? 0} scheduled`,
    },
    {
      id: "mail",
      name: "Mail",
      icon: Mail,
      accent: "text-amber-600",
      bg: "bg-amber-50",
      stat: status?.gmailConnected ? "Connected" : "Not linked",
      sub: `${mailPending} drafts · ${status?.pendingEmailDraftsCount ?? 0} queue`,
    },
    {
      id: "outreach",
      name: "Outreach",
      icon: Send,
      accent: "text-emerald-600",
      bg: "bg-emerald-50",
      stat: status?.outreachEnabled ? "Enabled" : "Off",
      sub: `${outreachPending} pending`,
    },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
            <Bot className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Agent fleet</h2>
            <p className="text-[11px] text-gray-500">
              {status?.autopilotEnabled ? "Autopilot on" : "Manual mode"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onNavigateAgent}>
            Open agents
          </Button>
          <Button size="sm" onClick={onRunAgents} disabled={running || status?.llmBudgetExhausted}>
            {running ? "Running..." : "Run all"}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {agents.map((agent) => {
          const Icon = agent.icon;
          return (
            <button
              key={agent.id}
              type="button"
              onClick={onNavigateAgent}
              className="text-left rounded-lg border border-gray-100 bg-gray-50/50 p-3 hover:border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-md ${agent.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${agent.accent}`} />
                </div>
                <span className="text-xs font-semibold text-gray-900">{agent.name}</span>
              </div>
              <p className="text-[11px] font-medium text-gray-700">{agent.stat}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{agent.sub}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Market snapshot (compact) ─────────────────────────────────────

export function MarketSnapshotCard({
  signals,
  loading,
  onRefresh,
}: {
  signals: MarketSignals | null;
  loading?: boolean;
  onRefresh?: () => void;
}) {
  const trends = signals?.googleTrends;
  const twitter = signals?.twitterPerformance;
  const topic = signals?.researchTopic || "Your industry";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm h-full">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-violet-600" />
          <h2 className="text-lg font-semibold text-gray-900">Market snapshot</h2>
        </div>
        {onRefresh && (
          <button type="button" onClick={onRefresh} className="text-xs text-gray-500 hover:text-gray-800">
            Refresh
          </button>
        )}
      </div>

      {loading && !signals ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 rounded bg-gray-100" />
          <div className="h-20 rounded bg-gray-100" />
        </div>
      ) : !signals ? (
        <p className="text-sm text-gray-500 text-center py-8">Market data unavailable.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800">
              {topic}
            </span>
            {signals.hasRealConnectors !== undefined && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  signals.hasRealConnectors ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {signals.hasRealConnectors ? "Live" : "Simulated"}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3">
              <p className="text-[10px] font-semibold uppercase text-gray-500 mb-1">Google Trends</p>
              {trends?.available && trends.currentIndex != null ? (
                <>
                  <div className="flex items-end justify-between">
                    <p className="text-xl font-bold text-gray-900 tabular-nums">{trends.currentIndex}</p>
                    <TrendBadge direction={trends.trendDirection} />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">Interest index</p>
                  {trends.interestPoints && trends.interestPoints.length > 1 && (
                    <MiniSparkline points={trends.interestPoints.map((p) => p.value)} />
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-500">No trend data</p>
              )}
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3">
              <p className="text-[10px] font-semibold uppercase text-gray-500 mb-1">X performance</p>
              {twitter?.connected ? (
                <div className="grid grid-cols-3 gap-1 mt-1">
                  <MiniMetric label="Views" value={twitter.impressions ?? 0} />
                  <MiniMetric label="Likes" value={twitter.likes ?? 0} />
                  <MiniMetric label="Replies" value={twitter.replies ?? 0} />
                </div>
              ) : (
                <p className="text-xs text-gray-500">{twitter?.message || "Connect X for metrics"}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-sm font-semibold text-gray-900 tabular-nums">{value.toLocaleString()}</p>
      <p className="text-[9px] text-gray-500">{label}</p>
    </div>
  );
}

function TrendBadge({ direction }: { direction?: "up" | "down" | "stable" }) {
  if (direction === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700">
        <ArrowUpRight className="h-3 w-3" /> Up
      </span>
    );
  }
  if (direction === "down") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-700">
        <ArrowDownRight className="h-3 w-3" /> Down
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-gray-600">
      <Minus className="h-3 w-3" /> Stable
    </span>
  );
}

function MiniSparkline({ points }: { points: number[] }) {
  const max = Math.max(...points, 1);
  return (
    <div className="flex items-end gap-px h-6 mt-2">
      {points.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-sky-400 min-w-[2px]"
          style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

// ── Strategy + opportunities ──────────────────────────────────────

export function StrategyOpportunitiesSection({
  pillars,
  opportunities,
}: {
  pillars: StrategicPillar[];
  opportunities: Opportunity[];
}) {
  if (pillars.length === 0 && opportunities.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {pillars.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Hash className="h-5 w-5 text-violet-600" />
            <h2 className="text-lg font-semibold text-gray-900">Strategy pillars</h2>
          </div>
          <div className="space-y-3">
            {pillars.slice(0, 4).map((pillar) => (
              <div key={pillar.name} className="rounded-lg border border-violet-100 bg-violet-50/40 px-4 py-3">
                <p className="text-sm font-semibold text-violet-900">{pillar.name}</p>
                {pillar.description && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{pillar.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {opportunities.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Top opportunities</h2>
          </div>
          <div className="space-y-3">
            {opportunities.slice(0, 5).map((opp, i) => (
              <div key={i} className="rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">{opp.title}</p>
                {opp.description && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{opp.description}</p>
                )}
                {opp.estimatedTraffic && (
                  <p className="text-[10px] text-emerald-700 font-medium mt-1.5">{opp.estimatedTraffic}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
