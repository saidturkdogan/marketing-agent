import type { Campaign, Company, View } from "../types";
import { CompanyLogo } from "./CompanyLogo";
import { Header } from "./Header";

type DashboardProps = {
  campaigns: Campaign[];
  companies: Company[];
  onNavigate: (view: View) => void;
  onOpenCampaign: (campaign: Campaign) => void;
};

export function Dashboard({ campaigns, companies, onNavigate, onOpenCampaign }: DashboardProps) {
  const completed = campaigns.filter((campaign) => campaign.status === "completed").length;
  const published = campaigns.filter((campaign) => campaign.published).length;
  const avgScore =
    campaigns.length > 0
      ? (campaigns.reduce((sum, campaign) => sum + (campaign.score || 0), 0) / campaigns.length).toFixed(2)
      : "0.00";

  return (
    <>
      <Header
        eyebrow="Executive Overview"
        title="Campaign Operations"
        description="Manage company profiles, generate market-aware content, and review campaign outputs from a single corporate console."
        action={
          <button onClick={() => onNavigate("create")} className="btn-primary">
            <i className="fas fa-plus" /> New Campaign
          </button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Companies" value={companies.length} icon="fa-building" />
        <Metric label="Campaigns" value={campaigns.length} icon="fa-folder-open" />
        <Metric label="Completed" value={completed} icon="fa-circle-check" />
        <Metric label="Avg Score" value={avgScore} icon="fa-chart-simple" />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Recent Campaigns</h3>
              <p className="text-sm text-slate-500">Latest company-linked content generation runs.</p>
            </div>
            <button onClick={() => onNavigate("campaigns")} className="btn-secondary">View all</button>
          </div>

          {campaigns.length === 0 ? (
            <EmptyState title="No campaigns yet" description="Create your first campaign after adding a company profile." />
          ) : (
            <div className="space-y-3">
              {campaigns.slice(0, 5).map((campaign) => (
                <button key={campaign.id} onClick={() => onOpenCampaign(campaign)} className="list-row text-left">
                  <CompanyLogo company={campaign.company} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-950">{campaign.topic}</p>
                    <p className="text-sm text-slate-500">
                      {campaign.company?.name || "Company"} · {campaign.platforms.join(", ")}
                    </p>
                  </div>
                  <StatusPill status={campaign.status} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-bold">Publishing Readiness</h3>
          <p className="mt-1 text-sm text-slate-500">LinkedIn publishing uses approved campaign outputs and configured access tokens.</p>
          <div className="mt-6 space-y-4">
            <Readiness label="Company profile" ready={companies.length > 0} />
            <Readiness label="Campaign history" ready={campaigns.length > 0} />
            <Readiness label="Published posts" ready={published > 0} />
          </div>
        </div>
      </section>
    </>
  );
}

function Metric({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="card">
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
        <i className={`fas ${icon}`} />
      </div>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

export function StatusPill({ status }: { status: Campaign["status"] }) {
  const classes = {
    completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    running: "bg-blue-50 text-blue-700 ring-blue-200",
    failed: "bg-red-50 text-red-700 ring-red-200",
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ring-1 ${classes[status]}`}>{status}</span>;
}

function Readiness({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
      <span className="text-sm font-semibold">{label}</span>
      <span className={ready ? "text-sm font-bold text-emerald-700" : "text-sm font-bold text-slate-400"}>
        {ready ? "Ready" : "Pending"}
      </span>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
