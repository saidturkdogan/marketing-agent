import type { Company } from "./types";

export function parseList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function initials(name?: string) {
  return (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function normalizeCompanySnapshot(value: unknown): Company | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const company = value as Record<string, unknown>;
  return {
    companyId: String(company.companyId || company.company_id || ""),
    name: String(company.name || ""),
    websiteUrl: stringValue(company.websiteUrl || company.website_url),
    logoUrl: stringValue(company.logoUrl || company.logo_url),
    industry: stringValue(company.industry),
    description: stringValue(company.description),
    targetAudience: stringValue(company.targetAudience || company.target_audience),
    brandVoice: stringValue(company.brandVoice || company.brand_voice),
    valueProposition: stringValue(company.valueProposition || company.value_proposition),
    productsOrServices: arrayValue(company.productsOrServices || company.products_or_services),
    competitors: arrayValue(company.competitors),
    socialLinks: (company.socialLinks || company.social_links || {}) as Record<string, string>,
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}
