import type { CampaignPayload, CampaignResponse, Company, CompanyPayload } from "./types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

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

export function createCampaign(payload: CampaignPayload) {
  return request<CampaignResponse>("/api/campaigns", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function publishLinkedIn(campaignId: string) {
  return request<{ status: string; url?: string }>(`/api/campaigns/${campaignId}/publish/linkedin`, {
    method: "POST",
  });
}

export async function healthCheck() {
  return request<{ status: string }>("/api/health");
}
