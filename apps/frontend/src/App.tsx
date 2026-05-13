import { useEffect, useMemo, useState } from "react";
import { createCampaign, createCompany, listCompanies, publishLinkedIn, updateCompany } from "./api";
import { CampaignForm } from "./components/CampaignForm";
import { CampaignList } from "./components/CampaignList";
import { CompaniesView } from "./components/CompaniesView";
import { Dashboard } from "./components/Dashboard";
import { Layout } from "./components/Layout";
import { CampaignResults } from "./components/CampaignResults";
import { SettingsView } from "./components/SettingsView";
import type { Campaign, Company, CompanyPayload, View } from "./types";
import { normalizeCompanySnapshot } from "./utils";

const CAMPAIGNS_KEY = "campaigns";
const SELECTED_COMPANY_KEY = "selectedCompanyId";

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => loadCampaigns());
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(() => localStorage.getItem(SELECTED_COMPANY_KEY));
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshCompanies();
  }, []);

  useEffect(() => {
    localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
  }, [campaigns]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.companyId === selectedCompanyId),
    [companies, selectedCompanyId],
  );

  async function refreshCompanies() {
    const data = await listCompanies();
    setCompanies(data);

    const current = localStorage.getItem(SELECTED_COMPANY_KEY);
    if (data.length > 0 && !data.some((company) => company.companyId === current)) {
      selectCompany(data[0].companyId);
    }
  }

  function selectCompany(companyId: string) {
    setSelectedCompanyId(companyId);
    localStorage.setItem(SELECTED_COMPANY_KEY, companyId);
  }

  async function saveCompany(companyId: string | null, payload: CompanyPayload) {
    const saved = companyId ? await updateCompany(companyId, payload) : await createCompany(payload);
    await refreshCompanies();
    selectCompany(saved.companyId);
    return saved;
  }

  async function runCampaign(draft: Omit<Campaign, "status" | "createdAt" | "published" | "score" | "assets">) {
    setError(null);
    const running: Campaign = {
      ...draft,
      status: "running",
      createdAt: new Date().toISOString(),
      published: false,
      score: null,
      assets: {},
    };

    setCampaigns((items) => [running, ...items]);
    setView("dashboard");

    try {
      const response = await createCampaign({
        companyId: draft.companyId,
        topic: draft.topic,
        platforms: draft.platforms,
        outputs: draft.outputs,
      });

      const company = normalizeCompanySnapshot(response.company) || selectedCompany || draft.company;
      const completed: Campaign = {
        ...running,
        id: response.campaign_id || running.id,
        companyId: response.company_id || running.companyId,
        company,
        status: "completed",
        assets: response.assets || {},
        score: response.performance_score ?? getAnalyticsScore(response.assets),
      };

      if (draft.autoPublish && draft.platforms.includes("LinkedIn")) {
        const publishResult = await publishLinkedIn(completed.id);
        completed.published = publishResult.status === "published";
      }

      setCampaigns((items) => items.map((item) => (item.id === running.id ? completed : item)));
      setActiveCampaign(completed);
      setView("campaigns");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Campaign failed";
      setError(message);
      setCampaigns((items) => items.map((item) => (item.id === running.id ? { ...item, status: "failed", error: message } : item)));
    }
  }

  function openCampaign(campaign: Campaign) {
    setActiveCampaign(campaign);
    setView("campaigns");
  }

  function renderView() {
    if (activeCampaign && view === "campaigns") {
      return <CampaignResults campaign={activeCampaign} onNavigate={setView} />;
    }

    switch (view) {
      case "companies":
        return (
          <CompaniesView
            companies={companies}
            selectedCompanyId={selectedCompanyId}
            onSave={saveCompany}
            onSelect={selectCompany}
            onRefresh={refreshCompanies}
          />
        );
      case "create":
        return (
          <CampaignForm
            companies={companies}
            selectedCompanyId={selectedCompanyId}
            onSelectCompany={selectCompany}
            onSubmit={runCampaign}
            onCreateCompany={() => setView("companies")}
          />
        );
      case "campaigns":
        return <CampaignList campaigns={campaigns} onOpen={openCampaign} />;
      case "settings":
        return <SettingsView />;
      case "dashboard":
      default:
        return <Dashboard campaigns={campaigns} companies={companies} onNavigate={setView} onOpenCampaign={openCampaign} />;
    }
  }

  return (
    <Layout
      activeView={view}
      onNavigate={(nextView) => {
        setActiveCampaign(null);
        setView(nextView);
      }}
    >
      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}
      {renderView()}
    </Layout>
  );
}

function loadCampaigns(): Campaign[] {
  try {
    return JSON.parse(localStorage.getItem(CAMPAIGNS_KEY) || "[]") as Campaign[];
  } catch {
    return [];
  }
}

function getAnalyticsScore(assets: Record<string, unknown>) {
  const analytics = assets.analytics;
  if (analytics && typeof analytics === "object" && "performance_score" in analytics) {
    const score = Number((analytics as { performance_score?: unknown }).performance_score);
    return Number.isFinite(score) ? score : null;
  }
  return null;
}
