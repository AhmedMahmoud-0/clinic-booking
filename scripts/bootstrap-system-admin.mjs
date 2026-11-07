import "dotenv/config";

import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";

function requiredEnvironmentValue(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required bootstrap input: ${name}`);
  }
  return value;
}

function validateEmail(value) {
  const email = value.trim().toLowerCase();
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error("The bootstrap email address is invalid.");
  }
  return email;
}

function validateEmployeeNumber(value) {
  const employeeNumber = value.trim();
  if (!/^[A-Za-z0-9_-]{3,30}$/.test(employeeNumber)) {
    throw new Error("Employee number must be 3–30 letters, digits, underscores, or hyphens.");
  }
  return employeeNumber;
}

function getLocalDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("DATABASE_URL is not configured.");

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("DATABASE_URL is not a valid PostgreSQL URL.");
  }

  if (!/^postgres(ql)?:$/.test(parsed.protocol)) {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol.");
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!localHosts.has(parsed.hostname)) {
    throw new Error(
      "This one-time bootstrap script is restricted to a local PostgreSQL database.",
    );
  }

  return value;
}

async function main() {
  const databaseUrl = getLocalDatabaseUrl();
  const email = validateEmail(requiredEnvironmentValue("MERUNO_BOOTSTRAP_ADMIN_EMAIL"));
  const firstName = requiredEnvironmentValue("MERUNO_BOOTSTRAP_ADMIN_FIRST_NAME");
  const lastName = requiredEnvironmentValue("MERUNO_BOOTSTRAP_ADMIN_LAST_NAME");
  const employeeNumber = validateEmployeeNumber(
    requiredEnvironmentValue("MERUNO_BOOTSTRAP_ADMIN_EMPLOYEE_NUMBER"),
  );
  const password = process.env.MERUNO_BOOTSTRAP_ADMIN_PASSWORD ?? "";
  delete process.env.MERUNO_BOOTSTRAP_ADMIN_PASSWORD;

  if (firstName.length > 100 || lastName.length > 100) {
    throw new Error("First and last names must not exceed 100 characters.");
  }
  if (password.length < 12 || password.length > 128) {
    throw new Error("The initial administrator password must be 12–128 characters.");
  }

  const passwordHash = await hashPassword(password);
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 5_000,
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('MERUNO_INITIAL_SYSTEM_ADMIN_BOOTSTRAP'))",
    );

    const existingBootstrap = await client.query(
      `SELECT 1
       FROM "EmployeeRoleAssignment"
       WHERE "role" = 'SYSTEM_ADMIN'
       LIMIT 1`,
    );

    if (existingBootstrap.rowCount > 0) {
      throw new Error(
        "A System Admin role assignment already exists. Bootstrap is one-time only; use the authorized account-management workflow instead.",
      );
    }

    const duplicate = await client.query(
      `SELECT 'employeeNumber' AS conflict
         FROM "Employee" WHERE "employeeNumber" = $1
       UNION ALL
       SELECT 'employeeEmail' AS conflict
         FROM "Employee" WHERE lower("workEmail") = lower($2)
       UNION ALL
       SELECT 'authEmail' AS conflict
         FROM "auth_user" WHERE lower("email") = lower($2)
       LIMIT 1`,
      [employeeNumber, email],
    );

    if (duplicate.rowCount > 0) {
      throw new Error(
        `The bootstrap ${duplicate.rows[0].conflict} is already in use. No records were created.`,
      );
    }

    const employeeId = randomUUID();
    const userId = randomUUID();
    const accountId = randomUUID();
    const employeeAccountId = randomUUID();
    const roleAssignmentId = randomUUID();
    const now = new Date();
    const displayName = `${firstName} ${lastName}`.trim();

    await client.query(
      `INSERT INTO "Employee"
        ("id", "employeeNumber", "firstName", "lastName", "workEmail", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6, $6)`,
      [employeeId, employeeNumber, firstName, lastName, email, now],
    );

    await client.query(
      `INSERT INTO "auth_user"
        ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, TRUE, $4, $4)`,
      [userId, displayName, email, now],
    );

    await client.query(
      `INSERT INTO "auth_account"
        ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
       VALUES ($1, $2, 'credential', $3, $4, $5, $5)`,
      [accountId, userId, userId, passwordHash, now],
    );

    await client.query(
      `INSERT INTO "EmployeeAccount"
        ("id", "userId", "employeeId", "linkedAt", "verifiedAt")
       VALUES ($1, $2, $3, $4, $4)`,
      [employeeAccountId, userId, employeeId, now],
    );

    await client.query(
      `INSERT INTO "EmployeeRoleAssignment"
        ("id", "employeeId", "role", "status", "reason", "grantedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, 'SYSTEM_ADMIN', 'ACTIVE', $3, $4, $4, $4)`,
      [
        roleAssignmentId,
        employeeId,
        "Initial local bootstrap of the MERUNO system administrator.",
        now,
      ],
    );

    await client.query(
      `INSERT INTO "AuditLog"
        ("id", "actorType", "actorEmployeeId", "action", "entityType", "entityId", "reason", "occurredAt")
       VALUES ($1, 'EMPLOYEE', $2, 'BOOTSTRAP', 'EmployeeRoleAssignment', $3, $4, $5)`,
      [
        randomUUID(),
        employeeId,
        roleAssignmentId,
        "Initial System Admin account provisioned by the local one-time bootstrap script.",
        now,
      ],
    );

    await client.query("COMMIT");
    console.log("MERUNO System Admin account created successfully.");
    console.log(`Employee number: ${employeeNumber}`);
    console.log(`Login email: ${email}`);
    console.log("The password was not displayed or stored in the project files.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "System Admin bootstrap failed.");
  process.exitCode = 1;
});
