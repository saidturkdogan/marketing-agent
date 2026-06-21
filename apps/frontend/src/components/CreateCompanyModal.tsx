import { useState } from "react";
import { createCompany } from "../api";
import type { CompanyPayload, BrandVoiceScale } from "../types";
import BrandVoiceSliders from "./BrandVoiceSliders";
import { X, Plus, Trash2 } from "lucide-react";

type Props = {
  onClose: () => void;
  onCreated: (companyId: string) => void;
};

export function CreateCompanyModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [productName, setProductName] = useState("");
  const [coreValueProp, setCoreValueProp] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [brandVoice, setBrandVoice] = useState("");
  const [valueProposition, setValueProposition] = useState("");
  const [products, setProducts] = useState<string[]>([""]);
  const [competitors, setCompetitors] = useState<string[]>([""]);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [socialKey, setSocialKey] = useState("");
  const [socialValue, setSocialValue] = useState("");
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [bannedInput, setBannedInput] = useState("");
  const [brandVoiceScale, setBrandVoiceScale] = useState<BrandVoiceScale>({
    humor: 5, professionalism: 5, technical_terms: 5, provocative: 5,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    const payload: CompanyPayload = {
      name: name.trim(),
      productName: productName.trim() || undefined,
      coreValueProp: coreValueProp.trim() || undefined,
      websiteUrl: websiteUrl.trim() || undefined,
      logoUrl: logoUrl.trim() || undefined,
      industry: industry.trim() || undefined,
      description: description.trim() || undefined,
      targetAudience: targetAudience.trim() || undefined,
      brandVoice: brandVoice.trim() || undefined,
      valueProposition: valueProposition.trim() || undefined,
      productsOrServices: products.filter((p) => p.trim()),
      competitors: competitors.filter((c) => c.trim()),
      socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
      bannedWords: bannedWords.length > 0 ? bannedWords : undefined,
      brandVoiceScale,
    };

    try {
      const created = await createCompany(payload);
      onCreated(created.companyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create brand");
    } finally {
      setLoading(false);
    }
  }

  function updateProduct(index: number, value: string) {
    const updated = [...products];
    updated[index] = value;
    if (index === updated.length - 1 && value.trim()) updated.push("");
    setProducts(updated);
  }

  function removeProduct(index: number) {
    if (products.length <= 1) return;
    setProducts(products.filter((_, i) => i !== index));
  }

  function updateCompetitor(index: number, value: string) {
    const updated = [...competitors];
    updated[index] = value;
    if (index === updated.length - 1 && value.trim()) updated.push("");
    setCompetitors(updated);
  }

  function removeCompetitor(index: number) {
    if (competitors.length <= 1) return;
    setCompetitors(competitors.filter((_, i) => i !== index));
  }

  function addSocialLink() {
    if (!socialKey.trim() || !socialValue.trim()) return;
    setSocialLinks({ ...socialLinks, [socialKey.trim()]: socialValue.trim() });
    setSocialKey("");
    setSocialValue("");
  }

  function removeSocialLink(key: string) {
    const updated = { ...socialLinks };
    delete updated[key];
    setSocialLinks(updated);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Create New Brand</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name (required) */}
          <div>
            <label className="form-label">Brand Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Acme Corp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Logo URL */}
          <div>
            <label className="form-label">Logo URL</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://example.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Preview"
                className="mt-2 h-10 w-10 rounded-lg object-cover border"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </div>

          {/* Website + Industry */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Website</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://example.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Industry</label>
              <select
                className="form-input"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                <option value="">Select...</option>
                <option value="E-commerce">E-commerce</option>
                <option value="SaaS">SaaS</option>
                <option value="Fintech">Fintech</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Education">Education</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Retail">Retail</option>
                <option value="Food & Beverage">Food & Beverage</option>
                <option value="Travel">Travel</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Technology">Technology</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="form-label">Brand Description</label>
            <textarea
              className="form-textarea"
              placeholder="Describe your brand, mission, and values..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Target Audience */}
          <div>
            <label className="form-label">Target Audience</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Gen Z professionals, small business owners..."
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
            />
          </div>

          {/* Brand Voice */}
          <div>
            <label className="form-label">Brand Voice / Tone</label>
            <select
              className="form-input"
              value={brandVoice}
              onChange={(e) => setBrandVoice(e.target.value)}
            >
              <option value="">Select...</option>
              <option value="Professional">Professional</option>
              <option value="Friendly">Friendly</option>
              <option value="Bold">Bold</option>
              <option value="Playful">Playful</option>
              <option value="Luxury">Luxury</option>
              <option value="Inspirational">Inspirational</option>
              <option value="Technical">Technical</option>
            </select>
          </div>

          {/* Value Proposition */}
          <div>
            <label className="form-label">Value Proposition</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. The fastest way to manage your finances"
              value={valueProposition}
              onChange={(e) => setValueProposition(e.target.value)}
            />
          </div>

          {/* Product Name */}
          <div>
            <label className="form-label">Product Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Ovura"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>

          {/* Core Value Prop */}
          <div>
            <label className="form-label">Core Value Proposition</label>
            <textarea
              className="form-textarea"
              placeholder="e.g. AI-native personalized nutrition and health tracking"
              value={coreValueProp}
              onChange={(e) => setCoreValueProp(e.target.value)}
              rows={2}
            />
          </div>

          {/* Brand Voice Scale */}
          <div className="rounded-lg border border-slate-200 p-4">
            <BrandVoiceSliders value={brandVoiceScale} onChange={setBrandVoiceScale} />
          </div>

          {/* Banned Words */}
          <div>
            <label className="form-label">Banned Words (agent will never use)</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                className="form-input flex-1"
                placeholder="Add a banned word..."
                value={bannedInput}
                onChange={(e) => setBannedInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const w = bannedInput.trim();
                    if (w && !bannedWords.includes(w)) {
                      setBannedWords([...bannedWords, w]);
                    }
                    setBannedInput("");
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const w = bannedInput.trim();
                  if (w && !bannedWords.includes(w)) {
                    setBannedWords([...bannedWords, w]);
                  }
                  setBannedInput("");
                }}
                className="rounded-lg bg-blue-500 px-3 py-2 text-white text-sm hover:bg-blue-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {bannedWords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {bannedWords.map((w, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                    {w}
                    <button
                      type="button"
                      onClick={() => setBannedWords(bannedWords.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600 ml-0.5"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Products / Services */}
          <div>
            <label className="form-label">Products / Services</label>
            <div className="space-y-2">
              {products.map((product, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    className="form-input"
                    placeholder={`Product or service #${index + 1}`}
                    value={product}
                    onChange={(e) => updateProduct(index, e.target.value)}
                  />
                  {products.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProduct(index)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Competitors */}
          <div>
            <label className="form-label">Competitors</label>
            <div className="space-y-2">
              {competitors.map((comp, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    className="form-input"
                    placeholder={`Competitor #${index + 1}`}
                    value={comp}
                    onChange={(e) => updateCompetitor(index, e.target.value)}
                  />
                  {competitors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCompetitor(index)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Social Links */}
          <div>
            <label className="form-label">Social Media Links</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                className="form-input flex-1"
                placeholder="Platform (e.g. Instagram)"
                value={socialKey}
                onChange={(e) => setSocialKey(e.target.value)}
              />
              <input
                type="url"
                className="form-input flex-1"
                placeholder="https://..."
                value={socialValue}
                onChange={(e) => setSocialValue(e.target.value)}
              />
              <button
                type="button"
                onClick={addSocialLink}
                className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            {Object.entries(socialLinks).length > 0 && (
              <div className="space-y-1">
                {Object.entries(socialLinks).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="font-medium">{key}:</span>
                    <span className="truncate">{val}</span>
                    <button
                      type="button"
                      onClick={() => removeSocialLink(key)}
                      className="ml-auto text-slate-400 hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {loading ? "Creating..." : "Create Brand"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}