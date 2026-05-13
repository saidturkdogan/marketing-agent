import { useEffect, useState } from "react";
import { healthCheck } from "../api";
import { Header } from "./Header";

export function SettingsView() {
  const [status, setStatus] = useState<"checking" | "ok" | "error">("checking");

  async function check() {
    setStatus("checking");
    try {
      const health = await healthCheck();
      setStatus(health.status === "ok" ? "ok" : "error");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    void check();
  }, []);

  return (
    <>
      <Header
        eyebrow="System"
        title="Settings"
        description="Review integration readiness and backend connectivity."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <IntegrationCard
          title="Backend API"
          icon="fa-server"
          status={status === "checking" ? "Checking" : status === "ok" ? "Online" : "Unavailable"}
          ready={status === "ok"}
          onCheck={() => void check()}
        />
        <IntegrationCard title="LinkedIn" icon="fa-linkedin" status="Configured by environment" ready />
        <IntegrationCard title="Instagram" icon="fa-instagram" status="Optional" ready={false} />
      </div>
    </>
  );
}

function IntegrationCard({ title, icon, status, ready, onCheck }: { title: string; icon: string; status: string; ready: boolean; onCheck?: () => void }) {
  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
          <i className={`${icon === "fa-server" ? "fas" : "fab"} ${icon}`} />
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${ready ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {ready ? "Ready" : "Pending"}
        </span>
      </div>
      <h3 className="font-bold">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{status}</p>
      {onCheck ? <button onClick={onCheck} className="btn-secondary mt-5">Check Status</button> : null}
    </div>
  );
}
