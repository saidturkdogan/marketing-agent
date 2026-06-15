import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { listCompanies, createCompany, createCampaign } from "../api";
import { useAuthStore } from "../stores/authStore";
import { Company, CompanyPayload, CampaignResponse } from "../types";
import { Sidebar } from "../components/Sidebar";
import { ChatView } from "../components/ChatView";
import {
  Sparkles, ArrowRight, ArrowLeft, Check, Globe, TrendingUp,
  Users, Mail, Rocket, Building2, Hash, Target, Search, Zap,
} from "lucide-react";

const GOALS = [
  { id: "sales", label: "More sales", desc: "Boost revenue & conversions", icon: TrendingUp, color: "emerald" },
  { id: "leads", label: "More leads", desc: "Generate qualified prospects", icon: Users, color: "blue" },
  { id: "social", label: "Social growth", desc: "Grow audience & engagement", icon: TrendingUp, color: "violet" },
  { id: "email", label: "Email marketing", desc: "Nurture & convert via inbox", icon: Mail, color: "amber" },
  { id: "launch", label: "Product launch", desc: "Launch a new offering", icon: Rocket, color: "rose" },
];

type Step = "goal" | "company" | "creating" | "results";

export function ChatLayout() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();
  const { conversationId } = useParams();

  const refreshCompanies = useCallback(async () => {
    try {
      const data = await listCompanies();
      setCompanies(data);
      setSelectedCompanyId((prev) => {
        if (prev && data.some((c) => c.companyId === prev)) return prev;
        return data.length > 0 ? data[0].companyId : null;
      });
    } catch { /* ignore */ }
    finally { setIsLoadingCompanies(false); }
  }, []);

  useEffect(() => { refreshCompanies(); }, [refreshCompanies]);

  function handleLogout() { clearAuth(); navigate("/login", { replace: true }); }

  // --- Onboarding ---
  const [step, setStep] = useState<Step>("goal");
  const [selectedGoal, setSelectedGoal] = useState("");
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [budget, setBudget] = useState("");
  const [competitor1, setCompetitor1] = useState("");
  const [competitor2, setCompetitor2] = useState("");
  const [competitor3, setCompetitor3] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [error, setError] = useState("");
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<CampaignResponse | null>(null);
  const [agentProgress, setAgentProgress] = useState<string[]>([]);
  const createdRef = useRef(false);

  const competitors = [competitor1, competitor2, competitor3].filter(Boolean);
  const goal = GOALS.find((g) => g.id === selectedGoal);

  const colorMap: Record<string, { bg: string; border: string; text: string; light: string }> = {
    emerald: { bg: "bg-emerald-600", border: "border-emerald-500/30", text: "text-emerald-400", light: "bg-emerald-600/10" },
    blue: { bg: "bg-blue-600", border: "border-blue-500/30", text: "text-blue-400", light: "bg-blue-600/10" },
    violet: { bg: "bg-violet-600", border: "border-violet-500/30", text: "text-violet-400", light: "bg-violet-600/10" },
    amber: { bg: "bg-amber-600", border: "border-amber-500/30", text: "text-amber-400", light: "bg-amber-600/10" },
    rose: { bg: "bg-rose-600", border: "border-rose-500/30", text: "text-rose-400", light: "bg-rose-600/10" },
  };

  async function handleLaunch() {
    if (!name.trim()) return;
    setError("");
    setStep("creating");
    createdRef.current = true;

    try {
      const payload: CompanyPayload = {
        name: name.trim(),
        websiteUrl: websiteUrl.trim() || undefined,
        industry: industry || undefined,
        description: selectedGoal ? `Goal: ${GOALS.find(g => g.id === selectedGoal)?.label} | Budget: ${budget || "not set"}` : undefined,
        targetAudience: targetAudience.trim() || undefined,
        brandVoice: undefined,
        valueProposition: undefined,
        productsOrServices: [],
        competitors: competitors.length > 0 ? competitors : undefined,
        socialLinks: undefined,
      };

      // Step 1: Create company
      setAgentProgress(["Creating brand profile..."]);
      const created = await createCompany(payload);
      setCreatedCompanyId(created.companyId);
      setAgentProgress((p) => [...p, "Brand profile created"]);

      // Step 2: Research phase
      setAgentProgress((p) => [...p, "Scanning market trends..."]);
      await sleep(600);
      setAgentProgress((p) => [...p, "Analyzing SEO keywords..."]);

      // Step 3: Run the full agent pipeline
      setAgentProgress((p) => [...p, "Building marketing strategy..."]);
      const topics: Record<string, string> = {
        sales: "Increase sales and revenue growth",
        leads: "Lead generation and prospect qualification",
        social: "Social media growth and audience engagement",
        email: "Email marketing nurture and conversion",
        launch: "New product launch campaign",
      };
      const topic = topics[selectedGoal] || "Comprehensive marketing strategy";

      const result = await createCampaign({
        companyId: created.companyId,
        topic,
        platforms: ["LinkedIn", "Twitter", "Instagram"],
        outputs: ["social"],
      });

      setAgentProgress((p) => [...p, "Generating content assets..."]);
      await sleep(400);
      setAgentProgress((p) => [...p, "Running quality review..."]);
      await sleep(300);
      setAgentProgress((p) => [...p, "Calculating performance score..."]);
      await sleep(300);

      setCampaign(result);
      setAgentProgress((p) => [...p, "Done!"]);

      await refreshCompanies();
      setSelectedCompanyId(created.companyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStep("company");
    }
  }

  function handleGoToChat() {
    navigate(`/chat`, { replace: true });
  }

  // --- Loading ---
  if (isLoadingCompanies) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
          <div className="h-5 w-5 animate-pulse rounded-full bg-blue-300/50" />
        </div>
      </div>
    );
  }

  // --- Onboarding render ---
  if (companies.length === 0 && !createdRef.current) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
        <div className="hidden lg:flex w-[420px] flex-col justify-between p-10 bg-gradient-to-br from-slate-900 to-slate-950 border-r border-slate-800/50">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600"><Sparkles className="h-5 w-5 text-white" /></div>
              <span className="text-lg font-semibold text-white">Plinth</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Autonomous marketing agent. Research, strategy, content, analytics — all in one.
            </p>
          </div>
          <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-slate-300 transition-colors text-left">Sign out</button>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-lg">
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600"><Sparkles className="h-4 w-4 text-white" /></div>
              <span className="text-base font-semibold text-white">Plinth</span>
            </div>

            {/* STEP 1: GOAL */}
            {step === "goal" && (
              <div className="animate-fadeIn">
                <h1 className="text-3xl font-bold text-white mb-2">What do you want to achieve?</h1>
                <p className="text-slate-400 mb-8">Your autonomous marketing team will handle the rest.</p>
                <div className="grid gap-3 mb-8">
                  {GOALS.map((g) => {
                    const c = colorMap[g.color];
                    const sel = selectedGoal === g.id;
                    return (
                      <button key={g.id} onClick={() => setSelectedGoal(g.id)}
                        className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${sel ? `${c.border} ${c.light}` : "border-slate-800 hover:border-slate-700 hover:bg-slate-900"}`}>
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${sel ? c.bg : "bg-slate-800"}`}>
                          <g.icon className={`h-5 w-5 ${sel ? "text-white" : "text-slate-400"}`} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${sel ? "text-white" : "text-slate-200"}`}>{g.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{g.desc}</p>
                        </div>
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 flex-shrink-0 ${sel ? "border-blue-500 bg-blue-500" : "border-slate-600"}`}>
                          {sel && <Check className="h-3.5 w-3.5 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setStep("company")} disabled={!selectedGoal}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => setStep("company")} className="w-full mt-3 text-sm text-slate-500 hover:text-slate-300 py-2">Skip</button>
              </div>
            )}

            {/* STEP 2: COMPANY INFO */}
            {step === "company" && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setStep("goal")} className="text-slate-400 hover:text-white"><ArrowLeft className="h-5 w-5" /></button>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Your business — in 30 seconds</h1>
                    <p className="text-sm text-slate-400">We'll analyze, research, and build your marketing — automatically.</p>
                  </div>
                </div>

                {goal && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colorMap[goal.color].light} border ${colorMap[goal.color].border} mb-6`}>
                    <goal.icon className={`h-4 w-4 ${colorMap[goal.color].text}`} />
                    <span className={`text-sm font-medium ${colorMap[goal.color].text}`}>Goal: {goal.label}</span>
                  </div>
                )}

                {error && (
                  <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Company name *</label>
                    <input type="text" className="auth-input" placeholder="e.g. Acme Corp" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Website URL <span className="text-slate-500 font-normal">— agent extracts your brand</span>
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input type="url" className="auth-input pl-10" placeholder="https://example.com" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Industry</label>
                    <select className="auth-input" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                      <option value="">Select...</option>
                      {["E-commerce","SaaS","Fintech","Healthcare","Education","Real Estate","Retail","Food & Beverage","Travel","Entertainment","Technology","Other"].map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Monthly budget</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                      <input type="text" className="auth-input pl-8" placeholder="e.g. 5,000" value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, ""))} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Target audience</label>
                    <input type="text" className="auth-input" placeholder="e.g. Small business owners, 25-45" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Top competitors <span className="text-slate-500 font-normal">(helps find gaps)</span></label>
                    {[
                      { val: competitor1, set: setCompetitor1, ph: "Competitor #1" },
                      { val: competitor2, set: setCompetitor2, ph: "Competitor #2" },
                      { val: competitor3, set: setCompetitor3, ph: "Competitor #3" },
                    ].map((c, i) => (
                      <div key={i} className="relative mb-2">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                        <input type="text" className="auth-input pl-10" placeholder={c.ph} value={c.val} onChange={(e) => c.set(e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={handleLaunch} disabled={!name.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 mt-8 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <Rocket className="h-4 w-4" />
                  Launch Plinth AI Agent
                </button>
              </div>
            )}

            {/* STEP 3: CREATING (agent progress) */}
            {step === "creating" && (
              <div className="animate-fadeIn">
                <div className="text-center mb-10">
                  <div className="flex justify-center mb-5">
                    <div className="relative">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600">
                        <Sparkles className="h-10 w-10 text-white animate-pulse" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 border-2 border-blue-600">
                        <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                      </div>
                    </div>
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">Building your marketing</h1>
                  <p className="text-slate-400 text-sm">
                    Research → Strategy → Content → Review — all autonomous
                  </p>
                </div>

                <div className="space-y-2 mb-8">
                  {["Researching market & competitors", "Building content strategy", "Generating platform posts", "Quality review & scoring"].map((label, i) => {
                    const done = agentProgress.length > i + 1;
                    const active = agentProgress.length === i + 1;
                    return (
                      <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${done ? "border-emerald-500/20 bg-emerald-600/5" : active ? "border-blue-500/20 bg-blue-600/5" : "border-slate-800"}`}>
                        {done ? (
                          <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                        ) : active ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent flex-shrink-0" />
                        ) : (
                          <div className="h-4 w-4 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${done ? "text-emerald-300" : active ? "text-blue-300" : "text-slate-500"}`}>
                          {label}
                        </span>
                        {done && <span className="ml-auto text-xs text-emerald-500 font-medium">Done</span>}
                        {active && <span className="ml-auto text-xs text-blue-400 font-medium">Running...</span>}
                      </div>
                    );
                  })}
                </div>

                {agentProgress.map((msg, i) => (
                  <p key={i} className="text-xs text-slate-600 text-center mb-1">{msg}</p>
                ))}
              </div>
            )}

            {/* STEP 4: RESULTS (aha moment) */}
            {step === "creating" && campaign && (
              <div className="mt-8 animate-fadeIn">
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600">
                      <Check className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">Your marketing is ready</h2>
                  <p className="text-sm text-slate-400">Here's what the AI team built for you:</p>
                </div>

                <div className="grid gap-3 mb-6">
                  {null}
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500 uppercase tracking-wide">Campaign Score</span>
                      <span className="text-lg font-bold text-emerald-400">{(campaign.performance_score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-1000"
                        style={{ width: `${Math.min(campaign.performance_score * 100, 100)}%` }} />
                    </div>
                  </div>

                  {/* Plan */}
                  {campaign.plan != null && Object.keys(campaign.plan).length > 0 && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-semibold text-white">Strategy Plan</span>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {Object.entries(campaign.plan).filter(([k]) => k !== "draft" && k !== "company" && k !== "execution_queue").slice(0, 5).map(([key, val]) => (
                          <p key={key} className="text-xs text-slate-400">
                            <span className="text-slate-500 capitalize">{key.replace(/_/g, " ")}:</span>{" "}
                            {typeof val === "string" ? val.slice(0, 80) + (val.length > 80 ? "..." : "") : JSON.stringify(val).slice(0, 80)}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Steps completed */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-semibold text-white">Agent Pipeline</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {campaign.completed_steps.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-md bg-emerald-600/10 border border-emerald-500/20 text-xs text-emerald-400 capitalize">
                          {s.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Social assets summary */}
                  {campaign.assets != null && !!((campaign.assets as Record<string, unknown>).social) && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-amber-400" />
                        <span className="text-sm font-semibold text-white">Content Generated</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.keys((campaign.assets as Record<string, unknown>).social as Record<string, unknown>).map((p) => (
                          <span key={p} className="px-2 py-0.5 rounded-md bg-amber-600/10 border border-amber-500/20 text-xs text-amber-400 capitalize">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={handleGoToChat}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                  Open dashboard <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Normal layout ---
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        onSelectCompany={setSelectedCompanyId}
        onCompanyCreated={refreshCompanies}
        onLogout={handleLogout}
      />
      <div className="flex flex-1 flex-col bg-white">
        {selectedCompanyId ? (
          <ChatView companyId={selectedCompanyId} conversationId={conversationId ?? null} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                  <Building2 className="h-8 w-8 text-blue-400" />
                </div>
              </div>
              <p className="text-slate-400 text-lg mb-2">Select a brand</p>
              <p className="text-slate-300 text-sm">Choose from the sidebar to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
