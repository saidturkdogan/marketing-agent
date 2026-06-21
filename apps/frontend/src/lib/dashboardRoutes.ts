export type DashboardView = "overview" | "agent" | "content" | "approval" | "settings" | "mails";

export const DASHBOARD_VIEWS: DashboardView[] = [
  "overview",
  "agent",
  "content",
  "approval",
  "settings",
  "mails",
];

export function isDashboardView(value: string | null | undefined): value is DashboardView {
  return !!value && DASHBOARD_VIEWS.includes(value as DashboardView);
}

export function dashboardPath(companyId: string, view: DashboardView = "overview"): string {
  if (view === "overview") return `/dashboard/${companyId}`;
  return `/dashboard/${companyId}/${view}`;
}

export function resolveDashboardView(tabParam?: string | null, queryTab?: string | null): DashboardView {
  if (isDashboardView(tabParam) && tabParam !== "overview") return tabParam;
  if (isDashboardView(queryTab) && queryTab !== "overview") return queryTab;
  return "overview";
}
