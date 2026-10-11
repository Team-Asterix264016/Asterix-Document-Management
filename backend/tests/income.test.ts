import "./setup.js";
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createUser } from "./helpers.js";

const app = createApp();

async function loginAs(username: string, password: string) {
  const res = await request(app).post("/api/auth/login").send({ username, password });
  return res.body.token as string;
}

describe("Income & Treasury Management API", () => {
  it("rejects unauthorized and non-privileged role access", async () => {
    // 1. Unauthenticated request
    const unauth = await request(app).get("/api/income/overview");
    expect(unauth.status).toBe(401);

    // 2. MEMBER role request (Forbidden)
    const { password: memberPw } = await createUser({
      username: "std_member_test",
      password: "password123",
      role: "MEMBER",
    });
    const memberToken = await loginAs("std_member_test", memberPw);

    const forbidden = await request(app)
      .get("/api/income/overview")
      .set("Authorization", `Bearer ${memberToken}`);
    expect(forbidden.status).toBe(403);
  });

  it("allows TREASURER to read and update variable target per member", async () => {
    const { password: treasPw } = await createUser({
      username: "treas_user_test",
      password: "password123",
      role: "TREASURER",
    });
    const treasToken = await loginAs("treas_user_test", treasPw);

    // Get settings
    const getRes = await request(app)
      .get("/api/income/settings")
      .set("Authorization", `Bearer ${treasToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.config.season).toBe("2026-27");
    expect(getRes.body.config.targetPerMember).toBe(10000);

    // Update variable target
    const putRes = await request(app)
      .put("/api/income/settings")
      .set("Authorization", `Bearer ${treasToken}`)
      .send({ targetPerMember: 12500 });
    expect(putRes.status).toBe(200);
    expect(putRes.body.config.targetPerMember).toBe(12500);
  });

  it("manages installment milestones and records member payments", async () => {
    const { password: treasPw } = await createUser({
      username: "treas_milestone",
      password: "password123",
      role: "TREASURER",
    });
    const { user: student1 } = await createUser({
      username: "student_payer",
      password: "password123",
      role: "MEMBER",
    });
    const token = await loginAs("treas_milestone", treasPw);

    // 1. Create installment plan
    const createPlanRes = await request(app)
      .post("/api/income/installments/plans")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Milestone 1 - Chassis Materials",
        amount: 3500,
        dueDate: new Date(Date.now() + 86400000 * 30).toISOString(),
        description: "Initial material procurement",
      });
    expect(createPlanRes.status).toBe(201);
    const planId = createPlanRes.body.item._id;
    expect(createPlanRes.body.item.amount).toBe(3500);

    // 2. Fetch installments matrix before payment
    const matrixBefore = await request(app)
      .get("/api/income/installments/matrix")
      .set("Authorization", `Bearer ${token}`);
    expect(matrixBefore.status).toBe(200);
    const memberEntry = matrixBefore.body.matrix.find((m: { memberId: string }) => m.memberId === student1.id);
    expect(memberEntry).toBeDefined();
    expect(memberEntry.totalPaid).toBe(0);

    // 3. Record payment for student1
    const payRes = await request(app)
      .post("/api/income/installments/pay")
      .set("Authorization", `Bearer ${token}`)
      .send({
        installmentId: planId,
        memberId: student1.id,
        amountPaid: 3500,
        paymentMode: "UPI",
        transactionRef: "UPI-UTR-987654",
        notes: "Paid via GPay",
      });
    expect(payRes.status).toBe(200);
    expect(payRes.body.payment.status).toBe("PAID");
    expect(payRes.body.payment.amountPaid).toBe(3500);

    // 4. Matrix after payment reflects paid status
    const matrixAfter = await request(app)
      .get("/api/income/installments/matrix")
      .set("Authorization", `Bearer ${token}`);
    const updatedMember = matrixAfter.body.matrix.find((m: { memberId: string }) => m.memberId === student1.id);
    expect(updatedMember.totalPaid).toBe(3500);
    const inst = updatedMember.installments.find((i: { planId: string }) => i.planId === planId);
    expect(inst.status).toBe("PAID");
    expect(inst.paymentMode).toBe("UPI");
    expect(inst.transactionRef).toBe("UPI-UTR-987654");
  });

  it("handles workshop events with dynamic multi-tier calculations", async () => {
    const { password: adminPw } = await createUser({
      username: "admin_event",
      password: "password123",
      role: "ADMIN",
    });
    const token = await loginAs("admin_event", adminPw);

    // 1. Create event with 2 tiers
    const createRes = await request(app)
      .post("/api/income/events")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Vehicle Dynamics Workshop 2026",
        date: new Date().toISOString(),
        location: "Audi Hall 1",
        description: "Hands-on vehicle setup",
        tiers: [
          { tierName: "Standard Pass", pricePerParticipant: 500, registeredCount: 20 },
          { tierName: "Pass + Hardware Kit", pricePerParticipant: 1200, registeredCount: 10 },
        ],
      });

    expect(createRes.status).toBe(201);
    // 20 * 500 = 10,000; 10 * 1200 = 12,000; Total = 22,000
    expect(createRes.body.item.totalRevenue).toBe(22000);
    expect(createRes.body.item.totalParticipants).toBe(30);

    const eventId = createRes.body.item._id;

    // 2. Update registration count on tier
    const updateRes = await request(app)
      .put(`/api/income/events/${eventId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        tiers: [
          { tierName: "Standard Pass", pricePerParticipant: 500, registeredCount: 25 },
          { tierName: "Pass + Hardware Kit", pricePerParticipant: 1200, registeredCount: 10 },
        ],
      });

    expect(updateRes.status).toBe(200);
    // 25 * 500 = 12,500; 10 * 1200 = 12,000; Total = 24,500
    expect(updateRes.body.item.totalRevenue).toBe(24500);
    expect(updateRes.body.item.totalParticipants).toBe(35);
  });

  it("tracks sponsors across tiers and statuses", async () => {
    const { password: treasPw } = await createUser({
      username: "treas_sponsor",
      password: "password123",
      role: "TREASURER",
    });
    const token = await loginAs("treas_sponsor", treasPw);

    const createRes = await request(app)
      .post("/api/income/sponsors")
      .set("Authorization", `Bearer ${token}`)
      .send({
        sponsorName: "SolidWorks Educational Grant",
        tier: "PLATINUM",
        amount: 50000,
        status: "RECEIVED",
        contactPerson: "Dr. John Doe",
        deliverables: "Logo on nose cone and pit banner",
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.item.amount).toBe(50000);
    expect(createRes.body.item.tier).toBe("PLATINUM");

    const sponsorId = createRes.body.item._id;

    const listRes = await request(app)
      .get("/api/income/sponsors")
      .set("Authorization", `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.summary.totalReceived).toBeGreaterThanOrEqual(50000);

    // Delete sponsor
    const delRes = await request(app)
      .delete(`/api/income/sponsors/${sponsorId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(delRes.status).toBe(200);
  });

  it("records miscellaneous income entries and verifies unified overview", async () => {
    const { password: treasPw } = await createUser({
      username: "treas_misc",
      password: "password123",
      role: "TREASURER",
    });
    const token = await loginAs("treas_misc", treasPw);

    const miscRes = await request(app)
      .post("/api/income/misc")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Sale of Scrap Mild Steel Tubes",
        category: "SCRAP_SALE",
        amount: 4200,
        paymentMode: "CASH",
        notes: "Sold to city scrap yard",
      });

    expect(miscRes.status).toBe(201);
    expect(miscRes.body.item.amount).toBe(4200);

    // Verify unified overview reflects this income
    const overviewRes = await request(app)
      .get("/api/income/overview")
      .set("Authorization", `Bearer ${token}`);

    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.inflow.breakdown.misc).toBeGreaterThanOrEqual(4200);
    expect(overviewRes.body.inflow.total).toBeGreaterThanOrEqual(4200);
    expect(overviewRes.body.netBalance).toBeDefined();
    expect(Array.isArray(overviewRes.body.recentInflows)).toBe(true);
  });
});
