import { useState, useEffect, useCallback } from "react";
import type { ContentItem, ContentType } from "../types";
import {
  listContents,
  generateContent,
  updateContent,
  deleteContent,
  generateContentImage,
  publishContent,
  scheduleContent,
  getTwitterAuthUrl,
  getTwitterStatus,
} from "../api";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Plus,
  Sparkles,
  Twitter,
  FileText,
  Image,
  Send,
  Calendar,
  Trash2,
  Copy,
  RefreshCw,
  Check,
  ExternalLink,
  Loader2,
  Pencil,
  X,
  Search,
  PenLine,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type Props = {
  companyId: string;
};

const CONTENT_TYPES: { id: ContentType; label: string; icon: typeof Twitter; color: string; accent: string }[] = [
  { id: "tweet", label: "Tweet / X", icon: Twitter, color: "text-sky-600", accent: "bg-sky-500" },
];

const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string; stripe: string }> = {
  draft: {
    label: "Draft",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
    stripe: "bg-slate-300",
  },
  scheduled: {
    label: "Scheduled",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
    stripe: "bg-violet-400",
  },
  published: {
    label: "Published",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    stripe: "bg-emerald-400",
  },
  pending_approval: {
    label: "Pending approval",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    stripe: "bg-amber-400",
  },
};

function formatContentDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatScheduledDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function ContentCreatorView({ companyId }: Props) {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "create">("list");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<ContentType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create form state
  const [createType, setCreateType] = useState<ContentType>("tweet");
  const [topic, setTopic] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [generating, setGenerating] = useState(false);

  // Actions state
  const [publishing, setPublishing] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [twitterConnected, setTwitterConnected] = useState(false);
  const [twitterScreenName, setTwitterScreenName] = useState("");
  const [connectingTwitter, setConnectingTwitter] = useState(false);

  const loadTwitterStatus = useCallback(async () => {
    try {
      const status = await getTwitterStatus(companyId);
      setTwitterConnected(status.connected);
      if (status.screenName) setTwitterScreenName(status.screenName);
    } catch {
      setTwitterConnected(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadTwitterStatus();
  }, [loadTwitterStatus]);

  const handleConnectTwitter = async () => {
    setConnectingTwitter(true);
    try {
      const result = await getTwitterAuthUrl(companyId);
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setActionMessage({ type: "error", text: result.message || "Twitter API not configured on server" });
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to start Twitter connection",
      });
    } finally {
      setConnectingTwitter(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("twitter_connected") === "true") {
      loadTwitterStatus();
      const screenName = params.get("screen_name");
      if (screenName) setTwitterScreenName(screenName);
      setTwitterConnected(true);
      setActionMessage({ type: "success", text: `Twitter connected${screenName ? ` as @${screenName}` : ""}!` });
      params.delete("twitter_connected");
      params.delete("screen_name");
      const qs = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    } else if (params.get("twitter_connected") === "error") {
      const message = params.get("message") || "Twitter connection failed";
      setActionMessage({ type: "error", text: message });
      params.delete("twitter_connected");
      params.delete("message");
      const qs = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    }
  }, [loadTwitterStatus]);

  const loadContents = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listContents(companyId);
      setContents(items);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  const selectedItem = contents.find((c) => c.contentId === selectedId) ?? null;

  const filteredContents = contents.filter((c) => {
    if (filter !== "all" && c.type !== filter) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (c.title?.toLowerCase().includes(q) ?? false) ||
        (c.body?.toLowerCase().includes(q) ?? false) ||
        (c.hashtags?.some((h) => h.toLowerCase().includes(q)) ?? false)
      );
    }
    return true;
  });

  const stats = {
    draft: contents.filter((c) => c.status === "draft").length,
    scheduled: contents.filter((c) => c.status === "scheduled").length,
    published: contents.filter((c) => c.status === "published").length,
    pending: contents.filter((c) => c.status === "pending_approval").length,
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setActionMessage(null);
    try {
      const item = await generateContent(companyId, {
        type: createType,
        topic: topic.trim(),
        additionalContext: additionalContext.trim() || undefined,
      });
      setContents((prev) => [item, ...prev]);
      setSelectedId(item.contentId);
      setMode("list");
      setTopic("");
      setAdditionalContext("");
      setActionMessage({ type: "success", text: "Content created successfully! ✨" });
    } catch (err) {
      setActionMessage({ type: "error", text: err instanceof Error ? err.message : "Generation failed" });
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedItem) return;
    setPublishing(true);
    setActionMessage(null);
    try {
      const result = await publishContent(companyId, selectedItem.contentId);
      if (result.status === "published") {
        setActionMessage({ type: "success", text: `Published to Twitter! 🎉 ${result.url || ""}` });
      } else {
        const msg = result.message || "Publishing failed";
        const isBillingError = msg.includes("402") || msg.toLowerCase().includes("credit");
        setActionMessage({
          type: "error",
          text: isBillingError
            ? "X API requires credits. Load credits at developer.x.com → Billing. Your OAuth connection is working."
            : msg,
        });
      }
      await loadContents();
    } catch (err) {
      setActionMessage({ type: "error", text: err instanceof Error ? err.message : "Publishing failed" });
    } finally {
      setPublishing(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!selectedItem || !imagePrompt.trim()) return;
    setGeneratingImage(true);
    setActionMessage(null);
    try {
      await generateContentImage(companyId, selectedItem.contentId, imagePrompt.trim());
      setActionMessage({ type: "success", text: "Image generated! 🎨" });
      setShowImagePrompt(false);
      setImagePrompt("");
      await loadContents();
    } catch (err) {
      setActionMessage({ type: "error", text: err instanceof Error ? err.message : "Image generation failed" });
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSchedule = async () => {
    if (!selectedItem || !scheduleDate) return;
    setScheduling(true);
    setActionMessage(null);
    try {
      const result = await scheduleContent(companyId, selectedItem.contentId, new Date(scheduleDate).toISOString());
      setActionMessage({
        type: "success",
        text: `Scheduled!${result.calendarEventCreated ? " 📅 Added to Google Calendar" : ""}`,
      });
      setShowSchedule(false);
      setScheduleDate("");
      await loadContents();
    } catch (err) {
      setActionMessage({ type: "error", text: err instanceof Error ? err.message : "Scheduling failed" });
    } finally {
      setScheduling(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContent(companyId, id);
      setContents((prev) => prev.filter((c) => c.contentId !== id));
      if (selectedId === id) setSelectedId(null);
    } catch {
      /* ignore */
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    try {
      await updateContent(companyId, selectedItem.contentId, { body: editBody } as Partial<ContentItem>);
      setEditing(false);
      await loadContents();
    } catch {
      /* ignore */
    }
  };

  const typeInfo = (type: string) => CONTENT_TYPES.find((t) => t.id === type) || CONTENT_TYPES[0];

  // Auto-dismiss action messages
  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  return (
    <div className="flex h-full min-h-[calc(100vh-3.5rem)] bg-slate-50/80">
      {/* ─── Left Panel ─── */}
      <div className="w-[340px] border-r border-slate-200/80 flex flex-col bg-white flex-shrink-0 shadow-[2px_0_24px_-12px_rgba(15,23,42,0.08)]">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Content</h2>
              <p className="text-xs text-slate-500 mt-0.5">{contents.length} items</p>
            </div>
            <Button
              onClick={() => { setMode("create"); setSelectedId(null); }}
              size="sm"
              className="h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white shadow-sm rounded-xl"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search content..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-100 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Stats pills */}
        <div className="px-4 py-3 border-b border-slate-100 flex gap-1.5 flex-wrap">
          {[
            { key: "all", label: "All", count: contents.length, color: "bg-slate-900 text-white" },
            { key: "draft", label: "Draft", count: stats.draft, color: "bg-slate-100 text-slate-700" },
            { key: "scheduled", label: "Scheduled", count: stats.scheduled, color: "bg-violet-100 text-violet-700" },
            { key: "published", label: "Published", count: stats.published, color: "bg-emerald-100 text-emerald-700" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                statusFilter === s.key
                  ? s.key === "all"
                    ? "bg-slate-900 text-white shadow-sm"
                    : `${s.color} ring-1 ring-inset ring-black/5`
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {s.label}
              <span className={`tabular-nums ${statusFilter === s.key && s.key === "all" ? "text-white/70" : "opacity-60"}`}>
                {s.count}
              </span>
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="px-4 py-2 border-b border-slate-100 flex gap-1">
          <button
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-colors ${
              filter === "all" ? "bg-slate-100 text-slate-800" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            All types
          </button>
          {CONTENT_TYPES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                  filter === t.id ? "bg-sky-50 text-sky-700" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon className="h-3 w-3" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {loading && contents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
              <p className="text-xs text-slate-400">Loading...</p>
            </div>
          ) : filteredContents.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-7 w-7 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-600">
                {searchQuery || statusFilter !== "all" ? "No results found" : "No content yet"}
              </p>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {searchQuery || statusFilter !== "all"
                  ? "Try a different search or filter"
                  : "Create your first content with AI"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button
                  onClick={() => setMode("create")}
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-xl border-slate-200"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Create
                </Button>
              )}
            </div>
          ) : (
            filteredContents.map((item) => {
              const ti = typeInfo(item.type);
              const Icon = ti.icon;
              const isSelected = item.contentId === selectedId;
              const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
              return (
                <button
                  key={item.contentId}
                  onClick={() => {
                    setSelectedId(item.contentId);
                    setMode("list");
                    setEditing(false);
                  }}
                  className={`w-full text-left rounded-xl border transition-all group relative overflow-hidden ${
                    isSelected
                      ? "bg-white border-slate-200 shadow-md shadow-slate-200/50 ring-1 ring-slate-200"
                      : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm"
                  }`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${status.stripe}`} />
                  <div className="pl-4 pr-3 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`h-6 w-6 rounded-lg flex items-center justify-center ${isSelected ? "bg-sky-50" : "bg-slate-50"}`}>
                        <Icon className={`h-3.5 w-3.5 ${ti.color}`} />
                      </div>
                      <Badge className={`text-[9px] h-5 px-2 font-semibold border ${status.badge}`}>
                        {status.label}
                      </Badge>
                      {item.scheduledAt && (
                        <CalendarClock className="h-3 w-3 text-violet-400 ml-auto" />
                      )}
                    </div>
                    <p className="text-[13px] font-semibold text-slate-900 line-clamp-1 leading-snug">
                      {item.title || "Untitled"}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {item.body?.substring(0, 120)}
                    </p>
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-50">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {formatContentDate(item.createdAt)}
                      </span>
                      <span
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.contentId); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ─── Right Panel ─── */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-slate-50/50">
        {/* Action Message */}
        {actionMessage && (
          <div className="sticky top-0 z-10 px-6 pt-4">
            <div
              className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2.5 shadow-sm ${
                actionMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                  : "bg-red-50 text-red-800 border border-red-200/80"
              }`}
            >
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                actionMessage.type === "success" ? "bg-emerald-100" : "bg-red-100"
              }`}>
                {actionMessage.type === "success"
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  : <AlertCircle className="h-4 w-4 text-red-600" />}
              </div>
              <span className="leading-snug">{actionMessage.text}</span>
              <button onClick={() => setActionMessage(null)} className="ml-auto p-1 rounded-md hover:bg-black/5">
                <X className="h-4 w-4 opacity-50" />
              </button>
            </div>
          </div>
        )}

        {mode === "create" ? (
          /* ─── Create Mode ─── */
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-lg w-full">
              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/40 overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500" />
                <div className="px-8 py-8">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">New Content</h2>
                    <p className="text-sm text-slate-500 mt-1">Generate AI content tailored to your brand voice</p>
                  </div>

                  <div className="mb-5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Content Type</label>
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-sky-100 bg-sky-50/50">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Tweet / X</p>
                        <p className="text-[11px] text-slate-500">Max 280 characters</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Topic</label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. SaaS growth tactics, AI trends..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all bg-slate-50/30 focus:bg-white"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Additional Context <span className="text-slate-400 font-normal normal-case tracking-normal">(optional)</span>
                    </label>
                    <textarea
                      value={additionalContext}
                      onChange={(e) => setAdditionalContext(e.target.value)}
                      placeholder="Target audience, tone, key messages..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none resize-none transition-all bg-slate-50/30 focus:bg-white"
                    />
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={!topic.trim() || generating}
                    className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-lg shadow-slate-900/10 disabled:opacity-50 rounded-xl"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating content...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate with AI
                      </>
                    )}
                  </Button>

                  <button
                    onClick={() => setMode("list")}
                    className="w-full mt-3 text-sm text-slate-500 hover:text-slate-700 py-2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : selectedItem ? (
          /* ─── Detail View ─── */
          <div className="max-w-2xl mx-auto px-6 py-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight truncate">
                  {selectedItem.title || "Untitled"}
                </h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge className={`text-[10px] border font-semibold ${(STATUS_CONFIG[selectedItem.status] || STATUS_CONFIG.draft).badge}`}>
                    {(STATUS_CONFIG[selectedItem.status] || STATUS_CONFIG.draft).label}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    {formatContentDate(selectedItem.createdAt)}
                  </span>
                </div>
              </div>

              {selectedItem.platformUrl && (
                <a
                  href={selectedItem.platformUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-100 hover:bg-sky-100 transition-colors flex-shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Post
                </a>
              )}
            </div>

            {/* Scheduled banner */}
            {selectedItem.scheduledAt && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-violet-50 border border-violet-100">
                <div className="h-9 w-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <CalendarClock className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Publish Time</p>
                  <p className="text-sm font-medium text-violet-900 mt-0.5">
                    {formatScheduledDate(selectedItem.scheduledAt)}
                  </p>
                </div>
              </div>
            )}

            {/* Image */}
            {selectedItem.imageUrl && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                <img
                  src={selectedItem.imageUrl}
                  alt="Generated visual"
                  className="w-full max-h-80 object-cover"
                />
              </div>
            )}

            {/* Tweet Preview Card */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Preview</span>
                <div className="flex items-center gap-1">
                  {!editing && (
                    <button
                      onClick={() => { setEditing(true); setEditBody(selectedItem.body || ""); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleCopy(selectedItem.body || "")}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
                    title="Copy"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-5">
                {editing ? (
                  <div className="space-y-3">
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-sky-300 focus:ring-2 focus:ring-sky-100 focus:outline-none resize-y bg-slate-50/30"
                    />
                    <div className="flex items-center gap-2">
                      <Button onClick={handleSaveEdit} size="sm" className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
                        <Check className="h-3.5 w-3.5 mr-1" /> Save
                      </Button>
                      <Button onClick={() => setEditing(false)} variant="outline" size="sm" className="rounded-xl">
                        Cancel
                      </Button>
                      {selectedItem.type === "tweet" && (
                        <span className={`ml-auto text-xs font-medium tabular-nums ${editBody.length > 280 ? "text-red-500" : "text-slate-400"}`}>
                          {editBody.length}/280
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    {twitterScreenName && (
                      <p className="text-xs text-slate-400 mb-2">@{twitterScreenName}</p>
                    )}
                    <p className="text-[15px] text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {selectedItem.body}
                    </p>
                    {selectedItem.hashtags && selectedItem.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {selectedItem.hashtags.map((tag, i) => (
                          <span key={i} className="text-sm text-sky-600 font-medium">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {selectedItem.type === "tweet" && (
                      <p className={`text-xs mt-3 tabular-nums ${(selectedItem.body?.length || 0) > 280 ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                        {selectedItem.body?.length || 0}/280 characters
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Hashtags (when not in preview) - skip duplicate, already in preview */}

            {/* Twitter Connection */}
            {!twitterConnected ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Twitter not connected</p>
                  <p className="text-xs text-slate-500 mt-0.5">Connect your account to publish</p>
                </div>
                <Button
                  onClick={handleConnectTwitter}
                  disabled={connectingTwitter}
                  className="bg-sky-500 hover:bg-sky-600 text-white text-xs flex-shrink-0 rounded-xl"
                  size="sm"
                >
                  {connectingTwitter ? "Connecting..." : "Connect"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-sky-50/80 border border-sky-100">
                <CheckCircle2 className="h-4 w-4 text-sky-600 flex-shrink-0" />
                <span className="text-xs text-sky-800 font-semibold">
                  {twitterScreenName ? `@${twitterScreenName}` : "Twitter connected"}
                </span>
              </div>
            )}

            {/* Actions toolbar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Actions</p>
              <div className="flex flex-wrap gap-2">
                {selectedItem.status === "draft" && (
                  <Button
                    onClick={handlePublish}
                    disabled={publishing || !twitterConnected}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-9"
                    size="sm"
                  >
                    {publishing ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {publishing ? "Publishing..." : "Publish to Twitter"}
                  </Button>
                )}

                {selectedItem.status === "draft" && (
                  <Button
                    onClick={() => setShowSchedule(!showSchedule)}
                    variant="outline"
                    size="sm"
                    className="border-slate-200 text-slate-700 rounded-xl h-9"
                  >
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    Schedule
                  </Button>
                )}

                <Button
                  onClick={() => setShowImagePrompt(!showImagePrompt)}
                  variant="outline"
                  size="sm"
                  className="border-slate-200 text-slate-700 rounded-xl h-9"
                >
                  <Image className="h-3.5 w-3.5 mr-1.5" />
                  Generate Image
                </Button>

                {selectedItem.status === "draft" && (
                  <Button
                    onClick={async () => {
                      setGenerating(true);
                      try {
                        const item = await generateContent(companyId, {
                          type: selectedItem.type,
                          topic: selectedItem.title || "",
                        });
                        setContents((prev) => [item, ...prev.filter((c) => c.contentId !== selectedItem.contentId)]);
                        setSelectedId(item.contentId);
                        await loadContents();
                      } catch { /* ignore */ }
                      setGenerating(false);
                    }}
                    variant="outline"
                    disabled={generating}
                    size="sm"
                    className="border-slate-200 text-slate-700 rounded-xl h-9"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${generating ? "animate-spin" : ""}`} />
                    Regenerate
                  </Button>
                )}

                <Button
                  onClick={() => handleDelete(selectedItem.contentId)}
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-600 hover:bg-red-50 ml-auto rounded-xl h-9"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Schedule Picker */}
            {showSchedule && (
              <Card className="border-violet-100 bg-violet-50/30 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-violet-700 mb-1.5">Date & Time</label>
                      <input
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-violet-200 text-sm focus:border-violet-400 focus:outline-none bg-white"
                      />
                    </div>
                    <Button
                      onClick={handleSchedule}
                      disabled={!scheduleDate || scheduling}
                      className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-10"
                    >
                      {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4 mr-1.5" />}
                      {scheduling ? "..." : "Schedule"}
                    </Button>
                  </div>
                  <p className="text-[11px] text-violet-600/80 mt-2.5 flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    Also added to Google Calendar if connected
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Image Prompt */}
            {showImagePrompt && (
              <Card className="border-slate-200 bg-slate-50/50 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Image Description (DALL-E 3)</label>
                      <input
                        type="text"
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder="e.g. Modern minimalist SaaS dashboard illustration"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-slate-400 focus:outline-none bg-white"
                      />
                    </div>
                    <Button
                      onClick={handleGenerateImage}
                      disabled={!imagePrompt.trim() || generatingImage}
                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10"
                    >
                      {generatingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4 mr-1.5" />}
                      {generatingImage ? "..." : "Generate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* ─── Empty State ─── */
          <div className="flex items-center justify-center h-full min-h-[480px] p-8">
            <div className="text-center max-w-md">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
                <PenLine className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">Content Studio</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                Create, schedule, and publish AI-powered tweets for your brand.
                Select content from the left panel or create something new.
              </p>
              <Button
                onClick={() => setMode("create")}
                className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10 rounded-xl h-11 px-6"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Content
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
