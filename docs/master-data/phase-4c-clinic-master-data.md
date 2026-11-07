# Phase 4C — Specialty, Doctor Profile, and Consultation-Service Master Data

## Scope

This update exposes controlled server-side maintenance for the clinic's existing specialty, doctor-profile, doctor-specialty, service-catalog, and doctor-service records. It is a single-branch clinic workflow. The seven approved specialties and eight synthetic doctor employees remain the existing catalog baseline; this update does not create or import new doctors.

## Authorization

The operation-specific permission is `clinic.master-data.manage` and is granted only to `CLINIC_MANAGER` and `SYSTEM_ADMIN`:

- Clinic Manager may maintain clinic-facing specialties, doctor profile data, service definitions, doctor specialty assignments, appointment service duration, and current EGP pricing.
- System Admin may perform the same master-data maintenance.
- Reception, doctors, nurses, laboratory staff, radiology staff, radiologists, and cashiers do not receive this permission.
- Every write checks the validated employee session and permission on the server. Mutating requests must also pass the existing same-origin check.

## Existing models reused

- `Specialty`
- `Employee`
- `DoctorProfile`
- `DoctorSpecialty`
- `ServiceCatalog`
- `DoctorService`
- `Appointment`
- `AuditLog`

No new Prisma model, field, enum, SQL constraint, or migration is introduced.

## API surface

### Staff endpoints

- `GET /api/clinic/master-data` — minimal staff DTO for specialties, doctors, doctor-specialty assignments, services, and doctor-service offerings.
- `PATCH /api/clinic/master-data/specialties/:specialtyId` — update specialty name/description/order/active state. The seven existing specialty records are maintained; no create/delete operation is exposed here.
- `PATCH /api/clinic/master-data/doctors/:doctorId` — update public title/display name/bio/experience, bookable state, and public visibility. Employee identity, work email, phone, and employment status cannot be changed through this endpoint.
- `PUT /api/clinic/master-data/doctor-specialties` — atomically replace one doctor's complete specialty assignment set and identify exactly one primary specialty.
- `POST /api/clinic/master-data/services` — create a service-catalog entry with an immutable unique code and one of the existing service types.
- `PATCH /api/clinic/master-data/services/:serviceId` — update service name/description or soft-deactivate it. Code and type remain immutable.
- `PUT /api/clinic/master-data/doctor-services` — create or update a doctor's service duration and EGP price.

### Public endpoint

- `GET /api/public/clinic-catalog` — returns active specialties, explicitly visible active-employee doctor profiles, and active doctor-service offerings. It never returns employee IDs/numbers, email addresses, phone numbers, or private employment fields.

All responses use `Cache-Control: no-store` and minimal DTOs.

## Business invariants

- The specialty catalog remains the seven approved seeded records; specialty codes are immutable.
- A specialty with an active bookable doctor assigned cannot be deactivated until the doctor is made non-bookable or the assignment is changed.
- A doctor can only be made bookable when the linked Employee is active, at least one assigned specialty is active, and at least one active doctor-service offering exists.
- A doctor's specialty replacement is atomic. Every assigned specialty must exist and be active, duplicates are rejected, and the primary specialty must be among the assignments.
- Service codes and service types are immutable after creation. Services are deactivated, not physically deleted, so historical references remain valid.
- Doctor-service durations are 5–240 minutes. Prices are positive EGP amounts with at most two decimal places and within the existing `Decimal(10,2)` range.
- Existing appointments retain their `bookedPrice` snapshot. Changing a current doctor-service price does not rewrite historical or already-confirmed appointment prices.
- Every mutation writes its `AuditLog` entry in the same database transaction. If the audit write fails, the corresponding master-data change rolls back.

## Explicit exclusions

This update does not implement a full staff UI, employee hiring/termination, doctor account/role management, lab-test pricing, radiology-procedure pricing, radiology equipment maintenance, appointment slot generation, or booking. Staff screens belong to Phase 11; lab/radiology catalog administration belongs to Phase 4D; appointment availability and booking belong to Phase 6.

## Verification

The update adds 20 validation unit tests, 3 authorization unit tests, and 2 E2E tests. The E2E tests verify that the staff endpoint denies anonymous access and the public endpoint returns a no-store response without private employee fields.
