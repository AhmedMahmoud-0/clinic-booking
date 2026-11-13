import { isPatientBookingAuthorized, type PatientBookingGrant } from "./appointment-booking-policy";

export interface BookingContextPatient {
  id: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

export interface BookingContextGrant {
  subjectPatient: BookingContextPatient & { dateOfBirth: Date | null };
  relationshipType: string;
  grant: PatientBookingGrant;
}

export interface BookablePatientOption {
  id: string;
  displayName: string;
  isSelf: boolean;
  relationshipType: string | null;
}

/**
 * Builds the patient choices visible to a verified portal actor. Delegated
 * choices use the same server policy as appointment creation; pending,
 * expired, revoked, inactive, and wrong-scope grants are never returned.
 */
export function buildBookablePatientOptions(input: {
  actor: BookingContextPatient;
  grants: readonly BookingContextGrant[];
  now: Date;
}): BookablePatientOption[] {
  if (!input.actor.isActive) return [];

  const options: BookablePatientOption[] = [
    {
      id: input.actor.id,
      displayName: `${input.actor.firstName} ${input.actor.lastName}`.trim(),
      isSelf: true,
      relationshipType: null,
    },
  ];

  for (const candidate of input.grants) {
    const subject = candidate.subjectPatient;
    const authorized = isPatientBookingAuthorized({
      actorPatientId: input.actor.id,
      subjectPatientId: subject.id,
      actorIsActive: input.actor.isActive,
      subjectIsActive: subject.isActive,
      subjectDateOfBirth: subject.dateOfBirth,
      grant: candidate.grant,
      now: input.now,
    });

    if (!authorized) continue;
    options.push({
      id: subject.id,
      displayName: `${subject.firstName} ${subject.lastName}`.trim(),
      isSelf: false,
      relationshipType: candidate.relationshipType,
    });
  }

  return options;
}
