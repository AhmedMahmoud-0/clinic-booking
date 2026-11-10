# MERUNO Update 51 — File Guide

## New files — add all 8

1. `src/server/appointments/reception-queue-policy.ts`
   - Reception actor policy, Call Next decision policy, queue summary, and waiting-time calculation.
2. `src/server/appointments/reception-queue-validation.ts`
   - Strict doctor ID validation for queue reads and Call Next.
3. `src/server/appointments/reception-queue.ts`
   - Reception queue DTO service and transactional Call Next operation.
4. `src/app/api/reception/queue/route.ts`
   - Protected `GET /api/reception/queue?doctorId=...` endpoint.
5. `src/app/api/reception/queue/call-next/route.ts`
   - Protected `POST /api/reception/queue/call-next` endpoint.
6. `tests/unit/reception-queue-policy.test.ts`
   - Unit tests for Reception access, single outstanding called ticket, inactive queue head, summaries, and wait-time calculations.
7. `tests/e2e/reception-queue.spec.ts`
   - Browser/API authorization tests for queue reads and Call Next.
8. `docs/appointments/phase-6d2-reception-queue-management.md`
   - Phase scope, route contracts, privacy boundary, concurrency rules, and exclusions.

## Existing files — replace only these 2

1. `README.md`
2. `docs/implementation-roadmap.md`

Do not replace other files. In particular, preserve all current migrations, `prisma/schema.prisma`, `generated/prisma`, package files, environment files, and existing source/tests.
