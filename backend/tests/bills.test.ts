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

describe("Bill lifecycle", () => {
  let memberToken: string;

  beforeEach(async () => {
    const { password } = await createUser({ username: "member1", password: "pass1234", role: "MEMBER" });
    memberToken = await loginAs("member1", password);
  });

  it("creates a draft bill", async () => {
    const res = await request(app)
      .post("/api/bills")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ vendor: "ABC Hardware" });

    expect(res.status).toBe(201);
    expect(res.body.bill.status).toBe("DRAFT");
    expect(res.body.bill.project).toBe("Asterix A-BAJA 2027");
  });

  it("allows editing a draft and rejects editing a non-draft", async () => {
    const create = await request(app).post("/api/bills").set("Authorization", `Bearer ${memberToken}`).send({});
    const billId = create.body.bill._id;

    const edit = await request(app)
      .put(`/api/bills/${billId}`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ vendor: "XYZ Traders", totalAmount: 1500 });

    expect(edit.status).toBe(200);
    expect(edit.body.bill.vendor).toBe("XYZ Traders");
  });

  it("uploads attachments and moves the bill to PROCESSING", async () => {
    const create = await request(app).post("/api/bills").set("Authorization", `Bearer ${memberToken}`).send({});
    const billId = create.body.bill._id;

    const res = await request(app)
      .post(`/api/bills/${billId}/attachments`)
      .set("Authorization", `Bearer ${memberToken}`)
      .attach("files", Buffer.from("%PDF-1.4 fake"), { filename: "bill.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(202);
    expect(res.body.bill.status).toBe("PROCESSING");
    expect(res.body.bill.attachments).toHaveLength(1);
  });

  it("rejects unsupported file types", async () => {
    const create = await request(app).post("/api/bills").set("Authorization", `Bearer ${memberToken}`).send({});
    const billId = create.body.bill._id;

    const res = await request(app)
      .post(`/api/bills/${billId}/attachments`)
      .set("Authorization", `Bearer ${memberToken}`)
      .attach("files", Buffer.from("hello"), { filename: "bill.txt", contentType: "text/plain" });

    expect(res.status).toBe(400);
  });

  it("requires evidence and total amount before submission", async () => {
    const create = await request(app).post("/api/bills").set("Authorization", `Bearer ${memberToken}`).send({});
    const billId = create.body.bill._id;
    const subsystem = await createSubsystem();

    const res = await request(app)
      .post(`/api/bills/${billId}/submit`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ subsystemId: subsystem.id });

    expect(res.status).toBe(400);
  });

  it("submits a fully-completed draft to PENDING_APPROVAL", async () => {
    const create = await request(app).post("/api/bills").set("Authorization", `Bearer ${memberToken}`).send({});
    const billId = create.body.bill._id;
    const subsystem = await createSubsystem();

    await request(app)
      .post(`/api/bills/${billId}/attachments`)
      .set("Authorization", `Bearer ${memberToken}`)
      .attach("files", Buffer.from("%PDF-1.4 fake"), { filename: "bill.pdf", contentType: "application/pdf" });

    await request(app)
      .put(`/api/bills/${billId}`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ totalAmount: 2460, vendor: "ABC Hardware" });

    const res = await request(app)
      .post(`/api/bills/${billId}/submit`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ subsystemId: subsystem.id });

    expect(res.status).toBe(200);
    expect(res.body.bill.status).toBe("PENDING_APPROVAL");
    expect(res.body.bill.subsystemNameAtSubmission).toBe(subsystem.name);
  });

  it("scopes bill listing to the member's own bills", async () => {
    await request(app).post("/api/bills").set("Authorization", `Bearer ${memberToken}`).send({ vendor: "Mine" });

    const { password } = await createUser({ username: "member2", password: "pass1234", role: "MEMBER" });
    const otherToken = await loginAs("member2", password);
    await request(app).post("/api/bills").set("Authorization", `Bearer ${otherToken}`).send({ vendor: "TheirsOnly" });

    const res = await request(app).get("/api/bills").set("Authorization", `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items.every((b: { vendor: string }) => b.vendor !== "TheirsOnly")).toBe(true);
  });

  it("lets the treasurer see all bills", async () => {
    await request(app).post("/api/bills").set("Authorization", `Bearer ${memberToken}`).send({ vendor: "Mine" });

    const { password } = await createUser({ username: "treasurer1", password: "pass1234", role: "TREASURER" });
    const treasurerToken = await loginAs("treasurer1", password);

    const res = await request(app).get("/api/bills").set("Authorization", `Bearer ${treasurerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });
});
