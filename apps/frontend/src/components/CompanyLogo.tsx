import type { Company } from "../types";
import { initials } from "../utils";

export function CompanyLogo({ company, size = "md" }: { company?: Company; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-9 w-9" : "h-11 w-11";

  return (
    <div className={`${sizeClass} flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-900 text-sm font-bold text-white`}>
      {company?.logoUrl ? <img src={company.logoUrl} alt={`${company.name} logo`} className="h-full w-full object-cover" /> : initials(company?.name)}
    </div>
  );
}
