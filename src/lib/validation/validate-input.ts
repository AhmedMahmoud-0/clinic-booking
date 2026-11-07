import { z } from "zod";

/**
 * Validate untrusted input with a shared Zod 4 schema.
 *
 * This helper is intentionally isomorphic so the same schema can be used for
 * client-side feedback and authoritative server-side validation. Server
 * Actions and Route Handlers must still call it independently.
 *
 * The returned error tree contains schema paths and messages, not submitted
 * input values. Keep custom schema messages user-safe and never interpolate
 * secrets or submitted values into them.
 */
export async function validateInput<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
) {
  const result = await schema.safeParseAsync(input);

  if (result.success) {
    return {
      success: true as const,
      data: result.data,
    };
  }

  return {
    success: false as const,
    errors: z.treeifyError(result.error),
  };
}
