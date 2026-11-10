import { z } from "zod";

export const receptionQueueDoctorIdSchema = z.string().trim().min(1).max(80);

export const receptionQueueCallNextRequestSchema = z.object({
  doctorId: receptionQueueDoctorIdSchema,
}).strict();

export type ReceptionQueueCallNextRequest = z.infer<typeof receptionQueueCallNextRequestSchema>;
