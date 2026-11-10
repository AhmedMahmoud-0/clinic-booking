# Update 58 Fix 01 — File Guide

| File | Action | Purpose |
|---|---|---|
| `tests/unit/doctor-prescription-validation.test.ts` | Replace | Supplies the required `quantityUnit` alongside the positive fractional dispense quantity. The schema's existing requirement remains intact. |

## Behavior preserved

- Zero quantity is rejected.
- More than two decimal places are rejected.
- A positive decimal such as `0.5` is accepted when accompanied by a unit.
- A provided dispense quantity without a unit remains invalid.
