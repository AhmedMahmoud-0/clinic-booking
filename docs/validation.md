# MERUNO Validation Foundation

## Purpose

MERUNO uses Zod 4 as its single schema-validation library. Shared validation helpers live in `src/lib/validation` and are isomorphic: they do not import `server-only`, Next.js APIs, Prisma, or environment variables.

The first helper is `validateInput`, exported from `@/lib/validation`. It accepts a Zod schema and untrusted input, uses `safeParseAsync`, and returns a discriminated result:

- Success: `{ success: true, data }`, where `data` is the parsed schema output (including supported transforms and defaults).
- Failure: `{ success: false, errors }`, where `errors` is the nested error tree produced by Zod 4's `z.treeifyError`.

The helper is asynchronous by design so it remains compatible with schemas that later use asynchronous refinements. Callers must `await` it.

## Usage pattern

```ts
import { z } from "zod";
import { validateInput } from "@/lib/validation";

const exampleSchema = z.object({
  displayName: z.string().trim().min(1, { error: "Enter a display name." }),
});

const result = await validateInput(exampleSchema, unknownInput);

if (!result.success) {
  // Map the safe validation result to the response shape required by the caller.
  // Do not expose raw request bodies or internal exceptions.
  return { success: false as const };
}

// Use parsed output, not the original untrusted input.
const validatedData = result.data;
```

This is an illustrative pattern only. It does not create a clinic feature or a real domain schema.

## Rules

1. Validate every external input on the server before database operations: request bodies, form data, route parameters, and search parameters.
2. Client-side validation is for immediate user feedback only. It is never the security or authorization boundary.
3. Reuse the same schema where client feedback and server validation share the same rules, but keep server-only checks and database lookups on the server.
4. Put future domain schemas close to the module that owns the business capability. Do not turn `src/lib/validation` into a central directory containing every patient, appointment, laboratory, radiology, or billing schema.
5. Use schema-level custom messages that are stable and user-safe. Never interpolate submitted values, passwords, tokens, connection strings, or medical details into messages.
6. Do not serialize raw `ZodError` objects, request bodies, or exception details to clients. Map validation failures to the stable response contract of the relevant action or route.
7. Do not treat successful validation as authorization. Ownership, role, delegation, assignment, and record-state checks belong to the server-side authorization/data-access layer introduced in Phase 3.
8. Keep environment validation in `src/server/env.ts`; it is server-only and is not replaced by this shared helper.

## Current scope

Phase 1 introduces the reusable helper only. It does not add patient, staff, appointment, clinical, laboratory, radiology, or billing schemas. Those schemas are defined alongside their domain modules after the Phase 2 data model and later workflow requirements are approved.
