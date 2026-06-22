import type {
  AuthResponse,
  CalendarData,
  CampaignRequest,
  CampaignResponse,
  Company,
  CompanyPayload,
  Competitor,
  ContentBrief,
  DashboardData,
  Opportunity,
  StrategyData,
  ProgressiveResponse,
  ProgressiveRequest,
} from "./types";

export interface StrategyRequest {
  companyId?: string;
  websiteUrl?: string;
  businessType?: string;
  targetCountry?: string;
  targetLanguage?: string;
  productDescription?: string;
  averagePrice?: string;
  personaType?: string;
  goal?: string;
  competitorUrls?: string[];
}

let tokenGetter: () => Promise<string | null> = async () => null;
let tokenRefresher: () => Promise<string | null> = async () => null;

export function setTokenGetter(
  fn: () => Promise<string | null>,
  refresher?: () => Promise<string | null>,
) {
  tokenGetter = fn;
  tokenRefresher = refresher ?? fn;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  async function doRequest(token: string | null): Promise<Response> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string> | undefined),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      console.warn(`[api] No token available for ${options?.method || "GET"} ${url}`);
    }
    return fetch(url, { ...options, headers });
  }

  let token = await tokenGetter();
  let response = await doRequest(token);

  if (response.status === 401 || response.status === 403) {
    console.warn(`[api] ${response.status} on ${options?.method || "GET"} ${url}, retrying with fresh token...`);
    token = await tokenRefresher();
    response = await doRequest(token);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const msg = error.error || `Request failed with ${response.status}`;
    console.error(`[api] ${response.status} on ${options?.method || "GET"} ${url}: ${msg}`);
    throw new Error(msg);
  }

  return response.json() as Promise<T>;
}

// Auth
export function login(email: string, password: string) {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(email: string, password: string, name: string) {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

// Clerk user sync
export function syncClerkUser(clerkUserId: string, email: string, name: string) {
  return request<AuthResponse>("/api/auth/clerk/sync", {
    method: "POST",
    body: JSON.stringify({ clerkUserId, email, name }),
  });
}

// Companies
export function listCompanies() {
  return request<Company[]>("/api/companies");
}

export function createCompany(payload: CompanyPayload) {
  return request<Company>("/api/companies", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCompany(companyId: string, payload: CompanyPayload) {
  return request<Company>(`/api/companies/${companyId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getCompany(companyId: string) {
  return request<Company>(`/api/companies/${companyId}`);
}

// Chat
export function sendChatMessage(companyId: string, message: string) {
  return request<{ response: string }>(`/api/chat/${companyId}`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

// Conversations
export function createConversation(companyId: string, message: string) {
  return request<{ conversationId: string; title: string }>(
    `/api/chat/${companyId}/conversations`,
    { method: "POST", body: JSON.stringify({ message }) },
  );
}

export function listConversations(companyId: string) {
  return request<Array<{ id: string; title: string; companyId: string; createdAt: string; updatedAt: string }>>(
    `/api/chat/${companyId}/conversations`,
  );
}

export function listMessages(conversationId: string) {
  return request<Array<{ id: string; role: "user" | "assistant"; content: string; timestamp: string }>>(
    `/api/chat/conversations/${conversationId}/messages`,
  );
}

export function saveMessage(conversationId: string, role: "user" | "assistant", content: string) {
  return request<{ status: string }>(
    `/api/chat/conversations/${conversationId}/messages`,
    { method: "POST", body: JSON.stringify({ role, content }) },
  );
}

// Gmail
export function getGmailAuthUrl(companyId: string) {
  return request<{ url: string }>(`/api/gmail/auth-url?companyId=${encodeURIComponent(companyId)}`);
}

export function getGmailStatus(companyId: string) {
  return request<{ connected: boolean; companyId: string }>(`/api/gmail/status/${companyId}`);
}

export function fetchGmailEmails(companyId: string, maxResults = 50) {
  return request<{ fetched: number; companyId: string }>(`/api/gmail/fetch/${companyId}?maxResults=${maxResults}`, {
    method: "POST",
  });
}

export function getGmailMessages(companyId: string) {
  return request<Array<{ id: number; messageId: string; from: string; to: string; subject: string; snippet: string; body?: string; receivedAt: string }>>(
    `/api/gmail/messages/${companyId}`
  );
}

export function sendGmailEmail(companyId: string, to: string, subject: string, body: string, threadId?: string) {
  return request<{ status: string }>("/api/gmail/send", {
    method: "POST",
    body: JSON.stringify({ companyId, to, subject, body, threadId }),
  });
}

export function draftGmailReply(companyId: string, emailSubject: string, emailBody: string, senderName: string) {
  return request<{ draft: string }>("/api/gmail/draft-reply", {
    method: "POST",
    body: JSON.stringify({ companyId, emailSubject, emailBody, senderName }),
  });
}

// Google Calendar
export type GoogleCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
  allDay: boolean;
  htmlLink: string;
};

export function getGoogleCalendarAuthUrl(companyId: string) {
  return request<{ url: string }>(`/api/calendar/auth-url?companyId=${encodeURIComponent(companyId)}`);
}

export function getGoogleCalendarStatus(companyId: string) {
  return request<{
    connected: boolean;
    companyId: string;
    email?: string;
    writeAccess?: boolean;
    needsReconnect?: boolean;
    unsyncedScheduled?: number;
  }>(
    `/api/calendar/status/${companyId}`,
  );
}

export function getGoogleCalendarEvents(companyId: string, days = 7) {
  return request<{
    connected: boolean;
    companyId: string;
    email?: string;
    events: GoogleCalendarEvent[];
  }>(`/api/calendar/events/${companyId}?days=${days}`);
}

export function syncScheduledPostsToCalendar(companyId: string) {
  return request<{ synced: number; skipped: number; failed: number; failures: Array<{ contentId: string; error: string }> }>(
    `/api/calendar/sync-scheduled/${companyId}`,
    { method: "POST" },
  );
}

// Campaigns
export function createCampaign(payload: CampaignRequest) {
  return request<CampaignResponse>("/api/campaigns", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getCampaign(campaignId: string) {
  return request<CampaignResponse>(`/api/campaigns/${campaignId}`);
}

export function listCampaigns() {
  return request<CampaignResponse[]>("/api/campaigns");
}

export function analyzeWebsite(url: string) {
  return request<Record<string, unknown>>("/api/strategy/analyze-website", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export function discoverCompetitors(params: {
  companyName: string;
  industry: string;
  productDescription?: string;
  targetCountry?: string;
}) {
  return request<Competitor[]>("/api/strategy/discover-competitors", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function analyzeCompetitors(params: {
  companyName: string;
  competitorUrls: string[];
  industry?: string;
}) {
  return request<Record<string, unknown>>("/api/strategy/analyze-competitors", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function findContentGaps(params: Record<string, unknown>) {
  return request<Record<string, unknown>>("/api/strategy/content-gaps", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function discoverKeywords(params: {
  companyName: string;
  industry: string;
  goal: string;
  targetAudience?: string;
}) {
  return request<Record<string, unknown>>("/api/strategy/discover-keywords", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function generateStrategy(req: StrategyRequest) {
  return request<StrategyData>("/api/strategy/generate-strategy", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function generateCalendar(params: { companyId: string; strategyId: string }) {
  return request<CalendarData>("/api/strategy/generate-calendar", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function generateBrief(params: {
  companyId: string;
  strategyId: string;
  contentTitle: string;
  contentType: string;
  goal: string;
  targetAudience: string;
}) {
  return request<ContentBrief>("/api/strategy/generate-brief", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function runFullAnalysis(req: StrategyRequest) {
  return request<StrategyData>("/api/strategy/run-full", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function getStrategy(strategyId: string) {
  return request<StrategyData>(`/api/strategy/${strategyId}`);
}

export function getDashboard(companyId: string) {
  return request<DashboardData>(`/api/strategy/dashboard/${companyId}`);
}

export function aiSuggest(field: string, currentText: string, context?: string) {
  return request<{ suggestion: string }>("/api/strategy/ai-suggest", {
    method: "POST",
    body: JSON.stringify({ field, currentText, context: context || "" }),
  });
}

// Progressive Pipeline
export function runPipelineResearch(req: ProgressiveRequest) {
  return request<ProgressiveResponse>("/api/pipeline/research", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function runPipelineStrategy(strategyId: string) {
  return request<ProgressiveResponse>(`/api/pipeline/strategy/${strategyId}`, {
    method: "POST",
  });
}

export function runPipelinePlan(strategyId: string) {
  return request<ProgressiveResponse>(`/api/pipeline/plan/${strategyId}`, {
    method: "POST",
  });
}

export function updateAssetStatus(strategyId: string, type: string, index: number | null, status: "approved" | "rejected") {
  return request<ProgressiveResponse>(`/api/pipeline/asset-status/${strategyId}`, {
    method: "POST",
    body: JSON.stringify({ type, index, status }),
  });
}

export function runOnboardingBootstrap(companyId: string) {
  return request<{
    status: string;
    companyId: string;
    strategyId?: string;
    marketingScore?: number;
    tweetCount?: number;
    tweets?: Array<{
      contentId: string;
      title?: string;
      body?: string;
      status?: string;
      topic?: string;
      scheduledAt?: string;
    }>;
    message?: string;
  }>(`/api/pipeline/onboarding/${companyId}`, {
    method: "POST",
    signal: AbortSignal.timeout(300_000),
  });
}

export function runPipelineAssets(strategyId: string) {
  return request<ProgressiveResponse>(`/api/pipeline/assets/${strategyId}`, {
    method: "POST",
  });
}

export type PublishResponse = {
  platform: string;
  status: string;
  externalId?: string;
  url?: string;
  message?: string;
};

export function publishScheduleItem(strategyId: string, scheduleIndex: number) {
  return request<PublishResponse>(`/api/pipeline/publish/schedule/${strategyId}`, {
    method: "POST",
    body: JSON.stringify({ scheduleIndex }),
  });
}

export function publishPipelinePostToLinkedIn(strategyId: string, index: number) {
  return request<PublishResponse>(`/api/pipeline/publish/linkedin/${strategyId}`, {
    method: "POST",
    body: JSON.stringify({ index }),
  });
}

export function publishCampaignToLinkedIn(campaignId: string) {
  return request<PublishResponse>(`/api/campaigns/${campaignId}/publish/linkedin`, { method: "POST" });
}

export function publishCampaignToInstagram(campaignId: string, payload?: { caption?: string; imageUrl?: string }) {
  return request<PublishResponse>(`/api/campaigns/${campaignId}/publish/meta/instagram`, {
    method: "POST",
    body: payload ? JSON.stringify(payload) : undefined,
  });
}

export function publishCampaignToTwitter(campaignId: string) {
  return request<PublishResponse>(`/api/campaigns/${campaignId}/publish/twitter`, { method: "POST" });
}

// ── Content Creator API ──────────────────────────────────────

import type { ContentItem, CreateContentRequest, LastPostMetrics } from "./types";

export function listContents(companyId: string) {
  return request<ContentItem[]>(`/api/content/${companyId}`);
}

export function getLastPostMetrics(companyId: string) {
  return request<LastPostMetrics>(`/api/content/${companyId}/metrics/last`);
}

export function getContent(companyId: string, contentId: string) {
  return request<ContentItem>(`/api/content/${companyId}/${contentId}`);
}

export function generateContent(companyId: string, payload: CreateContentRequest) {
  return request<ContentItem>(`/api/content/${companyId}/generate`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateContent(companyId: string, contentId: string, updates: Partial<ContentItem>) {
  return request<ContentItem>(`/api/content/${companyId}/${contentId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export function deleteContent(companyId: string, contentId: string) {
  return request<{ status: string; contentId: string }>(`/api/content/${companyId}/${contentId}`, {
    method: "DELETE",
  });
}

export function generateContentImage(companyId: string, contentId: string, prompt?: string) {
  return request<{ contentId: string; imageUrl: string; prompt?: string }>(
    `/api/content/${companyId}/${contentId}/generate-image`,
    {
      method: "POST",
      body: JSON.stringify(prompt ? { prompt } : {}),
    },
  );
}

// Twitter Auth
export function getTwitterAuthUrl(companyId: string) {
  return request<{ url: string; configured: boolean; message?: string }>(`/api/twitter/auth-url?companyId=${encodeURIComponent(companyId)}`);
}

export function getTwitterStatus(companyId: string) {
  return request<{ connected: boolean; configured: boolean; staticFallback?: boolean; screenName?: string; twitterUserId?: string }>(`/api/twitter/status/${companyId}`);
}

export function publishContent(companyId: string, contentId: string) {
  return request<PublishResponse>(`/api/content/${companyId}/${contentId}/publish`, {
    method: "POST",
  });
}

export function scheduleContent(companyId: string, contentId: string, scheduledAt: string) {
  return request<{
    contentId: string;
    status: string;
    scheduledAt: string;
    calendarConnected?: boolean;
    calendarEventCreated: boolean;
    calendarEventId?: string;
    calendarHint?: string;
    calendarError?: string;
  }>(
    `/api/content/${companyId}/${contentId}/schedule`,
    {
      method: "POST",
      body: JSON.stringify({ scheduledAt }),
    }
  );
}

// Agent
export interface AgentStatus {
  companyId: string;
  autopilotEnabled: boolean;
  twitterPostsPerWeek: number;
  emailDraftsPerWeek: number;
  outreachEnabled?: boolean;
  lastRunAt?: string;
  lastRunStatus?: string;
  lastRunMessage?: string;
  scheduledCount: number;
  pendingApprovalsCount: number;
  pendingApprovalContentCount?: number;
  emailDraftsThisWeek?: number;
  pendingEmailDraftsCount?: number;
  outreachEmailsPerWeek?: number;
  outreachDraftsThisWeek?: number;
  pendingOutreachCount?: number;
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
}

export interface AgentDecision {
  runId: string;
  step: string;
  reasoning?: string;
  answer?: string;
  confidence?: number;
  createdAt?: string;
}

export function getAgentStatus(companyId: string) {
  return request<AgentStatus>(`/api/agent/status/${companyId}`);
}

export function getAgentConfig(companyId: string) {
  return request<Record<string, unknown>>(`/api/agent/config/${companyId}`);
}

export function updateAgentConfig(companyId: string, config: Record<string, unknown>) {
  return request<Record<string, unknown>>(`/api/agent/config/${companyId}`, {
    method: "PUT",
    body: JSON.stringify(config),
  });
}

export function runAgent(companyId: string) {
  return request<{
    status: string;
    message?: string;
    runId?: string;
    created?: number;
    scheduled?: number;
    pendingApproval?: number;
    failed?: number;
    budgetSkipped?: number;
    marketDataReal?: boolean;
    items?: Array<Record<string, unknown>>;
    email?: { drafted?: number; message?: string; items?: Array<Record<string, unknown>> };
    outreach?: { drafted?: number; message?: string; items?: Array<Record<string, unknown>> };
    budget?: Record<string, unknown>;
  }>(`/api/agent/run/${companyId}`, { method: "POST" });
}

export function getAgentBudget(companyId: string) {
  return request<Record<string, unknown>>(`/api/agent/budget/${companyId}`);
}

export function getAgentMarketBrief(companyId: string) {
  return request<{
    summary?: string;
    hasRealConnectors?: boolean;
    signals?: Record<string, unknown>;
    brief?: Record<string, unknown>;
    performanceInsights?: Record<string, unknown>;
  }>(`/api/agent/market-brief/${companyId}`);
}

export function getAgentDecisions(companyId: string, limit = 15) {
  return request<AgentDecision[]>(`/api/agent/decisions/${companyId}?limit=${limit}`);
}

export interface ApprovalItem {
  approvalId: string;
  companyId?: string;
  contentId?: string;
  gmailMessageId?: string;
  outreachProspectId?: string;
  outreachToEmail?: string;
  outreachSubject?: string;
  draftBody?: string;
  stepName?: string;
  requestReason?: string;
  status: string;
}

export function listOutreachProspects(companyId: string) {
  return request<Array<Record<string, unknown>>>(`/api/outreach/prospects/${companyId}`);
}

export function listApprovals(companyId: string) {
  return request<ApprovalItem[]>(`/api/approvals/${companyId}`);
}

export function approveContent(approvalId: string, reviewerNotes?: string) {
  return request<Record<string, unknown>>(`/api/approvals/${approvalId}/approve`, {
    method: "POST",
    body: JSON.stringify({ reviewerNotes: reviewerNotes ?? "" }),
  });
}

export function rejectContent(approvalId: string, reviewerNotes?: string) {
  return request<Record<string, unknown>>(`/api/approvals/${approvalId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reviewerNotes: reviewerNotes ?? "Rejected" }),
  });
}
