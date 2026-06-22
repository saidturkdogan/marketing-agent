import {
  Bot,
  Brain,
  LineChart,
  Mail,
  Play,
  Radar,
  RefreshCw,
  Send,
  Twitter,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  approveContent,
  getAgentDecisions,
  getAgentMarketBrief,
  getAgentStatus,
  listApprovals,
  rejectContent,
  runAgent,
  updateAgentConfig,
  type AgentDecision,
  type AgentStatus,
  type ApprovalItem,
} from "../api";
import { AgentLoadingFlow } from "./AgentLoadingFlow";
import { MarketSignalsView, type MarketSignals } from "./MarketSignalsView";
import { Button } from "./ui/button";

type AgentId = "overview" | "analysis" | "twitter" | "mail" | "outreach";

type AgentMeta = {
  id: AgentId;
  name: string;
  subtitle: string;
  icon: typeof Bot;
  accent: string;
  ring: string;
  bg: string;
};

const AGENTS: AgentMeta[] = [
  {
    id: "analysis",
    name: "Analysis Agent",
    subtitle: "Market signals & planning",
    icon: Radar,
    accent: "text-violet-600",
    ring: "ring-violet-400",
    bg: "bg-violet-50",
  },
  {
    id: "twitter",
    name: "X / Twitter Agent",
    subtitle: "Content & scheduling",
    icon: Twitter,
    accent: "text-sky-600",
    ring: "ring-sky-400",
    bg: "bg-sky-50",
  },
  {
    id: "mail",
    name: "Mail Agent",
    subtitle: "Inbox reply drafts",
    icon: Mail,
    accent: "text-amber-600",
    ring: "ring-amber-400",
    bg: "bg-amber-50",
  },
  {
    id: "outreach",
    name: "Outreach Agent",
    subtitle: "Cold email prospecting",
    icon: Send,
    accent: "text-emerald-600",
    ring: "ring-emerald-400",
    bg: "bg-emerald-50",
  },
];

type Props = {
  companyId: string;
};

function isTwitterApproval(a: ApprovalItem) {
  return a.stepName !== "email_reply" && a.stepName !== "outreach_send";
}

function isMailApproval(a: ApprovalItem) {
  return a.stepName === "email_reply";
}

function isOutreachApproval(a: ApprovalItem) {
  return a.stepName === "outreach_send";
}

function isTwitterRunItem(item: Record<string, unknown>) {
  return !item.classification && !item.from && item.channel !== "outreach";
}

function isMailRunItem(item: Record<string, unknown>) {
  return Boolean(item.classification || item.from);
}

function isOutreachRunItem(item: Record<string, unknown>) {
  return item.channel === "outreach";
}

export function AgentPanel({ companyId }: Props) {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [decisions, setDecisions] = useState<AgentDecision[]>([]);
  const [marketSignals, setMarketSignals] = useState<MarketSignals | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastRunItems, setLastRunItems] = useState<Array<Record<string, unknown>>>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentId>("overview");

  const load = useCallback(async () => {
    setLoading(true);
    setMarketLoading(true);
    try {
      const [s, a, d] = await Promise.all([
        getAgentStatus(companyId),
        listApprovals(companyId).catch(() => []),
        getAgentDecisions(companyId, 12).catch(() => []),
      ]);
      setStatus(s);
      setApprovals(Array.isArray(a) ? a : []);
      setDecisions(Array.isArray(d) ? d : []);
      setLoading(false);

      getAgentMarketBrief(companyId)
        .then((m) => {
          if (m?.signals) setMarketSignals(m.signals as MarketSignals);
        })
        .catch(() => setMarketSignals(null))
        .finally(() => setMarketLoading(false));
    } catch {
      setStatus(null);
      setLoading(false);
      setMarketLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const twitterApprovals = useMemo(() => approvals.filter(isTwitterApproval), [approvals]);
  const mailApprovals = useMemo(() => approvals.filter(isMailApproval), [approvals]);
  const outreachApprovals = useMemo(() => approvals.filter(isOutreachApproval), [approvals]);

  const toggleAutopilot = async () => {
    if (!status) return;
    try {
      await updateAgentConfig(companyId, { autopilotEnabled: !status.autopilotEnabled });
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update config");
    }
  };

  const toggleOutreach = async () => {
    if (!status) return;
    try {
      await updateAgentConfig(companyId, { outreachEnabled: !status.outreachEnabled });
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update outreach");
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setMessage(null);
    try {
      const result = await runAgent(companyId);
      const emailDrafted = result.email?.drafted ?? 0;
      const outreachDrafted = result.outreach?.drafted ?? 0;
      setMessage(
        result.message
          ? `${result.message}${emailDrafted + outreachDrafted > 0 ? ` (${emailDrafted} inbox + ${outreachDrafted} outreach)` : ""}`
          : "Agent run completed",
      );
      if (result.items) setLastRunItems(result.items);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Agent run failed");
    } finally {
      setRunning(false);
    }
  };

  const handleApprove = async (approvalId: string) => {
    try {
      await approveContent(approvalId);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Approve failed");
    }
  };

  const handleReject = async (approvalId: string) => {
    try {
      await rejectContent(approvalId);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Reject failed");
    }
  };

  if (loading && !status) {
    return (
      <div className="w-full space-y-5 animate-pulse">
        <div className="rounded-xl border border-gray-200 bg-white p-5 h-28" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white h-32" />
          ))}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white h-96" />
      </div>
    );
  }

  const llmPct = status?.llmBudgetUsdPerWeek
    ? Math.min(100, ((status.llmSpendUsdThisWeek ?? 0) / status.llmBudgetUsdPerWeek) * 100)
    : 0;
  const xPct = status?.xApiBudgetCreditsPerWeek
    ? Math.min(100, ((status.xCreditsUsedThisWeek ?? 0) / status.xApiBudgetCreditsPerWeek) * 100)
    : 0;

  const agentBadges: Record<Exclude<AgentId, "overview">, { label: string; tone: string }> = {
    analysis: {
      label: marketLoading ? "Syncing" : marketSignals ? "Active" : "Idle",
      tone: marketSignals ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-600",
    },
    twitter: {
      label: status?.twitterConnected ? "Connected" : "Not linked",
      tone: status?.twitterConnected ? "bg-sky-100 text-sky-700" : "bg-gray-100 text-gray-600",
    },
    mail: {
      label: status?.gmailConnected ? "Connected" : "Not linked",
      tone: status?.gmailConnected ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600",
    },
    outreach: {
      label: status?.outreachEnabled ? "Enabled" : "Disabled",
      tone: status?.outreachEnabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600",
    },
  };

  const agentMetrics: Record<Exclude<AgentId, "overview">, Array<{ label: string; value: string | number }>> = {
    analysis: [
      { label: "Decisions", value: decisions.length },
      { label: "LLM left", value: status?.llmRemainingUsd != null ? `$${status.llmRemainingUsd.toFixed(2)}` : "—" },
    ],
    twitter: [
      { label: "Scheduled", value: status?.scheduledCount ?? 0 },
      { label: "Pending", value: twitterApprovals.length },
      { label: "/ week", value: status?.twitterPostsPerWeek ?? 0 },
    ],
    mail: [
      { label: "Drafts", value: status?.pendingEmailDraftsCount ?? 0 },
      { label: "This week", value: status?.emailDraftsThisWeek ?? 0 },
      { label: "/ week cap", value: status?.emailDraftsPerWeek ?? 0 },
    ],
    outreach: [
      { label: "Drafts", value: status?.pendingOutreachCount ?? 0 },
      { label: "This week", value: status?.outreachDraftsThisWeek ?? 0 },
      { label: "/ week cap", value: status?.outreachEmailsPerWeek ?? 0 },
    ],
  };

  return (
    <div className="w-full min-h-full space-y-5">
      {/* Orchestrator */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
              <Bot className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Agent Fleet</h2>
              <p className="text-sm text-gray-500">
                {status?.autopilotEnabled
                  ? "Autopilot coordinates all agents"
                  : "Manual mode — run agents on demand"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={toggleAutopilot}>
              {status?.autopilotEnabled ? "Disable" : "Enable"} Autopilot
            </Button>
            <Button size="sm" onClick={handleRun} disabled={running || status?.llmBudgetExhausted}>
              <Play className="h-4 w-4 mr-1" />
              {running ? "Running..." : "Run All Agents"}
            </Button>
          </div>
        </div>

        {message && (
          <p className="mt-4 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{message}</p>
        )}

        {running && (
          <div className="mt-4">
            <AgentLoadingFlow mode="run" />
          </div>
        )}

        {status?.lastRunMessage && (
          <p className="mt-4 text-xs text-gray-500">
            Last run: {status.lastRunStatus} — {status.lastRunMessage}
            {status.lastRunAt ? ` (${new Date(status.lastRunAt).toLocaleString()})` : ""}
          </p>
        )}
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setSelectedAgent("overview")}
          className={`text-left rounded-xl border p-4 transition-all hover:shadow-md ${
            selectedAgent === "overview"
              ? "border-gray-400 bg-gray-50 ring-2 ring-gray-300 shadow-sm"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
              <Bot className="h-4 w-4 text-gray-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">Overview</p>
              <p className="text-[11px] text-gray-500 truncate">All agents at a glance</p>
            </div>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="text-gray-500">
              <span className="font-semibold text-gray-900">{approvals.length}</span> pending
            </span>
            <span className="text-gray-500">
              <span className="font-semibold text-gray-900">{status?.scheduledCount ?? 0}</span> scheduled
            </span>
          </div>
        </button>

        {AGENTS.map((agent) => {
          const Icon = agent.icon;
          const badge = agentBadges[agent.id];
          const metrics = agentMetrics[agent.id];
          const pending =
            agent.id === "twitter"
              ? twitterApprovals.length
              : agent.id === "mail"
                ? mailApprovals.length
                : agent.id === "outreach"
                  ? outreachApprovals.length
                  : 0;

          return (
            <button
              key={agent.id}
              type="button"
              onClick={() => setSelectedAgent(agent.id)}
              className={`text-left rounded-xl border p-4 transition-all hover:shadow-md ${
                selectedAgent === agent.id
                  ? `border-gray-300 ${agent.bg} ring-2 ${agent.ring} shadow-sm`
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${agent.bg}`}>
                    <Icon className={`h-4 w-4 ${agent.accent}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{agent.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{agent.subtitle}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.tone}`}>
                  {badge.label}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {metrics.map((m) => (
                  <span key={m.label} className="text-[11px] text-gray-500">
                    <span className="font-semibold text-gray-800">{m.value}</span> {m.label}
                  </span>
                ))}
                {pending > 0 && (
                  <span className="text-[11px] font-semibold text-amber-700">{pending} awaiting approval</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail panel */}
      {selectedAgent === "overview" && (
        <OverviewPanel
          status={status}
          approvals={approvals}
          decisions={decisions}
          marketSignals={marketSignals}
          marketLoading={marketLoading}
          llmPct={llmPct}
          xPct={xPct}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {selectedAgent === "analysis" && (
        <AnalysisDetail
          decisions={decisions}
          marketSignals={marketSignals}
          marketLoading={marketLoading}
          status={status}
          llmPct={llmPct}
          xPct={xPct}
        />
      )}

      {selectedAgent === "twitter" && (
        <TwitterDetail
          status={status}
          approvals={twitterApprovals}
          runItems={lastRunItems.filter(isTwitterRunItem)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {selectedAgent === "mail" && (
        <MailDetail
          status={status}
          approvals={mailApprovals}
          runItems={lastRunItems.filter(isMailRunItem)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {selectedAgent === "outreach" && (
        <OutreachDetail
          status={status}
          approvals={outreachApprovals}
          runItems={lastRunItems.filter(isOutreachRunItem)}
          onToggle={toggleOutreach}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}

function OverviewPanel({
  status,
  approvals,
  decisions,
  marketSignals,
  marketLoading,
  llmPct,
  xPct,
  onApprove,
  onReject,
}: {
  status: AgentStatus | null;
  approvals: ApprovalItem[];
  decisions: AgentDecision[];
  marketSignals: MarketSignals | null;
  marketLoading: boolean;
  llmPct: number;
  xPct: number;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      <div className="xl:col-span-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm min-h-[360px]">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Fleet snapshot</h3>
        <p className="text-xs text-gray-500 mb-4">Each agent handles one channel — coordinated by the orchestrator above.</p>
        <MarketSignalsView signals={marketSignals} loading={marketLoading} />
      </div>
      <div className="xl:col-span-4 space-y-5">
        <BudgetCard status={status} llmPct={llmPct} xPct={xPct} />
        <DecisionsCard decisions={decisions.slice(0, 5)} />
        {approvals.length > 0 && (
          <ApprovalsCard approvals={approvals} onApprove={onApprove} onReject={onReject} title="All pending approvals" />
        )}
      </div>
    </div>
  );
}

function AnalysisDetail({
  decisions,
  marketSignals,
  marketLoading,
  status,
  llmPct,
  xPct,
}: {
  decisions: AgentDecision[];
  marketSignals: MarketSignals | null;
  marketLoading: boolean;
  status: AgentStatus | null;
  llmPct: number;
  xPct: number;
}) {
  return (
    <div className="space-y-5">
      <AgentSectionHeader
        icon={Radar}
        title="Analysis Agent"
        description="Perceives market trends, competitor signals, and past performance — then feeds the planner."
        accent="text-violet-600"
        bg="bg-violet-50"
      />
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-8 rounded-xl border border-violet-100 bg-white p-5 shadow-sm min-h-[400px]">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Market Signals</h3>
          <p className="text-xs text-gray-500 mb-4">Live intelligence from Google Trends, X analytics, and company learnings.</p>
          <MarketSignalsView signals={marketSignals} loading={marketLoading} />
        </div>
        <div className="xl:col-span-4 space-y-5">
          <BudgetCard status={status} llmPct={llmPct} xPct={xPct} />
          <DecisionsCard decisions={decisions} />
        </div>
      </div>
    </div>
  );
}

function TwitterDetail({
  status,
  approvals,
  runItems,
  onApprove,
  onReject,
}: {
  status: AgentStatus | null;
  approvals: ApprovalItem[];
  runItems: Array<Record<string, unknown>>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <AgentSectionHeader
        icon={Twitter}
        title="X / Twitter Agent"
        description="Plans topics, drafts tweets, runs guardrails, and schedules or queues posts for approval."
        accent="text-sky-600"
        bg="bg-sky-50"
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="X connected" value={status?.twitterConnected ? "Yes" : "No"} />
        <Stat label="Scheduled posts" value={status?.scheduledCount ?? 0} />
        <Stat label="Posts / week" value={status?.twitterPostsPerWeek ?? 0} />
        <Stat label="X credits left" value={status?.xCreditsRemaining ?? "—"} />
      </div>
      {runItems.length > 0 && <RunItemsCard items={runItems} channel="twitter" />}
      <ApprovalsCard
        approvals={approvals}
        onApprove={onApprove}
        onReject={onReject}
        title="Tweet approvals"
        emptyMessage="No tweets waiting for approval. Run agents to generate content."
      />
    </div>
  );
}

function MailDetail({
  status,
  approvals,
  runItems,
  onApprove,
  onReject,
}: {
  status: AgentStatus | null;
  approvals: ApprovalItem[];
  runItems: Array<Record<string, unknown>>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <AgentSectionHeader
        icon={Mail}
        title="Mail Agent"
        description="Reads inbound Gmail, classifies messages, and drafts personalized replies for your review."
        accent="text-amber-600"
        bg="bg-amber-50"
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Gmail connected" value={status?.gmailConnected ? "Yes" : "No"} />
        <Stat label="Pending drafts" value={status?.pendingEmailDraftsCount ?? 0} />
        <Stat label="Drafted this week" value={status?.emailDraftsThisWeek ?? 0} />
        <Stat label="Replies / week" value={status?.emailDraftsPerWeek ?? 0} />
      </div>
      {runItems.length > 0 && <RunItemsCard items={runItems} channel="mail" />}
      <ApprovalsCard
        approvals={approvals}
        onApprove={onApprove}
        onReject={onReject}
        title="Inbox reply approvals"
        emptyMessage="No inbox replies pending. Connect Gmail and run agents after new mail arrives."
      />
    </div>
  );
}

function OutreachDetail({
  status,
  approvals,
  runItems,
  onToggle,
  onApprove,
  onReject,
}: {
  status: AgentStatus | null;
  approvals: ApprovalItem[];
  runItems: Array<Record<string, unknown>>;
  onToggle: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AgentSectionHeader
          icon={Send}
          title="Outreach Agent"
          description="Discovers relevant organizations from your company profile and drafts cold outreach emails."
          accent="text-emerald-600"
          bg="bg-emerald-50"
        />
        <Button variant="outline" size="sm" onClick={onToggle} className="shrink-0">
          {status?.outreachEnabled ? "Disable outreach" : "Enable outreach"}
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Status" value={status?.outreachEnabled ? "Enabled" : "Disabled"} />
        <Stat label="Pending drafts" value={status?.pendingOutreachCount ?? 0} />
        <Stat label="Drafted this week" value={status?.outreachDraftsThisWeek ?? 0} />
        <Stat label="Emails / week" value={status?.outreachEmailsPerWeek ?? 0} />
      </div>
      {!status?.outreachEnabled && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
          Outreach is off — enable it above, then run agents to discover prospects and draft cold emails.
        </p>
      )}
      {runItems.length > 0 && <RunItemsCard items={runItems} channel="outreach" />}
      <ApprovalsCard
        approvals={approvals}
        onApprove={onApprove}
        onReject={onReject}
        title="Outreach approvals"
        emptyMessage="No outreach emails pending. Enable outreach and run agents to draft prospect emails."
      />
    </div>
  );
}

function AgentSectionHeader({
  icon: Icon,
  title,
  description,
  accent,
  bg,
}: {
  icon: typeof Bot;
  title: string;
  description: string;
  accent: string;
  bg: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
        <Icon className={`h-5 w-5 ${accent}`} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function BudgetCard({
  status,
  llmPct,
  xPct,
}: {
  status: AgentStatus | null;
  llmPct: number;
  xPct: number;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">Weekly Budget</h3>
      </div>
      <div className="space-y-4">
        <BudgetBar
          label="LLM spend"
          used={status?.llmSpendUsdThisWeek ?? 0}
          total={status?.llmBudgetUsdPerWeek ?? 5}
          unit="$"
          pct={llmPct}
          exhausted={status?.llmBudgetExhausted}
        />
        <BudgetBar
          label="X API credits"
          used={status?.xCreditsUsedThisWeek ?? 0}
          total={status?.xApiBudgetCreditsPerWeek ?? 100}
          unit=""
          pct={xPct}
          exhausted={status?.xBudgetExhausted}
        />
      </div>
    </div>
  );
}

function DecisionsCard({ decisions }: { decisions: AgentDecision[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="h-4 w-4 text-violet-600" />
        <h3 className="text-sm font-semibold text-gray-900">Planner Decisions</h3>
      </div>
      {decisions.length === 0 ? (
        <p className="text-xs text-gray-500">No decisions logged yet. Run agents to see planner reasoning.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {decisions.map((d, i) => (
            <div key={`${d.runId}-${d.step}-${i}`} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-violet-700">{d.step}</span>
                {d.confidence != null && (
                  <span className="text-[10px] text-gray-500 tabular-nums">
                    {(d.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-700 mt-1 line-clamp-2">{d.answer || d.reasoning}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RunItemsCard({
  items,
  channel,
}: {
  items: Array<Record<string, unknown>>;
  channel: "twitter" | "mail" | "outreach";
}) {
  const Icon = channel === "mail" ? Mail : channel === "outreach" ? Send : LineChart;
  const iconClass =
    channel === "mail" ? "text-amber-600" : channel === "outreach" ? "text-emerald-600" : "text-sky-600";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-4 w-4 ${iconClass}`} />
        <h3 className="text-sm font-semibold text-gray-900">Last run results</h3>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-xs border border-gray-100 rounded-lg px-3 py-2 gap-2">
            <span className="text-gray-800 font-medium truncate">
              {String(item.topic || item.subject || item.from || "—")}
            </span>
            <OutcomeBadge outcome={String(item.outcome)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ApprovalsCard({
  approvals,
  onApprove,
  onReject,
  title,
  emptyMessage = "Nothing pending.",
}: {
  approvals: ApprovalItem[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  title: string;
  emptyMessage?: string;
}) {
  if (approvals.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-xs text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="space-y-3">
        {approvals.map((a) => (
          <ApprovalRow key={a.approvalId} approval={a} onApprove={onApprove} onReject={onReject} />
        ))}
      </div>
    </div>
  );
}

function ApprovalRow({
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
        ? "Outreach email"
        : "Tweet / content";

  const sendOnApprove = a.stepName === "email_reply" || a.stepName === "outreach_send";

  return (
    <div className="rounded-lg border border-amber-100 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">{kind}</p>
      {a.stepName === "outreach_send" ? (
        <p className="text-xs text-gray-500 mb-2">
          To: {a.outreachToEmail} · {a.outreachSubject}
        </p>
      ) : a.stepName === "email_reply" ? (
        <p className="text-xs text-gray-500 mb-2">Message: {a.gmailMessageId?.slice(0, 12)}...</p>
      ) : (
        <p className="text-xs text-gray-500 mb-2">Content: {a.contentId?.slice(0, 8)}...</p>
      )}
      <p className="text-sm text-gray-800 mb-2">{a.requestReason}</p>
      {a.draftBody && (
        <p className="text-xs text-gray-600 bg-gray-50 rounded-md p-2 mb-3 line-clamp-4 whitespace-pre-wrap">
          {a.draftBody}
        </p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onApprove(a.approvalId)}>
          {sendOnApprove ? "Approve & Send" : "Approve"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => onReject(a.approvalId)}>
          Reject
        </Button>
      </div>
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const cls =
    outcome === "scheduled"
      ? "bg-emerald-100 text-emerald-700"
      : outcome === "pending_approval"
        ? "bg-amber-100 text-amber-700"
        : outcome === "skipped"
          ? "bg-gray-100 text-gray-500"
          : "bg-gray-100 text-gray-600";

  return (
    <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${cls}`}>
      {outcome}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <p className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function BudgetBar({
  label,
  used,
  total,
  unit,
  pct,
  exhausted,
}: {
  label: string;
  used: number;
  total: number;
  unit: string;
  pct: number;
  exhausted?: boolean;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={`tabular-nums ${exhausted ? "text-red-600 font-semibold" : "text-gray-500"}`}>
          {unit === "$" ? `$${used.toFixed(2)} / $${total.toFixed(2)}` : `${used} / ${total}`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${exhausted ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-violet-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
