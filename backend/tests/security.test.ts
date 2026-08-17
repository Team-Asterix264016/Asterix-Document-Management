import "./setup.js";
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";
import { createUser } from "./helpers.js";

const app = createApp();

describe("Auth token security", () => {
  let validToken: string;
  let userId: string;

  beforeEach(async () => {
    const { user, password } = await createUser({ username: "alice", password: "pass1234", role: "MEMBER" });
    userId = user.id;
    const login = await request(app).post("/api/auth/login").send({ username: "alice", password });
    validToken = login.body.token;
  });

  it("accepts a genuinely valid token as a control case", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${validToken}`);
    expect(res.status).toBe(200);
  });

  it("rejects a token with a tampered payload (signature no longer matches)", async () => {
    const [header, payload, signature] = validToken.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ sub: userId, username: "alice", role: "TREASURER" })).toString("base64url");
    const tampered = `${header}.${tamperedPayload}.${signature}`;

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${tampered}`);
    expect(res.status).toBe(401);
  });

  it("rejects a token signed with the wrong secret (forged by an attacker without JWT_SECRET)", async () => {
    const forged = jwt.sign({ sub: userId, username: "alice", role: "TREASURER", displayName: "Alice" }, "attacker-guessed-secret", {
      expiresIn: "7d",
    });
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it("rejects an expired token", async () => {
    const expired = jwt.sign({ sub: userId, username: "alice", role: "MEMBER", displayName: "Alice" }, env.jwtSecret, {
      expiresIn: "-10s",
    });
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  it("rejects requests with no Authorization header", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("rejects a malformed Authorization header (missing 'Bearer ' prefix)", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", validToken);
    expect(res.status).toBe(401);
  });

  it("rejects an empty bearer token", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer ");
    expect(res.status).toBe(401);
  });

  it("a forged TREASURER-role token cannot approve bills — role is verified server-side, not trusted from the token blindly re-signed by an attacker", async () => {
    const forged = jwt.sign({ sub: userId, username: "alice", role: "TREASURER", displayName: "Alice" }, "wrong-secret");
    const res = await request(app).post("/api/bills/000000000000000000000000/approve").set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(401); // rejected at signature verification, never reaches role check
  });
});

describe("Login rate limiting", () => {
  it("locks out after repeated failed login attempts from the same client", async () => {
    await createUser({ username: "bob", password: "correct-password", role: "MEMBER" });

    const attempts = await Promise.all(
      Array.from({ length: 25 }, () => request(app).post("/api/auth/login").send({ username: "bob", password: "wrong-password" }))
    );

    const statuses = attempts.map((r) => r.status);
    expect(statuses).toContain(401); // wrong password attempts
    expect(statuses).toContain(429); // rate limiter eventually kicks in
  });
});
