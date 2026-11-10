import { z } from "zod";

function isRealCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

export const appointmentAvailabilityQuerySchema = z.object({
  doctorId: z.string().trim().min(1).max(80),
  serviceId: z.string().trim().min(1).max(80),
  date: z.string().refine(isRealCalendarDate, "Use a real calendar date in YYYY-MM-DD format."),
}).strict();

export type AppointmentAvailabilityQuery = z.infer<typeof appointmentAvailabilityQuerySchema>;
