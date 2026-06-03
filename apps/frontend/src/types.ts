export type Company = {
  companyId: string;
  name: string;
  websiteUrl?: string;
  logoUrl?: string;
  industry?: string;
  description?: string;
  targetAudience?: string;
  brandVoice?: string;
  valueProposition?: string;
  productsOrServices?: string[];
  competitors?: string[];
  socialLinks?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
};

export type CompanyPayload = Omit<Company, "companyId" | "createdAt" | "updatedAt">;

export type Conversation = {
  id: string;
  title: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export type AuthResponse = {
  token: string;
  email: string;
  name: string;
};