import { ArrowDownRight, ArrowUpRight, Hash, Minus, TrendingUp, Twitter } from "lucide-react";
import type { ReactNode } from "react";
import { AgentLoadingFlow } from "./AgentLoadingFlow";

export type MarketSignals = {
  researchTopic?: string;
  hasRealConnectors?: boolean;
  strategyPillars?: string[];
  googleTrends?: {
    available?: boolean;
    currentIndex?: number;
    trendDirection?: "up" | "down" | "stable";
    interestPoints?: Array<{ date: string; value: number }>;
    relatedQueries?: string[];
  };
  twitterPerformance?: {
    connected?: boolean;
    message?: string;
    impressions?: number;
    likes?: number;
    retweets?: number;
    replies?: number;
    avgEngagement?: number;
    topTweetPreview?: string;
    topTweetImpressions?: number;
  };
  relatedKeywords?: string[];
  recentPublished?: Array<{ title?: string; body?: string; published_at?: string }>;
  learnings?: { bullets?: string[] };
};

type Props = {
  signals: MarketSignals | null;
  loading?: boolean;
};

export function MarketSignalsView({ signals, loading }: Props) {
  if (loading && !signals) {
    return (
      <div className="space-y-4">
        <AgentLoadingFlow mode="load" title="Gathering market signals" subtitle="Pulling Google Trends & X analytics" />
      </div>
    );
  }

  if (!signals) {
    return (
      <p className="text-sm text-gray-500 rounded-lg bg-gray-50 px-4 py-6 text-center">
        Market signals unavailable. Try refreshing the agent panel.
      </p>
    );
  }

  const topic = signals.researchTopic || "Your industry";
  const trends = signals.googleTrends;
  const twitter = signals.twitterPerformance;
  const keywords = [
    ...(trends?.relatedQueries ?? []),
    ...(signals.relatedKeywords ?? []),
  ].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 8);
  const pillars = signals.strategyPillars ?? [];
  const published = signals.recentPublished ?? [];
  const bullets = (signals.learnings?.bullets ?? []).map(stripMarkdown);

  return (
    <div className="space-y-4">
      {/* Topic header */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
          <TrendingUp className="h-3.5 w-3.5" />
          {topic}
        </span>
        {signals.hasRealConnectors !== undefined && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            signals.hasRealConnectors ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}>
            {signals.hasRealConnectors ? "Live data" : "Simulated"}
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Google Trends */}
        <SignalCard title="Google Trends" icon={<TrendingUp className="h-4 w-4 text-sky-600" />}>
          {trends?.available && trends.interestPoints && trends.interestPoints.length > 0 ? (
            <>
              <div className="flex items-end justify-between gap-3 mb-3">
                <div>
                  <p className="text-2xl font-semibold text-gray-900 tabular-nums">{trends.currentIndex ?? "—"}</p>
                  <p className="text-[11px] text-gray-500">Interest index</p>
                </div>
                <TrendBadge direction={trends.trendDirection} />
              </div>
              <Sparkline points={trends.interestPoints.map((p) => p.value)} />
              {keywords.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {keywords.slice(0, 5).map((q) => (
                    <span key={q} className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                      {q}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-500">Trend data not available for this topic.</p>
          )}
        </SignalCard>

        {/* X Performance */}
        <SignalCard title="X Performance" icon={<Twitter className="h-4 w-4 text-gray-700" />}>
          {twitter?.connected ? (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <Metric label="Impressions" value={twitter.impressions ?? 0} />
                <Metric label="Likes" value={twitter.likes ?? 0} />
                <Metric label="Replies" value={twitter.replies ?? 0} />
              </div>
              {twitter.topTweetPreview && (
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-[10px] font-medium text-gray-500 mb-1">Top recent post</p>
                  <p className="text-xs text-gray-700 line-clamp-2">{twitter.topTweetPreview}</p>
                  {twitter.topTweetImpressions != null && (
                    <p className="text-[10px] text-gray-400 mt-1">{twitter.topTweetImpressions} impressions</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-500">
              {twitter?.message || "Connect X to see live tweet performance."}
            </p>
          )}
        </SignalCard>
      </div>

      {/* Strategy pillars */}
      {pillars.length > 0 && (
        <SignalCard title="Strategy pillars" icon={<Hash className="h-4 w-4 text-violet-600" />}>
          <div className="flex flex-wrap gap-2">
            {pillars.map((p) => (
              <span key={p} className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-xs text-violet-800">
                {p}
              </span>
            ))}
          </div>
        </SignalCard>
      )}

      {(bullets.length > 0 || published.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {bullets.length > 0 && (
            <SignalCard title="Performance learnings" icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}>
              <ul className="space-y-2">
                {bullets.map((b, i) => (
                  <li key={i} className="flex gap-2 text-xs text-gray-700 leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </SignalCard>
          )}

          {published.length > 0 && (
            <SignalCard title="Recently published" icon={<Hash className="h-4 w-4 text-gray-500" />}>
              <div className="space-y-2">
                {published.slice(0, 3).map((post, i) => (
                  <div key={i} className="rounded-lg border border-gray-100 px-3 py-2">
                    <p className="text-xs font-medium text-gray-900">{post.title || "Untitled"}</p>
                    {post.body && <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{post.body}</p>}
                    {post.published_at && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(post.published_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </SignalCard>
          )}
        </div>
      )}
    </div>
  );
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#+\s*/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function SignalCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className="text-xs font-semibold text-gray-800 uppercase tracking-wide">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-white px-2 py-1.5 text-center border border-gray-100">
      <p className="text-sm font-semibold text-gray-900 tabular-nums">{value}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  );
}

function TrendBadge({ direction }: { direction?: "up" | "down" | "stable" }) {
  if (direction === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        <ArrowUpRight className="h-3 w-3" /> Rising
      </span>
    );
  }
  if (direction === "down") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
        <ArrowDownRight className="h-3 w-3" /> Cooling
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
      <Minus className="h-3 w-3" /> Stable
    </span>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const max = Math.max(...points, 1);
  return (
    <div className="flex items-end gap-0.5 h-10">
      {points.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-gradient-to-t from-sky-500 to-sky-300 min-w-[3px] transition-all"
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
          title={`${v}`}
        />
      ))}
    </div>
  );
}
