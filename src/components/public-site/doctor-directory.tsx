"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import type { PublicClinicCatalog } from "@/server/public-site/public-catalog";
import { DoctorPortrait } from "./doctor-portrait";
import { PublicIcon } from "./public-icon";

type Doctor = PublicClinicCatalog["doctors"][number];
type Specialty = PublicClinicCatalog["specialties"][number];

export function DoctorDirectory({ doctors, specialties }: { doctors: Doctor[]; specialties: Specialty[] }) {
  const [query, setQuery] = useState("");
  const [specialtyId, setSpecialtyId] = useState("all");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return doctors.filter((doctor) => {
      const matchesText = !normalized || [doctor.displayName, doctor.professionalTitle ?? "", doctor.bio ?? "", ...doctor.specialties.map((item) => item.name)].join(" ").toLocaleLowerCase().includes(normalized);
      const matchesSpecialty = specialtyId === "all" || doctor.specialties.some((item) => item.id === specialtyId);
      return matchesText && matchesSpecialty;
    });
  }, [doctors, query, specialtyId]);

  return (
    <div className="min-w-0 w-full">
      <div className="grid min-w-0 gap-3 rounded-3xl border border-[#E5ECEA] bg-white p-4 sm:grid-cols-[minmax(0,1fr)_15rem] sm:p-5">
        <label className="block min-w-0">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#71817D]">Search doctors</span>
          <span className="flex min-h-12 min-w-0 items-center gap-3 rounded-xl border border-[#DDE7E4] px-4 text-[#82918D]">
            <PublicIcon name="stethoscope" size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or specialty" className="min-w-0 flex-1 bg-transparent text-sm text-[#243B3B] outline-none placeholder:text-[#A0ACA8]" />
          </span>
        </label>
        <label htmlFor="doctor-specialty-filter" className="block min-w-0">
          <span id="doctor-specialty-filter-label" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#71817D]">Specialty</span>
          <select
            id="doctor-specialty-filter"
            name="specialty"
            aria-label="Specialty"
            aria-labelledby="doctor-specialty-filter-label"
            value={specialtyId}
            onChange={(event) => setSpecialtyId(event.target.value)}
            className="min-h-12 w-full min-w-0 rounded-xl border border-[#DDE7E4] bg-white px-3 text-sm text-[#344B49] outline-none focus:border-[#176B67]"
          >
            <option value="all">All specialties</option>
            {specialties.map((specialty) => <option key={specialty.id} value={specialty.id}>{specialty.name}</option>)}
          </select>
        </label>
      </div>
      <p className="mt-5 text-sm text-[#82918D]" aria-live="polite">{filtered.length} {filtered.length === 1 ? "doctor" : "doctors"} found</p>
      {filtered.length ? (
        <div className="mt-4 grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doctor) => {
            const displayName = doctor.displayName ?? "Doctor";
            const primary = doctor.specialties.find((item) => item.isPrimary) ?? doctor.specialties[0];
            const profileHref = `/doctors/${encodeURIComponent(doctor.id)}`;

            return (
              <article
                key={doctor.id}
                data-testid="doctor-card"
                className="group flex min-w-0 flex-col overflow-hidden rounded-3xl border border-[#E5ECEA] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#B8D1CA] hover:shadow-xl hover:shadow-[#173D39]/10"
              >
                <Link
                  href={profileHref}
                  data-testid="doctor-card-main-link"
                  aria-label={`View ${displayName} profile`}
                  className="flex min-w-0 flex-1 flex-col rounded-t-3xl focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#176B67]"
                >
                  <DoctorPortrait
                    doctorId={doctor.id}
                    displayName={displayName}
                    className="h-56 w-full shrink-0"
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 360px"
                  />
                  <div className="min-w-0 p-6 pb-4">
                    <h2 className="break-words text-lg font-semibold tracking-[-0.02em] text-[#243B3B]">{displayName}</h2>
                    <p className="mt-1 break-words text-sm text-[#71817D]">{doctor.professionalTitle || primary?.name || "Medical doctor"}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {doctor.specialties.map((item) => (
                        <span key={item.id} className="max-w-full break-words rounded-full bg-[#F1F6F4] px-3 py-1.5 text-xs font-medium text-[#56716B]">{item.name}</span>
                      ))}
                    </div>
                    {doctor.bio ? (
                      <p className="mt-4 line-clamp-3 break-words text-sm leading-6 text-[#71817D]">{doctor.bio}</p>
                    ) : (
                      <p className="mt-4 text-sm leading-6 text-[#899792]">Public profile details are limited to the information currently configured by the clinic.</p>
                    )}
                  </div>
                </Link>
                <div className="mt-auto flex min-w-0 items-center justify-between gap-3 border-t border-[#EDF1F0] px-6 py-5">
                  <Link href={profileHref} className="inline-flex min-w-0 flex-1 items-center gap-1 text-sm font-semibold text-[#176B67] hover:text-[#104F4B] focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#176B67]">
                    View profile <PublicIcon name="arrow" size={14} />
                  </Link>
                  {doctor.isBookable ? (
                    <Link href={`/book-appointment?doctorId=${encodeURIComponent(doctor.id)}`} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-[#EAF3F1] px-4 text-sm font-semibold text-[#176B67] transition hover:bg-[#176B67] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B67]">
                      Book
                    </Link>
                  ) : (
                    <span className="text-xs text-[#91A09B]">Booking unavailable</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-3xl border border-dashed border-[#CFDCD8] bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-[#243B3B]">No matching doctors</h2>
          <p className="mt-2 text-sm text-[#71817D]">Try another search term or choose a different specialty.</p>
          <button type="button" onClick={() => { setQuery(""); setSpecialtyId("all"); }} className="mt-5 rounded-full border border-[#D5E2DE] px-5 py-2.5 text-sm font-semibold text-[#176B67]">Clear filters</button>
        </div>
      )}
    </div>
  );
}
