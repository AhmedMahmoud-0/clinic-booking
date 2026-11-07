import "server-only";

export interface BetterAuthEnvironment {
  baseURL: string;
  secret: string;
}

/**
 * Read and validate the Better Auth-only environment variables.
 * DATABASE_URL remains validated by the existing server environment module.
 */
export function getBetterAuthEnvironment(): BetterAuthEnvironment {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  const configuredUrl = process.env.BETTER_AUTH_URL?.trim();

  if (!secret || secret.length < 32) {
    throw new Error(
      "BETTER_AUTH_SECRET must be set and contain at least 32 characters.",
    );
  }

  if (!configuredUrl) {
    throw new Error("BETTER_AUTH_URL must be set, for example http://localhost:3000.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new Error("BETTER_AUTH_URL must be a valid absolute URL.");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use HTTP or HTTPS.");
  }

  if (
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.pathname !== "/" ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error("BETTER_AUTH_URL must contain only the application origin, without a path or credentials.");
  }

  if (process.env.NODE_ENV === "production" && parsedUrl.protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use HTTPS in production.");
  }

  return {
    baseURL: parsedUrl.origin,
    secret,
  };
}
