"use client";

import { useEffect, useState } from "react";

type StaffMember = {
  id: string;
  employeeNumber: string;
  displayName: string;
  status: "ACTIVE" | "ON_LEAVE" | "INACTIVE" | string;
  roles: string[];
};

type StaffOverview = {
  counts: { activeEmployees: number; employeesOnLeave: number; inactiveEmployees: number; totalEmployees: number };
  roleCounts: Array<{ role: string; employeeCount: number }>;
  items: StaffMember[];
  limit: number;
  hasMore: boolean;
};

type StaffBody = { success?: boolean; staff?: StaffOverview; error?: { message?: string } };

async function fetchStaff(): Promise<StaffOverview> {
  const response = await fetch("/api/clinic-manager/staff", { credentials: "same-origin", cache: "no-store" });
  const body = await response.json().catch(() => null) as StaffBody | null;
  if (!response.ok || !body?.success || !body.staff) {
    throw new Error(body?.error?.message ?? "Staff oversight could not be loaded.");
  }
  return body.staff;
}

function roleLabel(role: string): string {
  return role.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function statusLabel(status: StaffMember["status"]): string {
  if (status === "ACTIVE") return "Active";
  if (status === "ON_LEAVE") return "On leave";
  if (status === "INACTIVE") return "Inactive";
  return status;
}

function statusClass(status: StaffMember["status"]): string {
  if (status === "ACTIVE") return "bg-[#EAF4F1] text-[#176B67]";
  if (status === "ON_LEAVE") return "bg-[#FFF5E7] text-[#93621C]";
  return "bg-[#F1F3F2] text-[#697A74]";
}

export function StaffOversightView() {
  const [staff, setStaff] = useState<StaffOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchStaff()
      .then((data) => { if (active) setStaff(data); })
      .catch((error: unknown) => { if (active) setErrorMessage(error instanceof Error ? error.message : "Staff oversight could not be loaded."); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const refresh = async () => {
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      setStaff(await fetchStaff());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Staff oversight could not be loaded.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const panel = "rounded-2xl border border-[#E3ECE8] bg-white p-5 shadow-sm";

  return (
    <div className="space-y-6 text-[#243B3B]">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">Clinic operations</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Staff oversight</h1>
          <p className="mt-2 text-sm leading-6 text-[#74857F]">Employee status and active role assignments for the single clinic branch.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={isLoading || isRefreshing} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#C9DDD6] px-4 text-sm font-semibold text-[#176B67] hover:bg-[#F0F7F4] disabled:cursor-not-allowed disabled:opacity-50">
          {isRefreshing ? "Refreshing…" : "Refresh staff"}
        </button>
      </header>

      {errorMessage ? <p role="alert" className="rounded-2xl border border-[#F0D7CF] bg-[#FFF8F5] p-4 text-sm text-[#9C5543]">{errorMessage}</p> : null}

      <section aria-label="Staff status summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total employees", value: staff?.counts.totalEmployees },
          { label: "Active employees", value: staff?.counts.activeEmployees },
          { label: "On leave", value: staff?.counts.employeesOnLeave },
          { label: "Inactive employees", value: staff?.counts.inactiveEmployees },
        ].map((item) => (
          <article key={item.label} className={panel}>
            <p className="text-sm text-[#758680]">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-[#24504A]">{isLoading ? "—" : item.value ?? 0}</p>
          </article>
        ))}
      </section>

      <section className={`${panel} space-y-4`}>
        <div>
          <h2 className="text-lg font-semibold text-[#2D4742]">Active role coverage</h2>
          <p className="mt-1 text-sm text-[#7B8B85]">Counts represent employees with an active assignment for each role. An employee may appear in more than one role.</p>
        </div>
        {isLoading ? <div className="h-20 animate-pulse rounded-xl bg-[#F2F6F4]" /> : staff?.roleCounts.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {staff.roleCounts.map((item) => (
              <div key={item.role} className="flex items-center justify-between gap-3 rounded-xl border border-[#EEF2F0] bg-[#FBFCFB] px-4 py-3">
                <span className="text-sm font-medium text-[#526B63]">{roleLabel(item.role)}</span>
                <strong className="text-lg tabular-nums text-[#24504A]">{item.employeeCount}</strong>
              </div>
            ))}
          </div>
        ) : <p className="rounded-xl bg-[#F5F8F7] p-4 text-sm text-[#74857F]">No active role assignments are available.</p>}
      </section>

      <section className={`${panel} space-y-4`}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[#2D4742]">Employee directory</h2>
            <p className="mt-1 text-sm text-[#7B8B85]">Limited to employee number, display name, employment status, and active role assignments.</p>
          </div>
          {staff ? <span className="text-xs font-medium text-[#87958F]">Showing {staff.items.length} of {staff.counts.totalEmployees}</span> : null}
        </div>
        {isLoading ? <div className="h-36 animate-pulse rounded-xl bg-[#F2F6F4]" /> : staff?.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-start text-sm">
              <thead className="border-b border-[#E8EFEC] text-xs font-semibold uppercase tracking-wide text-[#87958F]">
                <tr><th className="py-3 pe-4">Employee</th><th className="py-3 pe-4">Employee number</th><th className="py-3 pe-4">Status</th><th className="py-3">Active roles</th></tr>
              </thead>
              <tbody>
                {staff.items.map((item) => (
                  <tr key={item.id} className="border-b border-[#EEF2F0] last:border-0">
                    <td className="py-3 pe-4 font-medium text-[#344F48]">{item.displayName}</td>
                    <td className="py-3 pe-4 tabular-nums text-[#697D75]">{item.employeeNumber}</td>
                    <td className="py-3 pe-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(item.status)}`}>{statusLabel(item.status)}</span></td>
                    <td className="py-3 text-[#697D75]">{item.roles.length ? item.roles.map(roleLabel).join(", ") : "No active role"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="rounded-xl bg-[#F5F8F7] p-5"><p className="font-medium text-[#425C55]">No employee records found</p><p className="mt-1 text-sm text-[#7B8B85]">Employee records will appear here when they are available in the clinic directory.</p></div>}
        {staff?.hasMore ? <p className="text-xs text-[#87958F]">The first {staff.limit} employees are displayed. Additional pages can be added if the clinic workforce grows beyond this limit.</p> : null}
      </section>

      <section className="rounded-2xl border border-[#DCEAE5] bg-[#EDF6F2] p-5">
        <h2 className="font-semibold text-[#31534B]">Access boundary</h2>
        <p className="mt-2 text-sm leading-6 text-[#647C73]">This is operational staff information only. Authentication emails, phone numbers, account credentials, permission administration, and patient medical records are not exposed in this workspace.</p>
      </section>
    </div>
  );
}
