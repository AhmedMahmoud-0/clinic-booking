import Image from "next/image";

const doctorPortraits: Record<string, string> = {
  "seed_doctor_MER-DR-001": "/images/doctors/seed_doctor_MER-DR-001.webp",
  "seed_doctor_MER-DR-002": "/images/doctors/seed_doctor_MER-DR-002.webp",
  "seed_doctor_MER-DR-003": "/images/doctors/seed_doctor_MER-DR-003.webp",
  "seed_doctor_MER-DR-004": "/images/doctors/seed_doctor_MER-DR-004.webp",
  "seed_doctor_MER-DR-005": "/images/doctors/seed_doctor_MER-DR-005.webp",
  "seed_doctor_MER-DR-006": "/images/doctors/seed_doctor_MER-DR-006.webp",
  "seed_doctor_MER-DR-007": "/images/doctors/seed_doctor_MER-DR-007.webp",
  "seed_doctor_MER-DR-008": "/images/doctors/seed_doctor_MER-DR-008.webp",
};

function getInitials(displayName: string) {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function DoctorPortrait({
  doctorId,
  displayName,
  className = "",
  sizes = "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 360px",
}: {
  doctorId: string;
  displayName: string;
  className?: string;
  sizes?: string;
}) {
  const imageSrc = doctorPortraits[doctorId];

  return (
    <div
      className={`relative isolate overflow-hidden bg-[#EAF3F1] ${className}`}
      data-testid="doctor-portrait"
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={`Portrait of ${displayName}`}
          width={480}
          height={600}
          sizes={sizes}
          className="h-full w-full object-cover object-center"
        />
      ) : (
        <div
          aria-label={`Portrait unavailable for ${displayName}`}
          className="flex h-full w-full items-center justify-center text-2xl font-semibold tracking-wide text-[#176B67]"
          role="img"
        >
          {getInitials(displayName) || "MD"}
        </div>
      )}
    </div>
  );
}
