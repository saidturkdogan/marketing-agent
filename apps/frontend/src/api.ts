import type { AuthResponse, CampaignRequest, CampaignResponse, Company, CompanyPayload } from "./types";

let tokenGetter: () => Promise<string | null> = async () => null;

export function setTokenGetter(fn: () => Promise<string | null>) {
  tokenGetter = fn;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = await tokenGetter();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Request failed with ${response.status}`);
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
