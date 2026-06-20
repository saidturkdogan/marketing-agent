import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { getDashboard, getStrategy, listCompanies, getCompany, updateCompany, updateAssetStatus, publishPipelinePostToLinkedIn, publishScheduleItem } from "../api";
import type { DashboardData, Company, CompetitorDetail, CalendarItem } from "../types";
import { ChatView } from "../components/ChatView";
import { CreateCompanyModal } from "../components/CreateCompanyModal";
import BrandVoiceSliders from "../components/BrandVoiceSliders";
import CompetitorEditor from "../components/CompetitorEditor";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import {
  Sparkles, BarChart3, Target, Calendar, UserPlus, Settings, Zap, Globe, FileText,
  Linkedin, Mail, Check, ArrowRight, X, Search, ChevronDown, ChevronRight,
  Lightbulb, Star, Layers, TrendingUp, Users, MessageSquare, LogOut, LayoutDashboard,
  ThumbsUp, Plus, Building2, Moon, Sun, Monitor, Palette, RefreshCw,
} from "lucide-react";

type View = "overview" | "content" | "approval" | "settings";

const NAV_ITEMS: { id: View; label: string; icon: typeof BarChart3; badge?: string }[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "content", label: "İçerikler", icon: FileText },
  { id: "approval", label: "Onay Havuzu", icon: ThumbsUp },
  { id: "settings", label: "Ayarlar", icon: Settings },
];

const THEMES = [
  { id: "theme-black", label: "Black", icon: Moon },
  { id: "theme-space-gray", label: "Space Gray", icon: Monitor },
  { id: "theme-gray", label: "Gray", icon: Palette },
  { id: "theme-light-gray", label: "Light Gray", icon: Sun },
] as const;

const THEME_STORAGE_KEY = "plinth-theme";

export function DashboardPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);

  const [view, setView] = useState<View>("overview");
  const [selectedContent, setSelectedContent] = useState<Record<string, unknown> | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [strategyData, setStrategyData] = useState<any>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem(THEME_STORAGE_KEY) || "theme-black";
  });
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const themePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) setSwitcherOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (themePickerRef.current && !themePickerRef.current.contains(e.target as Node)) setThemePickerOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    document.documentElement.className = currentTheme;
    localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    if (token || isSignedIn) {
      listCompanies().then(setCompanies).catch(() => {});
    }
  }, [token, isSignedIn]);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true); setError("");
    try {
      const [dash, comp] = await Promise.all([
        getDashboard(companyId),
        getCompany(companyId).catch(() => null),
      ]);
      setDashboardData(dash);
      setCompany(comp);
      if (dash.strategyId) {
        getStrategy(dash.strategyId).then(setStrategyData).catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!token && !isSignedIn) { navigate("/login", { replace: true }); return; }
    if (!companyId) {
      listCompanies().then((cs) => {
        if (cs.length > 0) navigate(`/dashboard/${cs[0].companyId}`, { replace: true });
        else navigate("/onboarding", { replace: true });
      }).catch(() => navigate("/onboarding", { replace: true }));
      return;
    }
    loadData();
  }, [token, isSignedIn, navigate, loadData, companyId]);

  if (!token && !isSignedIn) return null;

  const score = dashboardData?.marketingScore ?? 0;

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-background font-sans">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  const calendar = (dashboardData?.calendar || {}) as Record<string, unknown>;
  const strategy = (dashboardData?.strategy || {}) as Record<string, unknown>;
  const pipelineAssets = (dashboardData?.pipelineAssets || {}) as Record<string, unknown>;
  const pillars = Array.isArray(strategy?.strategic_pillars) ? strategy.strategic_pillars as Array<Record<string, unknown>> : [];
  const weekThemes = Array.isArray(calendar?.week_themes) ? calendar.week_themes as Array<Record<string, unknown>> : [];
  const calendarDays = Array.isArray(calendar?.days) ? calendar.days as Array<Record<string, unknown>> : [];
  const calendarWeeks = Array.isArray(calendar?.weeks) ? calendar.weeks as Array<Record<string, unknown>> : [];

  const linkedinPosts = (pipelineAssets?.linkedinPosts || {}) as Record<string, unknown>;
  const posts = Array.isArray(linkedinPosts?.posts) ? linkedinPosts.posts as Array<Record<string, unknown>> : [];
  const newsletter = (pipelineAssets?.newsletter || {}) as Record<string, unknown>;
  const publishingSchedule = (pipelineAssets?.publishingSchedule || {}) as Record<string, unknown>;
  const schedule = Array.isArray(publishingSchedule?.schedule) ? publishingSchedule.schedule as Array<Record<string, unknown>> : [];

  const weekDays = calendarDays.length > 0
    ? calendarDays.slice(0, 7)
    : calendarWeeks.length > 0
      ? (Array.isArray((calendarWeeks[0] as Record<string, unknown>)?.days)
          ? (calendarWeeks[0].days as Array<Record<string, unknown>>).slice(0, 7)
          : [])
      : [];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-sans">
      {/* Sidebar */}
      <div className="w-[200px] flex flex-col bg-sidebar border-r border-sidebar-border flex-shrink-0">
        <div className="p-4 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sidebar-foreground text-sm">Plinth</span>
          </div>

          <div className="relative mb-4 px-2" ref={switcherRef}>
            <button onClick={() => setSwitcherOpen(!switcherOpen)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-sidebar-accent/50">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-600/20 text-[9px] font-bold text-blue-400">
                {companies.find(c => c.companyId === companyId)?.name?.charAt(0) ?? "?"}
              </div>
              <span className="flex-1 truncate text-left font-medium text-sidebar-foreground">
                {companies.find(c => c.companyId === companyId)?.name ?? "Brand"}
              </span>
              <ChevronDown className={`h-3 w-3 text-sidebar-foreground/40 transition-transform ${switcherOpen ? "rotate-180" : ""}`} />
            </button>
            {switcherOpen && (
              <div className="absolute left-2 right-2 top-full z-40 mt-1 rounded-lg border border-sidebar-border bg-sidebar-accent shadow-xl">
                <div className="max-h-48 overflow-y-auto px-1 py-1">
                  {companies.map((c) => (
                    <button key={c.companyId} onClick={() => { setSwitcherOpen(false); navigate(`/dashboard/${c.companyId}`, { replace: true }); }}
                      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                        c.companyId === companyId ? "bg-blue-600/10 text-blue-400" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"}`}>
                      <span className="flex-1 truncate text-left">{c.name}</span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-sidebar-border p-1">
                  <button onClick={() => { setSwitcherOpen(false); setShowCreateModal(true); }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent/50">
                    <Plus className="h-3 w-3 text-blue-400" /> New brand
                  </button>
                </div>
              </div>
            )}
          </div>

          <nav className="space-y-1 flex-1">
            {NAV_ITEMS.map((item) => (
              <Button key={item.id} variant={view === item.id ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 h-9 text-xs font-medium ${view === item.id ? "" : "text-sidebar-foreground hover:text-sidebar-accent-foreground"}`}
                onClick={() => setView(item.id)}>
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Button>
            ))}
          </nav>

          <div className="border-t border-sidebar-border pt-2 space-y-1">
            <div className="relative" ref={themePickerRef}>
              <button onClick={() => setThemePickerOpen(!themePickerOpen)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[11px] text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors">
                {(() => { const t = THEMES.find(t => t.id === currentTheme); const Icon = t?.icon ?? Moon; return <Icon className="h-3.5 w-3.5" />; })()}
                <span className="flex-1 text-left">{THEMES.find(t => t.id === currentTheme)?.label ?? "Theme"}</span>
              </button>
            </div>
            <button onClick={() => { useAuthStore.getState().clearAuth(); navigate("/login", { replace: true }); }}
              className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-[11px] text-sidebar-foreground/50 hover:text-red-400 transition-colors">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {view === "overview" && (
            <OverviewView
              companyId={companyId}
              company={company}
              dashboardData={dashboardData}
              strategy={strategy}
              calendar={{ days: calendarDays, weeks: calendarWeeks, weekThemes }}
              weekDays={weekDays}
              assets={{ posts, newsletter, schedule }}
              pillars={pillars}
              strategyId={dashboardData?.strategyId}
              onNewPipeline={() => navigate(`/pipeline/${companyId}`)}
              onSelectContent={(item) => { setSelectedContent(item); setView("content"); }}
            />
          )}
          {view === "content" && (
            <ContentView
              posts={posts}
              newsletter={newsletter}
              schedule={schedule}
              selectedItem={selectedContent}
              onSelectItem={setSelectedContent}
            />
          )}
          {view === "approval" && (
            <ApprovalPoolView posts={posts} newsletter={newsletter} strategyId={dashboardData?.strategyId} />
          )}
          {view === "settings" && companyId && <SettingsView companyId={companyId} />}
        </div>
      </div>

      {showCreateModal && (
        <CreateCompanyModal onClose={() => setShowCreateModal(false)}
          onCreated={async (id) => {
            setShowCreateModal(false);
            const updated = await listCompanies();
            setCompanies(updated);
            navigate(`/dashboard/${id}`, { replace: true });
          }} />
      )}
    </div>
  );
}

function OverviewView({
  companyId, company, dashboardData, strategy, calendar, weekDays, assets, pillars, strategyId, onNewPipeline, onSelectContent,
}: {
  companyId?: string; company: Company | null; dashboardData: DashboardData | null;
  strategy: Record<string, unknown>; calendar: { days: Record<string, unknown>[]; weeks: Record<string, unknown>[]; weekThemes: Record<string, unknown>[] };
  weekDays: Record<string, unknown>[]; assets: { posts: Record<string, unknown>[]; newsletter: Record<string, unknown>; schedule: Record<string, unknown>[] };
  pillars: Record<string, unknown>[]; strategyId?: string; onNewPipeline: () => void; onSelectContent?: (item: Record<string, unknown>) => void;
}) {
  const info = {
    name: company?.name || "",
    industry: company?.industry || strategy?.executive_summary ? "Analyzed" : "",
    website: company?.websiteUrl || "",
    goal: dashboardData?.strategyId ? "Active" : "",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Company Info Bar */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{info.name}</span>
        {info.industry && <><Separator orientation="vertical" className="h-4" /><span>{info.industry}</span></>}
        {info.website && <><Separator orientation="vertical" className="h-4" /><span className="truncate max-w-[200px]">{info.website}</span></>}
      </div>

      {/* Calendar View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-3 space-y-4">
          <CalendarGrid weekDays={weekDays} calendar={calendar} assets={assets} strategyId={strategyId} onSelectItem={onSelectContent} />
        </div>

        {/* Right: Strategy Summary */}
        <div className="space-y-6">
          {/* Strategic Pillars */}
          {pillars.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="h-4 w-4 text-violet-400" />
                  <h3 className="text-sm font-semibold text-foreground">Stratejik Pillar'lar</h3>
                </div>
                <div className="space-y-2">
                  {pillars.map((p, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="h-3 w-3 text-violet-400" />
                        <p className="text-xs font-semibold text-foreground">{typeof p.name === "string" ? p.name : ""}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{typeof p.description === "string" ? p.description : ""}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weekly Themes */}
          {calendar.weekThemes.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-foreground">Haftalık Temalar</h3>
                </div>
                <div className="space-y-2">
                  {calendar.weekThemes.map((wt, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-600/10 text-emerald-400 text-[9px] font-bold">
                        W{typeof wt.week === "number" ? wt.week : i + 1}
                      </div>
                      <span className="text-foreground font-medium">{typeof wt.theme === "string" ? wt.theme : ""}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Hızlı Aksiyonlar</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start h-9 text-xs gap-2" onClick={onNewPipeline}>
                  <RefreshCw className="h-3 w-3" /> Yeni Pipeline Başlat
                </Button>
                <Button variant="outline" className="w-full justify-start h-9 text-xs gap-2" asChild>
                  <a href={`/pipeline/${companyId}`}><ArrowRight className="h-3 w-3" /> Pipeline'a Devam Et</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ContentView({ posts, newsletter, schedule, selectedItem, onSelectItem }: {
  posts: Record<string, unknown>[];
  newsletter: Record<string, unknown>;
  schedule: Record<string, unknown>[];
  selectedItem: Record<string, unknown> | null;
  onSelectItem: (item: Record<string, unknown> | null) => void;
}) {
  const allItems = [
    ...posts.map((p, i) => ({
      ...p,
      _id: `post-${i}`,
      _type: "LinkedIn Post" as const,
      _icon: Linkedin,
      _iconColor: "text-blue-400",
    })),
    ...(newsletter?.subject ? [{
      ...newsletter,
      _id: "newsletter",
      _type: "Newsletter" as const,
      _icon: Mail,
      _iconColor: "text-amber-400",
    }] : []),
  ] as Record<string, unknown>[];

  if (allItems.length === 0) return (
    <div className="text-center py-16">
      <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
      <p className="text-sm text-muted-foreground">Henüz içerik oluşturulmamış</p>
      <p className="text-xs text-muted-foreground/60 mt-1">Pipeline'dan asset oluşturunca burada görünecek</p>
    </div>
  );

  const detailItem = selectedItem
    ? allItems.find((i) => i._id === selectedItem._id)
    : null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex gap-6">
        {/* Sol: İçerik Listesi */}
        <div className="w-72 flex-shrink-0 space-y-2">
          <h2 className="text-sm font-bold text-foreground mb-3">İçerikler</h2>
          {allItems.map((item) => {
            const Icon = item._icon as typeof FileText;
            const isSelected = detailItem?._id === item._id;
            return (
              <button key={item._id as string}
                onClick={() => onSelectItem(isSelected ? null : item)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  isSelected ? "bg-muted/60 border-primary/30" : "bg-muted/20 border-transparent hover:bg-muted/40"
                }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-3.5 w-3.5 ${item._iconColor as string}`} />
                  <span className="text-xs font-semibold text-foreground">{item._type as string}</span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2">
                  {typeof item.title === "string" ? item.title : typeof item.subject === "string" ? item.subject : "İçerik"}
                </p>
              </button>
            );
          })}
        </div>

        {/* Sağ: Detay */}
        <div className="flex-1">
          {detailItem ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = detailItem._icon as typeof FileText;
                  return <Icon className={`h-5 w-5 ${detailItem._iconColor as string}`} />;
                })()}
                <h3 className="text-lg font-bold text-foreground">
                  {typeof detailItem.title === "string" ? detailItem.title : typeof detailItem.subject === "string" ? detailItem.subject : "İçerik Detayı"}
                </h3>
              </div>

              {/* Media */}
              {typeof detailItem.imageUrl === "string" && detailItem.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-muted">
                  <img src={detailItem.imageUrl} alt="Content visual"
                    className="w-full h-48 object-cover" />
                </div>
              )}
              {typeof detailItem.videoUrl === "string" && detailItem.videoUrl && (
                <div className="rounded-xl overflow-hidden border border-muted">
                  <video src={detailItem.videoUrl} controls className="w-full h-48 object-cover" />
                </div>
              )}

              {/* Body */}
              <Card>
                <CardContent className="p-4">
                  {typeof detailItem.body === "string" ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap">{detailItem.body}</p>
                  ) : typeof detailItem.intro === "string" ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap">{detailItem.intro}</p>
                  ) : null}
                </CardContent>
              </Card>

              {/* Hashtags */}
              {Array.isArray(detailItem.hashtags) && (detailItem.hashtags as string[]).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(detailItem.hashtags as string[]).map((tag, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-400 border border-blue-500/20">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Newsletter sections */}
              {Array.isArray(detailItem.sections) && (detailItem.sections as Record<string, unknown>[]).length > 0 && (
                <div className="space-y-3">
                  {(detailItem.sections as Record<string, unknown>[]).map((sec, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <h4 className="text-sm font-semibold text-foreground mb-1">
                          {typeof sec.heading === "string" ? sec.heading : ""}
                        </h4>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {typeof sec.body === "string" ? sec.body : ""}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* CTA */}
              {typeof detailItem.cta === "string" && detailItem.cta && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-primary">{detailItem.cta}</p>
                  </CardContent>
                </Card>
              )}

              {/* Publishing schedule items for this content */}
              {schedule.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Yayın Takvimi</h4>
                    <div className="space-y-1">
                      {schedule.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{typeof s.day === "string" ? s.day : ""}</span>
                          <Badge variant="outline" className="text-[9px] h-4">{typeof s.platform === "string" ? s.platform : ""}</Badge>
                          <span className="flex-1 truncate">{typeof s.time === "string" ? s.time : ""}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Detayını görmek için soldan bir içerik seçin</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApprovalPoolView({ posts, newsletter, strategyId }: {
  posts: Record<string, unknown>[]; newsletter: Record<string, unknown>; strategyId?: string;
}) {
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<string | null>(null);
  const [publishResults, setPublishResults] = useState<Record<string, { status: string; url?: string; message?: string }>>({});

  const getPostStatus = (p: Record<string, unknown>, i: number) =>
    statuses[`post-${i}`] || (typeof p.approvalStatus === "string" ? p.approvalStatus : "pending");

  const getNlStatus = () =>
    statuses["newsletter"] || (typeof newsletter.approvalStatus === "string" ? newsletter.approvalStatus : "pending");

  async function handleAction(itemId: string, type: string, index: number | null, status: "approved" | "rejected") {
    if (!strategyId || updating) return;
    setUpdating(itemId);
    try {
      await updateAssetStatus(strategyId, type, index, status);
      setStatuses((prev) => ({ ...prev, [itemId]: status }));
    } catch { /* ignore */ }
    finally { setUpdating(null); }
  }

  async function handlePublish(itemId: string, index: number) {
    if (!strategyId || updating) return;
    setUpdating(itemId);
    try {
      const res = await publishPipelinePostToLinkedIn(strategyId, index);
      setPublishResults((prev) => ({ ...prev, [itemId]: res }));
    } catch { /* ignore */ }
    finally { setUpdating(null); }
  }

  const borderColor = (itemStatus: string) => {
    if (itemStatus === "approved") return "border-l-emerald-500";
    if (itemStatus === "rejected") return "border-l-red-500";
    return "border-l-amber-500";
  };

  const allItems = [
    ...posts.map((p, i) => ({
      id: `post-${i}`, type: "post" as const, index: i,
      title: typeof p.title === "string" ? p.title : `Post ${i + 1}`,
      body: typeof p.body === "string" ? p.body : "",
      platform: "LinkedIn",
      approvalStatus: getPostStatus(p, i),
    })),
    ...(newsletter?.subject
      ? [{
          id: "newsletter", type: "newsletter" as const, index: null as number | null,
          title: typeof newsletter.subject === "string" ? newsletter.subject : "Newsletter",
          body: typeof newsletter.intro === "string" ? newsletter.intro : "",
          platform: "Email",
          approvalStatus: getNlStatus(),
        }]
      : []),
  ];

  if (allItems.length === 0) return (
    <div className="text-center py-16">
      <ThumbsUp className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
      <p className="text-sm text-muted-foreground">Henüz onay bekleyen içerik yok</p>
      <p className="text-xs text-muted-foreground/60 mt-1">Pipeline'dan asset oluşturunca burada görünecek</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h2 className="text-lg font-bold text-foreground">Onay Havuzu</h2>
      {allItems.map((item) => {
        const isUpdating = updating === item.id;
        const itemStatus = item.approvalStatus;
        return (
        <Card key={item.id} className={`border-l-4 ${borderColor(itemStatus)}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-[10px]">{item.platform}</Badge>
              {item.type === "post" && <Linkedin className="h-3 w-3 text-blue-400" />}
              {item.type === "newsletter" && <Mail className="h-3 w-3 text-amber-400" />}
              {itemStatus === "approved" && <Badge className="text-[10px] bg-emerald-600/20 text-emerald-400 border-emerald-500/30 ml-auto">Onaylandı</Badge>}
              {itemStatus === "rejected" && <Badge className="text-[10px] bg-red-600/20 text-red-400 border-red-500/30 ml-auto">Reddedildi</Badge>}
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">{item.title}</p>
            <p className="text-xs text-muted-foreground mb-3 line-clamp-3">{item.body}</p>
            {itemStatus === "pending" && (
            <div className="flex gap-2">
              <Button size="sm" className="h-8 text-xs" disabled={isUpdating} onClick={() => handleAction(item.id, item.type, item.index, "approved")}>
                <Check className="h-3 w-3 mr-1" /> {isUpdating ? "..." : "Onayla"}
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled={isUpdating} onClick={() => handleAction(item.id, item.type, item.index, "rejected")}>
                <X className="h-3 w-3 mr-1" /> {isUpdating ? "..." : "Reddet"}
              </Button>
            </div>
            )}
            {itemStatus === "approved" && item.type === "post" && (
              <div>
                {!publishResults[item.id] ? (
                  <Button size="sm" variant="default" className="h-8 text-xs" disabled={isUpdating}
                    onClick={() => handlePublish(item.id, item.index!)}>
                    <Linkedin className="h-3 w-3 mr-1" /> {isUpdating ? "Yayınlanıyor..." : "LinkedIn'de Yayınla"}
                  </Button>
                ) : (
                  <div className="space-y-1">
                    {publishResults[item.id].status === "published" ? (
                      <div className="flex items-center gap-2 text-[11px] text-emerald-400">
                        <Check className="h-3 w-3" /> Yayında
                        {publishResults[item.id].url && (
                          <a href={publishResults[item.id].url} target="_blank" rel="noopener noreferrer"
                            className="underline text-blue-400 hover:text-blue-300">Görüntüle</a>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-red-400">
                        {publishResults[item.id].message || "Yayınlama başarısız"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
}

function CalendarGrid({ weekDays, calendar, assets, strategyId, onSelectItem }: {
  weekDays: Record<string, unknown>[];
  calendar: { days: Record<string, unknown>[]; weeks: Record<string, unknown>[]; weekThemes: Record<string, unknown>[] };
  assets: { posts: Record<string, unknown>[]; newsletter: Record<string, unknown>; schedule: Record<string, unknown>[] };
  strategyId?: string; onSelectItem?: (item: Record<string, unknown>) => void;
}) {
  const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  const itemsByDay: Record<number, Record<string, unknown>[]> = {};
  weekDays.forEach((d) => {
    const dayNum = typeof d.day === "number" ? d.day : 0;
    if (!itemsByDay[dayNum]) itemsByDay[dayNum] = [];
    itemsByDay[dayNum].push(d);
  });

  const hasContent = Object.keys(itemsByDay).length > 0;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">İçerik Takvimi</h3>
          </div>
          {hasContent && <Badge variant="outline" className="text-[10px]">{weekDays.length} içerik</Badge>}
        </div>

        {calendar.weekThemes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {calendar.weekThemes.map((wt, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600/10 text-emerald-400 border border-emerald-500/20">
                W{typeof wt.week === "number" ? wt.week : i + 1}: {typeof wt.theme === "string" ? wt.theme : ""}
              </span>
            ))}
          </div>
        )}

        {hasContent ? (
          <div className="grid grid-cols-7 gap-1.5">
            {dayNames.map((name) => (
              <div key={name} className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide py-1">
                {name}
              </div>
            ))}
            {(() => {
              const maxDay = Math.max(...Object.keys(itemsByDay).map(Number), 28);
              const startPad = 0; // simplified: day 1 = Monday
              const cells: React.ReactNode[] = [];
              for (let i = 0; i < startPad; i++) {
                cells.push(<div key={`pad-start-${i}`} className="min-h-[80px] rounded-lg bg-muted/10" />);
              }
              for (let day = 1; day <= maxDay; day++) {
                const dayItems = itemsByDay[day] || [];
                cells.push(
                  <div key={day} className={`min-h-[80px] rounded-lg p-1.5 border ${dayItems.length > 0 ? "bg-muted/40 border-primary/20" : "bg-muted/10 border-transparent"}`}>
                    <span className={`text-[9px] font-bold ${dayItems.length > 0 ? "text-primary" : "text-muted-foreground/40"}`}>{day}</span>
                    <div className="space-y-0.5 mt-1">
                      {dayItems.slice(0, 2).map((item, idx) => (
                        <div key={idx} className="text-[7px] px-1 py-0.5 rounded truncate bg-blue-600/20 text-blue-300 border border-blue-500/20 leading-tight cursor-pointer hover:bg-blue-600/40"
                          onClick={() => onSelectItem?.(item)}>
                          {typeof item.content_title === "string" ? item.content_title : typeof item.title === "string" ? item.title : "Content"}
                        </div>
                      ))}
                      {dayItems.length > 2 && (
                        <span className="text-[7px] text-muted-foreground">+{dayItems.length - 2} daha</span>
                      )}
                    </div>
                  </div>
                );
              }
              return cells;
            })()}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Henüz takvim oluşturulmamış</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScheduleCard({ schedule, strategyId }: { schedule: Record<string, unknown>[]; strategyId?: string }) {
  const [published, setPublished] = useState<Record<number, boolean>>({});
  const [pubStatus, setPubStatus] = useState<Record<number, string>>({});
  const [publishing, setPublishing] = useState<number | null>(null);

  async function handlePublish(index: number) {
    if (!strategyId || publishing !== null) return;
    setPublishing(index);
    try {
      const res = await publishScheduleItem(strategyId, index);
      setPublished((prev) => ({ ...prev, [index]: true }));
      setPubStatus((prev) => ({ ...prev, [index]: res.status }));
    } catch { /* ignore */ }
    finally { setPublishing(null); }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-foreground">Yayın Takvimi</h3>
        </div>
        <div className="space-y-1.5">
          {schedule.map((s, i) => {
            const isPublishing = publishing === i;
            const done = published[i];
            const status = pubStatus[i];
            return (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
              <span className="text-[10px] font-semibold text-foreground w-14">{typeof s.day === "string" ? s.day : ""}</span>
              <Badge variant="outline" className="text-[9px] h-5">{typeof s.platform === "string" ? s.platform : ""}</Badge>
              <span className="text-[10px] text-muted-foreground flex-1 truncate">{typeof s.content === "string" ? s.content : ""}</span>
              <span className="text-[9px] text-muted-foreground/60">{typeof s.time === "string" ? s.time : ""}</span>
              {done ? (
                <span className={`text-[9px] ${status === "published" ? "text-emerald-400" : "text-red-400"}`}>
                  {status === "published" ? "Yayında" : "Hata"}
                </span>
              ) : (
                <Button size="sm" variant="ghost" className="h-6 text-[9px] gap-1"
                  disabled={isPublishing || !strategyId}
                  onClick={() => handlePublish(i)}>
                  {isPublishing ? "..." : "Yayınla"}
                </Button>
              )}
            </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsView({ companyId }: { companyId: string }) {
  const [company, setCompany] = useState<any>(null);
  const [competitors, setCompetitors] = useState<CompetitorDetail[]>([]);
  const [brandVoice, setBrandVoice] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCompany(companyId).then((c) => {
      setCompany(c);
      setCompetitors(c.competitorsDetail || []);
      setBrandVoice(c.brandVoiceScale || {});
    }).catch(() => {}).finally(() => setLoading(false));
  }, [companyId]);

  if (loading) return <div className="flex items-center justify-center h-32"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-lg font-bold text-foreground">Ayarlar</h2>
      <Card><CardContent className="p-5 space-y-4">
        <div><label className="text-sm font-medium text-foreground mb-1 block">Product Name</label>
          <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" defaultValue={company?.productName || ""} id="productName" /></div>
        <div><label className="text-sm font-medium text-foreground mb-1 block">Core Value Proposition</label>
          <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" defaultValue={company?.coreValueProp || ""} id="coreValueProp" /></div>
      </CardContent></Card>
      <Card><CardContent className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Brand Voice</h3>
        <BrandVoiceSliders value={brandVoice as any} onChange={(v) => setBrandVoice(v as any)} />
      </CardContent></Card>
      <Card><CardContent className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Competitor Intelligence</h3>
        <CompetitorEditor value={competitors} onChange={setCompetitors} />
      </CardContent></Card>
      <Button onClick={async () => {
        try {
          const payload: any = { competitorsDetail: competitors };
          ["productName", "coreValueProp", "websiteUrl", "logoUrl"].forEach(f => {
            const el = document.getElementById(f) as HTMLInputElement;
            if (el?.value) payload[f] = el.value;
          });
          await updateCompany(companyId!, payload);
        } catch {}
      }}>Save Settings</Button>
    </div>
  );
}
