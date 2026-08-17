import "./setup.js";
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createUser, createSubsystem } from "./helpers.js";

const app = createApp();

async function loginAs(username: string, password: string) {
  const res = await request(app).post("/api/auth/login").send({ username, password });
  return res.body.token as string;
}

describe("Subsystem management", () => {
  it("requires authentication to list subsystems", async () => {
    const res = await request(app).get("/api/subsystems");
    expect(res.status).toBe(401);
  });

  it("creates a subsystem", async () => {
    const { password } = await createUser({ username: "m1", password: "pass1234", role: "MEMBER" });
    const token = await loginAs("m1", password);

    const res = await request(app).post("/api/subsystems").set("Authorization", `Bearer ${token}`).send({ name: "Telemetry" });
    expect(res.status).toBe(201);
    expect(res.body.subsystem.name).toBe("Telemetry");
  });

  it("rejects a duplicate subsystem name (case-insensitive)", async () => {
    await createSubsystem("Telemetry");
    const { password } = await createUser({ username: "m1", password: "pass1234", role: "MEMBER" });
    const token = await loginAs("m1", password);

    const res = await request(app).post("/api/subsystems").set("Authorization", `Bearer ${token}`).send({ name: "TELEMETRY" });
    expect(res.status).toBe(409);
  });

  it("only returns active subsystems in the list", async () => {
    const active = await createSubsystem("Active One");
    const inactive = await createSubsystem("Inactive One");
    inactive.active = false;
    await inactive.save();

    const { password } = await createUser({ username: "m1", password: "pass1234", role: "MEMBER" });
    const token = await loginAs("m1", password);

    const res = await request(app).get("/api/subsystems").set("Authorization", `Bearer ${token}`);
    const names = res.body.subsystems.map((s: { name: string }) => s.name);
    expect(names).toContain(active.name);
    expect(names).not.toContain(inactive.name);
  });

  it("updates a subsystem", async () => {
    const subsystem = await createSubsystem("Old Name");
    const { password } = await createUser({ username: "m1", password: "pass1234", role: "MEMBER" });
    const token = await loginAs("m1", password);

    const res = await request(app)
      .put(`/api/subsystems/${subsystem.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "Updated description" });

    expect(res.status).toBe(200);
    expect(res.body.subsystem.description).toBe("Updated description");
  });

  it("returns 404 when updating a nonexistent subsystem", async () => {
    const { password } = await createUser({ username: "m1", password: "pass1234", role: "MEMBER" });
    const token = await loginAs("m1", password);

    const res = await request(app)
      .put("/api/subsystems/000000000000000000000000")
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "x" });

    expect(res.status).toBe(404);
  });
});
