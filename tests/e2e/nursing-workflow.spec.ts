import { expect, test } from "@playwright/test";

const taskList = "/api/nurse/tasks";
const taskAction = "/api/nurse/tasks/task_demo_1";
const taskVitals = "/api/nurse/tasks/task_demo_1/vital-signs";
const doctorTasks = "/api/doctor/encounters/encounter_demo_1/nursing-tasks";
const doctorResolve = "/api/doctor/encounters/encounter_demo_1/nursing-tasks/task_demo_1";
const complete = "/api/doctor/encounters/encounter_demo_1/complete";

test("Nurse task worklist requires an authorized employee session", async ({ request }) => {
  const response = await request.get(taskList);
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
test("Nurse task transitions require an authorized employee session", async ({ request }) => {
  const response = await request.post(taskAction, { headers: { "content-type": "application/json" }, data: { action: "START" } });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
test("Nurse vital-sign reads require an authorized employee session", async ({ request }) => {
  const response = await request.get(taskVitals);
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
test("Nurse vital-sign writes require an authorized employee session", async ({ request }) => {
  const response = await request.post(taskVitals, { headers: { "content-type": "application/json" }, data: { pulseBpm: 72 } });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
test("Doctor nursing-task list requires an authorized employee session", async ({ request }) => {
  const response = await request.get(doctorTasks);
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
test("Doctor cannot assign a nursing task without an authorized session", async ({ request }) => {
  const response = await request.post(doctorTasks, { headers: { "content-type": "application/json" }, data: { assignedToEmployeeId: "nurse_demo", taskType: "RECORD_VITAL_SIGNS" } });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
test("Doctor nursing-task resolution requires an authorized employee session", async ({ request }) => {
  const response = await request.post(doctorResolve, { headers: { "content-type": "application/json" }, data: { action: "RESUME", note: "Reviewed." } });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
test("Encounter completion requires an authorized employee session", async ({ request }) => {
  const response = await request.post(complete, { headers: { "content-type": "application/json" }, data: {} });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
test("unauthenticated requests cannot forge VitalSign actor, BMI, measurement time, or task link", async ({ request }) => {
  const response = await request.post(taskVitals, { headers: { "content-type": "application/json" }, data: { pulseBpm: 72, recordedByEmployeeId: "forged", bmi: 40, measuredAt: "2026-11-10T10:00:00Z", nursingTaskId: "forged" } });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
test("Encounter completion does not accept client-selected status or timestamps", async ({ request }) => {
  const response = await request.post(complete, { headers: { "content-type": "application/json" }, data: { status: "COMPLETED", completedAt: "2026-11-10T10:00:00Z", actorEmployeeId: "forged" } });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
