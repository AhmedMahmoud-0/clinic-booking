# MERUNO Phase 10 — Update 73
## Public Website Foundation & Core Pages

Update 73 expands the Phase 1 public shell into the first usable public-facing website pages.

### Delivered pages
- Home (`/`)
- About MERUNO (`/about`)
- Services (`/services`)

### Shared public shell
- English-only, left-to-right navigation.
- Responsive desktop navigation and native keyboard-accessible mobile menu.
- MERUNO header and footer, Patient Portal entry, and skip-to-content navigation.
- Consistent content width, spacing, headings, cards, links, and actions.
- The existing Inter Variable font and project palette are retained; no second theme or font system is introduced.

### Data
- Public specialty/doctor/consultation information reuses `getPublicClinicCatalog()` from Phase 4C.
- The query remains server-only. No client-side Prisma access and no new public API are added.
- Public catalog failures render a truthful unavailable state; the UI does not invent fallback doctor or specialty records.
- The service overview stays within the approved scope: outpatient consultations, internal laboratory, Digital X-ray, and Ultrasound.

### Language and direction
- English-only and LTR-only, as required by `AGENTS.md` and `docs/architecture.md`.
- No translation dictionaries, locale switch, bilingual copy, or RTL code is introduced.

### Scope boundaries
- No booking engine or booking screens (Update 74).
- No patient portal screens (Updates 75–76).
- No staff workspaces.
- No Prisma schema, migration, dependency, or environment changes.
