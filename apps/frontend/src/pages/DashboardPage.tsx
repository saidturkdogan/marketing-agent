import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import {
  getDashboard,
  getStrategy,
  listCompanies,
  getCompany,
  updateAssetStatus,
  publishPipelinePostToLinkedIn,
  publishScheduleItem,
} from "../api";
import type {
  DashboardData,
  Company,
  CalendarItem,
} from "../types";
import { ChatView } from "../components/ChatView";
import { PlinthLogo } from "../components/PlinthLogo";
import { CreateCompanyModal } from "../components/CreateCompanyModal";
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
  TrendingUp,
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
  Bookmark,
  Phone,
  HelpCircle,
  Bell,
  Network,
  Activity,
  Inbox,
} from "lucide-react";

type View = "overview" | "content" | "approval" | "settings";

const NAV_ITEMS: { id: View; label: string; icon: typeof Home }[] = [
  { id: "overview", label: "Dashboard", icon: Home },
  { id: "content", label: "Content", icon: FileText },
  { id: "approval", label: "Approval Pool", icon: ThumbsUp },
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
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const userName = useAuthStore((s) => s.name);

  const [view, setView] = useState<View>("overview");
  const [selectedContent, setSelectedContent] = useState<Record<
    string,
    unknown
  > | null>(null as Record<string, unknown> | null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
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
      if (
        switcherRef.current &&
        !switcherRef.current.contains(e.target as Node)
      )
        setSwitcherOpen(false);
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
    setLoading(true);
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

  useEffect(() => {
    if (!token && !isSignedIn) {
      navigate("/login", { replace: true });
      return;
    }
    if (!companyId) {
      listCompanies()
        .then((cs) => {
          if (cs.length > 0)
            navigate(`/dashboard/${cs[0].companyId}`, { replace: true });
          else navigate("/onboarding", { replace: true });
        })
        .catch(() => navigate("/onboarding", { replace: true }));
      return;
    }
    loadData();
  }, [token, isSignedIn, navigate, loadData, companyId]);

  if (!token && !isSignedIn) return null;

  const score = dashboardData?.marketingScore ?? 0;

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-background font-sans">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );

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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-sans">
      {/* Icon-only Sidebar */}
      <div className="w-[72px] flex flex-col bg-[#2E2F32] flex-shrink-0">
        <div className="p-3 flex flex-col h-full">
          {/* Plinth Logo at top-left */}
          <div className="flex justify-center mb-3 pt-0.5">
            <PlinthLogo size={28} />
          </div>

          {/* Navigation Icons */}
          <TooltipProvider delayDuration={200}>
            <nav className="space-y-1 flex-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setView(item.id)}
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

            {/* Bottom Icons */}
            <div className="space-y-1 border-t border-sidebar-border pt-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
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
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Top Navigation Bar */}
        <div className="h-14 bg-[#2E2F32] flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Find or Ask"
                className="w-full h-9 pl-9 pr-4 rounded-md bg-[#3a3b3e] text-white text-sm placeholder-gray-400 border border-transparent focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button className="h-9 w-9 rounded-full bg-[#3a3b3e] flex items-center justify-center text-white hover:bg-[#4a4b4e] transition-colors">
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-1">
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
            <button className="h-9 px-3 rounded-md text-white text-sm font-medium hover:bg-[#3a3b3e] transition-colors flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gray-600 flex items-center justify-center text-xs">
                {userName ? userName.charAt(0) : "U"}
              </div>
              {userName ?? "User"}
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto">
          {view === "overview" && (
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
                setView("content");
              }}
              greeting={getGreeting()}
              date={formatDate()}
              userName={userName ?? undefined}
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
            <ApprovalPoolView
              posts={posts}
              newsletter={newsletter}
              strategyId={dashboardData?.strategyId}
            />
          )}
          {view === "settings" && (
            <div className="max-w-3xl mx-auto px-8 py-6">
              <h2 className="text-lg font-bold text-foreground">Settings</h2>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateCompanyModal
          onClose={() => setShowCreateModal(false)}
          onCreated={async (id) => {
            setShowCreateModal(false);
            const updated = await listCompanies();
            setCompanies(updated);
            navigate(`/dashboard/${id}`, { replace: true });
          }}
        />
      )}
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

      {/* Meetings Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Meetings</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 border border-gray-200 rounded-lg overflow-hidden">
            <CalendarGrid
              weekDays={weekDays}
              calendar={calendar}
              assets={assets}
              strategyId={strategyId}
              onSelectItem={onSelectContent}
            />
          </div>

          {/* Right: Prep Card */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Prep for your meetings that matter most
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Connect your calendar to highlight meetings that help you close
              deals.
            </p>
            <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white">
              <Inbox className="h-4 w-4 mr-2" />
              Connect your calendar
            </Button>
          </div>
        </div>
      </div>

      {/* Grow your sales pipeline */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              Grow your sales pipeline
            </h2>
          </div>
          <button className="text-sm text-[#009982] font-medium hover:underline flex items-center gap-1">
            See what's next →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <p className="text-xs text-gray-500 mb-2">About 2 minutes</p>
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Create a new contact
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                See all their details and interactions you've had in one place.
              </p>
              <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                Create contact
              </Button>
            </CardContent>
          </Card>

          <Card className="border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <p className="text-xs text-gray-500 mb-2">About 3 minutes</p>
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Set up your deals pipeline
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                In three easy steps, you'll hit the ground running with a custom
                deals pipeline.
              </p>
              <Button
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Set up deals pipeline
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tasks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 w-8 rounded-md flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
              <Plus className="h-5 w-5" />
            </button>
            <div className="flex border border-gray-300 rounded-md overflow-hidden">
              <button className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-900">
                Open
              </button>
              <button className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                Completed
              </button>
            </div>
          </div>
        </div>

        <Card className="border-gray-200">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-3">
              You have no tasks today
            </p>
            <Button
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              Activity Feed
            </h2>
          </div>
          <button className="text-sm text-gray-600 font-medium hover:text-gray-900 flex items-center gap-1">
            All activity types <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  Never miss a follow-up
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Connect your inbox to see when contacts open your emails,
                  click links, reply to conversations, and more.
                </p>
                <Button
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Connect your inbox
                </Button>
              </div>

              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 rounded-lg bg-gray-50"
                  >
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <Users className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="flex-1 h-2 bg-gray-200 rounded"></div>
                    <span className="text-xs text-gray-500 px-2 py-1 border border-gray-300 rounded-full">
                      {["Reply", "Click", "Open", "Sent"][i - 1]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">
            Recent activity
          </h2>
        </div>

        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    Site page
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-300">
                    Draft
                  </span>
                </div>
                <h3 className="text-base font-semibold text-gray-900">Home</h3>
                <p className="text-xs text-gray-500">
                  You created 18 hours ago
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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

function Clock({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
