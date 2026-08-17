import "./setup.js";
import { describe, it, expect } from "vitest";
import request from "supertest";
import ExcelJS from "exceljs";
import { createApp } from "../src/app.js";
import { Bill } from "../src/models/Bill.js";
import { createUser, createSubsystem } from "./helpers.js";

const app = createApp();

// supertest has no built-in parser for the xlsx content type, so res.body would otherwise be
// `{}` — this is the standard recipe for buffering an arbitrary binary response into a Buffer.
function binaryParser(res: NodeJS.ReadableStream & { setEncoding: (enc: string) => void }, callback: (err: Error | null, body: Buffer) => void) {
  const chunks: Buffer[] = [];
  res.on("data", (chunk: Buffer) => chunks.push(chunk));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
}

async function loginAs(username: string, password: string) {
  const res = await request(app).post("/api/auth/login").send({ username, password });
  return res.body.token as string;
}

async function assertValidWorkbook(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  expect(workbook.worksheets.length).toBeGreaterThan(0);
  return workbook;
}

describe("Excel export endpoints", () => {
  it("are restricted to the treasurer role", async () => {
    const { password } = await createUser({ username: "m1", password: "pass1234", role: "MEMBER" });
    const token = await loginAs("m1", password);

    const res = await request(app).get("/api/exports/bills").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("exports only approved bills as a valid xlsx workbook", async () => {
    const uploader = await createUser({ username: "m1", password: "pass1234", role: "MEMBER" });
    const subsystem = await createSubsystem();
    await Bill.create([
      { uploadedBy: uploader.user.id, status: "APPROVED", subsystem: subsystem.id, subsystemNameAtSubmission: subsystem.name, vendor: "V1", totalAmount: 100, billDate: new Date() },
      { uploadedBy: uploader.user.id, status: "REJECTED", subsystem: subsystem.id, subsystemNameAtSubmission: subsystem.name, vendor: "V2", totalAmount: 999, billDate: new Date() },
    ]);

    const { password } = await createUser({ username: "t1", password: "pass1234", role: "TREASURER" });
    const token = await loginAs("t1", password);

    const res = await request(app).get("/api/exports/bills").set("Authorization", `Bearer ${token}`).buffer(true).parse(binaryParser);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("spreadsheetml");
    const workbook = await assertValidWorkbook(res.body);
    const rows: string[] = [];
    workbook.worksheets[0].eachRow((row) => rows.push(JSON.stringify(row.values)));
    expect(rows.some((r) => r.includes("V1"))).toBe(true);
    expect(rows.some((r) => r.includes("V2"))).toBe(false);
  });

  it("produces a valid (empty) workbook for a subsystem with zero approved bills", async () => {
    const subsystem = await createSubsystem("Empty Subsystem");
    const { password } = await createUser({ username: "t1", password: "pass1234", role: "TREASURER" });
    const token = await loginAs("t1", password);

    const res = await request(app)
      .get(`/api/exports/subsystem/${subsystem.id}`)
      .set("Authorization", `Bearer ${token}`)
      .buffer(true)
      .parse(binaryParser);

    expect(res.status).toBe(200);
    await assertValidWorkbook(res.body);
  });

  it("returns 404 for a nonexistent subsystem export", async () => {
    const { password } = await createUser({ username: "t1", password: "pass1234", role: "TREASURER" });
    const token = await loginAs("t1", password);

    const res = await request(app).get("/api/exports/subsystem/000000000000000000000000").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("produces a valid (empty) workbook for a month with zero bills", async () => {
    const { password } = await createUser({ username: "t1", password: "pass1234", role: "TREASURER" });
    const token = await loginAs("t1", password);

    const res = await request(app).get("/api/exports/month/2099/12").set("Authorization", `Bearer ${token}`).buffer(true).parse(binaryParser);

    expect(res.status).toBe(200);
    await assertValidWorkbook(res.body);
  });
});
