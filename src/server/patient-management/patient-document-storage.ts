import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { PatientDocumentError } from "./patient-document-errors";
import { createPatientDocumentStorageKey, getPatientDocumentStorageRoot, resolvePatientDocumentStoragePath } from "./patient-document-storage-path";

function assertLocalStorageEnabled(): void {
  if (process.env.NODE_ENV === "production") {
    throw new PatientDocumentError(
      "PATIENT_DOCUMENT_STORAGE_UNAVAILABLE",
      "Private patient-document storage is not configured for production.",
    );
  }
}

export async function writePatientDocument(bytes: Uint8Array): Promise<string> {
  assertLocalStorageEnabled();
  const storageKey = createPatientDocumentStorageKey(randomUUID());
  const destination = resolvePatientDocumentStoragePath(storageKey, getPatientDocumentStorageRoot());
  const temporaryPath = `${destination}.${randomUUID()}.tmp`;
  try {
    await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
    const handle = await open(temporaryPath, "wx", 0o600);
    try {
      await handle.writeFile(bytes);
    } finally {
      await handle.close();
    }
    await rename(temporaryPath, destination);
    return storageKey;
  } catch {
    await unlink(temporaryPath).catch(() => undefined);
    throw new PatientDocumentError("PATIENT_DOCUMENT_STORAGE_UNAVAILABLE", "The private document could not be stored.");
  }
}

export async function readPatientDocument(storageKey: string): Promise<Uint8Array> {
  assertLocalStorageEnabled();
  try {
    const file = await readFile(resolvePatientDocumentStoragePath(storageKey, getPatientDocumentStorageRoot()));
    return new Uint8Array(file);
  } catch (error) {
    if (error instanceof PatientDocumentError) throw error;
    throw new PatientDocumentError("PATIENT_DOCUMENT_STORAGE_UNAVAILABLE", "The private document is unavailable.");
  }
}

export async function deletePatientDocument(storageKey: string): Promise<void> {
  assertLocalStorageEnabled();
  try {
    await unlink(resolvePatientDocumentStoragePath(storageKey, getPatientDocumentStorageRoot()));
  } catch {
    // A failed compensation is intentionally not exposed to the caller.
  }
}
