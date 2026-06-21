import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import {
  dashboardPath,
  isDashboardView,
  resolveDashboardView,
  type DashboardView,
} from "../lib/dashboardRoutes";
import {
  getDashboard,
  getStrategy,
  listCompanies,
  getCompany,
  listContents,
  updateAssetStatus,
  publishPipelinePostToLinkedIn,
  publishScheduleItem,
  getGoogleCalendarAuthUrl,
  getGoogleCalendarStatus,
  getGoogleCalendarEvents,
  syncScheduledPostsToCalendar,
  getGmailStatus,
  getTwitterStatus,
  type GoogleCalendarEvent,
} from "../api";
import type {
  DashboardData,
  Company,
  CalendarItem,
  ContentItem,
} from "../types";
import { ChatView } from "../components/ChatView";
import { PlinthLogo } from "../components/PlinthLogo";
import { CreateCompanyModal } from "../components/CreateCompanyModal";
import { MailsView } from "../components/MailsView";
import { ContentCreatorView } from "../components/ContentCreatorView";
import { AgentPanel } from "../components/AgentPanel";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
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
  Mail,
  Check,
  ArrowRight,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Star,
  Layers,
  Users,
  MessageSquare,
  LogOut,
  LayoutDashboard,
  ThumbsUp,
  Plus,
  Building2,
  Moon,
  Sun,
  Monitor,
  Palette,
  RefreshCw,
  Home,
  Phone,
  HelpCircle,
  Bell,
  Inbox,
  Bot,
  Twitter,
} from "lucide-react";

type View = DashboardView;

const NAV_ITEMS: { id: View; label: string; icon: typeof Home }[] = [
  { id: "overview", label: "Dashboard", icon: Home },
  { id: "agent", label: "Agent", icon: Bot },
  { id: "content", label: "Content", icon: FileText },
  { id: "approval", label: "Approval Pool", icon: ThumbsUp },
  { id: "mails", label: "Mails", icon: Mail },
  { id: "settings", label: "Settings", icon: Settings },
];

const THEMES = [
  { id: "theme-black", label: "Black", icon: Moon },
  { id: "theme-space-gray", label: "Space Gray", icon: Monitor },
  { id: "theme-gray", label: "Gray", icon: Palette },
  { id: "theme-light-gray", label: "Light Gray", icon: Sun },
] as const;

const THEME_STORAGE_KEY = "plinth-theme";

export function DashboardPage() {
  const { companyId, tab: tabParam } = useParams<{ companyId: string; tab?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = useAuthStore((s) => s.token);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const userName = useAuthStore((s) => s.name);
  const userEmail = useAuthStore((s) => s.email);

  const viewFromUrl = useMemo(
    () => resolveDashboardView(tabParam, searchParams.get("tab")),
    [tabParam, searchParams],
  );

  const view = viewFromUrl;

  const buildDashboardUrl = useCallback(
    (targetCompanyId: string, targetView: View) => {
      const next = new URLSearchParams(searchParams);
      next.delete("tab");
      const base = dashboardPath(targetCompanyId, targetView);
      const qs = next.toString();
      return qs ? `${base}?${qs}` : base;
    },
    [searchParams],
  );

  const handleViewChange = (newView: View) => {
    if (!companyId) return;
    navigate(buildDashboardUrl(companyId, newView), { replace: true });
  };

  useEffect(() => {
    if (companyId) {
      sessionStorage.setItem("plinth-last-dashboard", buildDashboardUrl(companyId, view));
    }
  }, [companyId, view, buildDashboardUrl]);

  useEffect(() => {
    if (!companyId) return;

    const legacyTab = searchParams.get("tab");
    if (legacyTab && isDashboardView(legacyTab)) {
      navigate(buildDashboardUrl(companyId, legacyTab), { replace: true });
      return;
    }

    if (tabParam && !isDashboardView(tabParam)) {
      navigate(buildDashboardUrl(companyId, "overview"), { replace: true });
    }
  }, [companyId, tabParam, searchParams, navigate, buildDashboardUrl]);

  const [selectedContent, setSelectedContent] = useState<Record<
    string,
    unknown
  > | null>(null as Record<string, unknown> | null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [strategyData, setStrategyData] = useState<any>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [mountedViews, setMountedViews] = useState<Set<View>>(() => new Set([viewFromUrl]));
  const [error, setError] = useState("");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem(THEME_STORAGE_KEY) || "theme-black";
  });
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const themePickerRef = useRef<HTMLDivElement>(null);

  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [googleCalendarWriteAccess, setGoogleCalendarWriteAccess] = useState(false);
  const [googleCalendarNeedsReconnect, setGoogleCalendarNeedsReconnect] = useState(false);
  const [unsyncedScheduledCount, setUnsyncedScheduledCount] = useState(0);
  const [googleCalendarEmail, setGoogleCalendarEmail] = useState("");
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [googleCalendarLoading, setGoogleCalendarLoading] = useState(false);
  const [connectingCalendar, setConnectingCalendar] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [calendarSyncMessage, setCalendarSyncMessage] = useState<string | null>(null);

  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState("");
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [twitterScreenName, setTwitterScreenName] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [allContents, setAllContents] = useState<ContentItem[]>([]);

  const NAV_KEYWORDS: { keys: string[]; view: View }[] = [
    { keys: ["dashboard", "overview", "home"], view: "overview" },
    { keys: ["agent", "autopilot", "bot"], view: "agent" },
    { keys: ["content", "posts", "tweet"], view: "content" },
    { keys: ["approval", "pool"], view: "approval" },
    { keys: ["mails", "email", "mail", "gmail", "inbox"], view: "mails" },
    { keys: ["settings", "profile", "preferences"], view: "settings" },
  ];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        switcherRef.current &&
        !switcherRef.current.contains(e.target as Node)
      )
        setSwitcherOpen(false);

      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      )
        setProfileMenuOpen(false);

      if (
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      )
        setSearchFocused(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        themePickerRef.current &&
        !themePickerRef.current.contains(e.target as Node)
      )
        setThemePickerOpen(false);
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
      listCompanies()
        .then(setCompanies)
        .catch(() => {});
    }
  }, [token, isSignedIn]);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setError("");
    try {
      const [dash, comp] = await Promise.all([
        getDashboard(companyId),
        getCompany(companyId).catch(() => null),
      ]);
      setDashboardData(dash);
      setCompany(comp);
      if (dash.strategyId) {
        getStrategy(dash.strategyId)
          .then(setStrategyData)
          .catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const loadCalendarData = useCallback(async () => {
    if (!companyId) return;
    setGoogleCalendarLoading(true);
    try {
      const status = await getGoogleCalendarStatus(companyId);
      setGoogleCalendarConnected(status.connected);
      setGoogleCalendarWriteAccess(status.writeAccess ?? false);
      setGoogleCalendarNeedsReconnect(status.needsReconnect ?? false);
      setUnsyncedScheduledCount(status.unsyncedScheduled ?? 0);
      setGoogleCalendarEmail(status.email ?? "");
      if (!status.connected) {
        setGoogleCalendarEvents([]);
        return;
      }
      if (!status.writeAccess) {
        setGoogleCalendarEvents([]);
        return;
      }
      try {
        const data = await getGoogleCalendarEvents(companyId);
        setGoogleCalendarEvents(data.events ?? []);
        if (data.email) setGoogleCalendarEmail(data.email);
      } catch {
        setGoogleCalendarEvents([]);
      }
    } catch {
      setGoogleCalendarConnected(false);
      setGoogleCalendarWriteAccess(false);
      setGoogleCalendarNeedsReconnect(false);
      setUnsyncedScheduledCount(0);
      setGoogleCalendarEvents([]);
    } finally {
      setGoogleCalendarLoading(false);
    }
  }, [companyId]);

  const handleConnectCalendar = useCallback(async () => {
    if (!companyId) return;
    setConnectingCalendar(true);
    try {
      const result = await getGoogleCalendarAuthUrl(companyId);
      if (result.url) window.location.href = result.url;
    } catch {
      setConnectingCalendar(false);
    }
  }, [companyId]);

  const handleSyncCalendar = useCallback(async () => {
    if (!companyId) return;
    setSyncingCalendar(true);
    setCalendarSyncMessage(null);
    try {
      const result = await syncScheduledPostsToCalendar(companyId);
      await loadCalendarData();
      listContents(companyId).then(setAllContents).catch(() => {});
      if (result.synced > 0) {
        setCalendarSyncMessage(`${result.synced} tweet${result.synced === 1 ? "" : "s"} added to Google Calendar — check your phone app.`);
      } else if (result.failed > 0) {
        setCalendarSyncMessage(`Sync failed for ${result.failed} item(s). Try reconnecting Google Calendar.`);
      } else {
        setCalendarSyncMessage("All scheduled tweets are already in Google Calendar.");
      }
    } catch (err) {
      setCalendarSyncMessage(err instanceof Error ? err.message : "Calendar sync failed");
    } finally {
      setSyncingCalendar(false);
    }
  }, [companyId, loadCalendarData]);

  useEffect(() => {
    if (companyId) loadCalendarData();
  }, [companyId, loadCalendarData]);

  useEffect(() => {
    if (!companyId) return;
    listContents(companyId).then(setAllContents).catch(() => {});
  }, [companyId]);

  useEffect(() => {
    if (!companyId || view !== "overview") return;
    listContents(companyId).then(setAllContents).catch(() => {});
  }, [companyId, view]);

  useEffect(() => {
    if (!companyId) return;
    getGmailStatus(companyId).then(s => { setGmailConnected(s.connected); }).catch(() => {});
    getTwitterStatus(companyId).then(s => { setTwitterConnected(s.connected); if (s.screenName) setTwitterScreenName(s.screenName); }).catch(() => {});
  }, [companyId]);

  useEffect(() => {
    const connected = searchParams.get("calendar_connected");
    if (connected === "true" && companyId) {
      loadCalendarData();
      const next = new URLSearchParams(searchParams);
      next.delete("calendar_connected");
      next.delete("email");
      next.delete("message");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, companyId, loadCalendarData, setSearchParams]);

  useEffect(() => {
    setMountedViews(new Set([view]));
  }, [companyId]);

  useEffect(() => {
    setMountedViews((prev) => {
      if (prev.has(view)) return prev;
      const next = new Set(prev);
      next.add(view);
      return next;
    });
  }, [view]);

  useEffect(() => {
    if (!token && !isSignedIn) {
      navigate("/login", { replace: true });
    }
  }, [token, isSignedIn, navigate]);

  useEffect(() => {
    if (!token && !isSignedIn) return;
    if (companyId) return;

    const stored = sessionStorage.getItem("plinth-last-dashboard");
    if (stored && /^\/dashboard\/[^/]+/.test(stored)) {
      navigate(stored, { replace: true });
      return;
    }
    const pendingView = resolveDashboardView(undefined, searchParams.get("tab"));
    listCompanies()
      .then((cs) => {
        if (cs.length > 0)
          navigate(buildDashboardUrl(cs[0].companyId, pendingView), { replace: true });
        else navigate("/onboarding", { replace: true });
      })
      .catch(() => navigate("/onboarding", { replace: true }));
  }, [token, isSignedIn, companyId, navigate, searchParams, buildDashboardUrl]);

  useEffect(() => {
    if ((!token && !isSignedIn) || !companyId) return;
    setLoading(true);
    loadData();
  }, [token, isSignedIn, companyId, loadData]);

  if (!token && !isSignedIn) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#2E2F32] font-sans">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#2E2F32] font-sans">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    );
  }

  const score = dashboardData?.marketingScore ?? 0;
  const overviewLoading = loading && !dashboardData;

  const scheduledPosts = allContents
    .filter(
      (c) =>
        c.status === "scheduled" &&
        c.scheduledAt &&
        new Date(c.scheduledAt).getTime() > Date.now() - 60_000,
    )
    .map((c) => ({
      id: c.contentId,
      title: c.title || c.body?.substring(0, 48) || "Scheduled post",
      start: c.scheduledAt as string,
      type: c.type,
      inGoogleCalendar: Boolean(c.calendarEventId),
      calendarEventId: c.calendarEventId ?? null,
    }));

  const unsyncedFromContents = scheduledPosts.filter((p) => !p.inGoogleCalendar).length;
  const calendarOnlyEvents = filterLinkedCalendarEvents(googleCalendarEvents, scheduledPosts);

  const calendar = (dashboardData?.calendar || {}) as Record<string, unknown>;
  const strategy = (dashboardData?.strategy || {}) as Record<string, unknown>;
  const pipelineAssets = (dashboardData?.pipelineAssets || {}) as Record<
    string,
    unknown
  >;
  const pillars = Array.isArray(strategy?.strategic_pillars)
    ? (strategy.strategic_pillars as Array<Record<string, unknown>>)
    : [];
  const weekThemes = Array.isArray(calendar?.week_themes)
    ? (calendar.week_themes as Array<Record<string, unknown>>)
    : [];
  const calendarDays = Array.isArray(calendar?.days)
    ? (calendar.days as Array<Record<string, unknown>>)
    : [];
  const calendarWeeks = Array.isArray(calendar?.weeks)
    ? (calendar.weeks as Array<Record<string, unknown>>)
    : [];

  const linkedinPosts = (pipelineAssets?.linkedinPosts || {}) as Record<
    string,
    unknown
  >;
  const posts = Array.isArray(linkedinPosts?.posts)
    ? (linkedinPosts.posts as Array<Record<string, unknown>>)
    : [];
  const newsletter = (pipelineAssets?.newsletter || {}) as Record<
    string,
    unknown
  >;
  const publishingSchedule = (pipelineAssets?.publishingSchedule ||
    {}) as Record<string, unknown>;
  const schedule = Array.isArray(publishingSchedule?.schedule)
    ? (publishingSchedule.schedule as Array<Record<string, unknown>>)
    : [];

  const weekDays =
    calendarDays.length > 0
      ? calendarDays.slice(0, 7)
      : calendarWeeks.length > 0
        ? Array.isArray((calendarWeeks[0] as Record<string, unknown>)?.days)
          ? (calendarWeeks[0].days as Array<Record<string, unknown>>).slice(
              0,
              7,
            )
          : []
        : [];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const formatDate = () => {
    const date = new Date();
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const contentLabel = (type: string) => {
    const map: Record<string, string> = { tweet: "Tweet", linkedin_post: "LinkedIn", blog: "Blog", newsletter: "Newsletter" };
    return map[type] || type;
  };

  const searchResults = (() => {
    if (!searchQuery.trim() || !searchFocused) return [];
    const q = searchQuery.toLowerCase();
    const results: { id: string; type: "nav" | "content"; label: string; sublabel: string; action: () => void }[] = [];

    for (const nav of NAV_KEYWORDS) {
      if (nav.keys.some(k => k.includes(q)) || q.includes(nav.keys[0])) {
        results.push({
          id: `nav-${nav.view}`,
          type: "nav",
          label: nav.view.charAt(0).toUpperCase() + nav.view.slice(1),
          sublabel: "Navigate",
          action: () => { handleViewChange(nav.view); setSearchFocused(false); setSearchQuery(""); },
        });
      }
    }

    if (companyId && allContents.length > 0) {
      const matching = allContents.filter(
        c => c.title?.toLowerCase().includes(q) || c.body?.toLowerCase().includes(q)
      ).slice(0, 5);
      for (const item of matching) {
        results.push({
          id: `content-${item.contentId}`,
          type: "content",
          label: item.title || "Untitled",
          sublabel: contentLabel(item.type),
          action: () => { setSelectedContent(item as unknown as Record<string, unknown>); handleViewChange("content"); setSearchFocused(false); setSearchQuery(""); },
        });
      }
    }

    return results;
  })();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background font-sans">
      {/* Full-width top bar — logo + search aligned with sidebar column */}
      <div className="h-14 bg-[#2E2F32] flex items-center flex-shrink-0">
        <div className="w-[72px] flex-shrink-0 flex items-center justify-center">
          <PlinthLogo size={28} />
        </div>
        <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
          <div ref={searchRef} className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Find or Ask"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setSearchFocused(false); (e.target as HTMLInputElement).blur(); }
                if (e.key === "Enter" && searchResults.length > 0) {
                  searchResults[0].action();
                }
              }}
              className="w-full h-9 pl-9 pr-4 rounded-md bg-[#3a3b3e] text-white text-sm placeholder-gray-400 border border-transparent focus:border-blue-500 focus:outline-none"
            />
            {searchFocused && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-lg bg-white shadow-xl border border-gray-200 py-1 z-50 max-h-80 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">No results found</div>
                ) : (
                  searchResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={r.action}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      {r.type === "nav" ? <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{r.label}</p>
                        <p className="text-[11px] text-gray-500">{r.sublabel}</p>
                      </div>
                      {r.type === "nav" && (
                        <span className="text-[10px] text-gray-400 font-mono">Go</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <button className="h-9 w-9 rounded-full bg-[#3a3b3e] flex items-center justify-center text-white hover:bg-[#4a4b4e] transition-colors flex-shrink-0">
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-1 pr-4 flex-shrink-0">
          <button className="h-9 px-3 rounded-md text-white text-sm font-medium hover:bg-[#3a3b3e] transition-colors flex items-center gap-2">
            <ArrowRight className="h-4 w-4 rotate-180" />
            Upgrade
          </button>
          <Separator
            orientation="vertical"
            className="h-6 bg-gray-600 mx-2"
          />
          <button className="h-9 w-9 rounded-md flex items-center justify-center text-white hover:bg-[#3a3b3e] transition-colors">
            <Phone className="h-4 w-4" />
          </button>
          <button className="h-9 w-9 rounded-md flex items-center justify-center text-white hover:bg-[#3a3b3e] transition-colors">
            <Building2 className="h-4 w-4" />
          </button>
          <button className="h-9 w-9 rounded-md flex items-center justify-center text-white hover:bg-[#3a3b3e] transition-colors">
            <HelpCircle className="h-4 w-4" />
          </button>
          <button className="h-9 w-9 rounded-md flex items-center justify-center text-white hover:bg-[#3a3b3e] transition-colors">
            <Settings className="h-4 w-4" />
          </button>
          <button className="h-9 w-9 rounded-md flex items-center justify-center text-white hover:bg-[#3a3b3e] transition-colors">
            <Bell className="h-4 w-4" />
          </button>
          <Separator
            orientation="vertical"
            className="h-6 bg-gray-600 mx-2"
          />
          <button className="h-9 px-3 rounded-md text-white text-sm font-medium hover:bg-[#3a3b3e] transition-colors flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Assistant
          </button>
          <Separator
            orientation="vertical"
            className="h-6 bg-gray-600 mx-2"
          />
          <div ref={profileMenuRef} className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="h-9 px-3 rounded-md text-white text-sm font-medium hover:bg-[#3a3b3e] transition-colors flex items-center gap-2"
            >
              <div className="h-6 w-6 rounded-full bg-blue-600/95 flex items-center justify-center text-xs text-white font-bold shadow-inner">
                {userName ? userName.charAt(0).toUpperCase() : "U"}
              </div>
              <span>{userName ?? "User"}</span>
              <ChevronDown className="h-4 w-4 text-white/70" />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-lg bg-white shadow-2xl border border-gray-200 py-1 text-gray-800 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Profile header */}
                <div className="p-4 border-b border-gray-100 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 border border-gray-200 flex items-center justify-center text-slate-600 font-bold text-lg">
                    {userName ? userName.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-gray-900 truncate">
                      {userName ?? "User"}
                    </h4>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {userEmail ?? "saidcemal10@gmail.com"}
                    </p>
                    <button
                      onClick={() => {
                        handleViewChange("settings");
                        setProfileMenuOpen(false);
                      }}
                      className="text-xs text-teal-600 hover:text-teal-700 hover:underline font-semibold mt-2 block"
                    >
                      Profile & Preferences
                    </button>
                  </div>
                </div>

                {/* Account info */}
                <div className="p-3 border-b border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2">Account</p>
                  <div className="px-2 py-1.5 mt-1 rounded flex flex-col">
                    <span className="text-xs font-bold text-gray-800">{company?.name || "Plinth Admin"}</span>
                    <span className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {companyId || "default"}</span>
                  </div>
                </div>

                {/* Help links */}
                <div className="py-1.5 border-b border-gray-100 text-xs">
                  <button
                    onClick={() => {
                      window.open("https://plinth.ai/guide", "_blank");
                      setProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-gray-700 font-medium transition-colors"
                  >
                    User Guide
                  </button>
                  <button
                    onClick={() => {
                      window.open("https://plinth.ai/pricing", "_blank");
                      setProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-gray-700 font-medium transition-colors"
                  >
                    Pricing & Features
                  </button>
                  <button
                    onClick={() => {
                      handleViewChange("settings");
                      setProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-gray-700 font-medium transition-colors"
                  >
                    Account & Billing
                  </button>
                </div>

                {/* Updates links */}
                <div className="py-1.5 border-b border-gray-100 text-xs">
                  <button
                    onClick={() => {
                      window.open("https://plinth.ai/updates", "_blank");
                      setProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-gray-700 font-medium transition-colors"
                  >
                    Product Updates
                  </button>
                  <button
                    onClick={() => {
                      window.open("https://plinth.ai/academy", "_blank");
                      setProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-gray-700 font-medium transition-colors"
                  >
                    Plinth Academy
                  </button>
                </div>

                {/* Sign out and privacy */}
                <div className="p-3 flex items-center justify-between bg-slate-50/50 rounded-b-lg">
                  <button
                    onClick={async () => {
                      if ((window as any).Clerk) {
                        try {
                          await (window as any).Clerk.signOut();
                        } catch (e) {
                          console.error("Clerk signout failed", e);
                        }
                      }
                      useAuthStore.getState().clearAuth();
                      navigate("/login", { replace: true });
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-bold hover:underline"
                  >
                    Sign out
                  </button>
                  <button
                    onClick={() => {
                      navigate("/privacy");
                      setProfileMenuOpen(false);
                    }}
                    className="text-xs text-teal-600 hover:text-teal-700 hover:underline font-semibold"
                  >
                    Privacy policy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Icon-only Sidebar */}
        <div className="w-[72px] flex flex-col bg-[#2E2F32] flex-shrink-0">
          <div className="p-3 flex flex-col h-full">
            <TooltipProvider delayDuration={200}>
              <nav className="space-y-1 flex-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleViewChange(item.id)}
                          className={`w-full flex items-center justify-center h-10 rounded-md transition-colors ${
                            view === item.id
                              ? "bg-white/15 text-white"
                              : "text-white/50 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          <Icon className="h-6 w-6" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </nav>

              <div className="space-y-1 border-t border-sidebar-border pt-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={async () => {
                        if ((window as any).Clerk) {
                          try {
                            await (window as any).Clerk.signOut();
                          } catch (e) {
                            console.error("Clerk signout failed", e);
                          }
                        }
                        useAuthStore.getState().clearAuth();
                        navigate("/login", { replace: true });
                      }}
                      className="w-full flex items-center justify-center h-10 rounded-md text-white/50 hover:text-red-400 hover:bg-white/10 transition-colors"
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Sign out</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {mountedViews.has("overview") && (
            <div className={view === "overview" ? "min-h-full" : "hidden"} aria-hidden={view !== "overview"}>
              {overviewLoading ? (
                <DashboardOverviewSkeleton />
              ) : (
            <OverviewView
              companyId={companyId}
              company={company}
              dashboardData={dashboardData}
              strategy={strategy}
              calendar={{
                days: calendarDays,
                weeks: calendarWeeks,
                weekThemes,
              }}
              weekDays={weekDays}
              assets={{ posts, newsletter, schedule }}
              pillars={pillars}
              strategyId={dashboardData?.strategyId}
              onNewPipeline={() => navigate(`/pipeline/${companyId}`)}
              onSelectContent={(item) => {
                setSelectedContent(item);
                handleViewChange("content");
              }}
              greeting={getGreeting()}
              date={formatDate()}
              userName={userName ?? undefined}
              googleCalendarConnected={googleCalendarConnected}
              googleCalendarWriteAccess={googleCalendarWriteAccess}
              googleCalendarNeedsReconnect={googleCalendarNeedsReconnect}
              unsyncedScheduledCount={Math.max(unsyncedScheduledCount, unsyncedFromContents)}
              googleCalendarEmail={googleCalendarEmail}
              calendarOnlyEvents={calendarOnlyEvents}
              googleCalendarLoading={googleCalendarLoading}
              connectingCalendar={connectingCalendar}
              onConnectCalendar={handleConnectCalendar}
              syncingCalendar={syncingCalendar}
              onSyncCalendar={handleSyncCalendar}
              calendarSyncMessage={calendarSyncMessage}
              scheduledPosts={scheduledPosts}
              onSelectScheduledPost={() => handleViewChange("content")}
            />
              )}
            </div>
          )}
          {mountedViews.has("agent") && companyId && (
            <div className={view === "agent" ? "h-full min-h-0" : "hidden"} aria-hidden={view !== "agent"}>
              <div className="h-full min-h-0 px-5 py-5">
                <AgentPanel companyId={companyId} />
              </div>
            </div>
          )}
          {mountedViews.has("content") && companyId && (
            <div className={view === "content" ? "h-full min-h-0" : "hidden"} aria-hidden={view !== "content"}>
              <ContentCreatorView companyId={companyId} />
            </div>
          )}
          {mountedViews.has("approval") && (
            <div className={view === "approval" ? "min-h-full" : "hidden"} aria-hidden={view !== "approval"}>
            <ApprovalPoolView
              posts={posts}
              newsletter={newsletter}
              strategyId={dashboardData?.strategyId}
            />
            </div>
          )}
          {mountedViews.has("settings") && (
            <div className={view === "settings" ? "min-h-full" : "hidden"} aria-hidden={view !== "settings"}>
            <div className="max-w-3xl mx-auto px-8 py-6 space-y-6">
              <h2 className="text-lg font-bold text-gray-900">Settings</h2>

              {/* Connections */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Connected Accounts</h3>

                {/* Gmail */}
                <Card className="border-gray-200">
                  <CardContent className="p-5 flex items-center gap-4">
                    <Mail className="h-8 w-8 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">Gmail</p>
                      <p className="text-xs text-gray-500">{gmailConnected ? gmailEmail : "Not connected"}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                      gmailConnected ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}>
                      {gmailConnected ? "Connected" : "Disconnected"}
                    </span>
                  </CardContent>
                </Card>

                {/* Google Calendar */}
                <Card className="border-gray-200">
                  <CardContent className="p-5 flex items-center gap-4">
                    <Calendar className="h-8 w-8 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">Google Calendar</p>
                      <p className="text-xs text-gray-500">{googleCalendarConnected ? googleCalendarEmail : "Not connected"}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                      googleCalendarConnected ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}>
                      {googleCalendarConnected ? "Connected" : "Disconnected"}
                    </span>
                  </CardContent>
                </Card>

                {/* Twitter */}
                <Card className="border-gray-200">
                  <CardContent className="p-5 flex items-center gap-4">
                    <Twitter className="h-8 w-8 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">Twitter / X</p>
                      <p className="text-xs text-gray-500">{twitterConnected ? `@${twitterScreenName}` : "Not connected"}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                      twitterConnected ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}>
                      {twitterConnected ? "Connected" : "Disconnected"}
                    </span>
                  </CardContent>
                </Card>
              </div>
            </div>
            </div>
          )}
          {mountedViews.has("mails") && companyId && (
            <div className={view === "mails" ? "h-full min-h-0" : "hidden"} aria-hidden={view !== "mails"}>
            <MailsView companyId={companyId} />
            </div>
          )}
        </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateCompanyModal
          onClose={() => setShowCreateModal(false)}
          onCreated={async (id) => {
            setShowCreateModal(false);
            const updated = await listCompanies();
            setCompanies(updated);
            navigate(buildDashboardUrl(id, view), { replace: true });
          }}
        />
      )}
    </div>
  );
}

function DashboardOverviewSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto px-8 py-6 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-32 rounded bg-gray-100" />
        <div className="h-9 w-72 rounded bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-64 rounded-lg bg-gray-100" />
        <div className="h-64 rounded-lg bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-28 rounded-lg bg-gray-100" />
        <div className="h-28 rounded-lg bg-gray-100" />
        <div className="h-28 rounded-lg bg-gray-100" />
      </div>
    </div>
  );
}

function OverviewView({
  companyId,
  company,
  dashboardData,
  strategy,
  calendar,
  weekDays,
  assets,
  pillars,
  strategyId,
  onNewPipeline,
  onSelectContent,
  greeting,
  date,
  userName,
  googleCalendarConnected,
  googleCalendarWriteAccess,
  googleCalendarNeedsReconnect,
  unsyncedScheduledCount,
  googleCalendarEmail,
  calendarOnlyEvents,
  googleCalendarLoading,
  connectingCalendar,
  onConnectCalendar,
  syncingCalendar,
  onSyncCalendar,
  calendarSyncMessage,
  scheduledPosts,
  onSelectScheduledPost,
}: {
  companyId?: string;
  company: Company | null;
  dashboardData: DashboardData | null;
  strategy: Record<string, unknown>;
  calendar: {
    days: Record<string, unknown>[];
    weeks: Record<string, unknown>[];
    weekThemes: Record<string, unknown>[];
  };
  weekDays: Record<string, unknown>[];
  assets: {
    posts: Record<string, unknown>[];
    newsletter: Record<string, unknown>;
    schedule: Record<string, unknown>[];
  };
  pillars: Record<string, unknown>[];
  strategyId?: string;
  onNewPipeline: () => void;
  onSelectContent?: (item: Record<string, unknown>) => void;
  greeting: string;
  date: string;
  userName?: string;
  googleCalendarConnected: boolean;
  googleCalendarWriteAccess: boolean;
  googleCalendarNeedsReconnect: boolean;
  unsyncedScheduledCount: number;
  googleCalendarEmail: string;
  calendarOnlyEvents: GoogleCalendarEvent[];
  googleCalendarLoading: boolean;
  connectingCalendar: boolean;
  onConnectCalendar: () => void;
  syncingCalendar: boolean;
  onSyncCalendar: () => void;
  calendarSyncMessage: string | null;
  scheduledPosts: Array<{ id: string; title: string; start: string; type: string; inGoogleCalendar?: boolean; calendarEventId?: string | null }>;
  onSelectScheduledPost?: () => void;
}) {
  const info = {
    name: company?.name || "",
    industry:
      company?.industry || strategy?.executive_summary ? "Analyzed" : "",
    website: company?.websiteUrl || "",
    goal: dashboardData?.strategyId ? "Active" : "",
  };

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{date}</p>
          <h1 className="text-3xl font-bold text-gray-900">
            {greeting}, {userName?.split(" ")[0] || "User"}
          </h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <Settings className="h-4 w-4" />
          Customize
        </button>
      </div>

      {/* Calendar — meetings + scheduled posts */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Calendar</h2>
          {scheduledPosts.length > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
              {scheduledPosts.length} scheduled post{scheduledPosts.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {(unsyncedScheduledCount > 0 || googleCalendarNeedsReconnect) && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {googleCalendarNeedsReconnect ? (
              <p>
                Google Calendar is linked but cannot add events yet.{" "}
                <button type="button" onClick={onConnectCalendar} className="font-semibold underline">
                  Reconnect calendar
                </button>{" "}
                to see scheduled tweets in the Google Calendar app on your phone.
              </p>
            ) : (
              <p>
                {unsyncedScheduledCount} scheduled tweet{unsyncedScheduledCount === 1 ? "" : "s"} only in Plinth — not in Google Calendar yet.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {googleCalendarConnected ? (
            <>
              <div className="lg:col-span-2 border border-gray-200 rounded-lg overflow-hidden">
                <GoogleMeetingsCalendar
                  events={calendarOnlyEvents}
                  scheduledPosts={scheduledPosts}
                  loading={googleCalendarLoading}
                  email={googleCalendarEmail}
                  onSelectScheduledPost={onSelectScheduledPost}
                />
              </div>
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Upcoming
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {googleCalendarEmail
                    ? googleCalendarWriteAccess
                      ? `Connected as ${googleCalendarEmail}. Scheduled tweets show once here and sync to Google Calendar on your phone.`
                      : `Connected as ${googleCalendarEmail}, but calendar write access is missing. Reconnect below.`
                    : "Your Google Calendar is connected."}
                </p>
                {(unsyncedScheduledCount > 0 || googleCalendarNeedsReconnect) && (
                  <div className="mb-4">
                    {googleCalendarNeedsReconnect ? (
                      <Button
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                        onClick={onConnectCalendar}
                        disabled={connectingCalendar || !companyId}
                      >
                        {connectingCalendar ? "Connecting..." : "Reconnect Google Calendar"}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={onSyncCalendar}
                        disabled={syncingCalendar || !companyId}
                      >
                        {syncingCalendar ? "Syncing..." : "Add tweets to Google Calendar"}
                      </Button>
                    )}
                    {calendarSyncMessage && (
                      <p className="text-xs text-gray-500 mt-2">{calendarSyncMessage}</p>
                    )}
                  </div>
                )}
                {googleCalendarLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
                  </div>
                ) : calendarOnlyEvents.length === 0 && scheduledPosts.length === 0 ? (
                  <p className="text-sm text-gray-500">Nothing scheduled this week.</p>
                ) : (
                  <div className="space-y-3">
                    {scheduledPosts.slice(0, 5).map((post) => (
                      <button
                        key={post.id}
                        type="button"
                        onClick={onSelectScheduledPost}
                        className="w-full text-left rounded-lg border border-sky-100 bg-sky-50/50 p-3 hover:bg-sky-50 transition-colors"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-600 mb-0.5">
                          Scheduled {post.type === "tweet" ? "Tweet" : post.type}
                          {post.inGoogleCalendar ? " · 📅 Google Calendar" : " · Plinth only"}
                        </p>
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">{post.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatScheduledPostTime(post.start)}
                        </p>
                      </button>
                    ))}
                    {calendarOnlyEvents.slice(0, 5).map((event) => (
                      <div
                        key={event.id}
                        className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                      >
                        <p className="text-sm font-medium text-gray-900">{event.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatEventTime(event)}
                        </p>
                        {event.location && (
                          <p className="text-xs text-gray-400 mt-0.5">{event.location}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="lg:col-span-2 border border-gray-200 rounded-lg overflow-hidden">
                <GoogleMeetingsCalendar
                  events={[]}
                  scheduledPosts={scheduledPosts}
                  loading={false}
                  email=""
                  onSelectScheduledPost={onSelectScheduledPost}
                />
              </div>
              <div className="border border-gray-200 rounded-lg p-6 flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Google Calendar
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Connect Google Calendar to see scheduled tweets on your phone — same account as the Google Calendar app.
                </p>
                <Button
                  className="bg-gray-900 hover:bg-gray-800 text-white mt-auto"
                  onClick={onConnectCalendar}
                  disabled={connectingCalendar || !companyId}
                >
                  <Inbox className="h-4 w-4 mr-2" />
                  {connectingCalendar ? "Connecting..." : "Connect calendar"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ContentView({
  posts,
  newsletter,
  schedule,
  selectedItem,
  onSelectItem,
}: {
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
    ...(newsletter?.subject
      ? [
          {
            ...newsletter,
            _id: "newsletter",
            _type: "Newsletter" as const,
            _icon: Mail,
            _iconColor: "text-amber-400",
          },
        ]
      : []),
  ] as Record<string, unknown>[];

  if (allItems.length === 0)
    return (
      <div className="text-center py-16">
        <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">
          No content created yet
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Content will appear here once you create assets from the pipeline
        </p>
      </div>
    );

  const detailItem = selectedItem
    ? allItems.find((i) => i._id === selectedItem._id)
    : null;

  return (
    <div className="max-w-6xl mx-auto px-8 py-6">
      <div className="flex gap-6">
        {/* Content list */}
        <div className="w-72 flex-shrink-0 space-y-2">
          <h2 className="text-sm font-bold text-foreground mb-3">Content</h2>
          {allItems.map((item) => {
            const Icon = item._icon as typeof FileText;
            const isSelected = detailItem?._id === item._id;
            return (
              <button
                key={item._id as string}
                onClick={() => onSelectItem(isSelected ? null : item)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? "bg-muted/60 border-primary/30"
                    : "bg-muted/20 border-transparent hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon
                    className={`h-3.5 w-3.5 ${item._iconColor as string}`}
                  />
                  <span className="text-xs font-semibold text-foreground">
                    {item._type as string}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2">
                  {typeof item.title === "string"
                    ? item.title
                    : typeof item.subject === "string"
                      ? item.subject
                      : "Content"}
                </p>
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        <div className="flex-1">
          {detailItem ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = detailItem._icon as typeof FileText;
                  return (
                    <Icon
                      className={`h-5 w-5 ${detailItem._iconColor as string}`}
                    />
                  );
                })()}
                <h3 className="text-lg font-bold text-foreground">
                  {typeof detailItem.title === "string"
                    ? detailItem.title
                    : typeof detailItem.subject === "string"
                      ? detailItem.subject
                      : "Content Details"}
                </h3>
              </div>

              {/* Media */}
              {typeof detailItem.imageUrl === "string" &&
                detailItem.imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-muted">
                    <img
                      src={detailItem.imageUrl}
                      alt="Content visual"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}
              {typeof detailItem.videoUrl === "string" &&
                detailItem.videoUrl && (
                  <div className="rounded-xl overflow-hidden border border-muted">
                    <video
                      src={detailItem.videoUrl}
                      controls
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}

              {/* Body */}
              <Card>
                <CardContent className="p-4">
                  {typeof detailItem.body === "string" ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {detailItem.body}
                    </p>
                  ) : typeof detailItem.intro === "string" ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {detailItem.intro}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              {/* Hashtags */}
              {Array.isArray(detailItem.hashtags) &&
                (detailItem.hashtags as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(detailItem.hashtags as string[]).map((tag, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-400 border border-blue-500/20"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

              {/* Newsletter sections */}
              {Array.isArray(detailItem.sections) &&
                (detailItem.sections as Record<string, unknown>[]).length >
                  0 && (
                  <div className="space-y-3">
                    {(detailItem.sections as Record<string, unknown>[]).map(
                      (sec, i) => (
                        <Card key={i}>
                          <CardContent className="p-4">
                            <h4 className="text-sm font-semibold text-foreground mb-1">
                              {typeof sec.heading === "string"
                                ? sec.heading
                                : ""}
                            </h4>
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                              {typeof sec.body === "string" ? sec.body : ""}
                            </p>
                          </CardContent>
                        </Card>
                      ),
                    )}
                  </div>
                )}

              {/* CTA */}
              {typeof detailItem.cta === "string" && detailItem.cta && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-primary">
                      {detailItem.cta}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Publishing schedule items for this content */}
              {schedule.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Publishing Schedule
                    </h4>
                    <div className="space-y-1">
                      {schedule.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-[11px] text-muted-foreground"
                        >
                          <span>{typeof s.day === "string" ? s.day : ""}</span>
                          <Badge variant="outline" className="text-[9px] h-4">
                            {typeof s.platform === "string" ? s.platform : ""}
                          </Badge>
                          <span className="flex-1 truncate">
                            {typeof s.time === "string" ? s.time : ""}
                          </span>
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
                <p className="text-sm">
                  Select content from the left to view details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApprovalPoolView({
  posts,
  newsletter,
  strategyId,
}: {
  posts: Record<string, unknown>[];
  newsletter: Record<string, unknown>;
  strategyId?: string;
}) {
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<string | null>(null);
  const [publishResults, setPublishResults] = useState<
    Record<string, { status: string; url?: string; message?: string }>
  >({});

  const getPostStatus = (p: Record<string, unknown>, i: number) =>
    statuses[`post-${i}`] ||
    (typeof p.approvalStatus === "string" ? p.approvalStatus : "pending");

  const getNlStatus = () =>
    statuses["newsletter"] ||
    (typeof newsletter.approvalStatus === "string"
      ? newsletter.approvalStatus
      : "pending");

  async function handleAction(
    itemId: string,
    type: string,
    index: number | null,
    status: "approved" | "rejected",
  ) {
    if (!strategyId || updating) return;
    setUpdating(itemId);
    try {
      await updateAssetStatus(strategyId, type, index, status);
      setStatuses((prev) => ({ ...prev, [itemId]: status }));
    } catch {
      /* ignore */
    } finally {
      setUpdating(null);
    }
  }

  async function handlePublish(itemId: string, index: number) {
    if (!strategyId || updating) return;
    setUpdating(itemId);
    try {
      const res = await publishPipelinePostToLinkedIn(strategyId, index);
      setPublishResults((prev) => ({ ...prev, [itemId]: res }));
    } catch {
      /* ignore */
    } finally {
      setUpdating(null);
    }
  }

  const borderColor = (itemStatus: string) => {
    if (itemStatus === "approved") return "border-l-emerald-500";
    if (itemStatus === "rejected") return "border-l-red-500";
    return "border-l-amber-500";
  };

  const allItems = [
    ...posts.map((p, i) => ({
      id: `post-${i}`,
      type: "post" as const,
      index: i,
      title: typeof p.title === "string" ? p.title : `Post ${i + 1}`,
      body: typeof p.body === "string" ? p.body : "",
      platform: "LinkedIn",
      approvalStatus: getPostStatus(p, i),
    })),
    ...(newsletter?.subject
      ? [
          {
            id: "newsletter",
            type: "newsletter" as const,
            index: null as number | null,
            title:
              typeof newsletter.subject === "string"
                ? newsletter.subject
                : "Newsletter",
            body: typeof newsletter.intro === "string" ? newsletter.intro : "",
            platform: "Email",
            approvalStatus: getNlStatus(),
          },
        ]
      : []),
  ];

  if (allItems.length === 0)
    return (
      <div className="text-center py-16">
        <ThumbsUp className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">
          No content pending approval
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Content will appear here once you create assets from the pipeline
        </p>
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto px-8 py-6 space-y-4">
      <h2 className="text-lg font-bold text-foreground">Approval Pool</h2>
      {allItems.map((item) => {
        const isUpdating = updating === item.id;
        const itemStatus = item.approvalStatus;
        return (
          <Card
            key={item.id}
            className={`border-l-4 ${borderColor(itemStatus)}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-[10px]">
                  {item.platform}
                </Badge>
                {item.type === "post" && (
                  <Linkedin className="h-3 w-3 text-blue-400" />
                )}
                {item.type === "newsletter" && (
                  <Mail className="h-3 w-3 text-amber-400" />
                )}
                {itemStatus === "approved" && (
                  <Badge className="text-[10px] bg-emerald-600/20 text-emerald-400 border-emerald-500/30 ml-auto">
                    Approved
                  </Badge>
                )}
                {itemStatus === "rejected" && (
                  <Badge className="text-[10px] bg-red-600/20 text-red-400 border-red-500/30 ml-auto">
                    Rejected
                  </Badge>
                )}
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">
                {item.title}
              </p>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-3">
                {item.body}
              </p>
              {itemStatus === "pending" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    disabled={isUpdating}
                    onClick={() =>
                      handleAction(item.id, item.type, item.index, "approved")
                    }
                  >
                    <Check className="h-3 w-3 mr-1" />{" "}
                    {isUpdating ? "..." : "Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={isUpdating}
                    onClick={() =>
                      handleAction(item.id, item.type, item.index, "rejected")
                    }
                  >
                    <X className="h-3 w-3 mr-1" />{" "}
                    {isUpdating ? "..." : "Reject"}
                  </Button>
                </div>
              )}
              {itemStatus === "approved" && item.type === "post" && (
                <div>
                  {!publishResults[item.id] ? (
                    <Button
                      size="sm"
                      variant="default"
                      className="h-8 text-xs"
                      disabled={isUpdating}
                      onClick={() => handlePublish(item.id, item.index!)}
                    >
                      <Linkedin className="h-3 w-3 mr-1" />{" "}
                      {isUpdating ? "Publishing..." : "Publish to LinkedIn"}
                    </Button>
                  ) : (
                    <div className="space-y-1">
                      {publishResults[item.id].status === "published" ? (
                        <div className="flex items-center gap-2 text-[11px] text-emerald-400">
                          <Check className="h-3 w-3" /> Published
                          {publishResults[item.id].url && (
                            <a
                              href={publishResults[item.id].url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline text-blue-400 hover:text-blue-300"
                            >
                              View
                            </a>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-red-400">
                          {publishResults[item.id].message ||
                            "Publishing failed"}
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

function formatEventTime(event: GoogleCalendarEvent): string {
  if (!event.start) return "";
  if (event.allDay) {
    const date = new Date(event.start + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }) + " · All day";
  }
  const start = new Date(event.start);
  const end = event.end ? new Date(event.end) : null;
  const datePart = start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timePart = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const endPart = end
    ? end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "";
  return endPart ? `${datePart} · ${timePart} – ${endPart}` : `${datePart} · ${timePart}`;
}

function formatScheduledPostTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Hide Google Calendar events that are already shown as Plinth scheduled posts. */
function filterLinkedCalendarEvents(
  events: GoogleCalendarEvent[],
  scheduledPosts: Array<{ calendarEventId?: string | null; inGoogleCalendar?: boolean; title: string; start: string }>,
): GoogleCalendarEvent[] {
  const linkedIds = new Set(
    scheduledPosts
      .map((p) => p.calendarEventId)
      .filter((id): id is string => Boolean(id)),
  );

  const syncedPosts = scheduledPosts.filter((p) => p.inGoogleCalendar);

  return events.filter((event) => {
    if (linkedIds.has(event.id)) return false;

    // Fallback when calendarEventId wasn't stored yet
    const isPlinthEvent =
      event.title.startsWith("Twitter/X:") ||
      event.title.startsWith("LinkedIn:") ||
      event.title.startsWith("tweet:");

    if (!isPlinthEvent) return true;

    const eventStart = new Date(event.start).getTime();
    return !syncedPosts.some((post) => {
      const postStart = new Date(post.start).getTime();
      const titleSnippet = post.title.toLowerCase().slice(0, 24);
      const titleMatch = titleSnippet.length > 0 && event.title.toLowerCase().includes(titleSnippet);
      const timeMatch = Math.abs(eventStart - postStart) < 5 * 60 * 1000;
      return titleMatch && timeMatch;
    });
  });
}

function GoogleMeetingsCalendar({
  events,
  scheduledPosts = [],
  loading,
  email,
  onSelectScheduledPost,
}: {
  events: GoogleCalendarEvent[];
  scheduledPosts?: Array<{ id: string; title: string; start: string; type: string; inGoogleCalendar?: boolean; calendarEventId?: string | null }>;
  loading: boolean;
  email: string;
  onSelectScheduledPost?: () => void;
}) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  function dayKey(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  function postDayKey(iso: string) {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const weekScheduledPosts = scheduledPosts.filter((post) => {
    const d = new Date(post.start);
    return d >= weekStart && d < weekEnd;
  });

  function eventDayKey(event: GoogleCalendarEvent) {
    if (!event.start) return "";
    return event.start.slice(0, 10);
  }

  const eventsByDay: Record<string, GoogleCalendarEvent[]> = {};
  events.forEach((event) => {
    const key = eventDayKey(event);
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(event);
  });

  const postsByDay: Record<string, typeof scheduledPosts> = {};
  weekScheduledPosts.forEach((post) => {
    const key = postDayKey(post.start);
    if (!postsByDay[key]) postsByDay[key] = [];
    postsByDay[key].push(post);
  });

  const hasAnything = events.length > 0 || weekScheduledPosts.length > 0;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <p className="text-sm font-semibold text-gray-900">This week</p>
          {email && <p className="text-xs text-gray-500">{email}</p>}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((d) => {
            const key = dayKey(d);
            const isToday = key === dayKey(today);
            const dayEvents = eventsByDay[key] ?? [];
            const dayPosts = postsByDay[key] ?? [];
            return (
              <div key={key} className="min-w-0">
                <div
                  className={`text-center py-2 rounded-t-md ${
                    isToday ? "bg-blue-600 text-white" : "text-gray-500"
                  }`}
                >
                  <p className="text-[10px] uppercase font-semibold tracking-wide">
                    {dayNames[d.getDay()]}
                  </p>
                  <p className={`text-sm font-bold ${isToday ? "text-white" : "text-gray-900"}`}>
                    {d.getDate()}
                  </p>
                </div>
                <div
                  className={`min-h-[120px] rounded-b-md p-1 border border-t-0 ${
                    isToday ? "border-blue-200 bg-blue-50/40" : "border-gray-100 bg-gray-50/50"
                  }`}
                >
                  <div className="space-y-1">
                    {dayPosts.map((post) => (
                      <button
                        key={post.id}
                        type="button"
                        onClick={onSelectScheduledPost}
                        className="w-full text-left text-[10px] px-1.5 py-1 rounded bg-sky-50 text-sky-800 border border-sky-200 leading-tight truncate hover:bg-sky-100"
                        title={post.title}
                      >
                        {post.type === "tweet" ? "𝕏 " : ""}{post.title}
                      </button>
                    ))}
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className="text-[10px] px-1.5 py-1 rounded bg-white text-blue-700 border border-blue-100 leading-tight truncate"
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayPosts.length + dayEvents.length > 3 && (
                      <span className="text-[10px] text-gray-400 px-1">
                        +{dayPosts.length + dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !hasAnything && (
        <p className="text-center text-sm text-gray-500 py-6">
          No meetings or scheduled posts this week.
        </p>
      )}
    </div>
  );
}

function CalendarGrid({
  weekDays,
  calendar,
  assets,
  strategyId,
  onSelectItem,
}: {
  weekDays: Record<string, unknown>[];
  calendar: {
    days: Record<string, unknown>[];
    weeks: Record<string, unknown>[];
    weekThemes: Record<string, unknown>[];
  };
  assets: {
    posts: Record<string, unknown>[];
    newsletter: Record<string, unknown>;
    schedule: Record<string, unknown>[];
  };
  strategyId?: string;
  onSelectItem?: (item: Record<string, unknown>) => void;
}) {
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const itemsByDay: Record<number, Record<string, unknown>[]> = {};
  weekDays.forEach((d) => {
    const dayNum = typeof d.day === "number" ? d.day : 0;
    if (!itemsByDay[dayNum]) itemsByDay[dayNum] = [];
    itemsByDay[dayNum].push(d);
  });

  const hasContent = Object.keys(itemsByDay).length > 0;

  return (
    <div className="p-4">
      {hasContent ? (
        <div className="grid grid-cols-7 gap-1">
          {dayNames.map((name) => (
            <div
              key={name}
              className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide py-2"
            >
              {name}
            </div>
          ))}
          {(() => {
            const maxDay = Math.max(...Object.keys(itemsByDay).map(Number), 28);
            const cells: React.ReactNode[] = [];
            for (let day = 1; day <= maxDay; day++) {
              const dayItems = itemsByDay[day] || [];
              cells.push(
                <div
                  key={day}
                  className={`min-h-[100px] rounded-md p-1.5 border ${dayItems.length > 0 ? "bg-gray-50 border-gray-200" : "border-transparent"}`}
                >
                  <span
                    className={`text-xs font-semibold ${dayItems.length > 0 ? "text-gray-900" : "text-gray-400"}`}
                  >
                    {day}
                  </span>
                  <div className="space-y-0.5 mt-1">
                    {dayItems.slice(0, 2).map((item, idx) => (
                      <div
                        key={idx}
                        className="text-[10px] px-1.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 leading-tight cursor-pointer hover:bg-blue-100"
                        onClick={() => onSelectItem?.(item)}
                      >
                        {typeof item.content_title === "string"
                          ? item.content_title
                          : typeof item.title === "string"
                            ? item.title
                            : "Content"}
                      </div>
                    ))}
                    {dayItems.length > 2 && (
                      <span className="text-[10px] text-gray-500">
                        +{dayItems.length - 2} more
                      </span>
                    )}
                  </div>
                </div>,
              );
            }
            return cells;
          })()}
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No calendar created yet</p>
        </div>
      )}
    </div>
  );
}
