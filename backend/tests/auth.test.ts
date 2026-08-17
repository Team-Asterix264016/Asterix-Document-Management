import "./setup.js";
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createUser } from "./helpers.js";

const app = createApp();

describe("Authentication", () => {
  it("logs in with valid credentials", async () => {
    await createUser({ username: "alice", password: "secret123", role: "MEMBER" });

    const res = await request(app).post("/api/auth/login").send({ username: "alice", password: "secret123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe("MEMBER");
  });

  it("rejects invalid credentials", async () => {
    await createUser({ username: "bob", password: "secret123" });

    const res = await request(app).post("/api/auth/login").send({ username: "bob", password: "wrong" });

    expect(res.status).toBe(401);
  });

  it("rejects unknown users", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "ghost", password: "whatever" });
    expect(res.status).toBe(401);
  });

  it("enforces role restrictions on treasurer-only routes", async () => {
    const { password } = await createUser({ username: "carol", password: "secret123", role: "MEMBER" });
    const login = await request(app).post("/api/auth/login").send({ username: "carol", password });
    const token = login.body.token;

    const res = await request(app).post("/api/bills/000000000000000000000000/approve").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
