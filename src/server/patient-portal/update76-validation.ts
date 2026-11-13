import { z } from "zod";

export const patientComplaintCategories = [
  "APPOINTMENT",
  "STAFF_CONDUCT",
  "WAIT_TIME",
  "BILLING",
  "FACILITY",
  "SERVICE_QUALITY",
  "OTHER",
] as const;

export const createPatientComplaintSchema = z.object({
  category: z.enum(patientComplaintCategories),
  subject: z.string().trim().min(4).max(180),
  description: z.string().trim().min(20).max(5000),
  appointmentId: z.string().trim().min(1).max(128).optional(),
  invoiceId: z.string().trim().min(1).max(128).optional(),
}).strict();

export type CreatePatientComplaintInput = z.infer<typeof createPatientComplaintSchema>;
