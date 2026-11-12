import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../prisma/migrations/20261112010000_billing_phase_9b_discounts_refunds_and_external_invoices/migration.sql", import.meta.url), "utf8");
const schema = readFileSync(new URL("../../prisma/schema.prisma", import.meta.url), "utf8");

describe("Phase 9B incremental billing migration", () => {
  it("does not drop, truncate, or delete existing billing records", () => {
    expect(migration).not.toMatch(/\bDROP\s+(TABLE|COLUMN|CONSTRAINT|INDEX)\b/i);
    expect(migration).not.toMatch(/\bTRUNCATE\b/i);
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i);
  });

  it("enforces exactly one source and patient-to-source consistency for invoices", () => {
    expect(migration).toContain('"Invoice_exactly_one_source_chk"');
    expect(migration).toContain('"Invoice_source_patient_guard_trg"');
    expect(migration).toContain('"externalLabIntakeId"');
    expect(schema).toMatch(/externalLabIntakeId\s+String\?/);
    expect(schema).toMatch(/encounterId\s+String\?/);
  });

  it("records the employee and payment channel used to complete refunds", () => {
    expect(migration).toContain('"Refund_completedByEmployeeId_fkey"');
    expect(migration).toContain('"Refund_completion_audit_state_chk"');
    expect(migration).toContain('"Refund_decidedByEmployeeId_fkey"');
    expect(schema).toMatch(/decidedByEmployeeId\s+String\?/);
    expect(schema).toMatch(/completedByEmployeeId\s+String\?/);
    expect(schema).toMatch(/paymentMethod\s+PaymentMethod\?/);
    expect(migration).toContain('"Refund_completedByEmployeeId_completedAt_idx"');
    expect(schema).toContain('@@index([completedByEmployeeId, completedAt])');
  });
});
