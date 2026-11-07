# MERUNO Update 05 — Step 9 Dependency Compatibility Fix

## Why this patch exists

The prior Step 9 update used `vitest: ^4.0.0`. At the current registry state, npm can resolve Vitest 4.1.12. That release's optional peer set has a known version mismatch which can trigger an npm 10 Arborist crash (`Cannot read properties of null (reading 'edgesOut')`). Pinning Vitest to 4.1.11 keeps its peer versions aligned. See the npm CLI issue and the reported Vitest peer-set reproduction.

The previous Playwright install command used `npx playwright install chromium`. Since the dependency installation had failed, npx attempted to fetch a separate latest `playwright` package and hit an unpublished/incomplete 1.65.0 version. This patch pins `@playwright/test` to stable 1.64.1 and adds a project script that invokes the locally installed Playwright binary.

## Apply

1. Extract this ZIP into the existing project root.
2. Replace `package.json`. This replacement is based on the Step 9 package.json previously supplied; the only package version changes are the exact pins below, plus the new browser-install script.
3. Replace `docs/testing.md` and `README.md` with the included updated files.
4. Do not replace or delete `package-lock.json`; npm will update it locally. Do not touch `.env`, `.git`, `.gitignore`, Prisma files, or application source files.

## Exact dependency changes

- `vitest`: `^4.0.0` → `4.1.11` (exact pin).
- `@playwright/test`: `^1.55.0` → `1.64.1` (exact stable pin).
- New script: `test:e2e:install`: `playwright install chromium`.

## Run in this order

1. `npm install`
2. If npm install succeeds: `npm run test:e2e:install`
3. `npm test`
4. `npm run test:e2e`
5. `npm run lint`
6. `npm run typecheck`
7. `npm run db:validate`
8. `npm run build`

Do not run `npx playwright install chromium` for this project; use the new npm script so npm does not try to resolve a separate package version.

If `npm install` still fails, stop. Do not delete `package-lock.json` or `node_modules`, and do not run the remaining test commands. Send the new npm debug log's stack section (remove local username/path if desired); we will diagnose the remaining dependency graph before changing anything else.
