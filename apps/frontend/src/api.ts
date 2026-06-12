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

export function setTokenGetter(fn: () => Promise<string | null>) {
  tokenGetter = fn;
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

  if (response.status === 403) {
    console.warn(`[api] 403 on ${options?.method || "GET"} ${url}, retrying with fresh token...`);
    await new Promise((r) => setTimeout(r, 500));
    token = await tokenGetter();
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

export type PublishResponse = {
  platform: string;
  status: string;
  externalId?: string;
  url?: string;
  message?: string;
};

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
