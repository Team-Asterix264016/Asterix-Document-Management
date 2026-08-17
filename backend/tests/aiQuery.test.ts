import { describe, it, expect, vi, beforeEach } from "vitest";
import "./setup.js";

const generateContentMock = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: generateContentMock },
  })),
  Type: { OBJECT: "OBJECT", STRING: "STRING", NUMBER: "NUMBER", ARRAY: "ARRAY" },
}));

const request = (await import("supertest")).default;
const { createApp } = await import("../src/app.js");
const { createUser, createSubsystem } = await import("./helpers.js");
const { Bill } = await import("../src/models/Bill.js");

const app = createApp();

async function loginAs(username: string, password: string) {
  const res = await request(app).post("/api/auth/login").send({ username, password });
  return res.body.token as string;
}

async function createApprovedBill(uploaderId: string, subsystemId: string, overrides: Partial<{ vendor: string; invoiceNumber: string; totalAmount: number }> = {}) {
  return Bill.create({
    uploadedBy: uploaderId,
    status: "APPROVED",
    subsystem: subsystemId,
    subsystemNameAtSubmission: "Mechanical",
    vendor: overrides.vendor ?? "ABC Hardware",
    invoiceNumber: overrides.invoiceNumber ?? "INV-1",
    totalAmount: overrides.totalAmount ?? 1000,
    billDate: new Date("2027-08-01"),
  });
}

describe("AI bill query endpoint", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it("requires authentication", async () => {
    const res = await request(app).post("/api/analytics/ai-query").send({ query: "how much did we spend" });
    expect(res.status).toBe(401);
  });

  it("rejects an empty query", async () => {
    const { password } = await createUser({ username: "m1", password: "pass1234", role: "MEMBER" });
    const token = await loginAs("m1", password);
    const res = await request(app).post("/api/analytics/ai-query").set("Authorization", `Bearer ${token}`).send({ query: "" });
    expect(res.status).toBe(400);
  });

  it("rejects a query over the length cap", async () => {
    const { password } = await createUser({ username: "m1", password: "pass1234", role: "MEMBER" });
    const token = await loginAs("m1", password);
    const res = await request(app)
      .post("/api/analytics/ai-query")
      .set("Authorization", `Bearer ${token}`)
      .send({ query: "x".repeat(600) });
    expect(res.status).toBe(400);
  });

  it("scopes results to a member's own bills, even when the AI response claims otherwise", async () => {
    const subsystem = await createSubsystem();
    const member1 = await createUser({ username: "m1", password: "pass1234", role: "MEMBER" });
    const member2 = await createUser({ username: "m2", password: "pass1234", role: "MEMBER" });

    await createApprovedBill(member1.user.id, subsystem.id, { invoiceNumber: "MINE-1" });
    await createApprovedBill(member2.user.id, subsystem.id, { invoiceNumber: "THEIRS-1" });

    // Simulate a (mis)behaving Gemini response that names a bill number outside the caller's scope.
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({ answer: "Found matches.", matchingBillNumbers: ["MINE-1", "THEIRS-1"] }),
    });

    const token = await loginAs("m1", member1.password);
    const res = await request(app).post("/api/analytics/ai-query").set("Authorization", `Bearer ${token}`).send({ query: "show all bills" });

    expect(res.status).toBe(200);
    const numbers = res.body.matchingBills.map((b: { billNumber: string }) => b.billNumber);
    expect(numbers).toContain("MINE-1");
    expect(numbers).not.toContain("THEIRS-1");
  });

  it("lets the treasurer see bills across all members", async () => {
    const subsystem = await createSubsystem();
    const member1 = await createUser({ username: "m1", password: "pass1234", role: "MEMBER" });
    const member2 = await createUser({ username: "m2", password: "pass1234", role: "MEMBER" });
    const treasurer = await createUser({ username: "t1", password: "pass1234", role: "TREASURER" });

    await createApprovedBill(member1.user.id, subsystem.id, { invoiceNumber: "A-1" });
    await createApprovedBill(member2.user.id, subsystem.id, { invoiceNumber: "B-1" });

    generateContentMock.mockResolvedValue({
      text: JSON.stringify({ answer: "ok", matchingBillNumbers: ["A-1", "B-1"] }),
    });

    const token = await loginAs("t1", treasurer.password);
    const res = await request(app).post("/api/analytics/ai-query").set("Authorization", `Bearer ${token}`).send({ query: "all bills" });

    const numbers = res.body.matchingBills.map((b: { billNumber: string }) => b.billNumber);
    expect(numbers.sort()).toEqual(["A-1", "B-1"]);
  });

  it("falls back to deterministic matching when Gemini errors, instead of failing the request", async () => {
    const subsystem = await createSubsystem();
    const member = await createUser({ username: "m1", password: "pass1234", role: "MEMBER" });
    await createApprovedBill(member.user.id, subsystem.id, { vendor: "ABC Hardware", invoiceNumber: "INV-9" });

    generateContentMock.mockRejectedValue(new Error("quota exceeded"));

    const token = await loginAs("m1", member.password);
    const res = await request(app).post("/api/analytics/ai-query").set("Authorization", `Bearer ${token}`).send({ query: "ABC Hardware" });

    expect(res.status).toBe(200);
    expect(res.body.answer).toBeTruthy();
    expect(res.body.matchingBills.some((b: { invoiceNumber?: string; billNumber: string }) => b.billNumber === "INV-9")).toBe(true);
  });

  it("falls back gracefully when Gemini returns malformed JSON", async () => {
    const subsystem = await createSubsystem();
    const member = await createUser({ username: "m1", password: "pass1234", role: "MEMBER" });
    await createApprovedBill(member.user.id, subsystem.id, { vendor: "ABC Hardware" });

    generateContentMock.mockResolvedValue({ text: "not valid json {{{" });

    const token = await loginAs("m1", member.password);
    const res = await request(app).post("/api/analytics/ai-query").set("Authorization", `Bearer ${token}`).send({ query: "ABC" });

    expect(res.status).toBe(200);
    expect(typeof res.body.answer).toBe("string");
  });

  it("returns an empty-but-successful result when there are no bills at all", async () => {
    const member = await createUser({ username: "m1", password: "pass1234", role: "MEMBER" });
    generateContentMock.mockResolvedValue({ text: JSON.stringify({ answer: "No bills found.", matchingBillNumbers: [] }) });

    const token = await loginAs("m1", member.password);
    const res = await request(app).post("/api/analytics/ai-query").set("Authorization", `Bearer ${token}`).send({ query: "anything" });

    expect(res.status).toBe(200);
    expect(res.body.matchingBills).toEqual([]);
  });
});
