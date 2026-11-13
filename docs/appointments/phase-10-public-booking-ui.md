# Phase 10 — Public Appointment Booking UI Contract

## Five visible stages

1. **Specialty** — only active public specialties from the Phase 4C catalog.
2. **Doctor** — only doctors that are publicly visible, active, bookable, and have an active consultation or follow-up service in the catalog.
3. **Date & Time** — clinic-local date selection and actual slots from the Phase 6A read-only availability endpoint. Slots are not reserved by GET.
4. **Your Details** — guest contact details or account booking identity selection. Guest requires full name and phone; email is optional. Account identities are loaded from a protected route.
5. **Confirmation** — server-returned booking reference, status, Cairo-local time, duration, and price snapshot.

## API flow

- Read catalog server-side with `getPublicClinicCatalog()`.
- Request date availability from `GET /api/public/appointment-availability` using the selected doctor, consultation service, and clinic-local date.
- For a guest, submit only the strict existing guest schema to `POST /api/public/appointments/guest`.
- For a patient account, first obtain the authorized list from `GET /api/patient/booking-context`, then submit the selected `patientId`, doctor, service, and canonical UTC start to `POST /api/patient/appointments`.

## New patient booking-context contract

`GET /api/patient/booking-context` is authenticated with `withPatientPortalRoute`. It returns:

```json
{
  "patients": [
    {
      "id": "server-authorized-patient-id",
      "displayName": "Synthetic Patient",
      "isSelf": true,
      "relationshipType": null
    }
  ]
}
```

The route starts with the current actor's `patientId`, loads only incoming active grants that include `BOOK_APPOINTMENTS`, and applies the exact `isPatientBookingAuthorized()` policy using grant verification, relationship status, guardian verification, subject age, adult subject approval, expiration, and revocation state. The client cannot supply the actor ID or request another patient ID for this list. It receives no date of birth, MRN, email, phone, or medical information.

## Security and consistency

- Availability responses are advisory only.
- Both existing booking operations re-check the selected slot and other booking constraints within their existing Serializable server transactions.
- Never submit price, duration, status, source, consultation room, actor, or client-invented availability.
- Never infer a patient identity from guest name/phone. Guest booking does not create or link a Patient record.
- The guest management token is returned once by the existing guest route. The UI keeps it only in component memory for the immediate confirmation display and never places it in the URL or persistent browser storage.
- A stale slot or conflict returns the user to the date/time step to refresh availability.
