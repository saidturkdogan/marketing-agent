import type { ReactNode } from "react";
import type { View } from "../types";

type LayoutProps = {
  activeView: View;
  onNavigate: (view: View) => void;
  children: ReactNode;
};

const navItems: Array<{ view: View; label: string; icon: string }> = [
  { view: "dashboard", label: "Dashboard", icon: "fa-chart-line" },
  { view: "companies", label: "Companies", icon: "fa-building" },
  { view: "create", label: "New Campaign", icon: "fa-plus" },
  { view: "campaigns", label: "Campaigns", icon: "fa-folder-open" },
  { view: "settings", label: "Settings", icon: "fa-gear" },
];

export function Layout({ activeView, onNavigate, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="border-b border-slate-200 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
              <i className="fas fa-robot" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Marketing</p>
              <h1 className="text-lg font-bold">Agent Console</h1>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                activeView === item.view
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <i className={`fas ${item.icon} w-5`} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-5">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              System Online
            </div>
            <p className="text-xs leading-5 text-slate-500">Company-aware campaign strategy is enabled.</p>
          </div>
        </div>
      </aside>

      <main className="lg:pl-72">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur lg:hidden">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-bold">Marketing Agent</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Online</span>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.view}
                onClick={() => onNavigate(item.view)}
                className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold ${
                  activeView === item.view ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">{children}</div>
      </main>
    </div>
  );
}
