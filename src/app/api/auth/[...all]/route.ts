import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "../../../../server/auth/auth";

// Better Auth uses the Node.js runtime and the existing PostgreSQL Prisma adapter.
export const runtime = "nodejs";

export const { GET, POST } = toNextJsHandler(auth);
