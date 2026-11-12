import { AppointmentAvailabilityError } from "../../../../server/appointments/availability-errors";
import { getPublicAppointmentAvailability } from "../../../../server/appointments/appointment-availability";
import { appointmentAvailabilityQuerySchema } from "../../../../server/appointments/availability-validation";

export const runtime = "nodejs";

function availabilityJson(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      Vary: "Origin",
    },
  });
}

/** Public, read-only slot discovery; creating a booking is a separate operation. */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = appointmentAvailabilityQuerySchema.safeParse({
    doctorId: url.searchParams.get("doctorId"),
    serviceId: url.searchParams.get("serviceId"),
    date: url.searchParams.get("date"),
  });

  if (!parsed.success) {
    return availabilityJson(
      {
        error: {
          code: "INVALID_APPOINTMENT_AVAILABILITY_REQUEST",
          message: "Provide a doctor, a bookable consultation service, and a valid clinic-local date (YYYY-MM-DD).",
        },
      },
      400,
    );
  }

  try {
    return availabilityJson({ data: await getPublicAppointmentAvailability(parsed.data) });
  } catch (error) {
    if (error instanceof AppointmentAvailabilityError) {
      return availabilityJson(
        { error: { code: error.code, message: error.message } },
        error.status,
      );
    }

    // Keep public responses generic, but log only safe diagnostic metadata so
    // database/ORM failures can be distinguished from availability policy errors.
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const errorCode = typeof error === "object" && error !== null && "code" in error
      && typeof error.code === "string"
      ? error.code
      : undefined;
    console.error("[public-appointment-availability] Unexpected failure", { errorName, errorCode });

    return availabilityJson(
      {
        error: {
          code: "APPOINTMENT_AVAILABILITY_FAILED",
          message: "Appointment availability could not be loaded. Try again later.",
        },
      },
      500,
    );
  }
}
