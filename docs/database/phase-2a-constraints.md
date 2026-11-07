# Phase 2A — Database Constraint Register

This register records constraints that Prisma's schema language does not currently express for this design. They belong in the first reviewed PostgreSQL migration, not in an ad hoc command against the live development database.

| Area | Rule | Enforcement plan |
| --- | --- | --- |
| Doctor specialties | At most one primary specialty per doctor | PostgreSQL partial unique index on `DoctorSpecialty(doctorId)` where `isPrimary = TRUE` |
| Patient contacts | At most one primary contact per patient and contact type | PostgreSQL partial unique index on `(patientId, type)` where `isPrimary = TRUE` |
| Employee dates | End date cannot precede hire date | CHECK constraint |
| Doctor profile | Years of experience cannot be negative | CHECK constraint |
| Doctor services | Duration must be positive; price cannot be negative | CHECK constraints |
| Weekly schedule | Minutes are in `[0, 1440]`, end is after start; effective end is not before effective start | CHECK constraints |
| Schedule exception | End timestamp must be after start timestamp | CHECK constraint |
| Patient relationship | A patient cannot be related to themselves | CHECK constraint |
| Guardian designation | Legal guardian requires verification timestamp and employee; non-guardian has neither | CHECK constraint |

## Concurrency and overlap safeguards deferred to their owning phase

This register does not claim that schedule rows, exceptions, or appointments are protected from overlapping intervals. Appointment concurrency and doctor/patient double-booking will be designed in Phase 2B/Phase 6 using PostgreSQL transactions and database-level safeguards appropriate to the final slot model. Weekly schedule overlap rules also need to account for effective-date ranges and clinic-local time zone.

## Application-level invariants

- Normalize phone numbers and email addresses before writing `PatientContact`.
- Do not treat a contact value as a globally unique patient identifier.
- Use one canonical direction when storing family relationship rows.
- Set `isLegalGuardian` only after a staff member records verification metadata.
- Never infer portal or medical-record access from `PatientRelationship`.
- Derive age from `dateOfBirth`; do not store a separately mutable age field.
- Deactivate employees/patients rather than hard-deleting records with linked operational history.
