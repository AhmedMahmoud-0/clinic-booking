import { describe, expect, it } from "vitest";

import { calculatePatientAge } from "../../src/server/auth/authorization/delegation-policy";

const now = new Date("2026-11-07T12:00:00.000Z");

describe("patient delegation age boundary", () => {
  it("classifies a patient as an adult on their eighteenth birthday", () => {
    expect(calculatePatientAge(new Date("2008-11-07T00:00:00.000Z"), now)).toBe(18);
  });

  it("keeps a patient a minor until the eighteenth birthday", () => {
    expect(calculatePatientAge(new Date("2008-11-08T00:00:00.000Z"), now)).toBe(17);
  });

  it("fails closed when date of birth is unavailable", () => {
    expect(calculatePatientAge(null, now)).toBeNull();
  });

  it("fails closed for invalid or future dates", () => {
    expect(calculatePatientAge(new Date("invalid"), now)).toBeNull();
    expect(calculatePatientAge(new Date("2027-01-01T00:00:00.000Z"), now)).toBeNull();
  });
});
