"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { EMPLOYEE_ROLES, type EmployeeRole } from "@/server/auth/authorization/types";

type ApiErrorBody = { error?: { message?: string } };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...init });
  const body = await response.json().catch(() => null) as (T & ApiErrorBody) | null;
  if (!response.ok || !body) throw new Error(body?.error?.message ?? "The administration request could not be completed.");
  return body;
}

const panel = "rounded-2xl border border-[#E3ECE8] bg-white p-5 shadow-sm";
const labelClass = "text-xs font-semibold uppercase tracking-[0.12em] text-[#78908A]";
const controlClass = "min-h-10 rounded-xl border border-[#DCE7E3] bg-white px-3 text-sm text-[#29443F] outline-none focus:border-[#71AAA0] focus:ring-2 focus:ring-[#D7ECE6]";

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#71918A]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#243B3B]">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#74857F]">{description}</p>
      </div>
      {action}
    </header>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <p role="alert" className="rounded-2xl border border-[#F0D7CF] bg-[#FFF8F5] p-4 text-sm text-[#9C5543]">{message}</p>;
}

function LoadingState() {
  return <div className={`${panel} text-sm text-[#82928C]`} role="status">Loading administration data…</div>;
}

function StatCard({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return <article className={panel}><p className="text-sm font-medium text-[#647C73]">{label}</p><p className="mt-3 text-3xl font-semibold tabular-nums text-[#24504A]">{value}</p><p className="mt-2 text-xs leading-5 text-[#87958F]">{detail}</p></article>;
}

type Overview = {
  generatedAt: string;
  counts: {
    totalEmployees: number; activeEmployees: number; linkedEmployees: number; activeRoleAssignments: number;
    specialties: number; doctors: number; services: number; auditEventsLast24Hours: number;
  };
};

export function SystemAdminDashboardView() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const body = await requestJson<{ overview: Overview }>("/api/system-admin/overview");
      setOverview(body.overview);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The dashboard could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    void requestJson<{ overview: Overview }>("/api/system-admin/overview")
      .then((body) => {
        if (active) {
          setOverview(body.overview);
          setError(null);
        }
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "The dashboard could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);
  const cards = overview ? [
    ["Employees", overview.counts.totalEmployees, `${overview.counts.activeEmployees} active employees`],
    ["Verified employee accounts", overview.counts.linkedEmployees, "Employee identities linked and verified"],
    ["Active role assignments", overview.counts.activeRoleAssignments, "Assignments currently granting workspace access"],
    ["Doctors", overview.counts.doctors, "Existing doctor profiles"],
    ["Specialties & services", `${overview.counts.specialties} / ${overview.counts.services}`, "Configured clinic catalog records"],
    ["Audit events · 24 hours", overview.counts.auditEventsLast24Hours, "Recent recorded administrative and workflow events"],
  ] as const : [];
  return <div className="space-y-6">
    <PageHeader eyebrow="Technical administration" title="System administration" description="Manage employee access, inspect the fixed role model, and review technical audit activity. Clinic operations and patient records remain outside this workspace." action={<button type="button" onClick={() => { setLoading(true); setError(null); void refresh(); }} className={`${controlClass} font-semibold text-[#176B67]`}>Refresh overview</button>} />
    {error ? <ErrorMessage message={error} /> : null}
    {loading && !overview ? <LoadingState /> : <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value, detail]) => <StatCard key={label} label={label} value={value} detail={detail} />)}</section>}
    <section className={`${panel} space-y-3`}>
      <h2 className="text-lg font-semibold text-[#2D4742]">Administration shortcuts</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[
          ["Users & role assignments", "/system-admin/users", "Review linked employee accounts and assign or revoke existing roles."],
          ["Roles & permissions", "/system-admin/roles", "Inspect the fixed least-privilege permission matrix."],
          ["Doctors & clinic catalog", "/system-admin/master-data", "Inspect the specialties, doctors, services, and current prices."],
          ["Schedules", "/system-admin/schedules", "Review clinic hours and active doctor schedules."],
          ["Audit logs", "/system-admin/audit-logs", "Review administrative and operational change history."],
          ["System settings", "/system-admin/settings", "Review current configuration boundaries and settings availability."],
        ].map(([title, href, detail]) => <Link key={href} href={href} className="rounded-xl border border-[#E5EEEA] p-4 transition hover:border-[#A7C9BF] hover:bg-[#F8FBFA]"><h3 className="font-semibold text-[#31534B]">{title}</h3><p className="mt-1 text-xs leading-5 text-[#7B8D86]">{detail}</p></Link>)}
      </div>
    </section>
    <section className="rounded-2xl border border-[#DCEAE5] bg-[#EDF6F2] p-5"><h2 className="font-semibold text-[#31534B]">Security boundary</h2><p className="mt-2 text-sm leading-6 text-[#647C73]">System Admin can administer employee access and technical configuration. This role does not grant routine access to patient profiles, encounters, prescriptions, diagnostic values, or medical records. Clinic Manager permissions remain separate.</p></section>
  </div>;
}

type UserRow = {
  id: string; employeeNumber: string; displayName: string; status: string; workEmail: string | null;
  account: { email: string; emailVerified: boolean; linkedAt: string; linkVerified: boolean } | null;
  roles: Array<{ role: EmployeeRole; status: "ACTIVE" | "REVOKED"; grantedAt: string; revokedAt: string | null; reason: string | null }>;
};

export function SystemAdminUsersView() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<Record<string, EmployeeRole>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const body = await requestJson<{ users: { items: UserRow[] } }>("/api/system-admin/users");
      setItems(body.users.items);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The employee list could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    void requestJson<{ users: { items: UserRow[] } }>("/api/system-admin/users")
      .then((body) => {
        if (active) {
          setItems(body.users.items);
          setError(null);
        }
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "The employee list could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);
  const filtered = useMemo(() => items.filter((item) => `${item.displayName} ${item.employeeNumber} ${item.workEmail ?? ""} ${item.account?.email ?? ""}`.toLowerCase().includes(search.toLowerCase())), [items, search]);
  const changeRole = async (employeeId: string, role: EmployeeRole, action: "GRANT" | "REVOKE") => {
    setError(null); setNotice(null);
    try {
      await requestJson(`/api/system-admin/users/${encodeURIComponent(employeeId)}/roles`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, role, reason }),
      });
      setNotice(`${role.replaceAll("_", " ")} ${action === "GRANT" ? "assigned" : "revoked"} successfully.`);
      setReason("");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The role assignment could not be changed."); }
  };
  const linkEmployeeAccount = async (item: UserRow) => {
    if (!item.workEmail) return;
    setError(null); setNotice(null);
    try {
      await requestJson("/api/admin/account-links/employee", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: item.workEmail, employeeId: item.id, reason }),
      });
      setNotice(`Verified sign-in account linked to ${item.displayName}.`);
      setReason("");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The employee account could not be linked."); }
  };
  return <div className="space-y-6">
    <PageHeader eyebrow="Access administration" title="Users & role assignments" description="Review employee identity links, link verified sign-in accounts by exact work-email match, and manage existing role assignments. This page never creates passwords or credentials." />
    {error ? <ErrorMessage message={error} /> : null}
    {notice ? <p role="status" className="rounded-2xl border border-[#D2E9DF] bg-[#F1FAF5] p-4 text-sm text-[#316B50]">{notice}</p> : null}
    <section className={`${panel} grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]`}>
      <label className="grid gap-2"><span className={labelClass}>Search employees</span><input className={controlClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, employee number, or email" /></label>
      <label className="grid gap-2"><span className={labelClass}>Reason for the next role change</span><input className={controlClass} value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={500} placeholder="Required audit reason (at least 5 characters)" /></label>
    </section>
    {loading ? <LoadingState /> : <section className="space-y-3">{filtered.map((item) => {
      const activeRoles = item.roles.filter((entry) => entry.status === "ACTIVE").map((entry) => entry.role);
      const selected = selectedRoles[item.id] ?? EMPLOYEE_ROLES.find((role) => !activeRoles.includes(role)) ?? EMPLOYEE_ROLES[0];
      return <article key={item.id} className={`${panel} space-y-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-semibold text-[#2D4742]">{item.displayName}</h2><p className="mt-1 text-xs text-[#80918B]">{item.employeeNumber} · {item.status.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-[#80918B]">{item.workEmail ?? item.account?.email ?? "No work email on file"}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.account?.linkVerified && item.account.emailVerified ? "bg-[#EAF5EF] text-[#347353]" : "bg-[#FFF5E8] text-[#986D31]"}`}>{item.account?.linkVerified && item.account.emailVerified ? "Verified account linked" : item.account ? "Account verification incomplete" : "No linked account"}</span>
        </div>
        <div><p className={labelClass}>Active roles</p><div className="mt-2 flex flex-wrap gap-2">{activeRoles.length ? activeRoles.map((role) => <span key={role} className="inline-flex items-center gap-2 rounded-full bg-[#EDF6F2] px-3 py-1.5 text-xs font-semibold text-[#35665D]">{role.replaceAll("_", " ")}<button type="button" disabled={reason.trim().length < 5} onClick={() => void changeRole(item.id, role, "REVOKE")} className="font-bold text-[#9A5949] disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Revoke ${role} from ${item.displayName}`}>×</button></span>) : <span className="text-sm text-[#82928C]">No active roles</span>}</div></div>
        <div className="flex flex-wrap items-end gap-2 border-t border-[#EEF2F0] pt-3">
          <label className="grid gap-1"><span className={labelClass}>Add role</span><select className={controlClass} value={selected} onChange={(event) => setSelectedRoles((current) => ({ ...current, [item.id]: event.target.value as EmployeeRole }))}>{EMPLOYEE_ROLES.filter((role) => !activeRoles.includes(role)).map((role) => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}</select></label>
          <button type="button" disabled={!EMPLOYEE_ROLES.some((role) => !activeRoles.includes(role)) || reason.trim().length < 5 || item.status !== "ACTIVE"} onClick={() => void changeRole(item.id, selected, "GRANT")} className="min-h-10 rounded-xl bg-[#176B67] px-4 text-sm font-semibold text-white hover:bg-[#125B57] disabled:cursor-not-allowed disabled:opacity-40">Assign role</button>
          {!item.account && item.workEmail ? <button type="button" disabled={reason.trim().length < 5 || item.status !== "ACTIVE"} onClick={() => void linkEmployeeAccount(item)} className={`${controlClass} font-semibold text-[#176B67] disabled:cursor-not-allowed disabled:opacity-40`}>Link verified employee account</button> : null}
        </div>
      </article>;
    })}{filtered.length === 0 ? <div className={panel}><p className="text-sm text-[#82928C]">No employees match this search.</p></div> : null}</section>}
    <p className="text-xs leading-5 text-[#87958F]">Showing up to 100 employees. Role changes are permission-checked on the server and written to AuditLog in the same transaction. The last verified active System Admin cannot be removed.</p>
  </div>;
}

type RoleEntry = { role: EmployeeRole; permissions: string[]; permissionCount: number; isTechnicalAdminRole: boolean };
export function SystemAdminRolesView() {
  const [roles, setRoles] = useState<RoleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void requestJson<{ roles: RoleEntry[] }>("/api/system-admin/roles").then((body) => { if (active) setRoles(body.roles); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "The role matrix could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <div className="space-y-6">
    <PageHeader eyebrow="Authorization model" title="Roles & permissions" description="This is the application's fixed, code-defined least-privilege permission matrix. Role definitions and permissions are intentionally read-only here; user-level role assignments are managed on the Users page." />
    {error ? <ErrorMessage message={error} /> : null}
    {loading ? <LoadingState /> : <section className="grid gap-4 xl:grid-cols-2">{roles.map((entry) => <article key={entry.role} className={panel}>
      <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-[#2D4742]">{entry.role.replaceAll("_", " ")}</h2><p className="mt-1 text-xs text-[#87958F]">{entry.permissionCount} permissions</p></div>{entry.isTechnicalAdminRole ? <span className="rounded-full bg-[#EAF4F1] px-3 py-1 text-xs font-semibold text-[#176B67]">Technical admin</span> : null}</div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">{entry.permissions.map((permission) => <li key={permission} className="rounded-lg bg-[#F7FAF8] px-3 py-2 font-mono text-[11px] text-[#58716A]">{permission}</li>)}</ul>
    </article>)}</section>}
    <section className="rounded-2xl border border-[#EEDFC5] bg-[#FFFAF1] p-5"><h2 className="font-semibold text-[#795D32]">Fixed authorization policy</h2><p className="mt-2 text-sm leading-6 text-[#8C7652]">There is no Role or Permission table in the current Prisma schema. The permission matrix is defined in the application policy module. This screen does not pretend to persist editable permissions or create arbitrary role types.</p></section>
  </div>;
}

type MasterDataPayload = {
  specialties: Array<{ id: string; code: string; name: string; isActive: boolean; sortOrder: number }>;
  doctors: Array<{ id: string; professionalTitle: string | null; publicDisplayName: string | null; isBookable: boolean; isPubliclyVisible: boolean; employee: { employeeNumber: string; firstName: string; lastName: string; status: string }; specialties: Array<{ specialty: { name: string } }>; services: Array<{ id: string; durationMinutes: number; price: string; currencyCode: string; isActive: boolean; service: { name: string } }> }>;
  services: Array<{ id: string; code: string; name: string; type: string; isActive: boolean }>;
};

export function SystemAdminMasterDataView() {
  const [data, setData] = useState<MasterDataPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void requestJson<{ data: MasterDataPayload }>("/api/clinic/master-data").then((body) => { if (active) setData(body.data); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "The clinic catalog could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <div className="space-y-6">
    <PageHeader eyebrow="Clinic configuration" title="Doctors & clinic catalog" description="Read-only view of the existing specialty, doctor, service, and doctor-price records. It reuses the Phase 4C master-data read API; existing mutation services and their audit/price-snapshot rules are left unchanged." />
    {error ? <ErrorMessage message={error} /> : null}
    {loading ? <LoadingState /> : data ? <>
      <section className="grid gap-4 sm:grid-cols-3"><StatCard label="Specialties" value={data.specialties.length} detail="Configured specialty records" /><StatCard label="Doctor profiles" value={data.doctors.length} detail="Existing doctor profiles" /><StatCard label="Services" value={data.services.length} detail="Catalog services" /></section>
      <section className={`${panel} overflow-hidden`}><h2 className="font-semibold text-[#2D4742]">Specialties</h2><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="text-xs text-[#87958F]"><tr><th className="py-2 pr-4">Code</th><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Order</th><th className="py-2">Status</th></tr></thead><tbody>{data.specialties.map((item) => <tr key={item.id} className="border-t border-[#EEF2F0]"><td className="py-3 pr-4 font-mono text-xs">{item.code}</td><td className="py-3 pr-4">{item.name}</td><td className="py-3 pr-4 tabular-nums">{item.sortOrder}</td><td className="py-3">{item.isActive ? "Active" : "Inactive"}</td></tr>)}</tbody></table></div></section>
      <section className={`${panel} overflow-hidden`}><h2 className="font-semibold text-[#2D4742]">Doctors & assigned services</h2><div className="mt-3 space-y-3">{data.doctors.map((doctor) => <article key={doctor.id} className="rounded-xl border border-[#E8EFEC] p-4"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold text-[#31534B]">{doctor.publicDisplayName || `${doctor.employee.firstName} ${doctor.employee.lastName}`}</h3><p className="mt-1 text-xs text-[#82928C]">{doctor.employee.employeeNumber} · {doctor.professionalTitle || "Doctor profile"} · {doctor.employee.status}</p></div><span className="text-xs text-[#718780]">{doctor.isBookable ? "Bookable" : "Not bookable"} · {doctor.isPubliclyVisible ? "Public" : "Hidden"}</span></div><p className="mt-2 text-xs text-[#718780]">{doctor.specialties.map((entry) => entry.specialty.name).join(" · ") || "No specialty assigned"}</p><div className="mt-3 flex flex-wrap gap-2">{doctor.services.map((service) => <span key={service.id} className="rounded-lg bg-[#F5F8F7] px-3 py-2 text-xs text-[#58716A]">{service.service.name} · {service.price} {service.currencyCode} · {service.durationMinutes} min{service.isActive ? "" : " · inactive"}</span>)}</div></article>)}</div></section>
      <section className={`${panel} overflow-hidden`}><h2 className="font-semibold text-[#2D4742]">Service catalog</h2><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="text-xs text-[#87958F]"><tr><th className="py-2 pr-4">Code</th><th className="py-2 pr-4">Service</th><th className="py-2 pr-4">Type</th><th className="py-2">Status</th></tr></thead><tbody>{data.services.map((item) => <tr key={item.id} className="border-t border-[#EEF2F0]"><td className="py-3 pr-4 font-mono text-xs">{item.code}</td><td className="py-3 pr-4">{item.name}</td><td className="py-3 pr-4">{item.type.replaceAll("_", " ")}</td><td className="py-3">{item.isActive ? "Active" : "Inactive"}</td></tr>)}</tbody></table></div></section>
    </> : null}
  </div>;
}

type ScheduleData = {
  clinicSchedules: Array<{ id: string; weekday: string; startTime: string; endTime: string; effectiveFrom: string; effectiveUntil: string | null }>;
  doctorSchedules: Array<{ id: string; weekday: string; startTime: string; endTime: string; effectiveFrom: string; effectiveUntil: string | null; employeeNumber: string; doctorName: string; employeeStatus: string }>;
  upcomingExceptions: Array<{ id: string; scope: "CLINIC" | "DOCTOR"; type: string; startsAt: string; endsAt: string; reason: string | null; employeeNumber: string | null; doctorName: string }>;
  timeZone: string;
};

export function SystemAdminSchedulesView() {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void requestJson<{ schedules: ScheduleData }>("/api/system-admin/schedules").then((body) => { if (active) setData(body.schedules); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Schedules could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <div className="space-y-6">
    <PageHeader eyebrow="Clinic configuration" title="Schedules" description="Review current clinic opening windows, active doctor schedules, and future schedule exceptions. This view is read-only; no schedule mutations are introduced outside the established scheduling workflows." />
    {error ? <ErrorMessage message={error} /> : null}
    {loading ? <LoadingState /> : data ? <>
      <section className="grid gap-4 sm:grid-cols-2"><StatCard label="Clinic opening windows" value={data.clinicSchedules.length} detail={`Active weekly windows · ${data.timeZone}`} /><StatCard label="Doctor weekly schedules" value={data.doctorSchedules.length} detail="Active doctor schedule rows" /></section>
      <section className={`${panel} overflow-x-auto`}><h2 className="font-semibold text-[#2D4742]">Clinic working hours</h2><table className="mt-3 w-full min-w-[560px] text-left text-sm"><thead className="text-xs text-[#87958F]"><tr><th className="py-2 pr-4">Weekday</th><th className="py-2 pr-4">Start</th><th className="py-2 pr-4">End</th><th className="py-2">Effective dates</th></tr></thead><tbody>{data.clinicSchedules.map((item) => <tr key={item.id} className="border-t border-[#EEF2F0]"><td className="py-3 pr-4">{item.weekday}</td><td className="py-3 pr-4 tabular-nums">{item.startTime}</td><td className="py-3 pr-4 tabular-nums">{item.endTime}</td><td className="py-3 text-xs">{item.effectiveFrom} – {item.effectiveUntil ?? "No end date"}</td></tr>)}</tbody></table>{data.clinicSchedules.length === 0 ? <p className="py-4 text-sm text-[#82928C]">No active clinic schedule rows.</p> : null}</section>
      <section className={`${panel} overflow-x-auto`}><h2 className="font-semibold text-[#2D4742]">Doctor schedules</h2><table className="mt-3 w-full min-w-[700px] text-left text-sm"><thead className="text-xs text-[#87958F]"><tr><th className="py-2 pr-4">Doctor</th><th className="py-2 pr-4">Weekday</th><th className="py-2 pr-4">Time</th><th className="py-2">Effective dates</th></tr></thead><tbody>{data.doctorSchedules.map((item) => <tr key={item.id} className="border-t border-[#EEF2F0]"><td className="py-3 pr-4">{item.doctorName}<span className="block text-xs text-[#87958F]">{item.employeeNumber}</span></td><td className="py-3 pr-4">{item.weekday}</td><td className="py-3 pr-4 tabular-nums">{item.startTime} – {item.endTime}</td><td className="py-3 text-xs">{item.effectiveFrom} – {item.effectiveUntil ?? "No end date"}</td></tr>)}</tbody></table>{data.doctorSchedules.length === 0 ? <p className="py-4 text-sm text-[#82928C]">No active doctor schedules.</p> : null}</section>
      <section className={`${panel} overflow-x-auto`}><h2 className="font-semibold text-[#2D4742]">Upcoming schedule exceptions</h2><table className="mt-3 w-full min-w-[620px] text-left text-sm"><thead className="text-xs text-[#87958F]"><tr><th className="py-2 pr-4">Affected resource</th><th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Start</th><th className="py-2">End</th></tr></thead><tbody>{data.upcomingExceptions.map((item) => <tr key={item.id} className="border-t border-[#EEF2F0]"><td className="py-3 pr-4">{item.doctorName}{item.employeeNumber ? <span className="block text-xs text-[#87958F]">{item.employeeNumber}</span> : <span className="block text-xs text-[#87958F]">Clinic-wide</span>}</td><td className="py-3 pr-4">{item.type.replaceAll("_", " ")}</td><td className="py-3 pr-4 text-xs">{new Date(item.startsAt).toLocaleString("en-GB", { timeZone: data.timeZone })}</td><td className="py-3 text-xs">{new Date(item.endsAt).toLocaleString("en-GB", { timeZone: data.timeZone })}</td></tr>)}</tbody></table>{data.upcomingExceptions.length === 0 ? <p className="py-4 text-sm text-[#82928C]">No upcoming clinic or doctor exceptions.</p> : null}</section>
    </> : null}
  </div>;
}

type AuditRow = { id: string; actorType: string; actor: string | null; actorEmployeeNumber: string | null; action: string; entityType: string; entityId: string; reason: string | null; occurredAt: string };
export function SystemAdminAuditLogsView() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (term: string) => {
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (term.trim()) params.set("q", term.trim());
      const body = await requestJson<{ audit: { items: AuditRow[] } }>(`/api/system-admin/audit-logs?${params.toString()}`);
      setItems(body.audit.items);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Audit history could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ limit: "100" });
    void requestJson<{ audit: { items: AuditRow[] } }>(`/api/system-admin/audit-logs?${params.toString()}`)
      .then((body) => {
        if (active) {
          setItems(body.audit.items);
          setError(null);
        }
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Audit history could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);
  return <div className="space-y-6">
    <PageHeader eyebrow="Traceability" title="Audit logs" description="Review recent recorded actions, actor identity, affected record references, and reasons. Authentication tokens, IP addresses, and patient clinical content are intentionally excluded from this view." />
    <form className={`${panel} flex flex-wrap items-end gap-3`} onSubmit={(event) => { event.preventDefault(); setAppliedSearch(search); setLoading(true); setError(null); void load(search); }}><label className="grid min-w-[240px] flex-1 gap-2"><span className={labelClass}>Search audit events</span><input className={controlClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Action, entity type, ID, or reason" /></label><button className="min-h-10 rounded-xl bg-[#176B67] px-4 text-sm font-semibold text-white disabled:opacity-50" type="submit" disabled={loading}>Search</button><button className={`${controlClass} font-semibold`} type="button" onClick={() => { setSearch(""); setAppliedSearch(""); setLoading(true); setError(null); void load(""); }}>Clear</button></form>
    {error ? <ErrorMessage message={error} /> : null}
    {loading ? <LoadingState /> : <section className={`${panel} overflow-x-auto`}><p className="mb-3 text-xs text-[#87958F]">Latest {items.length} matching events{appliedSearch ? ` · filter: ${appliedSearch}` : ""}</p><table className="w-full min-w-[800px] text-left text-sm"><thead className="text-xs text-[#87958F]"><tr><th className="py-2 pr-4">Time</th><th className="py-2 pr-4">Actor</th><th className="py-2 pr-4">Action</th><th className="py-2 pr-4">Entity</th><th className="py-2">Reason</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-t border-[#EEF2F0] align-top"><td className="py-3 pr-4 text-xs tabular-nums">{new Date(item.occurredAt).toLocaleString("en-GB", { timeZone: "Africa/Cairo" })}</td><td className="py-3 pr-4">{item.actor ?? item.actorType}<span className="block text-xs text-[#87958F]">{item.actorEmployeeNumber ?? item.actorType}</span></td><td className="py-3 pr-4 font-mono text-xs">{item.action}</td><td className="py-3 pr-4"><span className="block">{item.entityType}</span><span className="font-mono text-[11px] text-[#87958F]">{item.entityId}</span></td><td className="max-w-sm py-3 text-xs leading-5 text-[#6F817C]">{item.reason ?? "—"}</td></tr>)}</tbody></table>{items.length === 0 ? <p className="py-5 text-sm text-[#82928C]">No audit events match this filter.</p> : null}</section>}
  </div>;
}

export function SystemAdminSettingsView() {
  return <div className="space-y-6">
    <PageHeader eyebrow="Runtime configuration" title="System settings" description="Review the current system configuration boundaries. This project does not yet have a persisted SystemSettings model, so this page does not present non-functional controls or pretend that changes can be saved." />
    <section className={`${panel} space-y-4`}>
      <h2 className="text-lg font-semibold text-[#2D4742]">Application baseline</h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        {[["Application", "MERUNO Medical Clinics"], ["Deployment shape", "Single-branch outpatient clinic"], ["Application architecture", "Next.js modular monolith"], ["Database", "PostgreSQL with Prisma 7"], ["Clinic timezone", "Africa/Cairo"], ["Supported imaging", "Digital X-ray and Ultrasound"]].map(([term, description]) => <div key={term} className="rounded-xl bg-[#F7FAF8] p-4"><dt className={labelClass}>{term}</dt><dd className="mt-2 text-sm font-medium text-[#31534B]">{description}</dd></div>)}
      </dl>
    </section>
    <section className="rounded-2xl border border-[#EEDFC5] bg-[#FFFAF1] p-5"><h2 className="font-semibold text-[#795D32]">Settings are not editable in this update</h2><p className="mt-2 text-sm leading-6 text-[#8C7652]">Runtime secrets and deployment values remain in the deployment environment and are never displayed here. Clinic business settings do not have a dedicated persistent settings model in the current Prisma schema. A writable settings UI requires an approved data contract and migration decision; no placeholder save action has been added.</p></section>
  </div>;
}
