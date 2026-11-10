# Phase 5C — Patient Contacts & Consents (Update 35)

## Scope

Update 35 adds staff-side management for patient phone/email contacts, postal addresses, emergency contacts, and consent/refusal history. It uses the already-established Patient, PatientContact, PatientRelationship, and AuditLog models; three additional models provide addresses, emergency contacts, and append-only consent events.

## Contact profile

- `PatientContact` supports PHONE and EMAIL. Existing rows are preserved and marked active by the migration; a new `isActive` flag allows deactivation without deletion.
- Phone values are validated using the current patient phone normalizer. The stored display value is retained separately from its digits-only normalized value.
- Email values are trimmed and lowercased in the validated command before storage. Update 35 Fix 01 also ensures the parsed command itself returns the lowercase canonical value.
- `PatientAddress` stores HOME/WORK/OTHER addresses, city, governorate, optional district/postal code, and country code (EG by default).
- `PatientEmergencyContact` stores the contact's name, relationship, phone, and active/primary state.
- Contact values and addresses are not hard-deleted or silently replaced. Add a new value and deactivate an outdated one. Primary switching is transactional and backed by partial unique indexes.
- No contact is marked verified by this workflow. `PatientContact.verifiedAt` is only populated by a future explicit contact-verification process.

## Consents

`PatientConsent` stores each decision as a new immutable event:

- Types: PRIVACY_NOTICE, PERSONAL_DATA_PROCESSING, GENERAL_TREATMENT, EMAIL_COMMUNICATION, PHONE_COMMUNICATION.
- Decisions: GRANTED, REFUSED, WITHDRAWN.
- Capture methods in this phase: WRITTEN and VERBAL. Patient-portal capture is deferred until the portal is implemented in Phase 10.
- Each event stores a document version, signer identity/type/name snapshot, recording employee, and timestamp.
- Adult consent must be signed by the patient themselves. A minor's consent must be signed by a linked legal guardian whose relationship was already verified by staff.
- A withdrawal can be appended only when the latest event for that consent type is GRANTED.
- No PATCH or DELETE endpoint exists for consent history. A new event supersedes the effective status; a PostgreSQL trigger blocks direct update/delete attempts.
- This general consent log does not replace procedure-specific clinical consent or diagnostic preparation. Those controls belong to the relevant clinical workflow phases.

## Security and privacy

- Reception can read and manage contact profiles. Reception and Doctor can read and record consent events. Other patient-basic-read roles do not receive access to contact or consent data by implication; Clinic Manager and System Admin receive neither permission.
- All mutations use the authenticated employee from the server-side permission guard; no employee ID, signer name, or identity is trusted from client input.
- Audit logs record entity/event IDs and action types only. Contact commands intentionally reject free-text reasons so that unstructured personal information cannot leak into audit metadata. They do not include phone numbers, email addresses, address text, emergency-contact names, or raw consent identifiers.
- The signer name snapshot is obtained from the verified Patient record, not from the request body.
- Consent and address records use restrictive foreign keys so linked history cannot disappear through patient/employee deletion.

## API

- `GET /api/clinic/patients/:patientId/contact-profile` — Reception-only read of contact methods, addresses, and emergency contacts.
- `POST /api/clinic/patients/:patientId/contact-profile` — add, mark primary, or deactivate a contact/address/emergency contact.
- `GET /api/clinic/patients/:patientId/consents` — Reception/Doctor read of full history and latest decision per consent type.
- `POST /api/clinic/patients/:patientId/consents` — append a granted/refused/withdrawn event.

There is intentionally no endpoint to update or delete a consent event.

## Database

Migration `20261108030000_patient_contacts_and_consents` is additive. It adds PatientContact.isActive and creates PatientAddress, PatientEmergencyContact, and PatientConsent plus indexes, restrictive foreign keys, validation constraints, guardian signer validation, and the append-only consent trigger. It does not reseed, rewrite existing contacts, or modify appointments/clinical records.


## Update 35 Fix 01

The first local verification identified that email validation lowercased a temporary validation value without returning that canonical value, and the related unit test accessed `value` without narrowing the command union. Fix 01 applies lowercase normalization to the parsed EMAIL command and uses a union-safe object assertion in the test. This is code/test-only; it does not require another migration or Prisma generation.
