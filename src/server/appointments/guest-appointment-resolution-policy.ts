export interface GuestAppointmentResolutionState {
  source: string;
  status: string;
  patientId: string | null;
  guestContact: null | {
    resolutionStatus: string;
    resolvedPatientId: string | null;
  };
}

/**
 * Only an unresolved public-website appointment in Confirmed state can be
 * linked. Patient-portal and Reception appointments already have a Patient;
 * cancelled/no-show appointments do not enter the identity-resolution flow.
 */
export function isGuestAppointmentPendingResolution(
  state: GuestAppointmentResolutionState,
): boolean {
  return state.source === "PUBLIC_WEBSITE" &&
    state.status === "CONFIRMED" &&
    state.patientId === null &&
    state.guestContact !== null &&
    state.guestContact.resolutionStatus === "PENDING_VERIFICATION" &&
    state.guestContact.resolvedPatientId === null;
}
