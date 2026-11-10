import { homedir } from "node:os";
import { isAbsolute, join, resolve, sep } from "node:path";
import { PatientDocumentError } from "./patient-document-errors";

const STORAGE_NAMESPACE = "patient-documents";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getPatientDocumentStorageRoot(): string {
  const configured = process.env.PATIENT_DOCUMENT_STORAGE_DIR?.trim();
  if (configured && !isAbsolute(configured)) {
    throw new PatientDocumentError("PATIENT_DOCUMENT_STORAGE_UNAVAILABLE", "PATIENT_DOCUMENT_STORAGE_DIR must be an absolute path.");
  }
  const root = configured
    ? resolve(configured)
    : resolve(homedir(), ".meruno", "private-storage");
  if (!isAbsolute(root)) {
    throw new PatientDocumentError("PATIENT_DOCUMENT_STORAGE_UNAVAILABLE", "The private document storage directory must be an absolute path.");
  }
  return root;
}

export function createPatientDocumentStorageKey(uuid: string): string {
  if (!UUID_PATTERN.test(uuid)) {
    throw new PatientDocumentError("PATIENT_DOCUMENT_STORAGE_UNAVAILABLE", "A valid opaque storage identifier is required.");
  }
  return `${STORAGE_NAMESPACE}/${uuid.toLowerCase()}`;
}

export function resolvePatientDocumentStoragePath(storageKey: string, root = getPatientDocumentStorageRoot()): string {
  const parts = storageKey.split("/");
  if (parts.length !== 2 || parts[0] !== STORAGE_NAMESPACE || !UUID_PATTERN.test(parts[1])) {
    throw new PatientDocumentError("PATIENT_DOCUMENT_STORAGE_UNAVAILABLE", "The stored document key is invalid.");
  }
  if (!isAbsolute(root)) {
    throw new PatientDocumentError("PATIENT_DOCUMENT_STORAGE_UNAVAILABLE", "The private document storage directory must be an absolute path.");
  }
  const resolvedRoot = resolve(root);
  const destination = resolve(resolvedRoot, join(parts[0], parts[1]));
  if (!destination.startsWith(`${resolvedRoot}${sep}`)) {
    throw new PatientDocumentError("PATIENT_DOCUMENT_STORAGE_UNAVAILABLE", "The stored document path is outside the private storage directory.");
  }
  return destination;
}
