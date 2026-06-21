export type Company = {
  companyId: string;
  name: string;
  role?: string;
  companySize?: string;
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
  productName?: string;
  coreValueProp?: string;
  bannedWords?: string[];
  brandVoiceScale?: BrandVoiceScale;
  competitorsDetail?: CompetitorDetail[];
  createdAt?: string;
  updatedAt?: string;
};

export type CompanyPayload = Omit<Company, "companyId" | "createdAt" | "updatedAt"> & {
  brandVoiceScale?: BrandVoiceScale;
  competitorsDetail?: CompetitorDetail[];
};

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
  strategy?: Record<string, unknown>;
  pipelineAssets?: Record<string, unknown>;
}

// ── Detailed Analysis Types ──────────────────────────────────────

export interface ProductService {
  name: string;
  description: string;
  pricing_tier: string;
}

export interface SeoBasics {
  has_meta_title: boolean;
  has_meta_description: boolean;
  heading_structure_quality: string;
}

export interface WebsiteAnalysis {
  brand_name?: string;
  tagline?: string;
  industry?: string;
  sub_niche?: string;
  business_model?: string;
  target_audience_primary?: string;
  target_audience_secondary?: string;
  brand_voice?: string;
  products_services?: ProductService[];
  pages_identified?: string[];
  cta_effectiveness?: string;
  content_strengths?: string[];
  content_weaknesses?: string[];
  seo_basics?: SeoBasics;
  market_position?: string;
  overall_website_score?: number;
  key_takeaways?: string[];
}

export interface AnalysisCompetitor {
  name: string;
  url: string;
  strengths: string[];
  weaknesses: string[];
  content_types: string[];
  seo_position: string;
  social_presence: {
    platforms: string[];
    engagement_level: string;
  };
  pricing_positioning: string;
}

export interface LandscapeMatrix {
  high_content_high_presence: string[];
  high_content_low_presence: string[];
  low_content_high_presence: string[];
  low_content_low_presence: string[];
}

export interface CompetitorAnalysis {
  competitors: AnalysisCompetitor[];
  common_patterns: string[];
  market_gaps: string[];
  landscape_matrix: LandscapeMatrix;
  copy_these: string[];
  do_differently: string[];
  exploit_these: string[];
}

export interface TopicGap {
  topic: string;
  covered_by_competitors: string[];
  urgency: string;
}

export interface FormatGap {
  format: string;
  competitors_using: string[];
  opportunity_score: number;
}

export interface FunnelGaps {
  awareness: string[];
  consideration: string[];
  decision: string[];
  retention: string[];
}

export interface KeywordContentGap {
  keyword: string;
  search_intent: string;
  competitor_has_content: boolean;
}

export interface DistributionGap {
  channel: string;
  competitor_activity: string;
  opportunity: string;
}

export interface QualityGap {
  area: string;
  competitor_example: string;
  gap_description: string;
}

export interface TopOpportunity {
  rank: number;
  content_title: string;
  content_type: string;
  expected_impact: string;
  effort: string;
  rationale: string;
}

export interface ContentGaps {
  topic_gaps: TopicGap[];
  format_gaps: FormatGap[];
  funnel_gaps: FunnelGaps;
  keyword_content_gaps: KeywordContentGap[];
  distribution_gaps: DistributionGap[];
  quality_gaps: QualityGap[];
  top_10_opportunities: TopOpportunity[];
}

export interface SeedKeyword {
  keyword: string;
  search_intent: string;
  priority: string;
}

export interface LongTailKeyword {
  keyword: string;
  search_intent: string;
  estimated_volume: string;
}

export interface PainPointKeyword {
  keyword: string;
  user_question: string;
  content_angle: string;
}

export interface CompetitorKeywordGap {
  keyword: string;
  difficulty_estimate: string;
  opportunity: string;
}

export interface ContentCluster {
  pillar_topic: string;
  pillar_keyword: string;
  cluster_keywords: { keyword: string; content_type: string }[];
}

export interface PriorityKeyword {
  keyword: string;
  search_volume: string;
  business_value: string;
  competition: string;
}

export interface KeywordDiscovery {
  seed_keywords: SeedKeyword[];
  long_tail_keywords: LongTailKeyword[];
  pain_point_keywords: PainPointKeyword[];
  competitor_keyword_gaps: CompetitorKeywordGap[];
  content_clusters: ContentCluster[];
  priority_matrix: PriorityKeyword[];
  seasonal_keywords: { keyword: string; peak_months: string[] }[];
  geo_targeted: { keyword: string; location: string }[];
}

export interface StrategicPillar {
  name: string;
  description: string;
  initiatives: string[];
}

export interface ChannelStrategy {
  channel: string;
  focus_percentage: number;
  rationale: string;
}

export interface GrowthTactic {
  tactic: string;
  description: string;
  expected_impact: string;
  effort: string;
}

export interface KPI {
  metric: string;
  target: string;
  channel: string;
}

export interface RoadmapPhase {
  focus: string;
  milestones: string[];
}

export interface Strategy {
  executive_summary: string;
  strategic_pillars: StrategicPillar[];
  target_audience: {
    demographics: string;
    psychographics: string;
    pain_points: string[];
    buying_triggers: string[];
  };
  brand_positioning: {
    unique_space: string;
    vs_competitors: string;
  };
  messaging_framework: {
    core_message: string;
    value_proposition: string;
    differentiators: string[];
    segment_messages: { segment: string; message: string }[];
  };
  channel_strategy: ChannelStrategy[];
  content_strategy: {
    themes: string[];
    primary_formats: string[];
    cadence: string;
    distribution: string[];
  };
  growth_tactics: GrowthTactic[];
  kpis: KPI[];
  roadmap_90_days: {
    phase_1_month_1: RoadmapPhase;
    phase_2_month_2: RoadmapPhase;
    phase_3_month_3: RoadmapPhase;
  };
}

export interface DetailedOpportunity {
  title: string;
  description: string;
  category: string;
  expected_impact: number;
  expected_effort: number;
  timeline_to_results: string;
  first_step: string;
}

export interface ScoreBreakdown {
  overall_score: number;
  grade: string;
  dimensions: {
    name: string;
    score: number;
    max_score: number;
    assessment: string;
    recommendation: string;
  }[];
  biggest_strength: string;
  biggest_weakness: string;
  one_thing_to_fix_first: string;
}

export type BrandVoiceScale = {
  humor: number;
  professionalism: number;
  technical_terms: number;
  provocative: number;
};

export type CompetitorDetail = {
  name: string;
  weakness: string;
  our_advantage: string;
};

export type ProductDigitalTwin = {
  product_name: string;
  core_value_prop: string;
  banned_words: string[];
  competitors: CompetitorDetail[];
};

// Progressive Pipeline Types
export type PipelineStage = "research" | "strategy" | "plan" | "assets" | "complete";

export interface ProgressiveResponse {
  strategyId: string;
  companyId: string;
  currentStage: PipelineStage;
  nextStage: PipelineStage | null;
  nextAvailable: boolean;
  data: Record<string, unknown>;
  message: string;
}

export interface ProgressiveRequest {
  companyId: string;
  websiteUrl?: string;
  companyName?: string;
  industry?: string;
  productDescription?: string;
  targetAudience?: string;
  targetCountry?: string;
  goal?: string;
  competitorUrls?: string[];
  strategyId?: string;
}

// ── Content Creator Types ────────────────────────────────────

export type ContentType = "tweet" | "linkedin_post" | "blog" | "newsletter";
export type ContentStatus = "draft" | "scheduled" | "published";

export interface ContentItem {
  contentId: string;
  companyId: string;
  type: ContentType;
  title: string;
  body: string;
  hashtags: string[];
  imageUrl?: string | null;
  status: ContentStatus;
  platformPostId?: string | null;
  platformUrl?: string | null;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContentRequest {
  type: ContentType;
  topic: string;
  additionalContext?: string;
}