import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { getDashboard, getStrategy } from "../api";
import type {
  DashboardData,
  StrategyData,
  WebsiteAnalysis,
  CompetitorAnalysis,
  KeywordDiscovery,
  ContentGaps,
  Strategy,
  DetailedOpportunity,
} from "../types";
import {
  Sparkles,
  ArrowRight,
  Globe,
  Target,
  Zap,
  Search,
  TrendingUp,
  Shield,
  BarChart3,
  Users,
  Check,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
  Layers,
  Star,
} from "lucide-react";

function PlinthLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="plogo" x1="0" y1="0" x2="48" y2="48">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#plogo)" />
      <path d="M16 12h7v24h-7zM23 12h11v14h-11zM28.5 15.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" fill="white" fillRule="evenodd" />
    </svg>
  );
}

function getGradeColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-blue-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function getGradeBg(score: number): string {
  if (score >= 80) return "from-emerald-600 to-emerald-400";
  if (score >= 60) return "from-blue-600 to-blue-400";
  if (score >= 40) return "from-amber-600 to-amber-400";
  return "from-red-600 to-red-400";
}

function getGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

export function AnalysisReportPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [strategyData, setStrategyData] = useState<StrategyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revealStep, setRevealStep] = useState(0);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError("");
    try {
      const dash = await getDashboard(companyId);
      setDashboardData(dash);
      if (dash.strategyId) {
        const strat = await getStrategy(dash.strategyId);
        setStrategyData(strat);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!token && !isSignedIn) {
      navigate("/login", { replace: true });
      return;
    }
    load();
  }, [token, isSignedIn, navigate, load]);

  // Progressive reveal animation
  useEffect(() => {
    if (!loading && dashboardData) {
      const timers: ReturnType<typeof setTimeout>[] = [];
      for (let i = 1; i <= 7; i++) {
        timers.push(setTimeout(() => setRevealStep(i), i * 300));
      }
      return () => timers.forEach(clearTimeout);
    }
  }, [loading, dashboardData]);

  if (!token && !isSignedIn) return null;

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#06060e]">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-700">
                <Sparkles className="h-10 w-10 text-white animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#06060e] border-2 border-blue-700">
                <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-blue-300 border-t-transparent" />
              </div>
            </div>
          </div>
          <p className="text-white text-lg font-semibold">Preparing your report...</p>
          <p className="text-neutral-500 text-sm mt-1">Analyzing results</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#06060e]">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 text-lg font-semibold mb-2">Something went wrong</p>
          <p className="text-neutral-500 text-sm mb-6">{error}</p>
          <button onClick={() => navigate("/onboarding")} className="px-6 py-3 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors">
            Back to Onboarding
          </button>
        </div>
      </div>
    );
  }

  const score = dashboardData?.marketingScore ?? 0;
  const website = strategyData?.websiteAnalysis as WebsiteAnalysis | undefined;
  const competitors = strategyData?.competitorAnalysis as CompetitorAnalysis | undefined;
  const keywords = strategyData?.keywordDiscovery as KeywordDiscovery | undefined;
  const gaps = strategyData?.contentGaps as ContentGaps | undefined;
  const strategy = strategyData?.strategy as Strategy | undefined;
  const opportunities = strategyData?.opportunities as DetailedOpportunity[] | undefined;

  const circumference = 2 * Math.PI * 54;
  const scoreOffset = circumference - (score / 100) * circumference;

  return (
    <div className="min-h-screen bg-[#06060e] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#06060e]/80 backdrop-blur-xl border-b border-[#111122]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PlinthLogo size={36} />
            <span className="text-lg font-bold text-white">Plinth</span>
          </div>
          <button
            onClick={() => navigate(`/dashboard/${companyId}`)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 text-sm font-semibold text-white hover:bg-blue-800 transition-colors"
          >
            Go to Dashboard <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className={`text-center mb-16 transition-all duration-700 ${revealStep >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600/10 border border-emerald-600/20 text-emerald-400 text-sm font-medium mb-6">
            <Check className="h-4 w-4" /> Analysis Complete
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Here's what we found.
          </h1>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            Our AI agents analyzed your website, competitors, content landscape, and keyword opportunities. Here's your marketing intelligence report.
          </p>
        </div>

        {/* Score + Stats Row */}
        <div className={`grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12 transition-all duration-700 ${revealStep >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          {/* Score Circle */}
          <div className="col-span-1 flex flex-col items-center justify-center rounded-2xl border border-[#1a1a2e] bg-[#0c0c1a] p-8">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">Marketing Score</p>
            <div className="relative">
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="54" fill="none" stroke="#1a1a2e" strokeWidth="10" />
                <circle
                  cx="70" cy="70" r="54" fill="none"
                  stroke="url(#reportScoreGradient)" strokeWidth="10"
                  strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={scoreOffset}
                  transform="rotate(-90 70 70)" className="transition-all duration-[2000ms] ease-out"
                />
                <defs>
                  <linearGradient id="reportScoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold ${getGradeColor(score)}`}>{score}</span>
                <span className="text-xs text-neutral-500 mt-0.5">/ 100</span>
              </div>
            </div>
            <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getGradeBg(score)} text-white`}>
              Grade: {getGrade(score)}
            </div>
          </div>

          {/* Stats */}
          <ReportStatCard
            icon={<Target className="h-6 w-6 text-blue-400" />}
            value={dashboardData?.contentOpportunities ?? 0}
            label="Content Opportunities"
            desc="Topics your competitors cover but you don't"
          />
          <ReportStatCard
            icon={<Zap className="h-6 w-6 text-amber-400" />}
            value={dashboardData?.competitorWeaknesses ?? 0}
            label="Competitor Weaknesses"
            desc="Areas where competitors are vulnerable"
          />
          <ReportStatCard
            icon={<Search className="h-6 w-6 text-emerald-400" />}
            value={dashboardData?.keywordsFound ?? 0}
            label="Keywords Found"
            desc="Keyword opportunities to target"
          />
        </div>

        {/* Website Snapshot */}
        {website && (
          <div className={`mb-12 transition-all duration-700 ${revealStep >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <SectionHeader icon={<Globe className="h-5 w-5 text-blue-400" />} title="Website Snapshot" />
            <div className="rounded-2xl border border-[#1a1a2e] bg-[#0c0c1a] p-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <InfoChip label="Brand" value={website.brand_name || "-"} />
                <InfoChip label="Industry" value={website.industry || "-"} />
                <InfoChip label="Model" value={website.business_model || "-"} />
                <InfoChip label="Position" value={website.market_position || "-"} />
              </div>
              {website.brand_voice && (
                <div className="mb-4">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Brand Voice</p>
                  <p className="text-sm text-neutral-300">{website.brand_voice}</p>
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {website.content_strengths && website.content_strengths.length > 0 && (
                  <div>
                    <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2 font-semibold">Strengths</p>
                    <div className="flex flex-wrap gap-2">
                      {website.content_strengths.map((s, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-lg bg-emerald-600/10 border border-emerald-600/20 text-xs text-emerald-300">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {website.content_weaknesses && website.content_weaknesses.length > 0 && (
                  <div>
                    <p className="text-xs text-red-400 uppercase tracking-wider mb-2 font-semibold">Weaknesses</p>
                    <div className="flex flex-wrap gap-2">
                      {website.content_weaknesses.map((w, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-lg bg-red-600/10 border border-red-600/20 text-xs text-red-300">{w}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {website.key_takeaways && website.key_takeaways.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#1a1a2e]">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2 font-semibold">Key Takeaways</p>
                  <ul className="space-y-1.5">
                    {website.key_takeaways.map((t, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                        <ChevronRight className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {typeof website.overall_website_score === "number" && (
                <div className="mt-4 pt-4 border-t border-[#1a1a2e] flex items-center gap-3">
                  <span className="text-xs text-neutral-500">Website Score:</span>
                  <div className="flex-1 h-2 rounded-full bg-[#1a1a2e] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-1000"
                      style={{ width: `${website.overall_website_score}%` }}
                    />
                  </div>
                  <span className={`text-sm font-bold ${getGradeColor(website.overall_website_score)}`}>
                    {website.overall_website_score}/100
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Competitor Landscape */}
        {competitors && competitors.competitors && competitors.competitors.length > 0 && (
          <div className={`mb-12 transition-all duration-700 ${revealStep >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <SectionHeader icon={<Users className="h-5 w-5 text-violet-400" />} title="Competitor Landscape" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {competitors.competitors.slice(0, 6).map((comp, i) => (
                <div key={i} className="rounded-xl border border-[#1a1a2e] bg-[#0c0c1a] p-5 hover:border-[#252545] transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600/10 flex-shrink-0">
                      <Globe className="h-4 w-4 text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{comp.name}</p>
                      <p className="text-xs text-neutral-500 truncate">{comp.url}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-emerald-400 font-semibold">{comp.strengths?.length || 0}</span>
                      <span className="text-neutral-500 ml-1">strengths</span>
                    </div>
                    <div>
                      <span className="text-red-400 font-semibold">{comp.weaknesses?.length || 0}</span>
                      <span className="text-neutral-500 ml-1">weaknesses</span>
                    </div>
                  </div>
                  {comp.seo_position && (
                    <p className="text-xs text-neutral-500 mt-2">SEO: {comp.seo_position}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Quick insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {competitors.copy_these && competitors.copy_these.length > 0 && (
                <InsightList title="Copy These" items={competitors.copy_these} color="emerald" icon={<Check className="h-4 w-4" />} />
              )}
              {competitors.do_differently && competitors.do_differently.length > 0 && (
                <InsightList title="Do Differently" items={competitors.do_differently} color="amber" icon={<Lightbulb className="h-4 w-4" />} />
              )}
              {competitors.exploit_these && competitors.exploit_these.length > 0 && (
                <InsightList title="Exploit These" items={competitors.exploit_these} color="blue" icon={<Zap className="h-4 w-4" />} />
              )}
            </div>
          </div>
        )}

        {/* Top Opportunities */}
        {opportunities && opportunities.length > 0 && (
          <div className={`mb-12 transition-all duration-700 ${revealStep >= 5 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <SectionHeader icon={<Target className="h-5 w-5 text-emerald-400" />} title="Top Opportunities" />
            <div className="space-y-3">
              {opportunities.slice(0, 5).map((opp, i) => (
                <div key={i} className="rounded-xl border border-[#1a1a2e] bg-[#0c0c1a] p-5 hover:border-[#252545] transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 flex-shrink-0">
                      <span className="text-sm font-bold text-blue-400">#{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white mb-1">{opp.title}</h3>
                      <p className="text-sm text-neutral-400 mb-3">{opp.description}</p>
                      <div className="flex flex-wrap items-center gap-3">
                        {opp.category && (
                          <span className="px-2.5 py-1 rounded-md bg-[#111122] text-xs text-neutral-400">{opp.category}</span>
                        )}
                        {typeof opp.expected_impact === "number" && (
                          <span className="text-xs text-neutral-500">
                            Impact: <span className="text-emerald-400 font-semibold">{opp.expected_impact}/10</span>
                          </span>
                        )}
                        {typeof opp.expected_effort === "number" && (
                          <span className="text-xs text-neutral-500">
                            Effort: <span className="text-amber-400 font-semibold">{opp.expected_effort}/10</span>
                          </span>
                        )}
                        {opp.timeline_to_results && (
                          <span className="text-xs text-neutral-500">Timeline: {opp.timeline_to_results}</span>
                        )}
                      </div>
                      {opp.first_step && (
                        <div className="mt-3 flex items-start gap-2 text-xs text-blue-400">
                          <ArrowRight className="h-3 w-3 flex-shrink-0 mt-0.5" />
                          <span>First step: {opp.first_step}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Keyword Highlights */}
        {keywords && (
          <div className={`mb-12 transition-all duration-700 ${revealStep >= 6 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <SectionHeader icon={<Search className="h-5 w-5 text-cyan-400" />} title="Keyword Intelligence" />
            <div className="rounded-2xl border border-[#1a1a2e] bg-[#0c0c1a] p-6">
              {/* Keyword type counts */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <KeywordStat label="Seed Keywords" count={keywords.seed_keywords?.length || 0} color="blue" />
                <KeywordStat label="Long-tail" count={keywords.long_tail_keywords?.length || 0} color="emerald" />
                <KeywordStat label="Pain-point" count={keywords.pain_point_keywords?.length || 0} color="amber" />
                <KeywordStat label="Competitor Gaps" count={keywords.competitor_keyword_gaps?.length || 0} color="violet" />
              </div>

              {/* Content clusters */}
              {keywords.content_clusters && keywords.content_clusters.length > 0 && (
                <div className="pt-4 border-t border-[#1a1a2e]">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3 font-semibold">Content Clusters</p>
                  <div className="flex flex-wrap gap-3">
                    {keywords.content_clusters.map((cluster, i) => (
                      <div key={i} className="px-4 py-2.5 rounded-xl bg-[#111122] border border-[#1a1a2e]">
                        <p className="text-sm font-semibold text-white mb-0.5">{cluster.pillar_topic}</p>
                        <p className="text-xs text-neutral-500">{cluster.cluster_keywords?.length || 0} related keywords</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Priority keywords preview */}
              {keywords.priority_matrix && keywords.priority_matrix.length > 0 && (
                <div className="pt-4 mt-4 border-t border-[#1a1a2e]">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3 font-semibold">Priority Keywords</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[#1a1a2e]">
                          <th className="text-xs text-neutral-500 font-semibold pb-2 pr-4">Keyword</th>
                          <th className="text-xs text-neutral-500 font-semibold pb-2 pr-4">Volume</th>
                          <th className="text-xs text-neutral-500 font-semibold pb-2 pr-4">Business Value</th>
                          <th className="text-xs text-neutral-500 font-semibold pb-2">Competition</th>
                        </tr>
                      </thead>
                      <tbody>
                        {keywords.priority_matrix.slice(0, 5).map((kw, i) => (
                          <tr key={i} className="border-b border-[#111122]">
                            <td className="text-sm text-neutral-200 py-2.5 pr-4 font-medium">{kw.keyword}</td>
                            <td className="text-xs text-neutral-400 py-2.5 pr-4">{kw.search_volume}</td>
                            <td className="text-xs text-emerald-400 py-2.5 pr-4">{kw.business_value}</td>
                            <td className="text-xs text-amber-400 py-2.5">{kw.competition}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Strategy Preview */}
        {strategy && (
          <div className={`mb-12 transition-all duration-700 ${revealStep >= 7 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <SectionHeader icon={<Layers className="h-5 w-5 text-indigo-400" />} title="Strategy Overview" />
            <div className="rounded-2xl border border-[#1a1a2e] bg-[#0c0c1a] p-6">
              {strategy.executive_summary && (
                <div className="mb-6">
                  <p className="text-sm text-neutral-300 leading-relaxed">{strategy.executive_summary}</p>
                </div>
              )}

              {/* Strategic Pillars */}
              {strategy.strategic_pillars && strategy.strategic_pillars.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                  {strategy.strategic_pillars.map((pillar, i) => (
                    <div key={i} className="rounded-xl border border-[#1a1a2e] bg-[#080814] p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/10">
                          <Star className="h-3.5 w-3.5 text-indigo-400" />
                        </div>
                        <p className="text-sm font-semibold text-white">{pillar.name}</p>
                      </div>
                      <p className="text-xs text-neutral-400 mb-2">{pillar.description}</p>
                      {pillar.initiatives && pillar.initiatives.length > 0 && (
                        <div className="space-y-1">
                          {pillar.initiatives.slice(0, 3).map((init, j) => (
                            <p key={j} className="text-xs text-neutral-500 flex items-start gap-1.5">
                              <ChevronRight className="h-3 w-3 flex-shrink-0 mt-0.5 text-indigo-500" />
                              {init}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Channel Strategy Preview */}
              {strategy.channel_strategy && strategy.channel_strategy.length > 0 && (
                <div className="pt-4 border-t border-[#1a1a2e]">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3 font-semibold">Channel Focus</p>
                  <div className="space-y-2">
                    {strategy.channel_strategy.map((ch, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm text-neutral-300 w-28 flex-shrink-0">{ch.channel}</span>
                        <div className="flex-1 h-2 rounded-full bg-[#1a1a2e] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-1000"
                            style={{ width: `${ch.focus_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-neutral-400 w-10 text-right">{ch.focus_percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className={`text-center pb-16 transition-all duration-700 ${revealStep >= 7 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="rounded-2xl border border-[#1a1a2e] bg-gradient-to-br from-[#0c0c1a] to-[#111122] p-10">
            <h2 className="text-2xl font-bold text-white mb-3">Ready to take action?</h2>
            <p className="text-neutral-400 mb-8 max-w-lg mx-auto">
              Explore the full strategy, browse your 30-day content calendar, and dive deep into competitor analysis on your dashboard.
            </p>
            <button
              onClick={() => navigate(`/dashboard/${companyId}`)}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-700 text-base font-semibold text-white hover:bg-blue-800 transition-colors"
            >
              Explore Full Dashboard <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111122]">{icon}</div>
      <h2 className="text-lg font-bold text-white">{title}</h2>
    </div>
  );
}

function ReportStatCard({ icon, value, label, desc }: { icon: React.ReactNode; value: number; label: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[#1a1a2e] bg-[#0c0c1a] p-6">
      <div className="mb-3">{icon}</div>
      <p className="text-3xl font-bold text-white">+{value}</p>
      <p className="text-xs text-neutral-400 mt-1 font-semibold">{label}</p>
      <p className="text-xs text-neutral-600 mt-1 text-center">{desc}</p>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-[#111122]">
      <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-neutral-200 font-medium truncate">{value}</p>
    </div>
  );
}

function InsightList({ title, items, color, icon }: { title: string; items: string[]; color: "emerald" | "amber" | "blue"; icon: React.ReactNode }) {
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

function KeywordStat({ label, count, color }: { label: string; count: number; color: "blue" | "emerald" | "amber" | "violet" }) {
  const textColors = { blue: "text-blue-400", emerald: "text-emerald-400", amber: "text-amber-400", violet: "text-violet-400" };
  const bgColors = { blue: "bg-blue-600/10", emerald: "bg-emerald-600/10", amber: "bg-amber-600/10", violet: "bg-violet-600/10" };
  return (
    <div className={`rounded-xl ${bgColors[color]} p-4 text-center`}>
      <p className={`text-2xl font-bold ${textColors[color]}`}>{count}</p>
      <p className="text-xs text-neutral-400 mt-1">{label}</p>
    </div>
  );
}
