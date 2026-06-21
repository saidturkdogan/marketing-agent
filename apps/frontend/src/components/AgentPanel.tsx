import { Bot, Brain, LineChart, Play, RefreshCw, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
} from "../api";
import { AgentLoadingFlow } from "./AgentLoadingFlow";
import { MarketSignalsView, type MarketSignals } from "./MarketSignalsView";
import { Button } from "./ui/button";

type AgentStatus = {
  companyId: string;
  autopilotEnabled: boolean;
  twitterPostsPerWeek: number;
  emailDraftsPerWeek: number;
  lastRunAt?: string;
  lastRunStatus?: string;
  lastRunMessage?: string;
  scheduledCount: number;
  pendingApprovalsCount: number;
  twitterConnected: boolean;
  gmailConnected: boolean;
  calendarConnected: boolean;
  llmBudgetUsdPerWeek?: number;
  llmSpendUsdThisWeek?: number;
  llmRemainingUsd?: number;
  xApiBudgetCreditsPerWeek?: number;
  xCreditsUsedThisWeek?: number;
  xCreditsRemaining?: number;
  llmBudgetExhausted?: boolean;
  xBudgetExhausted?: boolean;
};

type Approval = {
  approvalId: string;
  contentId?: string;
  requestReason?: string;
  status: string;
};

type Props = {
  companyId: string;
};

export function AgentPanel({ companyId }: Props) {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [decisions, setDecisions] = useState<AgentDecision[]>([]);
  const [marketSignals, setMarketSignals] = useState<MarketSignals | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastRunItems, setLastRunItems] = useState<Array<Record<string, unknown>>>([]);

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

  const toggleAutopilot = async () => {
    if (!status) return;
    try {
      await updateAgentConfig(companyId, { autopilotEnabled: !status.autopilotEnabled });
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update config");
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setMessage(null);
    try {
      const result = await runAgent(companyId);
      setMessage(result.message || "Agent run completed");
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
        <div className="rounded-xl border border-gray-200 bg-white p-5 h-36" />
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-8 rounded-xl border border-gray-200 bg-white h-96" />
          <div className="xl:col-span-4 rounded-xl border border-gray-200 bg-white h-96" />
        </div>
      </div>
    );
  }

  const llmPct = status?.llmBudgetUsdPerWeek
    ? Math.min(100, ((status.llmSpendUsdThisWeek ?? 0) / status.llmBudgetUsdPerWeek) * 100)
    : 0;
  const xPct = status?.xApiBudgetCreditsPerWeek
    ? Math.min(100, ((status.xCreditsUsedThisWeek ?? 0) / status.xApiBudgetCreditsPerWeek) * 100)
    : 0;

  return (
    <div className="w-full min-h-full space-y-5">
      {/* Header — full width */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
              <Bot className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Marketing Agent</h2>
              <p className="text-sm text-gray-500">
                {status?.autopilotEnabled ? "Autopilot active" : "Autopilot off — manual mode"}
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
              {running ? "Running..." : "Run Now"}
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

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <Stat label="Scheduled" value={status?.scheduledCount ?? 0} />
          <Stat label="Pending approval" value={status?.pendingApprovalsCount ?? 0} />
          <Stat label="Tweets/week" value={status?.twitterPostsPerWeek ?? 0} />
          <Stat label="Twitter" value={status?.twitterConnected ? "Connected" : "Off"} />
          <Stat label="Gmail" value={status?.gmailConnected ? "Connected" : "Off"} />
          <Stat label="Calendar" value={status?.calendarConnected ? "Connected" : "Off"} />
        </div>

        {status?.lastRunMessage && (
          <p className="mt-4 text-xs text-gray-500">
            Last run: {status.lastRunStatus} — {status.lastRunMessage}
            {status.lastRunAt ? ` (${new Date(status.lastRunAt).toLocaleString()})` : ""}
          </p>
        )}
      </div>

      {/* Main grid — market left, ops right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Market signals — wide column */}
        <div className="xl:col-span-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm min-h-[420px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Market Signals</h3>
              <p className="text-xs text-gray-500 mt-0.5">Live intelligence feeding the agent planner</p>
            </div>
          </div>
          <MarketSignalsView signals={marketSignals} loading={marketLoading} />
        </div>

        {/* Sidebar — budget, decisions, runs */}
        <div className="xl:col-span-4 space-y-5">
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

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-4 w-4 text-violet-600" />
              <h3 className="text-sm font-semibold text-gray-900">Recent Decisions</h3>
            </div>
            {decisions.length === 0 ? (
              <p className="text-xs text-gray-500">No agent decisions logged yet. Run the agent to see planner and reviewer reasoning.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {decisions.map((d, i) => (
                  <div key={`${d.runId}-${d.step}-${i}`} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-violet-700">{d.step}</span>
                      {d.confidence != null && (
                        <span className="text-[10px] text-gray-500 tabular-nums">
                          confidence {(d.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 mt-1 line-clamp-2">{d.answer || d.reasoning}</p>
                    {d.createdAt && (
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(d.createdAt).toLocaleString()}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {lastRunItems.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <LineChart className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Last Run Results</h3>
              </div>
              <div className="space-y-2">
                {lastRunItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs border border-gray-100 rounded-lg px-3 py-2">
                    <span className="text-gray-800 font-medium truncate flex-1">{String(item.topic || "—")}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      item.outcome === "scheduled" ? "bg-emerald-100 text-emerald-700"
                        : item.outcome === "pending_approval" ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {String(item.outcome)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {approvals.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Approval Inbox</h3>
              <div className="space-y-3">
                {approvals.map((a) => (
                  <div key={a.approvalId} className="rounded-lg border border-amber-100 bg-white p-4">
                    <p className="text-xs text-gray-500 mb-1">Content: {a.contentId?.slice(0, 8)}...</p>
                    <p className="text-sm text-gray-800 mb-3">{a.requestReason}</p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApprove(a.approvalId)}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(a.approvalId)}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
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
