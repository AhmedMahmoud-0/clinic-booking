import { z } from "zod";
import { normalizePatientPhone } from "../patient-management/validation";

function isCanonicalUtcInstant(value: string): boolean {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

const guestNameField = z
  .string()
  .trim()
  .min(3)
  .max(180)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Enter a valid full name.");

const guestPhoneField = z
  .string()
  .trim()
  .min(7)
  .max(30)
  .refine((value) => {
    const digits = normalizePatientPhone(value);
    return digits.length >= 7 && digits.length <= 15;
  }, "Enter a phone number containing 7 to 15 digits.");

const guestEmailField = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().toLowerCase().email().max(254).optional(),
);

/**
 * Guest booking deliberately accepts only contact and booking-selection data.
 * It cannot create a Patient, assign an MRN, link an account, or submit a
 * client-selected patient ID, booking source, price, room, or status.
 */
export const createGuestAppointmentSchema = z.object({
  fullName: guestNameField,
  phone: guestPhoneField,
  email: guestEmailField,
  doctorId: z.string().trim().min(1).max(80),
  serviceId: z.string().trim().min(1).max(80),
  startsAt: z.string().refine(isCanonicalUtcInstant, "Choose an exact available appointment time."),
}).strict();

export type CreateGuestAppointmentInput = z.infer<typeof createGuestAppointmentSchema>;
