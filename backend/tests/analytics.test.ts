import "./setup.js";
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { Bill } from "../src/models/Bill.js";
import { createUser, createSubsystem } from "./helpers.js";

const app = createApp();

async function loginAs(username: string, password: string) {
  const res = await request(app).post("/api/auth/login").send({ username, password });
  return res.body.token as string;
}

async function seedScenario() {
  const member = await createUser({ username: "m1", password: "pass1234", role: "MEMBER", displayName: "Alice" });
  const treasurer = await createUser({ username: "t1", password: "pass1234", role: "TREASURER" });
  const mech = await createSubsystem("Mechanical");
  const elec = await createSubsystem("Electrical");

  await Bill.create([
    {
      uploadedBy: member.user.id,
      status: "APPROVED",
      subsystem: mech.id,
      subsystemNameAtSubmission: "Mechanical",
      vendor: "ABC Hardware",
      vendorNormalized: "ABC HARDWARE",
      totalAmount: 1000,
      billDate: new Date("2027-08-05"),
      submittedAt: new Date("2027-08-01T10:00:00Z"),
      approvedAt: new Date("2027-08-01T12:00:00Z"),
    },
    {
      uploadedBy: member.user.id,
      status: "PENDING_APPROVAL",
      subsystem: elec.id,
      subsystemNameAtSubmission: "Electrical",
      vendor: "XYZ Traders",
      vendorNormalized: "XYZ TRADERS",
      totalAmount: 250,
      billDate: new Date("2027-08-10"),
      submittedAt: new Date(),
    },
    {
      uploadedBy: member.user.id,
      status: "REJECTED",
      subsystem: mech.id,
      subsystemNameAtSubmission: "Mechanical",
      vendor: "Bad Vendor",
      totalAmount: 5000,
      billDate: new Date("2027-08-12"),
      submittedAt: new Date("2027-08-01T00:00:00Z"),
      rejectedAt: new Date("2027-08-02T00:00:00Z"),
    },
  ]);

  return { member, treasurer, mech, elec };
}

describe("Analytics endpoints", () => {
  it("requires authentication on every analytics route", async () => {
    const paths = ["/api/analytics/summary", "/api/analytics/categories", "/api/analytics/monthly", "/api/analytics/vendors", "/api/analytics/users", "/api/analytics/approvals"];
    for (const path of paths) {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
    }
  });

  it("computes correct summary totals across statuses", async () => {
    const { treasurer } = await seedScenario();
    const token = await loginAs("t1", treasurer.password);

    const res = await request(app).get("/api/analytics/summary").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.approvedExpenditure).toBe(1000);
    expect(res.body.pendingExpenditure).toBe(250);
    expect(res.body.rejectedExpenditure).toBe(5000);
    expect(res.body.totalBills).toBe(3);
  });

  it("groups spending by subsystem, approved bills only", async () => {
    const { treasurer } = await seedScenario();
    const token = await loginAs("t1", treasurer.password);

    const res = await request(app).get("/api/analytics/categories").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    const mech = res.body.items.find((i: { subsystem: string }) => i.subsystem === "Mechanical");
    expect(mech.total).toBe(1000); // the rejected 5000 Mechanical bill must not count
  });

  it("groups spending by month using bill date, not upload date", async () => {
    const { treasurer } = await seedScenario();
    const token = await loginAs("t1", treasurer.password);

    const res = await request(app).get("/api/analytics/monthly").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([{ month: "2027-08", total: 1000, count: 1 }]);
  });

  it("filters analytics by subsystem", async () => {
    const { treasurer, elec } = await seedScenario();
    const token = await loginAs("t1", treasurer.password);

    const res = await request(app).get(`/api/analytics/summary?subsystem=${elec.id}`).set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.approvedExpenditure).toBe(0); // only the pending Electrical bill exists
    expect(res.body.pendingExpenditure).toBe(250);
  });

  it("filters analytics by date range", async () => {
    const { treasurer } = await seedScenario();
    const token = await loginAs("t1", treasurer.password);

    const res = await request(app)
      .get("/api/analytics/summary?dateFrom=2027-09-01&dateTo=2027-09-30")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalBills).toBe(0);
  });

  it("reports approval counts and a numeric turnaround time", async () => {
    const { treasurer } = await seedScenario();
    const token = await loginAs("t1", treasurer.password);

    const res = await request(app).get("/api/analytics/approvals").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.approvedCount).toBe(1);
    expect(res.body.rejectedCount).toBe(1);
    expect(res.body.pendingCount).toBe(1);
    expect(res.body.averageApprovalTurnaroundHours).toBeGreaterThan(0);
  });

  it("returns zeroed-out summary values gracefully when there is no data at all", async () => {
    const { password } = await createUser({ username: "t1", password: "pass1234", role: "TREASURER" });
    const token = await loginAs("t1", password);

    const res = await request(app).get("/api/analytics/summary").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.approvedExpenditure).toBe(0);
    expect(res.body.totalBills).toBe(0);
    expect(Number.isNaN(res.body.averageApprovedBillValue)).toBe(false);
  });
});
