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

export type CampaignResponse = {
  campaign_id: string;
  company_id: string;
  company: Record<string, unknown>;
  status: string;
  plan: Record<string, unknown>;
  assets: Record<string, unknown>;
  completed_steps: string[];
  performance_score: number;
};

export type CampaignRequest = {
  companyId: string;
  topic: string;
  platforms?: string[];
  outputs?: string[];
};

export interface StrategyData {
  strategyId?: string;
  companyId?: string;
  businessType?: string;
  targetCountry?: string;
  targetLanguage?: string;
  productDescription?: string;
  averagePrice?: string;
  personaType?: string;
  goal?: string;
  websiteAnalysis?: Record<string, unknown>;
  competitors?: Competitor[];
  competitorAnalysis?: Record<string, unknown>;
  contentGaps?: Record<string, unknown>;
  keywordDiscovery?: Record<string, unknown>;
  strategy?: Record<string, unknown>;
  calendar?: CalendarData;
  marketingScore?: number;
  opportunities?: Opportunity[];
}

export interface Competitor {
  name: string;
  url: string;
  selected?: boolean;
}

export interface Opportunity {
  title: string;
  description: string;
  estimatedTraffic?: string;
  competitorReference?: string;
  action?: string;
}

export interface CalendarData {
  weeks: CalendarWeek[];
}

export interface CalendarWeek {
  weekNumber: number;
  days: CalendarDay[];
}

export interface CalendarDay {
  day: string;
  date?: string;
  items: CalendarItem[];
}

export interface CalendarItem {
  title: string;
  type: "blog" | "linkedin" | "x" | "email" | "case_study";
  goal?: string;
  targetAudience?: string;
  primaryKeyword?: string;
  description?: string;
}

export interface ContentBrief {
  title: string;
  goal: string;
  targetAudience: string;
  primaryKeyword: string;
  searchIntent: string;
  outline: string[];
  competitorReferences: string[];
  cta: string;
}

export interface DashboardData {
  strategyId?: string;
  marketingScore: number;
  contentOpportunities: number;
  competitorWeaknesses: number;
  keywordsFound: number;
  opportunities: Opportunity[];
  calendar?: CalendarData;
}