import { z } from "zod";

export const doctorReferralIdSchema = z.string().trim().min(1).max(80);

export const doctorReferralLifecycleRequestSchema = z.object({
  action: z.enum(["ACCEPT", "COMPLETE", "CANCEL"]),
}).strict();

export type DoctorReferralLifecycleRequest = z.infer<typeof doctorReferralLifecycleRequestSchema>;
