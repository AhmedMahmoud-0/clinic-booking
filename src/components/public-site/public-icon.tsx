import type { ReactNode } from "react";

export type PublicIconName =
  | "arrow"
  | "calendar"
  | "check"
  | "chevron"
  | "clipboard"
  | "flask"
  | "heart"
  | "pin"
  | "scan"
  | "shield"
  | "stethoscope";

const iconPaths: Record<PublicIconName, ReactNode> = {
  arrow: <path d="M7 17 17 7M8 7h9v9" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M7.5 3v4M16.5 3v4M3.5 9.5h17M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" />
    </>
  ),
  check: <path d="m5 12.5 4.2 4.2L19 7" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  clipboard: (
    <>
      <rect x="5" y="4.5" width="14" height="17" rx="2" />
      <path d="M9 4.5h6V3a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v1.5ZM8.5 10h7M8.5 14h7M8.5 18h4" />
    </>
  ),
  flask: (
    <>
      <path d="M9 3h6M10 3v6.4L4.9 18a2 2 0 0 0 1.7 3h10.8a2 2 0 0 0 1.7-3L14 9.4V3" />
      <path d="M7.2 16h9.6M9 13h6" />
    </>
  ),
  heart: <path d="M20.2 8.8c0 5.1-8.2 10.3-8.2 10.3S3.8 13.9 3.8 8.8a4.3 4.3 0 0 1 8-2.2 4.3 4.3 0 0 1 8.4 2.2Z" />,
  pin: (
    <>
      <path d="M19 10c0 5.2-7 11-7 11S5 15.2 5 10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  scan: (
    <>
      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M7 12h10M12 7v10" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 20 6v5.5c0 5-3.5 8.3-8 9.5-4.5-1.2-8-4.5-8-9.5V6l8-3Z" />
      <path d="m8.5 12.2 2.2 2.2 4.8-5" />
    </>
  ),
  stethoscope: (
    <>
      <path d="M6 4v5a4 4 0 0 0 8 0V4M4 4h4M12 4h4" />
      <path d="M10 13v2a6 6 0 0 0 12 0v-2" />
      <circle cx="19" cy="11" r="2" />
    </>
  ),
};

export function PublicIcon({
  name,
  size = 20,
  className,
}: {
  name: PublicIconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name]}
    </svg>
  );
}
