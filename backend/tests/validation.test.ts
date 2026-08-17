import "./setup.js";
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createUser, createSubsystem } from "./helpers.js";

const app = createApp();

async function loginAs(username: string, password: string) {
  const res = await request(app).post("/api/auth/login").send({ username, password });
  return res.body.token as string;
}

describe("Input validation and malformed-data hardening", () => {
  let token: string;

  beforeEach(async () => {
    const { password } = await createUser({ username: "member1", password: "pass1234", role: "MEMBER" });
    token = await loginAs("member1", password);
  });

  it("rejects a negative total amount", async () => {
    const create = await request(app).post("/api/bills").set("Authorization", `Bearer ${token}`).send({});
    const res = await request(app)
      .put(`/api/bills/${create.body.bill._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ totalAmount: -500 });
    expect(res.status).toBe(400);
  });

  it("rejects a negative item unit price", async () => {
    const create = await request(app).post("/api/bills").set("Authorization", `Bearer ${token}`).send({});
    const res = await request(app)
      .put(`/api/bills/${create.body.bill._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ name: "Bolt", unitPrice: -10 }] });
    expect(res.status).toBe(400);
  });

  it("accepts a zero total amount (free/warranty items are legitimate)", async () => {
    const create = await request(app).post("/api/bills").set("Authorization", `Bearer ${token}`).send({});
    const res = await request(app)
      .put(`/api/bills/${create.body.bill._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ totalAmount: 0 });
    expect(res.status).toBe(200);
    expect(res.body.bill.totalAmount).toBe(0);
  });

  it("rejects an absurdly large total amount", async () => {
    const create = await request(app).post("/api/bills").set("Authorization", `Bearer ${token}`).send({});
    const res = await request(app)
      .put(`/api/bills/${create.body.bill._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ totalAmount: 999_999_999_999 });
    expect(res.status).toBe(400);
  });

  it("rejects a malformed bill date string", async () => {
    const res = await request(app)
      .post("/api/bills")
      .set("Authorization", `Bearer ${token}`)
      .send({ billDate: "not-a-real-date" });
    expect(res.status).toBe(400);
  });

  it("accepts an empty-string bill date as 'no date yet'", async () => {
    const res = await request(app).post("/api/bills").set("Authorization", `Bearer ${token}`).send({ billDate: "" });
    expect(res.status).toBe(201);
    expect(res.body.bill.billDate).toBeNull();
  });

  it("returns 400 (not 500) for a malformed bill ID in the URL", async () => {
    const res = await request(app).get("/api/bills/not-a-valid-object-id").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("returns 404 for a well-formed but nonexistent bill ID", async () => {
    const res = await request(app).get("/api/bills/000000000000000000000000").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("rejects page=0 and negative page numbers", async () => {
    const zero = await request(app).get("/api/bills?page=0").set("Authorization", `Bearer ${token}`);
    const negative = await request(app).get("/api/bills?page=-1").set("Authorization", `Bearer ${token}`);
    expect(zero.status).toBe(400);
    expect(negative.status).toBe(400);
  });

  it("rejects a non-numeric page parameter", async () => {
    const res = await request(app).get("/api/bills?page=banana").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it("rejects a limit above the maximum instead of silently clamping", async () => {
    const res = await request(app).get("/api/bills?limit=5000").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it("does not crash when a query param is sent as a NoSQL-injection-shaped object", async () => {
    // supertest/qs encodes vendor[$ne]=null as { vendor: { $ne: 'null' } } — the zod query
    // schema expects vendor to be a string, so this must be rejected, not silently coerced
    // into a Mongo query object.
    const res = await request(app).get("/api/bills?vendor[$ne]=null").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it("handles special characters in free-text search without erroring", async () => {
    const res = await request(app).get("/api/bills?q=" + encodeURIComponent("test (.*) $where <script>")).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("rejects an oversized upload", async () => {
    const create = await request(app).post("/api/bills").set("Authorization", `Bearer ${token}`).send({});
    const billId = create.body.bill._id;
    const bigBuffer = Buffer.alloc(2 * 1024 * 1024, "a"); // 2MB > 1MB test cap

    const res = await request(app)
      .post(`/api/bills/${billId}/attachments`)
      .set("Authorization", `Bearer ${token}`)
      .attach("files", bigBuffer, { filename: "huge.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/too large/i);
  });

  it("rejects more than 10 files in a single upload", async () => {
    const create = await request(app).post("/api/bills").set("Authorization", `Bearer ${token}`).send({});
    const billId = create.body.bill._id;

    let req = request(app).post(`/api/bills/${billId}/attachments`).set("Authorization", `Bearer ${token}`);
    for (let i = 0; i < 11; i++) {
      req = req.attach("files", Buffer.from("%PDF-1.4"), { filename: `f${i}.pdf`, contentType: "application/pdf" });
    }
    const res = await req;

    expect(res.status).toBe(400);
  });

  it("rejects an oversized rejection reason even for the treasurer", async () => {
    const subsystem = await createSubsystem();
    const treasurer = await createUser({ username: "treasurer1", password: "pass1234", role: "TREASURER" });
    const treasurerToken = await loginAs("treasurer1", treasurer.password);

    const create = await request(app).post("/api/bills").set("Authorization", `Bearer ${token}`).send({});
    const billId = create.body.bill._id;
    await request(app)
      .post(`/api/bills/${billId}/attachments`)
      .set("Authorization", `Bearer ${token}`)
      .attach("files", Buffer.from("%PDF-1.4"), { filename: "bill.pdf", contentType: "application/pdf" });
    await request(app).put(`/api/bills/${billId}`).set("Authorization", `Bearer ${token}`).send({ totalAmount: 100 });
    await request(app).post(`/api/bills/${billId}/submit`).set("Authorization", `Bearer ${token}`).send({ subsystemId: subsystem.id });

    const res = await request(app)
      .post(`/api/bills/${billId}/reject`)
      .set("Authorization", `Bearer ${treasurerToken}`)
      .send({ reason: "x".repeat(5000) });

    expect(res.status).toBe(400);
  });
});
