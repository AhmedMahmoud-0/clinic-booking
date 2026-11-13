# MERUNO — Update 79 Fix 02

## Purpose

This correction removes the three remaining `react-hooks/set-state-in-effect` lint errors in the System Admin dashboard, users, and audit-log views. Initial data requests now update React state only from asynchronous Promise callbacks, following the existing request-loading pattern already used by the System Admin roles, master-data, and schedules views. Each effect also prevents state updates after its component unmounts.

It also corrects the anonymous-page E2E assertion. In Next.js App Router, a Server Component redirect can be streamed as HTML with a meta refresh while the HTTP response remains `200`; a direct `307` is therefore not guaranteed after streaming starts. The test now accepts a direct `307` to `/login` or verifies the streamed HTML refresh to `/login`. The API authorization checks remain unchanged.

## Apply

1. Extract this ZIP at the root of the `clinic-booking` project.
2. Preserve the folder structure in the archive.
3. Replace only these two files:
   - `src/components/system-admin/system-admin-views.tsx`
   - `tests/e2e/system-admin-workspace.spec.ts`
4. Do not replace any other project files.

## Protected scope

This fix does not modify `.env`, `.git`, `node_modules`, `.next`, generated Prisma files, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations`, or `prisma7.config.ts`.

## Database and dependencies

- No Prisma schema changes.
- No migrations or database operations.
- No dependency or package-manifest changes.
- No environment-variable changes.

## Verification

Run the standard Update 79 verification commands from the project root.
