import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { listCompanies } from "../api";
import { useAuthStore } from "../stores/authStore";
import { Company } from "../types";
import { Sidebar } from "../components/Sidebar";
import { ChatView } from "../components/ChatView";

export function ChatLayout() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();
  const { conversationId } = useParams();

  const refreshCompanies = useCallback(async () => {
    try {
      const data = await listCompanies();
      setCompanies(data);

      // Auto-select first company if none selected
      setSelectedCompanyId((prev) => {
        if (prev && data.some((c) => c.companyId === prev)) return prev;
        return data.length > 0 ? data[0].companyId : null;
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshCompanies();
  }, [refreshCompanies]);

  function handleLogout() {
    clearAuth();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Dark Sidebar */}
      <Sidebar
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        onSelectCompany={setSelectedCompanyId}
        onCompanyCreated={refreshCompanies}
        onLogout={handleLogout}
      />

      {/* Chat Area */}
      <div className="flex flex-1 flex-col bg-white">
        {selectedCompanyId ? (
          <ChatView
            companyId={selectedCompanyId}
            conversationId={conversationId ?? null}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <p className="text-slate-400 text-lg mb-2">No brand selected</p>
              <p className="text-slate-300 text-sm">
                Create or select a brand from the sidebar to get started
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}