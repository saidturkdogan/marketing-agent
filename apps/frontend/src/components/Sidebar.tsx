import { useState, useRef, useEffect } from "react";
import { Company } from "../types";
import { useAuthStore } from "../stores/authStore";
import {
  Sparkles,
  ChevronDown,
  Plus,
  Search,
  LogOut,
  Building2,
  Check,
} from "lucide-react";
import { CreateCompanyModal } from "./CreateCompanyModal";

type Props = {
  companies: Company[];
  selectedCompanyId: string | null;
  onSelectCompany: (id: string) => void;
  onCompanyCreated: () => void;
  onLogout: () => void;
};

export function Sidebar({
  companies,
  selectedCompanyId,
  onSelectCompany,
  onCompanyCreated,
  onLogout,
}: Props) {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const userName = useAuthStore((s) => s.name);
  const userEmail = useAuthStore((s) => s.email);

  const selectedCompany = companies.find((c) => c.companyId === selectedCompanyId);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = search.trim()
    ? companies.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    : companies;

  return (
    <>
      <aside className="sidebar flex h-screen w-72 flex-col border-r border-slate-800" style={{ minWidth: 288 }}>
        {/* Company Switcher */}
        <div className="relative p-3" ref={switcherRef}>
          <button
            onClick={() => setSwitcherOpen(!switcherOpen)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-slate-800"
          >
            {selectedCompany?.logoUrl ? (
              <img
                src={selectedCompany.logoUrl}
                alt=""
                className="h-7 w-7 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
                {selectedCompany?.name?.charAt(0) ?? "B"}
              </div>
            )}
            <span className="flex-1 truncate text-left font-medium text-slate-200">
              {selectedCompany?.name ?? "Select brand"}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform ${
                switcherOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown */}
          {switcherOpen && (
            <div className="absolute left-3 right-3 top-full z-40 mt-1 rounded-xl border border-slate-700 bg-slate-800 shadow-2xl">
              {/* Search */}
              <div className="p-2">
                <div className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2">
                  <Search className="h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search brands..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
                  />
                </div>
              </div>

              {/* List */}
              <div className="max-h-60 overflow-y-auto px-1 pb-1">
                {filtered.map((company) => (
                  <button
                    key={company.companyId}
                    onClick={() => {
                      onSelectCompany(company.companyId);
                      setSwitcherOpen(false);
                      setSearch("");
                    }}
                    className={`company-switcher-item w-full text-left text-sm ${
                      company.companyId === selectedCompanyId ? "selected" : ""
                    }`}
                  >
                    {company.logoUrl ? (
                      <img
                        src={company.logoUrl}
                        alt=""
                        className="h-6 w-6 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-700 text-xs font-bold text-slate-300">
                        {company.name.charAt(0)}
                      </div>
                    )}
                    <span className="flex-1 truncate text-slate-200">
                      {company.name}
                    </span>
                    {company.companyId === selectedCompanyId && (
                      <Check className="h-4 w-4 text-blue-400" />
                    )}
                  </button>
                ))}

                {filtered.length === 0 && (
                  <p className="px-4 py-3 text-xs text-slate-500">No brands found</p>
                )}
              </div>

              {/* Create new */}
              <div className="border-t border-slate-700 p-1">
                <button
                  onClick={() => {
                    setSwitcherOpen(false);
                    setShowCreateModal(true);
                    setSearch("");
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-700"
                >
                  <Plus className="h-4 w-4 text-blue-400" />
                  Create new brand
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation - Chat history placeholder */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <p className="sidebar-section-title">Chat History</p>
          <p className="px-4 py-3 text-xs text-slate-600">
            Your conversations will appear here
          </p>
        </div>

        {/* User Footer */}
        <div className="border-t border-slate-800 p-3">
          <div className="mb-2 flex items-center gap-3 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300">
              {userName?.charAt(0) ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-slate-300">
                {userName}
              </p>
              <p className="truncate text-xs text-slate-500">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="sidebar-nav-item text-red-400 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {showCreateModal && (
        <CreateCompanyModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            onCompanyCreated();
          }}
        />
      )}
    </>
  );
}