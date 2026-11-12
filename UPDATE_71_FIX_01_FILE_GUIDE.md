# MERUNO Update 71 — Fix 01 File Guide

| Path | Action | Reason |
|---|---|---|
| `src/components/billing/cashier-invoice-workbench.tsx` | Replace | Moves the error-clear state update until after asynchronous list requests succeed, resolving the synchronous effect update lint violation. |
| `playwright.config.ts` | Replace | Increases Next.js web-server startup allowance from 120 to 300 seconds and pipes stdout/stderr for actionable startup diagnostics; preserves canonical origin and HTTPS behavior. |

No API routes, billing domain logic, authorization rules, tests, Prisma models, migrations, dependencies, or environment values are changed.
