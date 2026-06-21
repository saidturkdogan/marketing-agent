import { Bot, Play, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  approveContent,
  getAgentStatus,
  listApprovals,
  rejectContent,
  runAgent,
  updateAgentConfig,
} from "../api";
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
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([
        getAgentStatus(companyId),
        listApprovals(companyId).catch(() => []),
      ]);
      setStatus(s);
      setApprovals(Array.isArray(a) ? a : []);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
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
      <div className="flex items-center justify-center py-16 text-sm text-gray-500">
        Loading agent status...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={toggleAutopilot}>
              {status?.autopilotEnabled ? "Disable" : "Enable"} Autopilot
            </Button>
            <Button size="sm" onClick={handleRun} disabled={running}>
              <Play className="h-4 w-4 mr-1" />
              {running ? "Running..." : "Run Now"}
            </Button>
          </div>
        </div>

        {message && (
          <p className="mt-4 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{message}</p>
        )}

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Scheduled" value={status?.scheduledCount ?? 0} />
          <Stat label="Pending approval" value={status?.pendingApprovalsCount ?? 0} />
          <Stat label="Tweets/week" value={status?.twitterPostsPerWeek ?? 0} />
          <Stat label="Twitter" value={status?.twitterConnected ? "Connected" : "Off"} />
        </div>

        {status?.lastRunMessage && (
          <p className="mt-4 text-xs text-gray-500">
            Last run: {status.lastRunStatus} — {status.lastRunMessage}
            {status.lastRunAt ? ` (${new Date(status.lastRunAt).toLocaleString()})` : ""}
          </p>
        )}
      </div>

      {approvals.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6">
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
