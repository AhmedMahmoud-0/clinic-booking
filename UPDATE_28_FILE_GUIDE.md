# Update 28 — File-by-file guide

| File | Action | Purpose |
|---|---|---|
| `prisma/schema.prisma` | Replace | Preserves the current domain and auth schema, adds `ConsultationRoom`, adds optional `Appointment.consultationRoomId`, relation, and index. |
| `prisma/migrations/20261107230000_add_consultation_rooms/migration.sql` | Add | Creates the consultation-room table, optional appointment FK, indexes, trim checks, and concurrent room-overlap exclusion constraint. |
| `tests/unit/consultation-room-migration.test.ts` | Add | Verifies the migration creates a separate room catalog, preserves optional existing appointments, and enforces active-room time overlap. |
| `docs/database/phase-4a-consultation-rooms.md` | Add | Documents the new resource, integrity rules, separation from radiology resources, and deliberate no-seed decision. |
| `docs/implementation-roadmap.md` | Replace | Records 3G-C as complete and Phase 4A as the current implementation update; separates remaining Phase 4 work. |
| `README.md` | Replace | Updates project status and clarifies that Phase 4A is a pending local migration/verification. |
| `APPLY_UPDATE_28.md` | Package guide | Lists file operations and the safe migration/validation sequence. |
| `UPDATE_28_SUMMARY.txt` | Package summary | Concise scope and verification summary. |

## Schema details

`ConsultationRoom` represents only outpatient consultation rooms. `RadiologyResource` continues to represent modality-specific X-ray and ultrasound resources. These entities must not be merged.

The appointment relation is nullable and restrictive. This is deliberate: old appointments remain valid, and a room referenced by an appointment cannot be deleted. In Phase 6, booking logic will require a selected active room and translate PostgreSQL overlap conflicts into a safe booking response.

No default room count is seeded because the approved scope identifies eight doctors but does not define how many physical consultation rooms the clinic has. No doctor shifts are seeded because individual working days and hours have not yet been defined.

## Important non-changes

- No changes to existing roles or permissions.
- No changes to `Specialty`, `Employee`, `DoctorProfile`, `DoctorSpecialty`, `ServiceCatalog`, `DoctorService`, `DoctorWeeklySchedule`, `DoctorScheduleException`, `LabTest`, `RadiologyProcedure`, or `RadiologyResource`.
- No room CRUD API or user interface in this subphase.
- No changes to patient, clinical, billing, authentication, or delegation records.
- No changes to prior migrations or seed SQL.
