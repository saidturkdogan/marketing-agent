import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { getDashboard, getStrategy, generateBrief, listCompanies } from "../api";
import type { DashboardData, StrategyData, CalendarWeek, CalendarDay, CalendarItem, ContentBrief, WebsiteAnalysis, CompetitorAnalysis, CompetitorDetail, KeywordDiscovery, ContentGaps, Strategy, DetailedOpportunity, LandscapeMatrix, BrandVoiceScale, Company } from "../types";
import BrandVoiceSliders from "../components/BrandVoiceSliders";
import CompetitorEditor from "../components/CompetitorEditor";
import { ChatView } from "../components/ChatView";
import { getCompany, updateCompany } from "../api";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Separator } from "../components/ui/separator";
import {
  Sparkles, BarChart3, Target, Calendar, UserPlus, Settings, Zap, Globe, FileText,
  Linkedin, Twitter, Mail, BookOpen, TrendingUp, ArrowRight, X, Search, Check,
  ChevronRight, Lightbulb, Shield, Star, Layers, AlertTriangle, Clock, Users,
  MessageSquare, LogOut, Copy, LayoutDashboard, ThumbsUp, Database, Key, DollarSign,
  PanelRightClose, PanelRightOpen, Terminal, RefreshCw, Edit3, Eye,
} from "lucide-react";

type View = "overview" | "approval" | "knowledge" | "integrations" | "cost" | "chat" | "settings";

const NAV_ITEMS: { id: View; label: string; icon: typeof BarChart3; badge?: string }[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "approval", label: "Onay Havuzu", icon: ThumbsUp, badge: "3" },
  { id: "knowledge", label: "Bilgi Deposu", icon: Database },
  { id: "integrations", label: "Entegrasyonlar", icon: Key },
  { id: "cost", label: "Maliyet / Bütçe", icon: DollarSign },
  { id: "chat", label: "AI Sohbet", icon: MessageSquare },
  { id: "settings", label: "Ayarlar", icon: Settings },
];

const APPROVAL_ITEMS = [
  {
    id: "1", title: "LinkedIn: Haftalık Sektör Raporu",
    status: "pending" as const, platform: "LinkedIn",
    content: "Bu hafta sektörümüzde öne çıkan üç trend: 1) Yapay zeka destekli pazarlama stratejileri %40 daha fazla dönüşüm sağlıyor. 2) Video içerikler organik erişimde metin bazlı içerikleri 2x geçti. 3) Mikro-influencer işbirlikleri ROI'de makro-influencerları geride bıraktı.",
    reasoning: "Hedef kitleniz LinkedIn'de aktif C-level yöneticiler. Sektör raporları paylaşmak güvenilirlik inşa eder. Geçen haftaki benzer bir gönderi %12 etkileşim oranı aldı.",
    author: "AI Agent v2.1", time: "2 dk önce",
  },
  {
    id: "2", title: "X (Twitter): Ürün Lansmanı Duyurusu",
    status: "pending" as const, platform: "X",
    content: "Yeni özelliğimiz API entegrasyonu ile pazarlama ekipleri kampanyalarını 10 dakikada başlatabiliyor. Bekleyen 500+ kullanıcımız için erken erişim linki: plinth.ai/early 🚀",
    reasoning: "Ürün lansmanı öncesi heyecan yaratmak için 'bekleyen kullanıcı' ve '10 dakika' gibi somut rakamlar kullanıldı. Erken erişim linki aciliyet hissi yaratır.",
    author: "AI Agent v2.1", time: "15 dk önce",
  },
  {
    id: "3", title: "Instagram: Haftalık Hikaye",
    status: "pending" as const, platform: "Instagram",
    content: "Ekibimizle haftalık planning session'dan bir kare! Bu hafta 3 yeni müşteri içeriği stratejisini finalize ettik. Sizce hangi sektör? 👀 #behindthescenes",
    reasoning: "Instagram hikayelerinde 'perde arkası' içerikleri takipçilerde aidiyet hissi yaratır. Haftalık düzenli paylaşım algoritma görünürlüğünü artırır.",
    author: "AI Agent v2.1", time: "32 dk önce",
  },
];

const LIVE_ACTIVITY_LOG = [
  { icon: "search", text: "Perplexity API ile rakip analizleri taranıyor...", time: "şimdi" },
  { icon: "edit", text: "X (Twitter) için 3 farklı kanca (hook) alternatifi oluşturuluyor...", time: "2 sn önce" },
  { icon: "check", text: "LinkedIn gönderisi onaylandı — sıraya eklendi.", time: "12 sn önce" },
  { icon: "search", text: "Hedef kitle segmentasyonu güncelleniyor (B2B SaaS, 25-45 yaş)...", time: "30 sn önce" },
];

export function DashboardPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);

  const [view, setView] = useState<View>("overview");
  const [rightPanel, setRightPanel] = useState(false);
  const [rightPanelContent, setRightPanelContent] = useState<React.ReactNode>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [strategyData, setStrategyData] = useState<StrategyData | null>(null);
  const [strategyId, setStrategyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [terminalOpen, setTerminalOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<string>("idle");
  const [agentStatusText, setAgentStatusText] = useState("Agent dinleniyor — yeni bir görev bekleniyor.");

  const [expandedWeek, setExpandedWeek] = useState<number | null>(0);
  const [briefingItem, setBriefingItem] = useState<CalendarItem | null>(null);
  const [brief, setBrief] = useState<ContentBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState("");

  const loadDashboard = useCallback(async () => {
    if (!companyId) return;
    setLoading(true); setError("");
    try {
      const data = await getDashboard(companyId);
      setDashboardData(data);
      if (data.strategyId) setStrategyId(data.strategyId);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to load dashboard"); }
    finally { setLoading(false); }
  }, [companyId]);

  const loadStrategy = useCallback(async () => {
    if (!strategyId) return;
    try { const data = await getStrategy(strategyId); setStrategyData(data); }
    catch { setStrategyData(null); }
  }, [strategyId]);

  useEffect(() => {
    if (!token && !isSignedIn) { navigate("/login", { replace: true }); return; }
    if (!companyId) {
      listCompanies().then((cs) => {
        if (cs.length > 0) navigate(`/dashboard/${cs[0].companyId}`, { replace: true });
        else navigate("/onboarding", { replace: true });
      }).catch(() => navigate("/onboarding", { replace: true }));
      return;
    }
    loadDashboard();
  }, [token, isSignedIn, navigate, loadDashboard, companyId]);

  useEffect(() => {
    if (view === "knowledge" && !strategyData && strategyId) loadStrategy();
  }, [view, strategyData, strategyId, loadStrategy]);

  const openRightPanel = (content: React.ReactNode) => {
    setRightPanelContent(content);
    setRightPanel(true);
  };

  const closeRightPanel = () => {
    setRightPanel(false);
    setTimeout(() => setRightPanelContent(null), 300);
  };

  if (!token && !isSignedIn) return null;
  if (loading) return (
    <div className="flex h-screen w-screen items-center justify-center bg-background font-sans">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  const score = dashboardData?.marketingScore ?? 0;
  const circumference = 2 * Math.PI * 54;
  const scoreOffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-sans">
      {/* Sidebar */}
      <div className="w-[240px] flex flex-col bg-sidebar border-r border-sidebar-border flex-shrink-0">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-6 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sidebar-foreground text-sm">Plinth</span>
          </div>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.id}
                variant={view === item.id ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 h-9 text-xs font-medium ${view === item.id ? "" : "text-sidebar-foreground hover:text-sidebar-accent-foreground"}`}
                onClick={() => setView(item.id)}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-semibold px-1.5">
                    {item.badge}
                  </span>
                )}
              </Button>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-4 border-t border-sidebar-border">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-3 text-sidebar-foreground/60 hover:text-sidebar-foreground h-9 text-xs"
            onClick={() => { useAuthStore.getState().clearAuth(); navigate("/login", { replace: true }); }}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* KPI Bar */}
        <div className="flex-shrink-0 px-6 pt-4 pb-3">
          <div className="grid grid-cols-4 gap-3">
            <KpiCard label="CTR (Tıklama)" value="4.8%" change="+12%" positive icon={BarChart3} />
            <KpiCard label="Dönüşüm (CR)" value="2.3%" change="+8%" positive icon={TrendingUp} />
            <KpiCard label="Harcanan Token" value="$147.20" change="-$23.40" positive={false} icon={DollarSign} />
            <KpiCard label="Başarı Skoru" value={`${score}`} change={`${score >= 50 ? "+" : ""}${score - 40}%`} positive={score >= 50} icon={Target} />
          </div>
        </div>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {view === "overview" && <OverviewView dashboardData={dashboardData} />}
          {view === "approval" && (
            <ApprovalPoolView
              items={APPROVAL_ITEMS}
              selectedId={selectedApproval}
              onSelect={setSelectedApproval}
            />
          )}
          {view === "knowledge" && <KnowledgeView strategyData={strategyData} dashboardData={dashboardData} error={error} />}
          {view === "integrations" && <IntegrationsView />}
          {view === "cost" && <CostView />}
          {view === "chat" && companyId && <ChatView companyId={companyId} conversationId={null} />}
          {view === "settings" && <SettingsView companyId={companyId} />}
        </div>

        {/* Agent Status Bar */}
        <div className="flex-shrink-0 border-t border-border px-6 py-2 bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${agentStatus === "working" ? "bg-blue-500 animate-pulse" : "bg-muted-foreground/40"}`} />
              <span>{agentStatusText}</span>
            </div>
            <button onClick={() => setTerminalOpen(!terminalOpen)} className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Terminal className="h-3 w-3" />
              {terminalOpen ? "Gizle" : "Terminal Logları"}
            </button>
          </div>
          {terminalOpen && (
            <div className="mt-2 mb-1 rounded-lg bg-black/80 p-3 font-mono text-[11px] leading-relaxed max-h-32 overflow-y-auto">
              {LIVE_ACTIVITY_LOG.map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-green-400/80">
                  <span className="text-blue-400/60">{">{i + 1}"}</span>
                  <span className="flex-1">{log.text}</span>
                  <span className="text-muted-foreground/40 flex-shrink-0">{log.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Slide-Over Panel */}
      {rightPanel && (
        <div className="w-[420px] border-l border-border bg-card overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Detay</h3>
              <Button variant="ghost" size="icon" onClick={closeRightPanel}><X className="h-4 w-4" /></Button>
            </div>
            {rightPanelContent}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ KPI Card ============ */
function KpiCard({ label, value, change, positive, icon: Icon }: {
  label: string; value: string; change: string; positive: boolean; icon: typeof BarChart3;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${positive ? "bg-emerald-600/10" : "bg-red-600/10"} flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${positive ? "text-emerald-400" : "text-red-400"}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-foreground">{value}</span>
            <span className={`text-xs font-medium ${positive ? "text-emerald-400" : "text-red-400"}`}>
              {change}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============ Overview View ============ */
function OverviewView({ dashboardData }: { dashboardData: DashboardData | null }) {
  const [agentStatus] = useState("working");
  const statusSteps = [
    { label: "Rakip analizi", icon: Search, done: true },
    { label: "İçerik üretimi", icon: Edit3, done: true },
    { label: "Kalite kontrol", icon: Eye, active: true },
    { label: "Yayınlama", icon: Globe, active: false },
  ];

  return (
    <div className="space-y-6">
      {/* Canlı Akış */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className={`h-4 w-4 text-blue-400 ${agentStatus === "working" ? "animate-spin" : ""}`} />
            <h3 className="text-sm font-semibold text-foreground">Canlı Akış</h3>
            <span className="text-[10px] text-blue-400 font-mono ml-auto">CANLI</span>
          </div>
          <div className="flex items-center gap-4 mb-4">
            {statusSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold
                  ${step.done ? "bg-emerald-600/20 text-emerald-400" : step.active ? "bg-blue-600/20 text-blue-400 animate-pulse" : "bg-muted text-muted-foreground/40"}`}>
                  {step.done ? <Check className="h-3 w-3" /> : <step.icon className="h-3 w-3" />}
                </div>
                <span className={`text-xs ${step.done ? "text-emerald-400" : step.active ? "text-blue-400" : "text-muted-foreground/40"}`}>
                  {step.label}
                </span>
                {i < statusSteps.length - 1 && <Separator className="w-6 bg-border" />}
              </div>
            ))}
          </div>
          <div className="space-y-1">
            {LIVE_ACTIVITY_LOG.slice(0, 3).map((log, i) => (
              <div key={i} className="text-xs text-muted-foreground flex items-start gap-2 font-mono">
                <span className="text-blue-400/60">◆</span>
                <span>{log.text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Onay Bekleyen İçerikler */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Onay Bekleyen İçerikler</h3>
          <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10">{APPROVAL_ITEMS.length} adet</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {APPROVAL_ITEMS.map((item) => (
            <Card key={item.id} className="border-l-4 border-l-amber-500 hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px] h-5">{item.platform}</Badge>
                  <span className="text-[10px] text-muted-foreground">{item.time}</span>
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-2 line-clamp-2">{item.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{item.content}</p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="default" className="h-7 text-xs"><Check className="h-3 w-3 mr-1" />Onayla</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs"><X className="h-3 w-3 mr-1" />Reddet</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Agent Başarı Skoru */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Başarı Skoru Trendi</h3>
            <span className="text-xs text-muted-foreground">Son 7 gün</span>
          </div>
          <div className="flex items-end gap-1 h-24">
            {[35, 42, 38, 55, 62, 58, 70].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-blue-500/40 to-violet-500/40 hover:from-blue-500/60 hover:to-violet-500/60 transition-all cursor-pointer"
                  style={{ height: `${val}%` }}
                />
                <span className="text-[9px] text-muted-foreground/60">{["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"][i]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============ Approval Pool View ============ */
function ApprovalPoolView({ items, selectedId, onSelect }: {
  items: typeof APPROVAL_ITEMS; selectedId: string | null; onSelect: (id: string | null) => void;
}) {
  const [revisingId, setRevisingId] = useState<string | null>(null);
  const [reviseText, setReviseText] = useState("");

  const selected = items.find(i => i.id === selectedId);

  return (
    <div className="flex gap-6 h-full">
      {/* Left: List */}
      <div className="w-[380px] flex-shrink-0 space-y-3">
        <h2 className="text-lg font-bold text-foreground">Onay Havuzu</h2>
        {items.map((item) => (
          <Card
            key={item.id}
            className={`border-l-4 ${item.status === "pending" ? "border-l-amber-500" : item.status === "approved" ? "border-l-emerald-500" : "border-l-red-500"} cursor-pointer transition-colors ${selectedId === item.id ? "ring-1 ring-primary" : "hover:border-primary/30"}`}
            onClick={() => onSelect(item.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] h-5">{item.platform}</Badge>
                <span className="text-[10px] text-muted-foreground">{item.time}</span>
              </div>
              <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Right: Split-Screen Detail */}
      {selected && (
        <Card className="flex-1">
          <CardContent className="p-5">
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* Left: Content */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">İçerik</h4>
                <div className="rounded-lg bg-muted/50 p-4 text-sm text-foreground/80 leading-relaxed">
                  {selected.content}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700">
                    <Check className="h-3 w-3 mr-1" /> Onayla
                  </Button>
                  <Button size="sm" variant="destructive" className="h-8 text-xs">
                    <X className="h-3 w-3 mr-1" /> Reddet
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setRevisingId(revisingId === selected.id ? null : selected.id)}>
                    <Edit3 className="h-3 w-3 mr-1" /> Revize Et
                  </Button>
                </div>
                {revisingId === selected.id && (
                  <div className="space-y-2">
                    <textarea
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm font-mono"
                      placeholder='Örn: "Marka sesini biraz daha sertleştir"'
                      value={reviseText}
                      onChange={(e) => setReviseText(e.target.value)}
                    />
                    <Button size="sm" className="h-7 text-xs" disabled={!reviseText.trim()}>
                      <RefreshCw className="h-3 w-3 mr-1" /> Agent'a Gönder
                    </Button>
                  </div>
                )}
              </div>
              {/* Right: Reasoning */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-violet-400">AI Gerekçesi</h4>
                <div className="rounded-lg bg-violet-600/5 border border-violet-600/10 p-4 text-sm text-foreground/70 leading-relaxed">
                  {selected.reasoning}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  <p>Yazar: {selected.author}</p>
                  <p>Oluşturulma: {selected.time}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ============ Knowledge View ============ */
function KnowledgeView({ strategyData, dashboardData, error }: {
  strategyData: StrategyData | null; dashboardData: DashboardData | null; error: string;
}) {
  const strategy = strategyData?.strategy as Strategy | undefined;
  const website = strategyData?.websiteAnalysis as WebsiteAnalysis | undefined;
  const competitors = strategyData?.competitorAnalysis as CompetitorAnalysis | undefined;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Agent Bilgi Deposu (RAG)</h2>
      <p className="text-sm text-muted-foreground">Agent'ın kararlarını verirken kullandığı bilgi kaynakları.</p>

      {strategy?.executive_summary && (
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3"><Lightbulb className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold text-foreground">Strateji Özeti</h3></div>
          <p className="text-sm text-foreground/80">{strategy.executive_summary}</p>
        </CardContent></Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {website && Object.keys(website).length > 0 && (
          <Card><CardHeader><CardTitle className="text-sm"><Globe className="h-4 w-4 inline mr-2 text-primary" />Website Analizi</CardTitle></CardHeader>
          <CardContent><pre className="text-xs text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto">{JSON.stringify(website, null, 2)}</pre></CardContent></Card>
        )}
        {competitors && Object.keys(competitors).length > 0 && (
          <Card><CardHeader><CardTitle className="text-sm"><Users className="h-4 w-4 inline mr-2 text-violet-400" />Rakip Analizi</CardTitle></CardHeader>
          <CardContent><pre className="text-xs text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto">{JSON.stringify(competitors, null, 2)}</pre></CardContent></Card>
        )}
      </div>

      {dashboardData?.opportunities?.length > 0 && (
        <Card><CardHeader><CardTitle className="text-sm"><Zap className="h-4 w-4 inline mr-2 text-amber-400" />Fırsatlar</CardTitle></CardHeader>
        <CardContent><div className="space-y-2">{dashboardData.opportunities.map((opp, i) => (
          <div key={i} className="p-3 rounded-lg bg-muted"><p className="text-sm font-medium text-foreground">{opp.title}</p><p className="text-xs text-muted-foreground mt-1">{opp.description}</p></div>
        ))}</div></CardContent></Card>
      )}
    </div>
  );
}

/* ============ Integrations View ============ */
function IntegrationsView() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Entegrasyonlar</h2>
      <p className="text-sm text-muted-foreground">API anahtarlarını ve bağlantılarını yönet.</p>

      {[
        { name: "LinkedIn", key: "••••••••", status: "connected", icon: Linkedin },
        { name: "X (Twitter)", key: "••••••••", status: "connected", icon: Twitter },
        { name: "Instagram", key: "", status: "disconnected", icon: Globe },
        { name: "Perplexity API", key: "••••••••", status: "connected", icon: Search },
        { name: "OpenAI / LLM", key: "••••••••", status: "connected", icon: Sparkles },
      ].map((integration, i) => (
        <Card key={i} className="hover:border-primary/30 transition-colors">
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${integration.status === "connected" ? "bg-emerald-600/10" : "bg-muted"} flex-shrink-0`}>
              <integration.icon className={`h-5 w-5 ${integration.status === "connected" ? "text-emerald-400" : "text-muted-foreground/40"}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{integration.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{integration.key || "Bağlı değil"}</p>
            </div>
            <Badge variant={integration.status === "connected" ? "default" : "outline"} className={integration.status === "connected" ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30" : ""}>
              {integration.status === "connected" ? "Bağlı" : "Bağlan"}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ============ Cost View ============ */
function CostView() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Maliyet / Bütçe Kontrolü</h2>
      <p className="text-sm text-muted-foreground">Agent operasyon maliyetleri ve token tüketimi.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-5 text-center">
          <p className="text-xs text-muted-foreground mb-1">Toplam Harcama</p>
          <p className="text-2xl font-bold text-foreground">$147.20</p>
          <p className="text-xs text-emerald-400 mt-1">Bu hafta</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-xs text-muted-foreground mb-1">Token Tüketimi</p>
          <p className="text-2xl font-bold text-foreground">2.4M</p>
          <p className="text-xs text-muted-foreground mt-1">Toplam token</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 text-center">
          <p className="text-xs text-muted-foreground mb-1">Ort. Maliyet/Görev</p>
          <p className="text-2xl font-bold text-foreground">$0.08</p>
          <p className="text-xs text-emerald-400 mt-1">Verimli</p>
        </CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="text-sm">Harcama Dağılımı</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[
            { label: "LLM API", cost: 89.40, pct: 61, color: "bg-blue-500" },
            { label: "Perplexity API", cost: 32.80, pct: 22, color: "bg-violet-500" },
            { label: "Embedding", cost: 18.00, pct: 12, color: "bg-cyan-500" },
            { label: "Diğer", cost: 7.00, pct: 5, color: "bg-muted-foreground" },
          ].map((item, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-xs"><span className="text-foreground/80">{item.label}</span><span className="text-foreground font-mono">${item.cost.toFixed(2)}</span></div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </CardContent></Card>
    </div>
  );
}

function SettingsView({ companyId }: { companyId?: string }) {
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [competitors, setCompetitors] = useState<CompetitorDetail[]>([]);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    getCompany(companyId).then((c) => {
      setCompany(c);
      setCompetitors(c.competitorsDetail || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [companyId]);

  if (loading) return <div className="flex items-center justify-center h-32"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-lg font-bold text-foreground">Ayarlar</h2>
      <Card><CardHeader><CardTitle className="text-sm">Ürün Bilgisi</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div><label className="text-sm font-medium text-foreground mb-1 block">Product Name</label><input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" defaultValue={company?.productName || ""} id="productName" /></div>
        <div><label className="text-sm font-medium text-foreground mb-1 block">Core Value Proposition</label><textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" defaultValue={company?.coreValueProp || ""} id="coreValueProp" /></div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm">Brand Voice</CardTitle></CardHeader>
      <CardContent><BrandVoiceSliders initialVoice={company?.brandVoiceScale} /></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm">Banned Words</CardTitle></CardHeader>
      <CardContent><div className="flex flex-wrap gap-2 mb-3" id="bannedTags" /><div className="flex gap-2"><input className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" placeholder="Type a word" id="bannedInput" /><Button size="sm">Add</Button></div></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm">Competitor Intelligence</CardTitle></CardHeader>
      <CardContent><CompetitorEditor value={competitors} onChange={setCompetitors} /></CardContent></Card>
      <Button onClick={async () => {
        try {
          const payload: any = { competitorsDetail: competitors };
          ["productName", "coreValueProp", "websiteUrl", "logoUrl"].forEach(f => { const el = document.getElementById(f) as HTMLInputElement; if (el?.value) payload[f] = el.value; });
          await updateCompany(companyId!, payload);
          const updated = await getCompany(companyId!);
          setCompany(updated);
        } catch {}
      }}>Save Settings</Button>
    </div>
  );
}
