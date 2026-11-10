# Phase 7B — Doctor Starts a Consultation (Update 55)

## Purpose

Move one called ticket from the Doctor's current-day worklist into an active clinical visit. This is a server/data-layer increment. It creates the encounter shell only; clinical notes, diagnoses, vital signs, prescriptions, diagnostic orders, referrals, and encounter completion remain separate workflows.

## Route and authorization

- `POST /api/doctor/queue/:queueEntryId/start`
- Requires the existing `clinical.encounter.manage` permission through `withEmployeePermissionRoute`.
- Rechecks inside the Serializable transaction that the authenticated employee is active, has an active `DOCTOR` role assignment, and still has the linked DoctorProfile.
- Rejects query parameters implicitly by not reading them; the queue entry ID is the only path input. The request body must be an empty JSON object. Patient, appointment, doctor, encounter, status, timestamps, and actor are never caller-selected.
- A queue entry owned by another Doctor or not on the current `Africa/Cairo` queue date is not exposed.

## Atomic transition

The service uses the shared `DoctorProfile` row lock already used by Reception Call Next and Walk-in queue allocation, then locks the selected queue entry and its appointment (when present). Inside one Serializable transaction it:

1. Confirms the caller is the Doctor assigned to the ticket, the patient is active, and the ticket is in the current Cairo-local day.
2. Requires the ticket to be `CALLED`. A second `IN_SERVICE` ticket for the same Doctor blocks the operation.
3. For `APPOINTMENT`, confirms that the linked appointment belongs to the same patient and Doctor and is still `CHECKED_IN`. For `WALK_IN`, confirms that no appointment is linked.
4. Creates exactly one `IN_PROGRESS` `Encounter` using the Phase 2B visit-origin contract: an appointment visit sets `appointmentId` only; a walk-in sets `queueEntryId` only. The associated QueueEntry remains linked to the appointment when one exists.
5. Changes the queue ticket to `IN_SERVICE` and sets `serviceStartedAt`.
6. For an appointment ticket only, changes the appointment from `CHECKED_IN` to `IN_CONSULTATION` and appends a `STAFF` `AppointmentStatusHistory` row with the authenticated Doctor as actor.
7. Writes a PII-minimal `DOCTOR_ENCOUNTER_STARTED` audit event.

All changes roll back together if any transition, history, or audit write fails. The Doctor lock prevents starting two patients simultaneously under concurrent requests. Repeating the request for the same already-started ticket returns `ALREADY_STARTED` with the existing Encounter and creates no duplicate record or audit event.

## Response

Returns only the outcome, queue ticket identifier/number/type/status, Encounter identifier/status/start time, and appointment identifier/status where applicable. It does not include patient contact values or clinical data.

## Deliberately not included

- No schema, migration, seed, Prisma generation, package, dependency, environment, or database changes.
- No Doctor UI, encounter editor, clinical note, diagnosis, vital-sign entry, medication reconciliation, prescription, lab/radiology order, referral, follow-up, completion, approval, or amendment workflow.
- No ability to start a `WAITING`, terminal, previous-day, foreign-Doctor, unresolved guest, or inconsistent appointment ticket.
- No support for concurrent active consultations by one Doctor.

All records remain synthetic. MERUNO is a portfolio/demo application, not production clinical software.
