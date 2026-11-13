# MERUNO Update 74 — Fix 02 Summary

- Added an explicit `aria-label="Specialty"` and a matching `aria-labelledby` relationship to the doctor specialty select.
- Constrained the doctor directory's filter row, cards, and text containers with `min-w-0` to prevent intrinsic content widths from pushing the viewport.
- Changed the public wrapper from `overflow-x-clip` to the widely supported `overflow-x-hidden`, constrained the main flex child, and applied width/min-width constraints to shared header and footer containers.
- Preserved the existing route structure, data access, booking logic, catalog contract, and all test assertions.
