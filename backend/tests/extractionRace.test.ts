import { describe, it, expect, vi, beforeEach } from "vitest";
import "./setup.js";

const generateContentMock = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: generateContentMock },
  })),
  Type: { OBJECT: "OBJECT", STRING: "STRING", NUMBER: "NUMBER", ARRAY: "ARRAY", BOOLEAN: "BOOLEAN", INTEGER: "INTEGER" },
}));

const request = (await import("supertest")).default;
const { createApp } = await import("../src/app.js");
const { createUser, createSubsystem } = await import("./helpers.js");
const { Bill } = await import("../src/models/Bill.js");

const app = createApp();

async function waitFor(check: () => Promise<boolean>, timeoutMs = 5000) {
  const start = Date.now();
  while (!(await check())) {
    if (Date.now() - start > timeoutMs) throw new Error("timed out waiting for condition");
    await new Promise((r) => setTimeout(r, 25));
  }
}

describe("background AI extraction", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it("never reverts a bill that was submitted while extraction was still running", async () => {
    // Hold the Gemini call open until the member has already submitted the bill.
    let failGemini!: (err: Error) => void;
    generateContentMock.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          failGemini = reject;
        })
    );

    const { password } = await createUser({ username: "m1", password: "pass1234", role: "MEMBER" });
    const login = await request(app).post("/api/auth/login").send({ username: "m1", password });
    const token = login.body.token as string;

    const create = await request(app).post("/api/bills").set("Authorization", `Bearer ${token}`).send({});
    const billId = create.body.bill._id as string;

    const upload = await request(app)
      .post(`/api/bills/${billId}/attachments`)
      .set("Authorization", `Bearer ${token}`)
      .attach("files", Buffer.from("%PDF-1.4 fake"), { filename: "bill.pdf", contentType: "application/pdf" });
    expect(upload.body.bill.status).toBe("PROCESSING");
    await waitFor(async () => generateContentMock.mock.calls.length > 0);

    // The member fills in the amount by hand while the AI is still reading the upload.
    await request(app).put(`/api/bills/${billId}`).set("Authorization", `Bearer ${token}`).send({ vendor: "Steel Mart", totalAmount: 500 });

    const subsystem = await createSubsystem("Race Subsystem");
    const submit = await request(app)
      .post(`/api/bills/${billId}/submit`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subsystemId: subsystem.id });
    expect(submit.body.bill.status).toBe("PENDING_APPROVAL");

    // Extraction now finishes (with a non-retryable error) after the submission.
    failGemini(new Error("invalid request"));
    await waitFor(async () => Boolean((await Bill.findById(billId).lean())?.aiExtraction?.processedAt));

    const bill = await Bill.findById(billId).lean();
    expect(bill?.status).toBe("PENDING_APPROVAL");
    expect(bill?.totalAmount).toBe(500);
    expect(bill?.aiExtraction?.error).toBeTruthy();
  });
});
