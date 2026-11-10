export interface GuestAppointmentIdentityState {
  appointmentPatientId: string | null;
  guestContact: null | {
    resolutionStatus: "PENDING_VERIFICATION" | "LINKED";
    resolvedPatientId: string | null;
    resolvedByEmployeeId: string | null;
    resolvedAt: Date | null;
  };
  hasMatchingVerifiedIdentityCheck?: boolean;
}

/**
 * Guest contact is a provisional booking identity, never a Patient/MRN.
 * A resolved guest must point to the exact Patient and have a staff actor,
 * timestamp, and matching two-element verification event.
 */
export function isGuestAppointmentIdentityConsistent(state: GuestAppointmentIdentityState): boolean {
  if (state.appointmentPatientId === null) {
    return state.guestContact !== null &&
      state.guestContact.resolutionStatus === "PENDING_VERIFICATION" &&
      state.guestContact.resolvedPatientId === null &&
      state.guestContact.resolvedByEmployeeId === null &&
      state.guestContact.resolvedAt === null;
  }

  if (state.guestContact === null) return true;

  return state.guestContact.resolutionStatus === "LINKED" &&
    state.guestContact.resolvedPatientId === state.appointmentPatientId &&
    typeof state.guestContact.resolvedByEmployeeId === "string" &&
    state.guestContact.resolvedByEmployeeId.length > 0 &&
    state.guestContact.resolvedAt instanceof Date &&
    Number.isFinite(state.guestContact.resolvedAt.getTime()) &&
    state.hasMatchingVerifiedIdentityCheck === true;
}
