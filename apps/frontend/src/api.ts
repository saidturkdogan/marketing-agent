import type { AuthResponse, Company, CompanyPayload } from "./types";

let tokenGetter: () => string | null = () => null;

export function setTokenGetter(fn: () => string | null) {
  tokenGetter = fn;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = tokenGetter();
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
