import "server-only";

import { getPublicClinicCatalog } from "@/server/clinic-master-data/master-data";

export type PublicClinicCatalog = Awaited<ReturnType<typeof getPublicClinicCatalog>>;

export async function loadPublicClinicCatalog(): Promise<PublicClinicCatalog | null> {
  try {
    return await getPublicClinicCatalog();
  } catch {
    // Keep the public pages usable without leaking database details or inventing fallback records.
    return null;
  }
}

export function getPublicConsultationServices(catalog: PublicClinicCatalog) {
  const services = new Map<
    string,
    { serviceId: string; code: string; name: string; type: string }
  >();

  for (const doctor of catalog.doctors) {
    for (const service of doctor.services) {
      if (service.type !== "CONSULTATION" && service.type !== "FOLLOW_UP") {
        continue;
      }
      if (!services.has(service.serviceId)) {
        services.set(service.serviceId, {
          serviceId: service.serviceId,
          code: service.code,
          name: service.name,
          type: service.type,
        });
      }
    }
  }

  return Array.from(services.values()).sort((a, b) => a.name.localeCompare(b.name));
}
