import type { Campaign } from "../types";
import { CompanyLogo } from "./CompanyLogo";
import { StatusPill } from "./Dashboard";
import { Header } from "./Header";

export function CampaignList({ campaigns, onOpen }: { campaigns: Campaign[]; onOpen: (campaign: Campaign) => void }) {
  return (
    <>
      <Header
        eyebrow="Archive"
        title="Campaigns"
        description="Browse generated campaign runs and reopen their assets."
      />

      <div className="card">
        {campaigns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <p className="font-semibold">No campaigns yet</p>
            <p className="mt-1 text-sm text-slate-500">Generated campaigns will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <button key={campaign.id} onClick={() => onOpen(campaign)} className="list-row text-left">
                <CompanyLogo company={campaign.company} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{campaign.topic}</p>
                  <p className="text-sm text-slate-500">
                    {campaign.company?.name || "Company"} · {new Date(campaign.createdAt).toLocaleDateString()} · {campaign.platforms.join(", ")}
                  </p>
                </div>
                <StatusPill status={campaign.status} />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
