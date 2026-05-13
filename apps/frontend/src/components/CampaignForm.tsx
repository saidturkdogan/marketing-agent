import { useState } from "react";
import type { Campaign, Company } from "../types";
import { CompanyLogo } from "./CompanyLogo";
import { Header } from "./Header";

type CampaignFormProps = {
  companies: Company[];
  selectedCompanyId?: string | null;
  onSelectCompany: (companyId: string) => void;
  onSubmit: (campaign: Omit<Campaign, "status" | "createdAt" | "published" | "score" | "assets">) => Promise<void>;
  onCreateCompany: () => void;
};

const platformOptions = ["LinkedIn", "Twitter", "Instagram", "TikTok"];
const outputOptions = [
  { value: "social", label: "Social Media Posts" },
  { value: "blog", label: "Blog Post" },
  { value: "video", label: "Video Script" },
  { value: "images", label: "Image Prompts" },
];

export function CampaignForm({ companies, selectedCompanyId, onSelectCompany, onSubmit, onCreateCompany }: CampaignFormProps) {
  const [topic, setTopic] = useState("");
  const [platforms, setPlatforms] = useState(["LinkedIn"]);
  const [outputs, setOutputs] = useState(["social"]);
  const [autoPublish, setAutoPublish] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const company = companies.find((item) => item.companyId === selectedCompanyId);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedCompanyId || !company) {
      onCreateCompany();
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        id: `camp_${Date.now()}`,
        companyId: selectedCompanyId,
        company,
        topic,
        platforms,
        outputs,
        autoPublish,
      });
      setTopic("");
    } finally {
      setSubmitting(false);
    }
  }

  function toggle(value: string, selected: string[], setSelected: (value: string[]) => void) {
    setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  return (
    <>
      <Header
        eyebrow="Campaign Brief"
        title="Create Campaign"
        description="Choose the company context first, then define the campaign topic and required asset formats."
      />

      {companies.length === 0 ? (
        <div className="card border-amber-200 bg-amber-50">
          <h3 className="text-lg font-bold text-amber-950">Company profile required</h3>
          <p className="mt-2 text-sm text-amber-800">Create a company before generating strategy and copy.</p>
          <button onClick={onCreateCompany} className="btn-primary mt-5">Create Company</button>
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="card">
            <div className="grid gap-6">
              <label>
                <span className="form-label">Company *</span>
                <select value={selectedCompanyId || ""} onChange={(event) => onSelectCompany(event.target.value)} className="form-input">
                  {companies.map((item) => (
                    <option key={item.companyId} value={item.companyId}>{item.name}</option>
                  ))}
                </select>
              </label>

              <label>
                <span className="form-label">Campaign Topic *</span>
                <textarea
                  required
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  rows={5}
                  placeholder="e.g., Launch announcement for an AI-powered marketing automation platform"
                  className="form-input resize-y"
                />
              </label>

              <div>
                <span className="form-label">Platforms</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {platformOptions.map((platform) => (
                    <label key={platform} className={`option-card ${platforms.includes(platform) ? "option-card-active" : ""}`}>
                      <input type="checkbox" checked={platforms.includes(platform)} onChange={() => toggle(platform, platforms, setPlatforms)} className="sr-only" />
                      <span className="font-semibold">{platform}</span>
                      <span className="text-xs text-slate-500">{platform === "LinkedIn" ? "Ready" : "Draft only"}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <span className="form-label">Asset Types</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {outputOptions.map((option) => (
                    <label key={option.value} className={`option-card ${outputs.includes(option.value) ? "option-card-active" : ""}`}>
                      <input type="checkbox" checked={outputs.includes(option.value)} onChange={() => toggle(option.value, outputs, setOutputs)} className="sr-only" />
                      <span className="font-semibold">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span>
                  <span className="block font-semibold">Auto-publish to LinkedIn</span>
                  <span className="text-sm text-slate-500">Only runs after the review step passes guardrails.</span>
                </span>
                <input type="checkbox" checked={autoPublish} onChange={(event) => setAutoPublish(event.target.checked)} className="h-5 w-5 accent-slate-950" />
              </label>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-200 pt-5">
              <button disabled={submitting || platforms.length === 0 || outputs.length === 0} className="btn-primary">
                <i className={`fas ${submitting ? "fa-spinner fa-spin" : "fa-wand-magic-sparkles"}`} />
                {submitting ? "Generating" : "Generate Campaign"}
              </button>
            </div>
          </div>

          <aside className="card h-fit">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Active Company</p>
            {company ? (
              <div className="mt-5">
                <div className="flex gap-3">
                  <CompanyLogo company={company} size="lg" />
                  <div>
                    <h3 className="text-lg font-bold">{company.name}</h3>
                    <p className="text-sm text-slate-500">{company.industry || company.websiteUrl}</p>
                  </div>
                </div>
                <dl className="mt-6 space-y-4 text-sm">
                  <CompanyDetail label="Audience" value={company.targetAudience} />
                  <CompanyDetail label="Brand Voice" value={company.brandVoice} />
                  <CompanyDetail label="Value" value={company.valueProposition} />
                </dl>
              </div>
            ) : null}
          </aside>
        </form>
      )}
    </>
  );
}

function CompanyDetail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 leading-6 text-slate-800">{value || "Not specified"}</dd>
    </div>
  );
}
