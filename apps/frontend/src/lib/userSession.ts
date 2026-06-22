import { listCompanies } from "../api";
import { dashboardPath, resolveDashboardView } from "./dashboardRoutes";

const ACTIVE_USER_KEY = "plinth-active-user-id";
const LAST_DASHBOARD_KEY = "plinth-last-dashboard";

export function clearPlinthUserCache() {
  sessionStorage.removeItem(LAST_DASHBOARD_KEY);
}

/** Returns true when the signed-in Clerk user changed (account switch). */
export function noteActiveUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const previous = localStorage.getItem(ACTIVE_USER_KEY);
  const changed = Boolean(previous && previous !== userId);
  localStorage.setItem(ACTIVE_USER_KEY, userId);
  if (changed) {
    clearPlinthUserCache();
  }
  return changed;
}

export function clearActiveUser() {
  localStorage.removeItem(ACTIVE_USER_KEY);
  clearPlinthUserCache();
}

export function getStoredDashboardPath(): string | null {
  return sessionStorage.getItem(LAST_DASHBOARD_KEY);
}

export function setStoredDashboardPath(path: string) {
  sessionStorage.setItem(LAST_DASHBOARD_KEY, path);
}

export function extractCompanyIdFromDashboardPath(path: string): string | null {
  const match = path.match(/^\/dashboard\/([^/]+)/);
  return match?.[1] ?? null;
}

export async function resolveDashboardTarget(): Promise<string> {
  const companies = await listCompanies();
  if (companies.length === 0) return "/onboarding";

  const ids = new Set(companies.map((c) => c.companyId));
  const stored = getStoredDashboardPath();
  const storedCompanyId = stored ? extractCompanyIdFromDashboardPath(stored) : null;
  if (stored && storedCompanyId && ids.has(storedCompanyId)) {
    return stored;
  }
  return dashboardPath(companies[0].companyId, resolveDashboardView());
}
