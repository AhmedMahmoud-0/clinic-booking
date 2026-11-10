import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createPatientDocumentStorageKey,
  resolvePatientDocumentStoragePath,
} from "../../src/server/patient-management/patient-document-storage-path";
import { PatientDocumentError } from "../../src/server/patient-management/patient-document-errors";

const uuid = "b3e2ab12-4c2d-4e5a-8f12-6a7b8c9d0e1f";

describe("patient document storage path", () => {
  it("creates keys inside the patient-documents namespace", () =>
    expect(createPatientDocumentStorageKey(uuid)).toBe(`patient-documents/${uuid}`));

  it("resolves a valid key under the configured root on the current platform", () => {
    const expected = resolve("/tmp/meruno-private", "patient-documents", uuid);
    expect(
      resolvePatientDocumentStoragePath(`patient-documents/${uuid}`, "/tmp/meruno-private"),
    ).toBe(expected);
  });

  it("rejects traversal segments", () =>
    expect(() =>
      resolvePatientDocumentStoragePath("patient-documents/../../secret", "/tmp/private"),
    ).toThrow(PatientDocumentError));

  it("rejects absolute paths as keys", () =>
    expect(() => resolvePatientDocumentStoragePath(`/tmp/${uuid}`, "/tmp/private")).toThrow(
      PatientDocumentError,
    ));

  it("rejects keys outside the storage namespace", () =>
    expect(() => resolvePatientDocumentStoragePath(`other/${uuid}`, "/tmp/private")).toThrow(
      PatientDocumentError,
    ));
});
