# Phase 4C — Doctor Specialty Replacement Input Contract

`PUT /api/clinic/master-data/doctor-specialties` receives the target doctor in the JSON body. The required body fields are:

- `doctorId`: existing `DoctorProfile.id` to update.
- `specialtyIds`: unique list of one to seven active specialty IDs.
- `primarySpecialtyId`: exactly one ID included in `specialtyIds`.
- `reason`: required audit reason.

The route passes `doctorId` to `replaceDoctorSpecialties` as the target record identifier. The remaining validated fields determine the replacement mapping. The route remains protected by `clinic.master-data.manage`; callers cannot set employee identity, role, or permissions through this payload.

This fix aligns the Zod schema with the existing route contract and the already-authored acceptance test. It does not alter Prisma models, database data, prices, or migration history.
