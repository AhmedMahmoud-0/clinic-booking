# Update 74 — Fix 01: public discovery, FAQ, and mobile layout

## Issue-to-change mapping

| Observed failure | Source correction |
|---|---|
| Doctor directory Specialty filter had no Playwright-resolvable label | Give the select a stable `id` and connect its visible label with `htmlFor`. |
| Guest-booking FAQ answer existed in the DOM but was hidden inside a collapsed `<details>` | Expand that specific answer by default so the no-patient-record disclosure is immediately visible. |
| `/specialties` and `/` exceeded a 320px viewport by 14px | Clip horizontal overflow at the shared public-site frame and prevent that frame from shrinking below its available width. |

## Scope discipline

This patch does not change test expectations, booking behavior, patient identity, authorization, database state, or dependencies. The login, email-change, and About/Services checks already passed in the user's focused run and are not modified.

## Verification

After applying the patch, run the focused Playwright command in `APPLY_UPDATE_74_FIX_01.md`. A passing result confirms these four UI assertions in the local project; it does not claim the full E2E suite has been rerun.
