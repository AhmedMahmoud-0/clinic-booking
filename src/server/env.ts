import "server-only";
import { z } from "zod";

const databaseUrlSchema = z
  .url({ protocol: /^postgres(ql)?$/ })
  .refine((value) => /^postgres(ql)?:\/\//i.test(value));

export type ServerEnvironment =
  | { available: true; databaseUrl: string }
  | { available: false };

export function getServerEnvironment(): ServerEnvironment {
  const result = databaseUrlSchema.safeParse(process.env.DATABASE_URL);

  if (!result.success) {
    return { available: false };
  }

  return { available: true, databaseUrl: result.data };
}
