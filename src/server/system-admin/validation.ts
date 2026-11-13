import { z } from "zod";
import { EMPLOYEE_ROLES } from "../auth/authorization/types";

export const employeeRoleChangeSchema = z.object({
  action: z.enum(["GRANT", "REVOKE"]),
  role: z.enum(EMPLOYEE_ROLES),
  reason: z.string().trim().min(5).max(500),
}).strict();

export const auditLogQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();

export type EmployeeRoleChangeInput = z.infer<typeof employeeRoleChangeSchema>;
