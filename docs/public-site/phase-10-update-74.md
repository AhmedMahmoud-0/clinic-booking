# MERUNO Phase 10 — Update 74
## Specialty and Doctor Discovery, Public Information Pages, and Booking UI

### Scope delivered in this package

- Active specialty directory and specialty detail routes.
- Public doctor directory with client-side search and specialty filtering over the existing public-safe catalog DTO.
- Doctor profile pages containing only the public title, public biography, configured years of experience, active specialties, and active consultation/follow-up services that already exist in the public DTO.
- FAQ, Contact, Privacy Notice, Terms of Use, and public not-found experiences.
- Responsive public navigation updated with discovery links and a primary Book Appointment action.
- One five-stage booking experience: Specialty → Doctor → Date & Time → Your Details → Confirmation.
- Guest booking via the existing guest booking route.
- Authenticated patient booking via the existing patient appointment route.
- A new read-only patient booking-context route that returns the signed-in patient's own active identity and only delegated patients whose exact, active `BOOK_APPOINTMENTS` permission passes the existing appointment-booking authorization policy.

### Existing server capabilities reused

| Capability | Existing contract |
|---|---|
| Public clinic catalogue | `GET /api/public/clinic-catalog` and `getPublicClinicCatalog()` from Phase 4C / Update 31 |
| Public available appointment slots | `GET /api/public/appointment-availability?doctorId=...&serviceId=...&date=YYYY-MM-DD` from Phase 6A / Update 39 |
| Authenticated booking | `POST /api/patient/appointments` from Phase 6B1 / Update 40 |
| Guest booking | `POST /api/public/appointments/guest` from Phase 6B2 / Update 41 |
| Booking identity options | New `GET /api/patient/booking-context` read-only route; uses the existing patient-portal route guard and `isPatientBookingAuthorized()` policy |

### Booking and authorization boundaries

- The UI sends the exact UTC `startsAt` returned by the availability API. It does not calculate or reserve slots.
- Both booking endpoints revalidate availability and apply the existing serializable booking transaction. The UI never sends price, room, duration, booking source, status, or actor identity.
- Guest requests contain only full name, phone, optional email, doctor, service, and the exact returned slot. The guest endpoint remains strict and same-origin protected.
- Account booking obtains patient choices from the authenticated server context. The browser cannot submit an arbitrary patient list or grant. The booking endpoint independently rechecks the selected patient and exact `BOOK_APPOINTMENTS` authority.
- Booking authority is not medical-record authority. The booking-context route returns names and IDs only; no DOB, MRN, contacts, medical information, or clinical records are returned.
- The guest management token is displayed only in the immediate in-memory confirmation state, never stored in local storage, query strings, or logs. The user is instructed to keep it private.
- Slot availability is advisory; final server confirmation is authoritative. A 409 conflict returns the user to slot selection.

### Content and privacy safeguards

- Public specialty and doctor records come only from the existing active/public catalogue.
- No profile images, ratings, reviews, fabricated qualifications, patient counts, clinic contact details, address, hours, or unsupported services are invented.
- The Contact page explicitly reports that verified contact details are not configured in this portfolio demo; it does not copy illustrative details from design boards.
- Privacy Notice and Terms pages are prominently labelled draft demonstration placeholders pending legal review, not approved policies.
- The FAQ describes only existing project rules and avoids fixed diagnostic turnaround promises.

### Language, design, and data

- Public website remains English-only, LTR-only, and light theme.
- Existing MERUNO teal/white palette, Inter Variable font, and shared public components are retained.
- No translations, locale switch, RTL behavior, new dependencies, Prisma schema changes, migrations, seed changes, or environment variables are introduced.

### Verification status

The source package was syntax-transpiled locally with TypeScript's transpile API: 18 TypeScript/TSX files, zero syntax diagnostics. Full project typecheck, ESLint, Vitest, Playwright, and production build must be run in the developer's actual repository because that repository and its installed dependencies are not mounted in this package-building environment.
