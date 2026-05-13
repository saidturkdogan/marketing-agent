export type View = "dashboard" | "companies" | "create" | "campaigns" | "settings";

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

export type Campaign = {
  id: string;
  companyId: string;
  company?: Company;
  topic: string;
  platforms: string[];
  outputs: string[];
  autoPublish: boolean;
  status: "running" | "completed" | "failed";
  createdAt: string;
  published: boolean;
  score: number | null;
  assets: Record<string, unknown>;
  error?: string;
};

export type CampaignResponse = {
  campaign_id: string;
  company_id: string;
  company?: Record<string, unknown>;
  status: string;
  plan: Record<string, unknown>;
  assets: Record<string, unknown>;
  completed_steps: string[];
  performance_score?: number;
};

export type CompanyPayload = Omit<Company, "companyId" | "createdAt" | "updatedAt">;

export type CampaignPayload = {
  companyId: string;
  topic: string;
  platforms: string[];
  outputs: string[];
};
