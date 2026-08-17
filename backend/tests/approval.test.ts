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

async function createPendingBill(memberToken: string) {
  const subsystem = await createSubsystem();
  const create = await request(app).post("/api/bills").set("Authorization", `Bearer ${memberToken}`).send({});
  const billId = create.body.bill._id;

  await request(app)
    .post(`/api/bills/${billId}/attachments`)
    .set("Authorization", `Bearer ${memberToken}`)
    .attach("files", Buffer.from("%PDF-1.4 fake"), { filename: "bill.pdf", contentType: "application/pdf" });

  await request(app)
    .put(`/api/bills/${billId}`)
    .set("Authorization", `Bearer ${memberToken}`)
    .send({ totalAmount: 999, vendor: "Test Vendor", billDate: new Date().toISOString() });

  await request(app)
    .post(`/api/bills/${billId}/submit`)
    .set("Authorization", `Bearer ${memberToken}`)
    .send({ subsystemId: subsystem.id });

  return billId as string;
}

describe("Treasurer approval workflow", () => {
  let memberToken: string;
  let treasurerToken: string;

  beforeEach(async () => {
    const member = await createUser({ username: "member1", password: "pass1234", role: "MEMBER" });
    memberToken = await loginAs("member1", member.password);
    const treasurer = await createUser({ username: "treasurer1", password: "pass1234", role: "TREASURER" });
    treasurerToken = await loginAs("treasurer1", treasurer.password);
  });

  it("lets the treasurer accept a pending bill", async () => {
    const billId = await createPendingBill(memberToken);

    const res = await request(app).post(`/api/bills/${billId}/approve`).set("Authorization", `Bearer ${treasurerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.bill.status).toBe("APPROVED");
    expect(res.body.bill.approvedAt).toBeTruthy();
  });

  it("lets the treasurer reject a pending bill with a reason preserved", async () => {
    const billId = await createPendingBill(memberToken);

    const res = await request(app)
      .post(`/api/bills/${billId}/reject`)
      .set("Authorization", `Bearer ${treasurerToken}`)
      .send({ reason: "Missing itemized total" });

    expect(res.status).toBe(200);
    expect(res.body.bill.status).toBe("REJECTED");
    expect(res.body.bill.rejectionReason).toBe("Missing itemized total");
  });

  it("prevents a member from accepting a bill", async () => {
    const billId = await createPendingBill(memberToken);

    const res = await request(app).post(`/api/bills/${billId}/approve`).set("Authorization", `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
  });

  it("prevents a member from rejecting a bill", async () => {
    const billId = await createPendingBill(memberToken);

    const res = await request(app).post(`/api/bills/${billId}/reject`).set("Authorization", `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
  });

  it("refuses to approve a bill that is not pending", async () => {
    const billId = await createPendingBill(memberToken);
    await request(app).post(`/api/bills/${billId}/approve`).set("Authorization", `Bearer ${treasurerToken}`);

    const res = await request(app).post(`/api/bills/${billId}/approve`).set("Authorization", `Bearer ${treasurerToken}`);

    expect(res.status).toBe(400);
  });
});
