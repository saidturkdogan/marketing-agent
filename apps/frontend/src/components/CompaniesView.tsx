import { useEffect, useState } from "react";
import type { Company, CompanyPayload } from "../types";
import { parseList } from "../utils";
import { CompanyLogo } from "./CompanyLogo";
import { Header } from "./Header";

type CompaniesViewProps = {
  companies: Company[];
  selectedCompanyId?: string | null;
  onSave: (companyId: string | null, payload: CompanyPayload) => Promise<Company>;
  onSelect: (companyId: string) => void;
  onRefresh: () => Promise<void>;
};

const emptyForm = {
  name: "",
  websiteUrl: "",
  logoUrl: "",
  industry: "",
  description: "",
  targetAudience: "",
  brandVoice: "",
  valueProposition: "",
  productsOrServices: "",
  competitors: "",
  linkedin: "",
  instagram: "",
  x: "",
};

export function CompaniesView({ companies, selectedCompanyId, onSave, onSelect, onRefresh }: CompaniesViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void onRefresh();
  }, []);

  function edit(company: Company) {
    setEditingId(company.companyId);
    setForm({
      name: company.name || "",
      websiteUrl: company.websiteUrl || "",
      logoUrl: company.logoUrl || "",
      industry: company.industry || "",
      description: company.description || "",
      targetAudience: company.targetAudience || "",
      brandVoice: company.brandVoice || "",
      valueProposition: company.valueProposition || "",
      productsOrServices: (company.productsOrServices || []).join("\n"),
      competitors: (company.competitors || []).join("\n"),
      linkedin: company.socialLinks?.linkedin || "",
      instagram: company.socialLinks?.instagram || "",
      x: company.socialLinks?.x || "",
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await onSave(editingId, {
        name: form.name,
        websiteUrl: form.websiteUrl,
        logoUrl: form.logoUrl,
        industry: form.industry,
        description: form.description,
        targetAudience: form.targetAudience,
        brandVoice: form.brandVoice,
        valueProposition: form.valueProposition,
        productsOrServices: parseList(form.productsOrServices),
        competitors: parseList(form.competitors),
        socialLinks: {
          ...(form.linkedin ? { linkedin: form.linkedin } : {}),
          ...(form.instagram ? { instagram: form.instagram } : {}),
          ...(form.x ? { x: form.x } : {}),
        },
      });
      onSelect(saved.companyId);
      reset();
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
  }

  return (
    <>
      <Header
        eyebrow="Brand Foundation"
        title="Company Profiles"
        description="Store the company context that drives planning, positioning, copywriting, and platform-specific execution."
        action={<button onClick={() => void onRefresh()} className="btn-secondary"><i className="fas fa-sync" /> Refresh</button>}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <form onSubmit={(event) => void submit(event)} className="card">
          <div className="mb-6 border-b border-slate-200 pb-5">
            <h3 className="text-xl font-bold">{editingId ? "Edit Company" : "Create Company"}</h3>
            <p className="mt-1 text-sm text-slate-500">Logo is stored as URL in this version.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Company Name" required value={form.name} onChange={(name) => setForm({ ...form, name })} />
            <Field label="Industry" value={form.industry} onChange={(industry) => setForm({ ...form, industry })} />
            <Field label="Website / Live Link" type="url" value={form.websiteUrl} onChange={(websiteUrl) => setForm({ ...form, websiteUrl })} />
            <Field label="Logo URL" type="url" value={form.logoUrl} onChange={(logoUrl) => setForm({ ...form, logoUrl })} />
            <TextArea label="Description" value={form.description} onChange={(description) => setForm({ ...form, description })} />
            <TextArea label="Target Audience" value={form.targetAudience} onChange={(targetAudience) => setForm({ ...form, targetAudience })} />
            <TextArea label="Brand Voice" value={form.brandVoice} onChange={(brandVoice) => setForm({ ...form, brandVoice })} />
            <TextArea label="Value Proposition" value={form.valueProposition} onChange={(valueProposition) => setForm({ ...form, valueProposition })} />
            <TextArea label="Products or Services" value={form.productsOrServices} onChange={(productsOrServices) => setForm({ ...form, productsOrServices })} />
            <TextArea label="Competitors" value={form.competitors} onChange={(competitors) => setForm({ ...form, competitors })} />
            <Field label="LinkedIn URL" type="url" value={form.linkedin} onChange={(linkedin) => setForm({ ...form, linkedin })} />
            <Field label="Instagram URL" type="url" value={form.instagram} onChange={(instagram) => setForm({ ...form, instagram })} />
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button type="button" onClick={reset} className="btn-secondary">Clear</button>
            <button type="submit" disabled={saving} className="btn-primary">
              <i className={`fas ${saving ? "fa-spinner fa-spin" : "fa-save"}`} />
              {saving ? "Saving" : editingId ? "Update Company" : "Save Company"}
            </button>
          </div>
        </form>

        <div className="card">
          <h3 className="text-xl font-bold">Saved Companies</h3>
          <p className="mt-1 text-sm text-slate-500">Select the active company for campaign creation.</p>
          <div className="mt-5 space-y-4">
            {companies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No company profiles yet.</div>
            ) : (
              companies.map((company) => (
                <article key={company.companyId} className={`rounded-2xl border p-4 ${company.companyId === selectedCompanyId ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}>
                  <div className="flex gap-3">
                    <CompanyLogo company={company} />
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-bold">{company.name}</h4>
                      <p className="truncate text-sm text-slate-500">{company.industry || company.websiteUrl || "Company profile"}</p>
                    </div>
                  </div>
                  {company.valueProposition ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{company.valueProposition}</p> : null}
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => onSelect(company.companyId)} className="btn-primary py-2 text-xs">Use</button>
                    <button onClick={() => edit(company)} className="btn-secondary py-2 text-xs">Edit</button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  return (
    <label className="block">
      <span className="form-label">{label}{required ? " *" : ""}</span>
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="form-input" />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="form-label">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="form-input resize-y" />
    </label>
  );
}
