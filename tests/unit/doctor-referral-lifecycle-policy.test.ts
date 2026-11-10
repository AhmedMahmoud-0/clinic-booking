import { describe, expect, it } from "vitest";
import {
  decideDoctorReferralLifecycleTransition,
  isDoctorReferralInboxVisible,
} from "../../src/server/appointments/doctor-referral-lifecycle-policy";

const base = {
  employeeId: "employee_2",
  employeeStatus: "ACTIVE",
  activeRoles: ["DOCTOR"],
  doctorProfileId: "doctor_2",
  activeSpecialtyIds: ["specialty_1"],
  referralExists: true,
  referralType: "INTERNAL",
  referralStatus: "PENDING",
  createdByEmployeeId: "employee_1",
  referredToDoctorId: "doctor_2",
  referredToSpecialtyId: "specialty_1",
};

describe("Doctor referral inbox visibility", () => {
  const inboxBase = {
    employeeStatus: "ACTIVE",
    activeRoles: ["DOCTOR"],
    doctorProfileId: "doctor_2",
    activeSpecialtyIds: ["specialty_1"],
    referralType: "INTERNAL",
    referralStatus: "PENDING",
    referredToDoctorId: "doctor_2",
    referredToSpecialtyId: "specialty_1",
  };

  it("shows a referral addressed directly to the current Doctor", () => {
    expect(isDoctorReferralInboxVisible(inboxBase)).toBe(true);
  });
  it("shows a specialty-only referral to an active member of that specialty", () => {
    expect(isDoctorReferralInboxVisible({
      ...inboxBase,
      referredToDoctorId: null,
    })).toBe(true);
  });
  it("shows a direct Doctor referral without a specialty", () => {
    expect(isDoctorReferralInboxVisible({
      ...inboxBase,
      referredToSpecialtyId: null,
    })).toBe(true);
  });
  it("does not show another Doctor's referral even when both doctors share its specialty", () => {
    expect(isDoctorReferralInboxVisible({
      ...inboxBase,
      referredToDoctorId: "doctor_3",
    })).toBe(false);
  });
  it("does not show specialty referrals to a Doctor outside the specialty", () => {
    expect(isDoctorReferralInboxVisible({
      ...inboxBase,
      referredToDoctorId: null,
      activeSpecialtyIds: ["specialty_2"],
    })).toBe(false);
  });
  it("does not show referrals for an inactive specialty", () => {
    expect(isDoctorReferralInboxVisible({
      ...inboxBase,
      activeSpecialtyIds: [],
    })).toBe(false);
  });
  it("does not show external referrals", () => {
    expect(isDoctorReferralInboxVisible({ ...inboxBase, referralType: "EXTERNAL" })).toBe(false);
  });
  it("does not show completed or cancelled referrals", () => {
    expect(isDoctorReferralInboxVisible({ ...inboxBase, referralStatus: "COMPLETED" })).toBe(false);
    expect(isDoctorReferralInboxVisible({ ...inboxBase, referralStatus: "CANCELLED" })).toBe(false);
  });
  it("does not show referrals to inactive or non-Doctor employees", () => {
    expect(isDoctorReferralInboxVisible({ ...inboxBase, employeeStatus: "INACTIVE" })).toBe(false);
    expect(isDoctorReferralInboxVisible({ ...inboxBase, activeRoles: ["NURSE"] })).toBe(false);
  });
  it("does not show referrals without a linked Doctor profile", () => {
    expect(isDoctorReferralInboxVisible({ ...inboxBase, doctorProfileId: null })).toBe(false);
  });
});

describe("Doctor referral lifecycle transitions", () => {
  it("allows the directly assigned Doctor to accept a pending internal referral", () => {
    expect(decideDoctorReferralLifecycleTransition({ ...base, action: "ACCEPT" })).toEqual({
      kind: "ALLOW",
      previousStatus: "PENDING",
      nextStatus: "ACCEPTED",
    });
  });
  it("allows an active specialty member to accept a specialty-only referral", () => {
    expect(decideDoctorReferralLifecycleTransition({
      ...base,
      referredToDoctorId: null,
      action: "ACCEPT",
    })).toEqual({ kind: "ALLOW", previousStatus: "PENDING", nextStatus: "ACCEPTED" });
  });
  it("rejects a Doctor who is not the direct target", () => {
    expect(decideDoctorReferralLifecycleTransition({
      ...base,
      referredToDoctorId: "doctor_3",
      action: "ACCEPT",
    })).toEqual({ kind: "REJECT", code: "REFERRAL_NOT_ASSIGNED_TO_DOCTOR" });
  });
  it("rejects a Doctor outside the referral specialty", () => {
    expect(decideDoctorReferralLifecycleTransition({
      ...base,
      referredToDoctorId: null,
      activeSpecialtyIds: ["specialty_2"],
      action: "ACCEPT",
    })).toEqual({ kind: "REJECT", code: "REFERRAL_NOT_ASSIGNED_TO_DOCTOR" });
  });
  it("rejects external referrals for internal acceptance", () => {
    expect(decideDoctorReferralLifecycleTransition({
      ...base,
      referralType: "EXTERNAL",
      action: "ACCEPT",
    })).toEqual({ kind: "REJECT", code: "REFERRAL_ACTION_NOT_SUPPORTED" });
  });
  it("rejects acceptance unless the referral is pending", () => {
    expect(decideDoctorReferralLifecycleTransition({
      ...base,
      referralStatus: "ACCEPTED",
      action: "ACCEPT",
    })).toEqual({ kind: "REJECT", code: "REFERRAL_STATUS_TRANSITION_INVALID" });
  });
  it("allows the assigned Doctor to complete an accepted referral", () => {
    expect(decideDoctorReferralLifecycleTransition({
      ...base,
      referralStatus: "ACCEPTED",
      action: "COMPLETE",
    })).toEqual({ kind: "ALLOW", previousStatus: "ACCEPTED", nextStatus: "COMPLETED" });
  });
  it("rejects completion before acceptance", () => {
    expect(decideDoctorReferralLifecycleTransition({
      ...base,
      referralStatus: "PENDING",
      action: "COMPLETE",
    })).toEqual({ kind: "REJECT", code: "REFERRAL_STATUS_TRANSITION_INVALID" });
  });
  it("allows the originating Doctor to cancel a pending referral", () => {
    expect(decideDoctorReferralLifecycleTransition({
      ...base,
      employeeId: "employee_1",
      action: "CANCEL",
    })).toEqual({ kind: "ALLOW", previousStatus: "PENDING", nextStatus: "CANCELLED" });
  });
  it("allows the originating Doctor to cancel an accepted referral", () => {
    expect(decideDoctorReferralLifecycleTransition({
      ...base,
      employeeId: "employee_1",
      referralStatus: "ACCEPTED",
      action: "CANCEL",
    })).toEqual({ kind: "ALLOW", previousStatus: "ACCEPTED", nextStatus: "CANCELLED" });
  });
  it("rejects cancellation by a Doctor who did not create the referral", () => {
    expect(decideDoctorReferralLifecycleTransition({ ...base, action: "CANCEL" })).toEqual({
      kind: "REJECT",
      code: "REFERRAL_NOT_CREATED_BY_DOCTOR",
    });
  });
  it("rejects cancellation after completion", () => {
    expect(decideDoctorReferralLifecycleTransition({
      ...base,
      employeeId: "employee_1",
      referralStatus: "COMPLETED",
      action: "CANCEL",
    })).toEqual({ kind: "REJECT", code: "REFERRAL_STATUS_TRANSITION_INVALID" });
  });
  it("rejects an inactive employee", () => {
    expect(decideDoctorReferralLifecycleTransition({
      ...base,
      employeeStatus: "INACTIVE",
      action: "ACCEPT",
    })).toEqual({ kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED" });
  });
  it("rejects an employee without the active Doctor role", () => {
    expect(decideDoctorReferralLifecycleTransition({
      ...base,
      activeRoles: ["NURSE"],
      action: "ACCEPT",
    })).toEqual({ kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED" });
  });
  it("rejects an employee without a Doctor profile", () => {
    expect(decideDoctorReferralLifecycleTransition({
      ...base,
      doctorProfileId: null,
      action: "ACCEPT",
    })).toEqual({ kind: "REJECT", code: "DOCTOR_PROFILE_REQUIRED" });
  });
  it("conceals a missing referral", () => {
    expect(decideDoctorReferralLifecycleTransition({
      ...base,
      referralExists: false,
      action: "ACCEPT",
    })).toEqual({ kind: "REJECT", code: "REFERRAL_NOT_FOUND" });
  });
});
